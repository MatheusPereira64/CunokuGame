import { beforeEach, describe, expect, it } from "vitest";
import type { GameState, Player } from "@shared/schema";
import { addMatchToHistory, HISTORY_LIMIT, historyEntryFromState, loadMatchHistory } from "./matchHistory";

// Ambiente de teste sem navegador: localStorage e eventos mínimos
const store = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
  window: { dispatchEvent: () => true, addEventListener: () => undefined, removeEventListener: () => undefined },
});

function player(id: string, score: number, isBot = true): Player {
  return { id, name: id, isBot, isConnected: true, hand: [], score, knownCards: {} };
}

function finished(patch: Partial<GameState> = {}): GameState {
  return {
    deck: [],
    discardPile: [],
    players: [player("me", 7, false), player("bot1", 3), player("bot2", 12)],
    currentPlayerIndex: 0,
    turnPhase: "finished",
    drawnCard: null,
    drawnFromDiscard: false,
    round: 9,
    winnerId: "bot1",
    finalRoundDeclarerId: "bot1",
    logs: [],
    ...patch,
  };
}

describe("histórico de partidas", () => {
  beforeEach(() => store.clear());

  it("monta a entrada com posição, modo e quem declarou", () => {
    const entry = historyEntryFromState({ id: "a", state: finished(), playerId: "me", isOffline: true, now: 1 })!;
    expect(entry).toMatchObject({ mode: "bots", won: false, place: 2, myScore: 7, rounds: 9 });
    expect(entry.players.map((p) => p.name)).toEqual(["bot1", "me", "bot2"]);
    expect(entry.players[0]).toMatchObject({ won: true, declared: true });
    expect(historyEntryFromState({ id: "b", state: finished({ dailyDay: "2026-11-28" }), playerId: "me", isOffline: false })!.mode).toBe("daily");
  });

  it("não guarda a mesma partida duas vezes e mantém só as mais recentes", () => {
    const entry = historyEntryFromState({ id: "x", state: finished(), playerId: "me", isOffline: true })!;
    addMatchToHistory(entry);
    addMatchToHistory(entry);
    expect(loadMatchHistory()).toHaveLength(1);
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) addMatchToHistory({ ...entry, id: `m${i}` });
    const history = loadMatchHistory();
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0].id).toBe(`m${HISTORY_LIMIT + 4}`);
  });

  it("partida sem vencedor não entra", () => {
    expect(historyEntryFromState({ id: "z", state: finished({ winnerId: null }), playerId: "me", isOffline: true })).toBeNull();
  });
});
