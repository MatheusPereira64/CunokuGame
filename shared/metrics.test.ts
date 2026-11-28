import { describe, expect, it } from "vitest";
import { cunokuRoundBucket, matchMetricSchema, metricKeysForMatch } from "./metrics";

describe("métricas anônimas", () => {
  it("monta os contadores de uma partida contra bots", () => {
    expect(metricKeysForMatch({ mode: "bots", difficulty: "hard", players: 3, rounds: 9, declaredRound: 7 })).toEqual([
      "games",
      "games.mode.bots",
      "games.players.3",
      "games.bots.hard",
      "cunoku.round.7",
    ]);
  });

  it("partida que terminou pelo baralho não conta rodada de Cunoku", () => {
    expect(metricKeysForMatch({ mode: "online", players: 2, rounds: 30, declaredRound: null })).toContain("games.ended.deck");
  });

  it("agrupa as rodadas longas", () => {
    expect(cunokuRoundBucket(5)).toBe("5");
    expect(cunokuRoundBucket(12)).toBe("11-12");
    expect(cunokuRoundBucket(14)).toBe("13-15");
    expect(cunokuRoundBucket(40)).toBe("16+");
  });

  it("recusa dados fora do formato (nada de texto livre)", () => {
    expect(matchMetricSchema.safeParse({ mode: "bots", players: 9, rounds: 5, declaredRound: null }).success).toBe(false);
    expect(matchMetricSchema.safeParse({ mode: "hack", players: 2, rounds: 5, declaredRound: null }).success).toBe(false);
    expect(matchMetricSchema.safeParse({ mode: "online", players: 4, rounds: 8, declaredRound: 6, nome: "x" }).success).toBe(true);
  });
});
