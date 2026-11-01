import { describe, expect, it } from "vitest";
import type { GameState, InsertRoom, Room } from "@shared/schema";
import { filterGameStateForPlayer } from "@shared/gameFilter";
import { BotPlayer } from "./bot";
import { getDailyStatus, getLeagueStandings, recordFinishedMatch, startDailyChallenge } from "./competition";
import { MemoryCompetitionStore } from "./competitionStore";
import { GameLogic } from "./game";
import { createEmptySession, executeBotTurn, handleEmote, handleJoinMessage, type RoomMessenger } from "./roomHandlers";
import type { IStorage } from "./storage";

const KEY_A = "11111111-1111-4111-8111-111111111111";
const KEY_B = "22222222-2222-4222-8222-222222222222";
const DAY_1 = new Date("2026-11-02T10:00:00Z");
const DAY_2 = new Date("2026-11-03T10:00:00Z");

/** Mesmo comportamento do MemoryStorage, sem carregar a conexão de banco de server/storage. */
function memoryStorage(): IStorage {
  const rooms = new Map<string, Room>();
  const update = (code: string, patch: Partial<Room>) => {
    const updated = { ...rooms.get(code)!, ...patch };
    rooms.set(code, updated);
    return updated;
  };
  return {
    async createRoom(room: InsertRoom) {
      const created = { id: rooms.size + 1, gameState: null, createdAt: new Date(), ...room } as Room;
      rooms.set(room.code, created);
      return created;
    },
    getRoom: async (code) => rooms.get(code),
    listRooms: async () => Array.from(rooms.values()),
    updateGameState: async (code, gameState) => update(code, { gameState }),
    updateRoomStatus: async (code, status) => update(code, { status }),
  };
}

function capturingMessenger() {
  const sent: { to: string | null; msg: any }[] = [];
  const messenger: RoomMessenger = {
    send: (to, msg) => sent.push({ to, msg }),
    broadcast: (msg) => sent.push({ to: null, msg }),
    getConnectedPlayerIds: () => [],
    connectionCount: () => 0,
  };
  return { sent, messenger };
}

async function finishDaily(
  storage: IStorage,
  store: MemoryCompetitionStore,
  key: string,
  name: string,
  now: Date,
  score: number,
) {
  const started = await startDailyChallenge(storage, store, { playerKey: key, playerName: name }, now);
  const room = (await storage.getRoom(started.code!))!;
  const state = structuredClone(room.gameState!) as GameState;
  state.players[0]!.score = score;
  state.winnerId = state.players[0]!.id;
  return { started, rewards: await recordFinishedMatch(store, room, state, new Map(), now) };
}

