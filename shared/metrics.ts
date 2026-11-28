import { sql } from "drizzle-orm";
import { z } from "zod";

/**
 * Métricas anônimas do jogo: só contadores por dia ("partidas contra bots no médio: 12").
 * Nada identifica quem jogou — sem id de jogador, conta, IP ou nome.
 */
export const matchMetricSchema = z.object({
  mode: z.enum(["bots", "online", "daily"]),
  difficulty: z.enum(["easy", "medium", "hard", "professor"]).optional(),
  players: z.number().int().min(2).max(6),
  rounds: z.number().int().min(1).max(200),
  /** Rodada em que alguém declarou Cunoku; null quando o baralho acabou antes */
  declaredRound: z.number().int().min(1).max(200).nullable(),
});
export type MatchMetric = z.infer<typeof matchMetricSchema>;

/** Faixas da rodada do Cunoku: as primeiras uma a uma, as longas agrupadas. */
export function cunokuRoundBucket(round: number): string {
  if (round <= 10) return String(round);
  if (round <= 12) return "11-12";
  if (round <= 15) return "13-15";
  return "16+";
}

/** Contadores que uma partida terminada incrementa. */
export function metricKeysForMatch(m: MatchMetric): string[] {
  const keys = ["games", `games.mode.${m.mode}`, `games.players.${m.players}`];
  if (m.mode === "bots" && m.difficulty) keys.push(`games.bots.${m.difficulty}`);
  keys.push(m.declaredRound === null ? "games.ended.deck" : `cunoku.round.${cunokuRoundBucket(m.declaredRound)}`);
  return keys;
}

export const METRICS_TABLE_SQL = sql`
  CREATE TABLE IF NOT EXISTS metric_daily (
    day TEXT NOT NULL,
    key TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, key)
  )
`;

type Db = { execute: (query: ReturnType<typeof sql>) => Promise<unknown> };

export async function recordMetrics(db: Db, day: string, keys: string[]): Promise<void> {
  for (const key of keys) {
    await db.execute(sql`
      INSERT INTO metric_daily (day, key, count) VALUES (${day}, ${key}, 1)
      ON CONFLICT (day, key) DO UPDATE SET count = metric_daily.count + 1
    `);
  }
}

export type MetricsSummary = {
  days: number;
  /** Soma de cada contador no período */
  totals: Record<string, number>;
  /** Partidas por dia (para o gráfico), do mais antigo ao mais recente */
  perDay: { day: string; games: number }[];
};

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  return ((result as { rows?: Record<string, unknown>[] })?.rows ?? []) as Record<string, unknown>[];
}

export async function metricsSummary(db: Db, days: number, today: Date = new Date()): Promise<MetricsSummary> {
  const span = Math.min(Math.max(Math.floor(days) || 30, 1), 365);
  const since = new Date(today.getTime() - (span - 1) * 86_400_000).toISOString().slice(0, 10);
  const totals: Record<string, number> = {};
  for (const row of rowsOf(await db.execute(sql`SELECT key, SUM(count) AS total FROM metric_daily WHERE day >= ${since} GROUP BY key`))) {
    totals[String(row.key)] = Number(row.total) || 0;
  }
  const perDay = rowsOf(
    await db.execute(sql`SELECT day, count FROM metric_daily WHERE key = 'games' AND day >= ${since} ORDER BY day`),
  ).map((row) => ({ day: String(row.day), games: Number(row.count) || 0 }));
  return { days: span, totals, perDay };
}
