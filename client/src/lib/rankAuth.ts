import { apiUrl } from "./gameServer";
import type { PublicRankProfile, LeaderboardEntry, RankTier } from "@shared/rank";

const TOKEN_KEY = "cunoku_rank_token";
const PLAYER_KEY = "cunoku_rank_player_id";

export type { PublicRankProfile, LeaderboardEntry, RankTier };

export function getRankToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRankPlayerId(): string | null {
  try {
    return localStorage.getItem(PLAYER_KEY);
  } catch {
    return null;
  }
}

export function isRankLoggedIn(): boolean {
  return !!getRankToken();
}

function saveSession(token: string, playerId: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PLAYER_KEY, playerId);
}

export function logoutRank(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PLAYER_KEY);
  } catch {
    // ignore
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string };
    return data.message || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function registerRankAccount(input: {
  nickname: string;
  pin: string;
  displayName?: string;
  iconId?: string;
  accent?: string;
}): Promise<PublicRankProfile> {
  const res = await fetch(apiUrl("/api/rank/register"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { token: string; profile: PublicRankProfile };
  saveSession(data.token, data.profile.playerId);
  return data.profile;
}

export async function loginRankAccount(input: {
  nickname: string;
  pin: string;
}): Promise<PublicRankProfile> {
  const res = await fetch(apiUrl("/api/rank/login"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { token: string; profile: PublicRankProfile };
  saveSession(data.token, data.profile.playerId);
  return data.profile;
}

export async function fetchRankMe(): Promise<PublicRankProfile | null> {
  const token = getRankToken();
  if (!token) return null;
  const res = await fetch(apiUrl("/api/rank/me"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    logoutRank();
    return null;
  }
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { profile: PublicRankProfile };
  return data.profile;
}

export async function syncRankProfile(patch: {
  displayName?: string;
  iconId?: string;
  accent?: string;
}): Promise<PublicRankProfile | null> {
  const token = getRankToken();
  if (!token) return null;
  const res = await fetch(apiUrl("/api/rank/me"), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
  });
  if (res.status === 401) {
    logoutRank();
    return null;
  }
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { profile: PublicRankProfile };
  return data.profile;
}

export async function reportRankMatchResult(input: {
  won: boolean;
  finalScore: number;
}): Promise<PublicRankProfile | null> {
  const token = getRankToken();
  if (!token) return null;
  const res = await fetch(apiUrl("/api/rank/match-result"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  if (res.status === 401) {
    logoutRank();
    return null;
  }
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { profile: PublicRankProfile };
  return data.profile;
}

/**
 * Rank global só conta PvP: offline/bots não entram.
 * Precisa de pelo menos outro humano na mesa.
 */
export function countsForGlobalRank(
  isOffline: boolean,
  players: { id: string; isBot?: boolean }[],
  localPlayerId: string,
): boolean {
  if (isOffline) return false;
  return players.some((p) => p.id !== localPlayerId && !p.isBot);
}

export async function fetchLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const res = await fetch(apiUrl(`/api/rank/leaderboard?limit=${limit}`));
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { entries: LeaderboardEntry[] };
  return data.entries ?? [];
}
