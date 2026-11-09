import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { rankPlayers, rankSessions, type RankPlayer } from "./schema";
import {
  effectiveRank,
  ENTITY_TOP_N,
  normalizeNickname,
  normalizeEmail,
  isValidPassword,
  type PublicRankProfile,
  type LeaderboardEntry,
  type RankTier,
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
    nickname: row.nickname ?? "",
    displayName: row.displayName || row.nickname || "",
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
    profile.email = row.email ?? null;
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

/** Só entra no ranking quem já escolheu o nome de usuário. */
async function listLeaderboardRows(db: any, limit: number): Promise<RankPlayer[]> {
  const rows = await db
    .select()
    .from(rankPlayers)
    .where(isNotNull(rankPlayers.nickname))
    .orderBy(
      sql`${rankPlayers.wins} DESC`,
      sql`${rankPlayers.bestScore} ASC NULLS LAST`,
      asc(rankPlayers.createdAt),
    )
    .limit(limit);
  return rows;
}

type AuthResult = { token: string; profile: PublicRankProfile } | { error: string; status: number };

/** Violação de UNIQUE do Postgres (duas contas criadas ao mesmo tempo com o mesmo dado). */
function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

async function openSession(db: any, playerId: string): Promise<string> {
  const token = randomHex(32);
  await db.insert(rankSessions).values({ tokenHash: await hashToken(token), playerId });
  return token;
}

async function emailOwner(db: any, email: string): Promise<RankPlayer | null> {
  const [row] = await db.select().from(rankPlayers).where(eq(rankPlayers.email, email)).limit(1);
  return row ?? null;
}

/** Cria a conta só com e-mail e senha; o nome de usuário é escolhido depois. */
export async function registerRankPlayer(
  db: any,
  input: { email: string; password: string; displayName?: string; iconId?: string; accent?: string },
): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  if (!email) return { error: "invalid_email", status: 400 };
  if (!isValidPassword(input.password)) return { error: "invalid_password", status: 400 };
  if (await emailOwner(db, email)) return { error: "email_taken", status: 409 };

  const { hash, salt } = await hashPin(input.password);
  const id = newPlayerUuid();
  let row: RankPlayer;
  try {
    [row] = await db
      .insert(rankPlayers)
      .values({
        id,
        nickname: null,
        email,
        passwordHash: hash,
        passwordSalt: salt,
        displayName: (input.displayName || "").trim().slice(0, 24),
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
        updatedAt: new Date(),
      })
      .returning();
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "email_taken", status: 409 };
    throw err;
  }
  const token = await openSession(db, id);
  return { token, profile: toPublic(row, null, { includeProgress: true }) };
}

export async function loginRankPlayer(db: any, input: { email: string; password: string }): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  if (!email) return { error: "invalid_email", status: 400 };

  const row = await emailOwner(db, email);
  // Mesma resposta para e-mail desconhecido e senha errada
  if (!row?.passwordHash || !row.passwordSalt) return { error: "invalid_credentials", status: 401 };
  const ok = await verifyPin(input.password, row.passwordSalt, row.passwordHash);
  if (!ok) return { error: "invalid_credentials", status: 401 };

  const token = await openSession(db, row.id);
  const position = await findPosition(db, row.id);
  return { token, profile: toPublic(row, position, { includeProgress: true }) };
}

/** Conta antiga, ainda logada neste aparelho, ganha e-mail e senha e mantém vitórias e conquistas. */
export async function linkRankEmail(
  db: any,
  token: string,
  input: { email: string; password: string },
): Promise<{ profile: PublicRankProfile } | { error: string; status: number }> {
  const row = await getPlayerByToken(db, token);
  if (!row) return { error: "unauthorized", status: 401 };
  if (row.email) return { error: "email_already_linked", status: 409 };
  const email = normalizeEmail(input.email);
  if (!email) return { error: "invalid_email", status: 400 };
  if (!isValidPassword(input.password)) return { error: "invalid_password", status: 400 };
  if (await emailOwner(db, email)) return { error: "email_taken", status: 409 };

  const { hash, salt } = await hashPin(input.password);
  let updated: RankPlayer;
  try {
    [updated] = await db
      .update(rankPlayers)
      .set({ email, passwordHash: hash, passwordSalt: salt, updatedAt: new Date() })
      .where(eq(rankPlayers.id, row.id))
      .returning();
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "email_taken", status: 409 };
    throw err;
  }
  const position = await findPosition(db, updated.id);
  return { profile: toPublic(updated, position, { includeProgress: true }) };
}

