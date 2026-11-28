import type { GameState } from "@shared/schema";
import type { MatchMetric } from "@shared/metrics";
import { FINAL_ROUNDS } from "@shared/cardPowers";
import { apiUrl } from "./gameServer";

const SENT_PREFIX = "cunoku_metric_sent_";

/**
 * Online, todos os jogadores veem a mesma partida terminar: só um deles envia
 * (o de menor id entre as pessoas), para a partida não contar várias vezes.
 */
export function isMetricReporter(state: GameState, playerId: string): boolean {
  const humans = state.players.filter((p) => !p.isBot).map((p) => p.id).sort();
  return humans[0] === playerId;
}

export function matchMetricFromState(
  state: GameState,
  isOffline: boolean,
  difficulty?: MatchMetric["difficulty"],
): MatchMetric {
  let mode: MatchMetric["mode"] = "online";
  if (state.dailyDay) mode = "daily";
  else if (isOffline) mode = "bots";
  // Partida que terminou pelo baralho não teve declaração
  const declaredRound = state.finalRoundDeclarerId ? Math.max(1, state.round - Math.max(0, FINAL_ROUNDS - (state.finalRoundsLeft ?? 0))) : null;
  return {
    mode,
    difficulty: mode === "bots" ? difficulty : undefined,
    players: Math.min(Math.max(state.players.length, 2), 6),
    rounds: Math.min(Math.max(state.round, 1), 200),
    declaredRound: declaredRound === null ? null : Math.min(declaredRound, 200),
  };
}

/** Envia os contadores anônimos da partida (uma vez por partida; falha em silêncio). */
export function reportMatchMetric(matchKey: string, metric: MatchMetric): void {
  try {
    if (sessionStorage.getItem(SENT_PREFIX + matchKey)) return;
    sessionStorage.setItem(SENT_PREFIX + matchKey, "1");
  } catch {
    return;
  }
  void fetch(apiUrl("/api/rank/metrics/match"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(metric),
    keepalive: true,
  }).catch(() => undefined);
}
