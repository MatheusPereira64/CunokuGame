import { asc, eq, sql } from "drizzle-orm";
import { rankPlayers, type RankPlayer } from "./schema";
import {
  effectiveRank,
  normalizeNickname,
  isValidPin,
  type PublicRankProfile,
  type LeaderboardEntry,
} from "./rank";
import { hashPin, verifyPin, hashToken, randomHex, newPlayerUuid } from "./rankCrypto";
import {
  evaluateNewAchievements,
  normalizeAchievements,
  normalizeProgress,
  type AchievementProgress,
} from "./achievements";
import {
  isBannerUnlocked,
  isFrameUnlocked,
  isTitleUnlocked,
} from "./cosmetics";

export type { PublicRankProfile, LeaderboardEntry };

export type MatchMode = "pvp" | "bots" | "offline";
export type BotDifficulty = "easy" | "medium" | "hard";

function rowAchievements(row: RankPlayer): string[] {
  return normalizeAchievements((row as any).achievements);
}

function rowProgress(row: RankPlayer): AchievementProgress {
  return normalizeProgress((row as any).progress);
}

function toPublic(
  row: RankPlayer,
  position: number | null,
  opts?: { includeProgress?: boolean; newlyUnlocked?: string[] },
): PublicRankProfile {
  const profile: PublicRankProfile = {
    playerId: row.id,
    nickname: row.nickname,
    displayName: row.displayName || row.nickname,
    iconId: row.iconId,
    accent: row.accent,
    frameId: (row as any).frameId || "none",
    titleId: (row as any).titleId || "none",
    bannerId: (row as any).bannerId || "default",
    wins: row.wins,
    gamesPlayed: row.gamesPlayed,
    bestScore: row.bestScore,
    rank: effectiveRank(row.wins, position),
    position,
    achievements: rowAchievements(row),
  };
  if (opts?.includeProgress) {
    profile.progress = rowProgress(row);
  }
  if (opts?.newlyUnlocked?.length) {
    profile.newlyUnlocked = opts.newlyUnlocked;
  }
  return profile;
}

async function findPosition(db: any, playerId: string): Promise<number | null> {
  const board = await listLeaderboardRows(db, 10_000);
  const idx = board.findIndex((r) => r.id === playerId);
  return idx >= 0 ? idx + 1 : null;
}

async function listLeaderboardRows(db: any, limit: number): Promise<RankPlayer[]> {
  const rows = await db
    .select()
    .from(rankPlayers)
    .orderBy(
      sql`${rankPlayers.wins} DESC`,
      sql`${rankPlayers.bestScore} ASC NULLS LAST`,
      asc(rankPlayers.createdAt),
    )
    .limit(limit);
  return rows;
}

export async function registerRankPlayer(
  db: any,
  input: { nickname: string; pin: string; displayName?: string; iconId?: string; accent?: string },
): Promise<{ token: string; profile: PublicRankProfile } | { error: string; status: number }> {
  const nickname = normalizeNickname(input.nickname);
  if (!nickname) return { error: "invalid_nickname", status: 400 };
  if (!isValidPin(input.pin)) return { error: "invalid_pin", status: 400 };

  const existing = await db.select().from(rankPlayers).where(eq(rankPlayers.nickname, nickname)).limit(1);
  if (existing.length) return { error: "nickname_taken", status: 409 };

  const { hash, salt } = await hashPin(input.pin);
  const token = randomHex(32);
  const tokenHash = await hashToken(token);
  const id = newPlayerUuid();
  const displayName = (input.displayName || nickname).trim().slice(0, 24) || nickname;

  const [row] = await db
    .insert(rankPlayers)
    .values({
      id,
      nickname,
      pinHash: hash,
      pinSalt: salt,
      displayName,
      iconId: input.iconId || "spade",
      accent: input.accent || "indigo",
      frameId: "none",
      titleId: "none",
      bannerId: "default",
      wins: 0,
      gamesPlayed: 0,
      bestScore: null,
      progress: {},
      achievements: [],
      authTokenHash: tokenHash,
      updatedAt: new Date(),
    })
    .returning();

  return { token, profile: toPublic(row, null, { includeProgress: true }) };
}

export async function loginRankPlayer(
  db: any,
  input: { nickname: string; pin: string },
): Promise<{ token: string; profile: PublicRankProfile } | { error: string; status: number }> {
  const nickname = normalizeNickname(input.nickname);
  if (!nickname) return { error: "invalid_nickname", status: 400 };
  if (!isValidPin(input.pin)) return { error: "invalid_pin", status: 400 };

  const [row] = await db.select().from(rankPlayers).where(eq(rankPlayers.nickname, nickname)).limit(1);
  if (!row) return { error: "invalid_credentials", status: 401 };

  const ok = await verifyPin(input.pin, row.pinSalt, row.pinHash);
  if (!ok) return { error: "invalid_credentials", status: 401 };

  const token = randomHex(32);
  const tokenHash = await hashToken(token);
  const [updated] = await db
    .update(rankPlayers)
    .set({ authTokenHash: tokenHash, updatedAt: new Date() })
    .where(eq(rankPlayers.id, row.id))
    .returning();

  const position = await findPosition(db, updated.id);
  return { token, profile: toPublic(updated, position, { includeProgress: true }) };
}

export async function getPlayerByToken(db: any, token: string): Promise<RankPlayer | null> {
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const [row] = await db.select().from(rankPlayers).where(eq(rankPlayers.authTokenHash, tokenHash)).limit(1);
  return row ?? null;
}

export async function getMe(
  db: any,
  token: string,
): Promise<{ profile: PublicRankProfile } | { error: string; status: number }> {
  const row = await getPlayerByToken(db, token);
  if (!row) return { error: "unauthorized", status: 401 };
  const position = await findPosition(db, row.id);
  return { profile: toPublic(row, position, { includeProgress: true }) };
}