export async function getPlayerByToken(db: any, token: string): Promise<RankPlayer | null> {
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const [session] = await db.select().from(rankSessions).where(eq(rankSessions.tokenHash, tokenHash)).limit(1);
  if (session) {
    const [row] = await db.select().from(rankPlayers).where(eq(rankPlayers.id, session.playerId)).limit(1);
    return row ?? null;
  }
  // Tokens emitidos antes de rank_sessions
  const [legacy] = await db.select().from(rankPlayers).where(eq(rankPlayers.authTokenHash, tokenHash)).limit(1);
  return legacy ?? null;
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
    nickname?: string;
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

  let nickname = row.nickname;
  if (patch.nickname !== undefined) {
    const wanted = normalizeNickname(patch.nickname);
    if (!wanted) return { error: "invalid_nickname", status: 400 };
    if (wanted !== row.nickname) {
      const [owner] = await db
        .select({ id: rankPlayers.id })
        .from(rankPlayers)
        .where(and(eq(rankPlayers.nickname, wanted), sql`${rankPlayers.id} <> ${row.id}`))
        .limit(1);
      if (owner) return { error: "nickname_taken", status: 409 };
      nickname = wanted;
    }
  }

  let updated: RankPlayer;
  try {
    [updated] = await db
      .update(rankPlayers)
      .set({
        nickname,
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
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "nickname_taken", status: 409 };
    throw err;
  }

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

  applyMatchOutcome(next, input.won);
  applyModeStats(next, input);
  return next;
}

function applyMatchOutcome(next: AchievementProgress, won: boolean) {
  if (won) {
    next.anyWins += 1;
    next.winStreak += 1;
    next.bestWinStreak = Math.max(next.bestWinStreak, next.winStreak);
    return;
  }
  next.winStreak = 0;
}

function applyModeStats(
  next: AchievementProgress,
  input: { won: boolean; mode: MatchMode; botDifficulty?: BotDifficulty },
) {
  if (input.mode === "pvp") {
    if (input.won) next.pvpWins += 1;
    return;
  }

  const diff = input.botDifficulty || "medium";
  if (diff === "easy") {
    next.botGamesEasy += 1;
    if (input.won) next.botWinsEasy += 1;
    return;
  }
  if (diff === "hard") {
    next.botGamesHard += 1;
    if (input.won) next.botWinsHard += 1;
    return;
  }
  next.botGamesMedium += 1;
  if (input.won) next.botWinsMedium += 1;
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
      nickname: row.nickname ?? "",
      displayName: row.displayName || row.nickname || "",
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

/** Nome e rank atuais das contas, para ligas e rankings que referenciam jogadores. */
export async function getRankSummaries(
  db: any,
  ids: string[],
): Promise<Map<string, { displayName: string; rank: RankTier }>> {
  const summaries = new Map<string, { displayName: string; rank: RankTier }>();
  if (ids.length === 0) return summaries;
  const rows: RankPlayer[] = await db.select().from(rankPlayers).where(inArray(rankPlayers.id, ids));
  const top = await listLeaderboardRows(db, ENTITY_TOP_N);
  for (const row of rows) {
    const index = top.findIndex((t) => t.id === row.id);
    summaries.set(row.id, {
      displayName: row.displayName || row.nickname || "",
      rank: effectiveRank(row.wins, index >= 0 ? index + 1 : null),
    });
  }
  return summaries;
}

export function bearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const header = authHeader.trim();
  if (!/^bearer\s/i.test(header)) return null;
  return header.slice("bearer".length).trim() || null;
}

/** Exposto para testes unitários. */
export const __test = { applyMatchToProgress, toPublic };
