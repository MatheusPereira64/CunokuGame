import { describe, expect, it } from "vitest";
import type { Card, GameState, Player } from "@shared/schema";
import { autoPlayDisconnectedTurn, autoPlayTimedOutTurn, DISCONNECT_TURN_MS, syncReconnectWindow, syncTurnClock, TURN_TIME_MS } from "./disconnectTurn";

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

describe("tempo da vez de quem está conectado", () => {
  const online = () => state({ players: [player("p1", true), player("p2", true)] });

  it("começa a contar quando a vez é de um humano conectado e há outro humano esperando", () => {
    const s = syncTurnClock(online(), 1000);
    expect(s.turnDeadline).toBe(1000 + TURN_TIME_MS);
    expect(s.turnKey).toBe("1:0");
  });

  it("não reinicia na mesma vez, nem quando o jogador compra", () => {
    const s = syncTurnClock(online(), 1000);
    expect(syncTurnClock({ ...s, turnPhase: "action" }, 5000).turnDeadline).toBe(1000 + TURN_TIME_MS);
  });

  it("reinicia quando a vez passa para outro jogador", () => {
    const s = syncTurnClock(online(), 1000);
    const next = syncTurnClock({ ...s, currentPlayerIndex: 1 }, 9000);
    expect(next.turnDeadline).toBe(9000 + TURN_TIME_MS);
    expect(next.turnKey).toBe("1:1");
  });

  it("não conta contra bots, no desafio diário nem com um humano só", () => {
    const vsBot = online();
    vsBot.players[1]!.isBot = true;
    expect(syncTurnClock(vsBot, 1000).turnDeadline ?? null).toBeNull();
    expect(syncTurnClock({ ...online(), dailyDay: "2026-11-09" }, 1000).turnDeadline ?? null).toBeNull();
  });

  it("quem caiu fica com a janela de reconexão, não com o tempo da vez", () => {
    const s = syncTurnClock(state(), 1000);
    expect(s.reconnectDeadline).toBe(1000 + DISCONNECT_TURN_MS);
    expect(s.turnDeadline ?? null).toBeNull();
  });

  it("ao esgotar, compra e descarta pelo jogador e passa a vez", () => {
    const s = syncTurnClock(online(), 1000);
    expect(autoPlayTimedOutTurn(s, 1000 + TURN_TIME_MS - 1)).toBe(s);
    const after = autoPlayTimedOutTurn(s, 1000 + TURN_TIME_MS);
    expect(after.currentPlayerIndex).toBe(1);
    expect(after.discardPile.at(-1)?.id).toBe("d2");
    expect(after.players[0]!.hand).toHaveLength(4);
    expect(after.turnKey).toBe("1:1");
  });
});
