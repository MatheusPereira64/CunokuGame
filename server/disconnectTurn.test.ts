import { describe, expect, it } from "vitest";
import type { Card, GameState, Player } from "@shared/schema";
import { autoPlayDisconnectedTurn, DISCONNECT_TURN_MS, syncReconnectWindow } from "./disconnectTurn";

function card(id: string, rank: Card["rank"]): Card {
  return { id, suit: "spades", rank, value: 1, isFaceUp: false };
}

function player(id: string, connected: boolean): Player {
  return {
    id,
    name: id === "p1" ? "Ana" : "Bia",
    isBot: false,
    isConnected: connected,
    hand: [card(`${id}h`, "2"), card(`${id}i`, "3"), card(`${id}j`, "4"), card(`${id}k`, "5")],
    score: 0,
    knownCards: {},
  };
}

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    deck: [card("d1", "9"), card("d2", "10")],
    discardPile: [card("disc", "A")],
    players: [player("p1", false), player("p2", true)],
    currentPlayerIndex: 0,
    turnPhase: "draw",
    drawnCard: null,
    drawnFromDiscard: false,
    round: 1,
    winnerId: null,
    logs: [],
    ...overrides,
  };
}

describe("turno de jogador desconectado", () => {
  it("abre 50s só quando a vez chega no jogador offline", () => {
    const waiting = syncReconnectWindow(state({ currentPlayerIndex: 1, players: [player("p1", false), player("p2", true)] }));
    expect(waiting.reconnectDeadline).toBeUndefined();

    const now = 1_000_000;
    const opened = syncReconnectWindow(state(), now);
    expect(opened.reconnectPlayerId).toBe("p1");
    expect(opened.reconnectDeadline).toBe(now + DISCONNECT_TURN_MS);

    const kept = syncReconnectWindow(opened, now + 10_000);
    expect(kept.reconnectDeadline).toBe(opened.reconnectDeadline);
  });

  it("não joga antes dos 50s e descarta a carta comprada depois", () => {
    const now = 1_000_000;
    const opened = syncReconnectWindow(state(), now);
    expect(autoPlayDisconnectedTurn(opened, now + 49_000)).toBe(opened);

    const played = autoPlayDisconnectedTurn(opened, now + DISCONNECT_TURN_MS);
    expect(played.currentPlayerIndex).toBe(1);
    expect(played.drawnCard).toBeNull();
    expect(played.discardPile.at(-1)?.id).toBe("d2");
    expect(played.reconnectPlayerId).toBeNull();
    expect(played.logs.some((line) => line.includes("não reconectou"))).toBe(true);
  });

  it("se já tinha comprado, só descarta essa carta", () => {
    const now = 1_000_000;
    const holding = syncReconnectWindow(
      state({ turnPhase: "action", drawnCard: card("drawn", "Q"), deck: [card("d1", "9")] }),
      now,
    );
    const played = autoPlayDisconnectedTurn(holding, now + DISCONNECT_TURN_MS);
    expect(played.discardPile.at(-1)?.id).toBe("drawn");
    expect(played.deck).toHaveLength(1);
    expect(played.currentPlayerIndex).toBe(1);
  });

  it("cancela a janela quando o jogador volta", () => {
    const now = 1_000_000;
    const opened = syncReconnectWindow(state(), now);
    const back = {
      ...opened,
      players: opened.players.map((p) => (p.id === "p1" ? { ...p, isConnected: true } : p)),
    };
    const cleared = syncReconnectWindow(back, now + 1000);
    expect(cleared.reconnectDeadline).toBeNull();
    expect(cleared.reconnectPlayerId).toBeNull();
    expect(autoPlayDisconnectedTurn(cleared, now + DISCONNECT_TURN_MS)).toBe(cleared);
  });
});
