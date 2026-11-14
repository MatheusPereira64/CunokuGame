/** Ranks globais por vitórias; Entity = TOP 10 no leaderboard. */

import type { AchievementProgress } from "./achievements";

export const RANK_TIERS = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "grandmaster",
  "celestial",
  "godlike",
  "entity",
] as const;

export type RankTier = (typeof RANK_TIERS)[number];

export type PublicRankProfile = {
  playerId: string;
  /** Nome de usuário; "" enquanto a conta nova não escolheu um. */
  nickname: string;
  /** Só no perfil do próprio jogador. null nas contas antigas de PIN. */
  email?: string | null;
  displayName: string;
  iconId: string;
  accent: string;
  frameId: string;
  titleId: string;
  bannerId: string;
  wins: number;
  gamesPlayed: number;
  bestScore: number | null;
  rank: RankTier;
  position: number | null;
  achievements: string[];
  /** Presente em /me; omitido no leaderboard público. */
  progress?: AchievementProgress;
  /** Conquistas desbloqueadas nesta resposta de match-result. */
  newlyUnlocked?: string[];
};

export type LeaderboardEntry = {
  position: number;
  nickname: string;
  displayName: string;
  wins: number;
  bestScore: number | null;
  rank: RankTier;
  iconId: string;
  accent: string;
  frameId: string;
  titleId: string;
  bannerId: string;
};

export const ENTITY_TOP_N = 10;

/** Rank baseado só em vitórias (sem Entity). */
export function rankFromWins(wins: number): Exclude<RankTier, "entity"> {
  const w = Math.max(0, Math.floor(wins));
  if (w >= 200) return "godlike";
  if (w >= 120) return "celestial";
  if (w >= 80) return "grandmaster";
  if (w >= 50) return "diamond";
  if (w >= 30) return "platinum";
  if (w >= 15) return "gold";
  if (w >= 5) return "silver";
  return "bronze";
}

/**
 * Rank efetivo na UI: Entity se posição 1–10 no leaderboard;
 * caso contrário usa o rank por vitórias.
 */
export function effectiveRank(wins: number, leaderboardPosition: number | null): RankTier {
  if (
    leaderboardPosition !== null &&
    leaderboardPosition >= 1 &&
    leaderboardPosition <= ENTITY_TOP_N
  ) {
    return "entity";
  }
  return rankFromWins(wins);
}

/** Normaliza apelido: trim, lowercase para unicidade, 3–16 chars [a-z0-9_]. */
export function normalizeNickname(raw: string): string | null {
  const n = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (!/^[a-z0-9_]{3,16}$/.test(n)) return null;
  return n;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** E-mail em minúsculas, para login e unicidade; null se não parece um e-mail. */
export function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  if (e.length > 254 || /\s/.test(e)) return null;
  // Exatamente um @, algo antes dele e um ponto no meio do domínio
  const at = e.indexOf("@");
  if (at < 1 || at !== e.lastIndexOf("@")) return null;
  const domain = e.slice(at + 1);
  if (!domain.slice(1, -1).includes(".")) return null;
  return e;
}

export function isValidPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;
}