describe("desafio diário", () => {
  it("dá a mesma distribuição para todos no dia e muda no dia seguinte", async () => {
    const storage = memoryStorage();
    const store = new MemoryCompetitionStore();
    const handsOf = async (key: string, now: Date) => {
      const { code } = await startDailyChallenge(storage, store, { playerKey: key, playerName: "x" }, now);
      const state = (await storage.getRoom(code!))!.gameState as GameState;
      return state.players.map((p) => p.hand.map((c) => `${c.rank}:${c.suit}`));
    };

    const a = await handsOf(KEY_A, DAY_1);
    expect(await handsOf(KEY_B, DAY_1)).toEqual(a);
    expect(await handsOf(KEY_A, DAY_2)).not.toEqual(a);
  });

  it("retoma a mesma sala e bloqueia nova tentativa depois de terminar", async () => {
    const storage = memoryStorage();
    const store = new MemoryCompetitionStore();
    const input = { playerKey: KEY_A, playerName: "Ana" };

    const first = await startDailyChallenge(storage, store, input, DAY_1);
    const resumed = await startDailyChallenge(storage, store, input, DAY_1);
    expect(resumed.code).toBe(first.code);
    expect(resumed.playerId).toBe(first.playerId);

    const room = (await storage.getRoom(first.code!))!;
    const state = structuredClone(room.gameState!) as GameState;
    state.winnerId = first.playerId;
    await recordFinishedMatch(store, room, state, new Map(), DAY_1);

    expect((await startDailyChallenge(storage, store, input, DAY_1)).alreadyPlayed).toBe(true);
  });

  it("não conta a mesma partida duas vezes", async () => {
    const storage = memoryStorage();
    const store = new MemoryCompetitionStore();
    const { started } = await finishDaily(storage, store, KEY_A, "Ana", DAY_1, 3);
    const room = (await storage.getRoom(started.code!))!;
    const again = structuredClone(room.gameState!) as GameState;
    again.winnerId = started.playerId;
    expect(await recordFinishedMatch(store, room, again, new Map(), DAY_1)).toEqual([]);
    expect((await getLeagueStandings(store, KEY_A, DAY_1)).me?.games).toBe(1);
  });

  it("ordena o ranking pelo menor score, marca o jogador e não expõe a chave", async () => {
    const storage = memoryStorage();
    const store = new MemoryCompetitionStore();
    await finishDaily(storage, store, KEY_A, "Ana", DAY_1, 9);
    const { rewards } = await finishDaily(storage, store, KEY_B, "Bia", DAY_1, 2);

    expect(rewards[0]!.reward.daily).toEqual({ rank: 1, total: 2, streak: 1 });

    const status = await getDailyStatus(store, KEY_A, DAY_1);
    expect(status.top.map((r) => r.name)).toEqual(["Bia", "Ana"]);
    expect(status.top[1]!.isMe).toBe(true);
    expect(status.result?.rank).toBe(2);
    expect(JSON.stringify(status)).not.toContain(KEY_B);
    expect(JSON.stringify(await getLeagueStandings(store, KEY_A, DAY_1))).not.toContain(KEY_B);
  });

  it("acumula streak em dias seguidos", async () => {
    const storage = memoryStorage();
    const store = new MemoryCompetitionStore();
    await finishDaily(storage, store, KEY_A, "Ana", DAY_1, 3);
    const { rewards } = await finishDaily(storage, store, KEY_A, "Ana", DAY_2, 3);
    expect(rewards[0]!.reward.daily?.streak).toBe(2);
  });

  it("permite retomar só ao dono e reconstrói os bots a partir do estado", async () => {
    const storage = memoryStorage();
    const store = new MemoryCompetitionStore();
    const { code, playerId } = await startDailyChallenge(storage, store, { playerKey: KEY_A, playerName: "Ana" }, DAY_1);
    const session = createEmptySession();
    const { sent, messenger } = capturingMessenger();

    const replies: any[] = [];
    await handleJoinMessage(storage, session, messenger, { code: code!, playerId: "intruso", name: "X" }, () => {}, (m) => replies.push(m), () => {});
    expect(replies[0].type).toBe("error");

    replies.length = 0;
    await handleJoinMessage(storage, session, messenger, { code: code!, playerId: playerId!, name: "Ana" }, () => {}, (m) => replies.push(m), () => {});
    expect(replies[0].type).toBe("game_state");
    expect(replies[0].state.seed).toBeUndefined();

    // Passa a vez para um bot sem nenhum BotPlayer na sessão
    const room = (await storage.getRoom(code!))!;
    const state = structuredClone(room.gameState!) as GameState;
    state.currentPlayerIndex = 1;
    await storage.updateGameState(code!, state);
    await executeBotTurn(storage, session, messenger, code!, () => {}, store);
    expect(sent.some((s) => s.msg.type === "game_state")).toBe(true);
    expect(((await storage.getRoom(code!))!.gameState as GameState).logs.length).toBeGreaterThan(state.logs.length);
  });

  it("não deixa bot continuar jogando depois do fim da partida", async () => {
    const storage = memoryStorage();
    const store = new MemoryCompetitionStore();
    const { code } = await startDailyChallenge(storage, store, { playerKey: KEY_A, playerName: "Ana" }, DAY_1);
    const state = structuredClone((await storage.getRoom(code!))!.gameState!) as GameState;
    state.currentPlayerIndex = 1;
    state.winnerId = state.players[1]!.id;
    await storage.updateGameState(code!, state);

    let scheduled = 0;
    const { messenger } = capturingMessenger();
    await executeBotTurn(storage, createEmptySession(), messenger, code!, () => { scheduled++; }, store);
    expect(scheduled).toBe(0);
  });
});

