import { asc, eq, sql } from "drizzle-orm";
import { rankPlayers, type RankPlayer } from "./schema";
import { effectiveRank, normalizeNickname, isValidPin, type PublicRankProfile, type LeaderboardEntry } from "./rank";
import { hashPin, verifyPin, hashToken, randomHex, newPlayerUuid } from "./rankCrypto";

export type { PublicRankProfile, LeaderboardEntry };

function toPublic(row: RankPlayer, position: number | null): PublicRankProfile {
  return {
    playerId: row.id,
    nickname: row.nickname,
    displayName: row.displayName || row.nickname,
    iconId: row.iconId,
    accent: row.accent,
    wins: row.wins,
    gamesPlayed: row.gamesPlayed,
    bestScore: row.bestScore,
    rank: effectiveRank(row.wins, position),
    position,
  };
}

async function findPosition(db: any, playerId: string): Promise<number | null> {
  const board = await listLeaderboardRows(db, 10_000);
  const idx = board.findIndex((r) => r.id === playerId);
  return idx >= 0 ? idx + 1 : null;
}

async function listLeaderboardRows(db: any, limit: number): Promise<RankPlayer[]> {
  // vitórias DESC; empate: menor best_score (nulls last); depois created_at ASC
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
      wins: 0,
      gamesPlayed: 0,
      bestScore: null,
      authTokenHash: tokenHash,
      updatedAt: new Date(),
    })
    .returning();

  return { token, profile: toPublic(row, null) };
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
  return { token, profile: toPublic(updated, position) };
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
  return { profile: toPublic(row, position) };
}

export async function updateRankProfile(
  db: any,
  token: string,
  patch: { displayName?: string; iconId?: string; accent?: string },
): Promise<{ profile: PublicRankProfile } | { error: string; status: number }> {
  const row = await getPlayerByToken(db, token);
  if (!row) return { error: "unauthorized", status: 401 };

  const [updated] = await db
    .update(rankPlayers)
    .set({
      displayName: patch.displayName !== undefined ? patch.displayName.trim().slice(0, 24) : row.displayName,
      iconId: patch.iconId ?? row.iconId,
      accent: patch.accent ?? row.accent,
      updatedAt: new Date(),
    })
    .where(eq(rankPlayers.id, row.id))
    .returning();

  const position = await findPosition(db, updated.id);
  return { profile: toPublic(updated, position) };
}

export async function recordRankMatch(
  db: any,
  token: string,
  input: { won: boolean; finalScore: number },
): Promise<{ profile: PublicRankProfile } | { error: string; status: number }> {
  const row = await getPlayerByToken(db, token);
  if (!row) return { error: "unauthorized", status: 401 };

  const score = Number.isFinite(input.finalScore) ? Number(input.finalScore) : 0;
  const nextBest = row.bestScore === null ? score : Math.min(row.bestScore, score);

  const [updated] = await db
    .update(rankPlayers)
    .set({
      gamesPlayed: row.gamesPlayed + 1,
      wins: row.wins + (input.won ? 1 : 0),
      bestScore: nextBest,
      updatedAt: new Date(),
    })
    .where(eq(rankPlayers.id, row.id))
    .returning();

  const position = await findPosition(db, updated.id);
  return { profile: toPublic(updated, position) };
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
    };
  });
}

export function bearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return m?.[1]?.trim() || null;
}
