import {
  Spade,
  Heart,
  Club,
  Diamond,
  Crown,
  Star,
  Flame,
  Moon,
  Sun,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const PROFILE_STORAGE_KEY = "cunoku_player_profile";

export type ProfileIconId =
  | "spade"
  | "heart"
  | "club"
  | "diamond"
  | "crown"
  | "star"
  | "flame"
  | "moon"
  | "sun"
  | "zap";

export type ProfileAccent = "indigo" | "red" | "amber" | "emerald" | "slate";

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  bestScore: number | null;
}

export interface PlayerProfile {
  displayName: string;
  iconId: ProfileIconId;
  accent: ProfileAccent;
  stats: PlayerStats;
  updatedAt: string;
}

export const PROFILE_ICONS: { id: ProfileIconId; Icon: LucideIcon }[] = [
  { id: "spade", Icon: Spade },
  { id: "heart", Icon: Heart },
  { id: "club", Icon: Club },
  { id: "diamond", Icon: Diamond },
  { id: "crown", Icon: Crown },
  { id: "star", Icon: Star },
  { id: "flame", Icon: Flame },
  { id: "moon", Icon: Moon },
  { id: "sun", Icon: Sun },
  { id: "zap", Icon: Zap },
];

export const PROFILE_ACCENTS: {
  id: ProfileAccent;
  ring: string;
  bg: string;
  text: string;
  soft: string;
}[] = [
  { id: "indigo", ring: "border-indigo-500", bg: "bg-indigo-100", text: "text-indigo-800", soft: "bg-indigo-500" },
  { id: "red", ring: "border-red-500", bg: "bg-red-100", text: "text-red-800", soft: "bg-red-500" },
  { id: "amber", ring: "border-amber-500", bg: "bg-amber-100", text: "text-amber-800", soft: "bg-amber-500" },
  { id: "emerald", ring: "border-emerald-500", bg: "bg-emerald-100", text: "text-emerald-800", soft: "bg-emerald-500" },
  { id: "slate", ring: "border-slate-500", bg: "bg-slate-100", text: "text-slate-800", soft: "bg-slate-500" },
];

export function defaultProfile(): PlayerProfile {
  return {
    displayName: "",
    iconId: "spade",
    accent: "indigo",
    stats: {
      gamesPlayed: 0,
      wins: 0,
      bestScore: null,
    },
    updatedAt: new Date(0).toISOString(),
  };
}

function isIconId(v: unknown): v is ProfileIconId {
  return typeof v === "string" && PROFILE_ICONS.some((i) => i.id === v);
}

function isAccent(v: unknown): v is ProfileAccent {
  return typeof v === "string" && PROFILE_ACCENTS.some((a) => a.id === v);
}

export function normalizeProfile(raw: unknown): PlayerProfile {
  const base = defaultProfile();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const statsRaw = (o.stats && typeof o.stats === "object" ? o.stats : {}) as Record<string, unknown>;

  const gamesPlayed = Number(statsRaw.gamesPlayed);
  const wins = Number(statsRaw.wins);
  const bestScoreRaw = statsRaw.bestScore;
  const bestScore =
    bestScoreRaw === null || bestScoreRaw === undefined
      ? null
      : Number.isFinite(Number(bestScoreRaw))
        ? Number(bestScoreRaw)
        : null;

  return {
    displayName: typeof o.displayName === "string" ? o.displayName.trim().slice(0, 24) : "",
    iconId: isIconId(o.iconId) ? o.iconId : base.iconId,
    accent: isAccent(o.accent) ? o.accent : base.accent,
    stats: {
      gamesPlayed: Number.isFinite(gamesPlayed) && gamesPlayed >= 0 ? Math.floor(gamesPlayed) : 0,
      wins: Number.isFinite(wins) && wins >= 0 ? Math.floor(wins) : 0,
      bestScore,
    },
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : base.updatedAt,
  };
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return defaultProfile();
    return normalizeProfile(JSON.parse(raw));
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(partial: Partial<Omit<PlayerProfile, "stats">> & { stats?: Partial<PlayerStats> }): PlayerProfile {
  const current = loadProfile();
  const next: PlayerProfile = {
    displayName:
      partial.displayName !== undefined
        ? String(partial.displayName).trim().slice(0, 24)
        : current.displayName,
    iconId: partial.iconId && isIconId(partial.iconId) ? partial.iconId : current.iconId,
    accent: partial.accent && isAccent(partial.accent) ? partial.accent : current.accent,
    stats: {
      gamesPlayed: partial.stats?.gamesPlayed ?? current.stats.gamesPlayed,
      wins: partial.stats?.wins ?? current.stats.wins,
      bestScore:
        partial.stats && "bestScore" in partial.stats
          ? (partial.stats.bestScore as number | null)
          : current.stats.bestScore,
    },
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota / private mode
  }
  return next;
}

export interface MatchResultInput {
  won: boolean;
  finalScore: number;
}

/** Atualiza estatísticas após uma partida. bestScore = menor valor (Cunoku). */
export function recordMatchResult(input: MatchResultInput): PlayerProfile {
  const current = loadProfile();
  const finalScore = Number(input.finalScore);
  const score = Number.isFinite(finalScore) ? finalScore : 0;

  const nextBest =
    current.stats.bestScore === null ? score : Math.min(current.stats.bestScore, score);

  return saveProfile({
    stats: {
      gamesPlayed: current.stats.gamesPlayed + 1,
      wins: current.stats.wins + (input.won ? 1 : 0),
      bestScore: nextBest,
    },
  });
}

export function getProfileIcon(iconId: ProfileIconId): LucideIcon {
  return PROFILE_ICONS.find((i) => i.id === iconId)?.Icon ?? Spade;
}

export function getProfileAccent(accent: ProfileAccent) {
  return PROFILE_ACCENTS.find((a) => a.id === accent) ?? PROFILE_ACCENTS[0];
}

export function winRate(stats: PlayerStats): number {
  if (stats.gamesPlayed <= 0) return 0;
  return Math.round((stats.wins / stats.gamesPlayed) * 100);
}

/** Guard de sessão para não contar a mesma partida duas vezes. */
export function statsRecordGuardKey(matchId: string): string {
  return `cunoku_stats_recorded_${matchId}`;
}

export function hasRecordedMatchStats(matchId: string): boolean {
  try {
    return sessionStorage.getItem(statsRecordGuardKey(matchId)) === "1";
  } catch {
    return false;
  }
}

export function markMatchStatsRecorded(matchId: string): void {
  try {
    sessionStorage.setItem(statsRecordGuardKey(matchId), "1");
  } catch {
    // ignore
  }
}