describe("seed das partidas", () => {
  it("bots tomam a mesma decisão no mesmo estado com seed", () => {
    const players = ["a", "b"].map((id) => ({ id, name: id, isBot: true, isConnected: true, hand: [], score: 0, knownCards: {} }));
    const state = GameLogic.createInitialState(players, { seed: "s" });
    const decide = () => new BotPlayer("b", "medium", "b").decideTurn(state, 1);
    const first = decide();
    for (let i = 0; i < 20; i++) expect(decide()).toEqual(first);
  });

  it("nunca envia a seed ao cliente", () => {
    const state = GameLogic.createInitialState(
      [{ id: "a", name: "a", isBot: false, isConnected: true, hand: [], score: 0, knownCards: {} }],
      { seed: "s", dailyDay: "2026-11-02" },
    );
    const filtered = filterGameStateForPlayer(state, "a");
    expect(filtered.seed).toBeUndefined();
    expect(filtered.dailyDay).toBe("2026-11-02");
  });
});

describe("liga em partidas online", () => {
  const roomFor = (code: string) => ({ code, gameMode: "multiplayer" }) as Room;
  const finished = (): GameState =>
    ({
      winnerId: "p1",
      players: [
        { id: "p1", name: "Ana", isBot: false, score: 1 },
        { id: "p2", name: "Bia", isBot: false, score: 9 },
        { id: "bot", name: "Bot", isBot: true, score: 5 },
      ],
    }) as GameState;
  const keys = new Map([["p1", KEY_A], ["p2", KEY_B]]);

  it("pontua humanos e ignora bots", async () => {
    const store = new MemoryCompetitionStore();
    const rewards = await recordFinishedMatch(store, roomFor("AAAA"), finished(), keys, DAY_1);
    expect(rewards).toEqual([
      { playerId: "p1", reward: { points: 10 } },
      { playerId: "p2", reward: { points: 3 } },
    ]);
  });

  it("não pontua sem dois humanos identificados", async () => {
    const store = new MemoryCompetitionStore();
    const rewards = await recordFinishedMatch(store, roomFor("AAAA"), finished(), new Map([["p1", KEY_A]]), DAY_1);
    expect(rewards).toEqual([]);
  });

  it("zera os pontos depois do limite diário", async () => {
    const store = new MemoryCompetitionStore();
    for (let i = 0; i < 5; i++) {
      await recordFinishedMatch(store, roomFor(`R${i}`), finished(), keys, DAY_1);
    }
    const sixth = await recordFinishedMatch(store, roomFor("R6"), finished(), keys, DAY_1);
    expect(sixth[0]!.reward.points).toBe(0);
    expect((await getLeagueStandings(store, KEY_A, DAY_1)).me?.points).toBe(50);
  });
});

describe("emotes", () => {
  it("só repassa emotes conhecidos e respeita o cooldown", () => {
    const session = createEmptySession();
    const { sent, messenger } = capturingMessenger();

    handleEmote(session, messenger, "p1", "<script>", 10_000);
    expect(sent).toHaveLength(0);

    handleEmote(session, messenger, "p1", "fire", 10_000);
    handleEmote(session, messenger, "p1", "fire", 10_500);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.msg).toEqual({ type: "emote", playerId: "p1", emoteId: "fire" });

    handleEmote(session, messenger, "p2", "clap", 10_500);
    handleEmote(session, messenger, "p1", "clap", 12_000);
    expect(sent).toHaveLength(3);
  });
});
