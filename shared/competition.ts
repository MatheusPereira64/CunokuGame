/** Regras puras do desafio diário e da liga semanal (dias e semanas em UTC). */
export const PLAYER_KEY_HEADER = "x-player-key";

export const DAILY_BOT_COUNT = 3;
export const DAILY_BOT_DIFFICULTY = "medium" as const;
/** Partidas online que valem pontos de liga por dia (limita farm entre aparelhos). */
export const ONLINE_SCORED_MATCHES_PER_DAY = 5;

const DAY_MS = 86_400_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPlayerKey(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dailySeed(day: string): string {
  return `cunoku-daily-${day}`;
}

/** Semana ISO, ex.: "2026-W44". */
export function weekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // A semana ISO pertence ao ano da sua quinta-feira
  const weekday = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - weekday);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function previousWeekKey(date: Date): string {
  return weekKey(new Date(date.getTime() - 7 * DAY_MS));
}

export function nextDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
}

/** Próxima segunda-feira 00:00 UTC. */
export function nextWeekStart(date: Date): Date {
  const weekday = date.getUTCDay() || 7;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 8 - weekday));
}

/** Streak atual (vale jogar hoje ou ontem) e melhor streak a partir dos dias jogados. */
export function computeStreak(days: string[], today: string): { current: number; best: number } {
  const stamps = Array.from(new Set(days))
    .map((d) => Date.parse(`${d}T00:00:00Z`))
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const stamp of stamps) {
    run = previous !== null && stamp - previous === DAY_MS ? run + 1 : 1;
    best = Math.max(best, run);
    previous = stamp;
  }
  const todayStamp = Date.parse(`${today}T00:00:00Z`);
  const isAlive = previous !== null && todayStamp - previous <= DAY_MS;
  return { current: isAlive ? run : 0, best };
}

/** Participação + vitória + bônus por score baixo (no Cunoku, menor é melhor). */
export function dailyPoints(won: boolean, score: number): number {
  const scoreBonus = Math.max(0, Math.min(15, 15 - score));
  return 10 + (won ? 15 : 0) + scoreBonus;
}

export function onlinePoints(won: boolean): number {
  return won ? 10 : 3;
}

export const LEAGUE_TIERS = [
  { id: "diamond", minPoints: 250 },
  { id: "gold", minPoints: 120 },
  { id: "silver", minPoints: 50 },
  { id: "bronze", minPoints: 0 },
] as const;

export type LeagueTier = (typeof LEAGUE_TIERS)[number]["id"];

export function leagueTier(points: number): LeagueTier {
  return LEAGUE_TIERS.find((t) => points >= t.minPoints)?.id ?? "bronze";
}

export interface ScoredResult {
  playerKey: string;
  displayName: string;
  won: boolean;
  score: number;
  points: number;
  createdAt: Date | null;
}

export function sortDailyResults<T extends ScoredResult>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => a.score - b.score || (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
  );
}

export interface LeagueStanding {
  playerKey: string;
  name: string;
  points: number;
  wins: number;
  games: number;
  rank: number;
  tier: LeagueTier;
}

/** Soma os resultados da semana; o nome exibido é o mais recente do jogador. */
export function aggregateLeague(rows: ScoredResult[]): LeagueStanding[] {
  const byPlayer = new Map<string, Omit<LeagueStanding, "rank" | "tier"> & { lastAt: number }>();
  for (const row of rows) {
    const at = row.createdAt?.getTime() ?? 0;
    const current = byPlayer.get(row.playerKey) ?? {
      playerKey: row.playerKey,
      name: row.displayName,
      points: 0,
      wins: 0,
      games: 0,
      lastAt: at,
    };
    current.points += row.points;
    current.wins += row.won ? 1 : 0;
    current.games += 1;
    if (at >= current.lastAt) {
      current.lastAt = at;
      current.name = row.displayName;
    }
    byPlayer.set(row.playerKey, current);
  }
  return Array.from(byPlayer.values())
    .sort((a, b) => b.points - a.points || b.wins - a.wins || a.lastAt - b.lastAt)
    .map(({ lastAt: _lastAt, ...standing }, i) => ({
      ...standing,
      rank: i + 1,
      tier: leagueTier(standing.points),
    }));
}
