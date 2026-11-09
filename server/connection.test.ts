import { describe, expect, it } from "vitest";
import type { Card, GameState, Room } from "@shared/schema";
import type { IStorage } from "./storage";
import { handlePlayerAction, handleRematch, type RoomMessenger } from "./roomHandlers";

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

describe("revanche", () => {
  async function rematchFrom(state: GameState, connected = ["ana", "bia"]) {
    let room = { code: "ABCD", hostId: "ana", status: "finished", gameState: state } as Room;
    const sent: { type: string; state?: GameState }[] = [];
    const storage = {
      getRoom: async () => room,
      updateGameState: async (_code: string, next: GameState) => (room = { ...room, gameState: next }),
      updateRoomStatus: async (_code: string, status: string) => (room = { ...room, status }),
    } as unknown as IStorage;
    const messenger = {
      broadcast: (m: never) => sent.push(m),
      send: (_id: string, m: never) => sent.push(m),
      getConnectedPlayerIds: () => connected,
      connectionCount: () => connected.length,
    } as unknown as RoomMessenger;
    await handleRematch(storage, messenger, "ABCD", "bia", () => {});
    return { room, sent };
  }

  const finished = () => ({ ...staleDisconnect(), winnerId: "ana", turnPhase: "finished" as const, round: 7 });

  it("começa outra partida na mesma sala com quem está conectado", async () => {
    const { room } = await rematchFrom(finished());
    const next = room.gameState as GameState;
    expect(next.winnerId).toBeNull();
    expect(next.round).toBe(1);
    expect(next.players.map((p) => p.id)).toEqual(["ana", "bia"]);
    expect(next.players.every((p) => p.hand.length === 4 && p.score === 0)).toBe(true);
    expect(room.status).toBe("playing");
  });

  it("não reinicia partida em andamento nem o desafio diário", async () => {
    const running = staleDisconnect();
    expect((await rematchFrom(running)).room.gameState).toBe(running);
    const daily = { ...finished(), dailyDay: "2026-11-09" };
    expect((await rematchFrom(daily)).room.gameState).toBe(daily);
  });

  it("sem outro jogador conectado, avisa em vez de começar", async () => {
    const { room, sent } = await rematchFrom(finished(), ["bia"]);
    expect((room.gameState as GameState).winnerId).toBe("ana");
    expect(sent.some((m) => m.type === "error")).toBe(true);
  });
});
