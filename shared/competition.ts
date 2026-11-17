/** Regras puras do desafio diário e da liga semanal (dias e semanas em UTC). */
export const DAILY_BOT_COUNT = 3;
export const DAILY_BOT_DIFFICULTY = "medium" as const;
/** Partidas online que valem pontos de liga por dia (limita farm entre aparelhos). */
export const ONLINE_SCORED_MATCHES_PER_DAY = 5;

const DAY_MS = 86_400_000;

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

export interface ScoredResult {
  rankPlayerId: string;
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
  rankPlayerId: string;
  name: string;
  points: number;
  wins: number;
  games: number;
  rank: number;
}

/** Soma os resultados da semana; o nome exibido é o mais recente do jogador. */
export function aggregateLeague(rows: ScoredResult[]): LeagueStanding[] {
  const byPlayer = new Map<string, Omit<LeagueStanding, "rank"> & { lastAt: number }>();
  for (const row of rows) {
    const at = row.createdAt?.getTime() ?? 0;
    const current = byPlayer.get(row.rankPlayerId) ?? {
      rankPlayerId: row.rankPlayerId,
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
    byPlayer.set(row.rankPlayerId, current);
  }
  return Array.from(byPlayer.values())
    .sort((a, b) => b.points - a.points || b.wins - a.wins || a.lastAt - b.lastAt)
    .map(({ lastAt: _lastAt, ...standing }, i) => ({
      ...standing,
      rank: i + 1,
    }));
}

/** Divisões da liga, da mais baixa à mais alta: toda conta começa no bronze. */
export const DIVISIONS = ["bronze", "silver", "gold"] as const;
export type Division = (typeof DIVISIONS)[number];

/** Parte de cada divisão que sobe (ou desce) quando a semana fecha. */
export const DIVISION_MOVE_SHARE = 0.2;

/** Quantos sobem e quantos descem numa divisão com `count` jogadores na semana. */
export function divisionMoves(division: Division, count: number): { promote: number; demote: number } {
  const share = Math.max(1, Math.floor(count * DIVISION_MOVE_SHARE));
  return {
    promote: division === "gold" || count === 0 ? 0 : Math.min(share, count),
    // Com menos de 3 na divisão ninguém desce: sobra pouca gente para comparar
    demote: division === "bronze" || count < 3 ? 0 : share,
  };
}

export type DivisionZone = "promote" | "demote" | null;

export function divisionZone(division: Division, rank: number, count: number): DivisionZone {
  const { promote, demote } = divisionMoves(division, count);
  if (rank <= promote) return "promote";
  if (rank > count - demote) return "demote";
  return null;
}

function shiftDivision(division: Division, step: 1 | -1): Division {
  const i = DIVISIONS.indexOf(division) + step;
  return DIVISIONS[Math.max(0, Math.min(DIVISIONS.length - 1, i))];
}

type WeeklyResult = ScoredResult & { week: string };

/** Classificação da semana separada por divisão (cada uma com a própria contagem de posições). */
export function standingsByDivision(
  rows: ScoredResult[],
  divisionOf: (rankPlayerId: string) => Division,
): Record<Division, LeagueStanding[]> {
  const result = { bronze: [], silver: [], gold: [] } as Record<Division, LeagueStanding[]>;
  for (const division of DIVISIONS) {
    result[division] = aggregateLeague(rows.filter((r) => divisionOf(r.rankPlayerId) === division));
  }
  return result;
}

/**
 * Divisão de cada conta no começo da semana `currentWeek`: repete o fechamento de cada
 * semana anterior (sobe quem ficou na zona de subida, desce quem ficou na de queda).
 * Quem não jogou numa semana fica onde estava.
 */
export function computeDivisions(rows: WeeklyResult[], currentWeek: string): Map<string, Division> {
  const divisions = new Map<string, Division>();
  const divisionOf = (id: string) => divisions.get(id) ?? "bronze";
  const weeks = Array.from(new Set(rows.map((r) => r.week).filter((w) => w < currentWeek))).sort();
  for (const week of weeks) {
    const tables = standingsByDivision(
      rows.filter((r) => r.week === week),
      divisionOf,
    );
    for (const division of DIVISIONS) {
      const table = tables[division];
      for (const standing of table) {
        const zone = divisionZone(division, standing.rank, table.length);
        const next = zone === "promote" ? shiftDivision(division, 1) : zone === "demote" ? shiftDivision(division, -1) : division;
        divisions.set(standing.rankPlayerId, next);
      }
    }
  }
  return divisions;
}