export async function updateRankProfile(
  db: any,
  token: string,
  patch: {
    displayName?: string;
    iconId?: string;
    accent?: string;
    frameId?: string;
    titleId?: string;
    bannerId?: string;
  },
): Promise<{ profile: PublicRankProfile } | { error: string; status: number }> {
  const row = await getPlayerByToken(db, token);
  if (!row) return { error: "unauthorized", status: 401 };

  const unlocked = rowAchievements(row);
  if (patch.frameId !== undefined && !isFrameUnlocked(patch.frameId, unlocked)) {
    return { error: "cosmetic_locked", status: 400 };
  }
  if (patch.titleId !== undefined && !isTitleUnlocked(patch.titleId, unlocked)) {
    return { error: "cosmetic_locked", status: 400 };
  }
  if (patch.bannerId !== undefined && !isBannerUnlocked(patch.bannerId, unlocked)) {
    return { error: "cosmetic_locked", status: 400 };
  }

  const [updated] = await db
    .update(rankPlayers)
    .set({
      displayName: patch.displayName !== undefined ? patch.displayName.trim().slice(0, 24) : row.displayName,
      iconId: patch.iconId ?? row.iconId,
      accent: patch.accent ?? row.accent,
      frameId: patch.frameId ?? (row as any).frameId ?? "none",
      titleId: patch.titleId ?? (row as any).titleId ?? "none",
      bannerId: patch.bannerId ?? (row as any).bannerId ?? "default",
      updatedAt: new Date(),
    })
    .where(eq(rankPlayers.id, row.id))
    .returning();

  const position = await findPosition(db, updated.id);
  return { profile: toPublic(updated, position, { includeProgress: true }) };
}

function applyMatchToProgress(
  prev: AchievementProgress,
  input: { won: boolean; finalScore: number; mode: MatchMode; botDifficulty?: BotDifficulty },
): AchievementProgress {
  const next: AchievementProgress = { ...prev };
  next.gamesPlayed += 1;

  const score = Number.isFinite(input.finalScore) ? Number(input.finalScore) : 0;
  next.bestScore = next.bestScore === null ? score : Math.min(next.bestScore, score);

  if (input.won) {
    next.anyWins += 1;
    next.winStreak += 1;
    next.bestWinStreak = Math.max(next.bestWinStreak, next.winStreak);
  } else {
    next.winStreak = 0;
  }

  if (input.mode === "pvp") {
    if (input.won) next.pvpWins += 1;
  } else {
    const diff = input.botDifficulty || "medium";
    if (diff === "easy") {
      next.botGamesEasy += 1;
      if (input.won) next.botWinsEasy += 1;
    } else if (diff === "hard") {
      next.botGamesHard += 1;
      if (input.won) next.botWinsHard += 1;
    } else {
      next.botGamesMedium += 1;
      if (input.won) next.botWinsMedium += 1;
    }
  }

  return next;
}

export async function recordRankMatch(
  db: any,
  token: string,
  input: {
    won: boolean;
    finalScore: number;
    mode?: MatchMode;
    botDifficulty?: BotDifficulty;
  },
): Promise<{ profile: PublicRankProfile } | { error: string; status: number }> {
  const row = await getPlayerByToken(db, token);
  if (!row) return { error: "unauthorized", status: 401 };

  const mode: MatchMode = input.mode || "pvp";
  const score = Number.isFinite(input.finalScore) ? Number(input.finalScore) : 0;

  const progress = applyMatchToProgress(rowProgress(row), {
    won: input.won,
    finalScore: score,
    mode,
    botDifficulty: input.botDifficulty,
  });

  const prevAchievements = rowAchievements(row);
  const newlyUnlocked = evaluateNewAchievements(progress, prevAchievements);
  const achievements = [...prevAchievements, ...newlyUnlocked];

  // Ranking global (wins/gamesPlayed/bestScore das colunas) só em PvP
  const isPvp = mode === "pvp";
  const nextGamesPlayed = isPvp ? row.gamesPlayed + 1 : row.gamesPlayed;
  const nextWins = isPvp ? row.wins + (input.won ? 1 : 0) : row.wins;
  const nextBest =
    isPvp
      ? row.bestScore === null
        ? score
        : Math.min(row.bestScore, score)
      : row.bestScore;

  const [updated] = await db
    .update(rankPlayers)
    .set({
      gamesPlayed: nextGamesPlayed,
      wins: nextWins,
      bestScore: nextBest,
      progress,
      achievements,
      updatedAt: new Date(),
    })
    .where(eq(rankPlayers.id, row.id))
    .returning();

  const position = await findPosition(db, updated.id);
  return {
    profile: toPublic(updated, position, {
      includeProgress: true,
      newlyUnlocked,
    }),
  };
}

export async function getLeaderboard(db: any, limit = 50): Promise<LeaderboardEntry[]> {
  const capped = Math.min(Math.max(limit, 1), 100);
  const rows = await listLeaderboardRows(db, capped);
  return rows.map((row, i) => {
    const position = i + 1;
    return {
      position,
      nickname: row.nickname,
      displayName: row.displayName || row.nickname,
      wins: row.wins,
      bestScore: row.bestScore,
      rank: effectiveRank(row.wins, position),
      iconId: row.iconId,
      accent: row.accent,
      frameId: (row as any).frameId || "none",
      titleId: (row as any).titleId || "none",
      bannerId: (row as any).bannerId || "default",
    };
  });
}

export function bearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return m?.[1]?.trim() || null;
}

/** Exposto para testes unitários. */
export const __test = { applyMatchToProgress, toPublic };
