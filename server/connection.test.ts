import { describe, expect, it } from "vitest";
import type { Card, GameState, Room } from "@shared/schema";
import type { IStorage } from "./storage";
import { handlePlayerAction, type RoomMessenger } from "./roomHandlers";

const card = (id: string): Card => ({ id, rank: "5", value: 5, suit: "hearts", isFaceUp: false });

/** Vez da Ana, mas um aviso de desconexão atrasado a marcou como offline. */
function staleDisconnect(): GameState {
  return {
    deck: [card("d1"), card("d2")],
    discardPile: [card("top")],
    players: ["ana", "bia"].map((id) => ({
      id,
      name: id,
      isBot: false,
      isConnected: id !== "ana",
      hand: [card(`${id}1`), card(`${id}2`)],
      score: 0,
      knownCards: {},
    })),
    currentPlayerIndex: 0,
    turnPhase: "draw",
    drawnCard: null,
    drawnFromDiscard: false,
    round: 1,
    winnerId: null,
    logs: [],
    finalRoundDeclarerId: null,
    isFinalRound: false,
    reconnectPlayerId: "ana",
    reconnectDeadline: Date.now() + 50_000,
  };
}

async function act(state: GameState) {
  let room = { code: "ABCD", hostId: "ana", status: "playing", gameState: state } as Room;
  const storage = {
    getRoom: async () => room,
    updateGameState: async (_code: string, next: GameState) => (room = { ...room, gameState: next }),
  } as unknown as IStorage;
  const messenger = { broadcast: () => {}, send: () => {}, getConnectedPlayerIds: () => ["ana", "bia"], connectionCount: () => 2 } as unknown as RoomMessenger;
  await handlePlayerAction(storage, messenger, "ABCD", "ana", { type: "draw_deck" }, () => {});
  return room.gameState as GameState;
}

describe("conexão de quem joga", () => {
  it("quem manda uma ação volta a contar como conectado e a janela de reconexão fecha", async () => {
    const after = await act(staleDisconnect());
    expect(after.players[0]!.isConnected).toBe(true);
    expect(after.reconnectPlayerId).toBeNull();
    expect(after.reconnectDeadline).toBeNull();
    expect(after.turnPhase).toBe("action");
  });
});
