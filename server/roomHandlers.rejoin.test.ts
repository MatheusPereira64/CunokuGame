import { describe, expect, it } from "vitest";
import type { GameState, Room } from "@shared/schema";
import type { IStorage } from "./storage";
import {
  createEmptySession,
  createFilteringMessenger,
  handleJoinMessage,
  handlePlayerDisconnect,
} from "./roomHandlers";

function playingRoom(): Room {
  const state: GameState = {
    deck: [],
    discardPile: [],
    players: [
      {
        id: "p1",
        name: "Ana",
        isBot: false,
        isConnected: true,
        hand: [],
        score: 0,
        knownCards: {},
      },
    ],
    currentPlayerIndex: 0,
    turnPhase: "draw",
    drawnCard: null,
    drawnFromDiscard: false,
    round: 1,
    winnerId: null,
    logs: [],
  };
  return {
    id: 1,
    code: "ABCD",
    hostId: "p1",
    status: "playing",
    gameMode: "multiplayer",
    botDifficulty: "medium",
    maxPlayers: 4,
    botCount: 0,
    gameState: state,
    createdAt: new Date(),
  };
}

function memoryStorage(initial: Room): IStorage & { room: Room } {
  const box = { room: initial };
  return {
    get room() {
      return box.room;
    },
    set room(value: Room) {
      box.room = value;
    },
    async createRoom() {
      throw new Error("unused");
    },
    async getRoom() {
      return box.room;
    },
    async listRooms() {
      return [box.room];
    },
    async updateGameState(_code, state) {
      box.room = { ...box.room, gameState: state };
      return box.room;
    },
    async updateRoomStatus(_code, status) {
      box.room = { ...box.room, status };
      return box.room;
    },
  };
}

describe("reentrada na partida", () => {
  it("devolve o estado a quem já está na mesa", async () => {
    const store = memoryStorage(playingRoom());
    store.room.gameState!.players[0]!.isConnected = false;
    store.room.gameState!.reconnectDeadline = Date.now() + 50_000;
    store.room.gameState!.reconnectPlayerId = "p1";
    const sent: unknown[] = [];
    const messenger = createFilteringMessenger(
      () => ({ open: true, send: (data) => sent.push(JSON.parse(data)) }),
      () => ["p1"],
    );

    await handleJoinMessage(
      store,
      createEmptySession(),
      messenger,
      { code: "ABCD", playerId: "p1", name: "Ana" },
      () => undefined,
      () => undefined,
    );

    expect(store.room.gameState?.players[0]?.isConnected).toBe(true);
    expect(store.room.gameState?.reconnectDeadline).toBeNull();
    expect(store.room.gameState?.reconnectPlayerId).toBeNull();
    expect(sent.some((m) => (m as { type?: string }).type === "game_state")).toBe(true);
  });

  it("marca desconexão quando o socket some", async () => {
    const store = memoryStorage(playingRoom());
    const messenger = createFilteringMessenger(
      () => undefined,
      () => [],
    );
    await handlePlayerDisconnect(store, messenger, "ABCD", "p1");
    expect(store.room.gameState?.players[0]?.isConnected).toBe(false);
    expect(store.room.gameState?.reconnectPlayerId).toBe("p1");
    expect(store.room.gameState?.reconnectDeadline).toBeGreaterThan(Date.now());
  });

  it("recusa quem não estava na partida", async () => {
    const store = memoryStorage(playingRoom());
    const replies: unknown[] = [];
    const messenger = createFilteringMessenger(
      () => undefined,
      () => [],
    );
    await handleJoinMessage(
      store,
      createEmptySession(),
      messenger,
      { code: "ABCD", playerId: "stranger", name: "Bob" },
      () => undefined,
      (msg) => replies.push(msg),
    );
    expect(replies).toEqual([{ type: "error", message: "Game has already started" }]);
  });
});
