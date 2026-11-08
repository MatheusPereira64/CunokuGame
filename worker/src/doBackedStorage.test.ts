import { describe, expect, it } from "vitest";
import type { GameState, Room } from "../../shared/schema";
import type { IStorage } from "../../server/storage";
import { DoBackedStorage, LatestStateWriter } from "./doBackedStorage";

const state = (round: number) => ({ round }) as GameState;
const room = (gameState: GameState | null, status = "playing") => ({ id: 1, code: "ABCD", hostId: "h", status, gameState }) as Room;

function setup() {
  let cached: Room | undefined = room(state(1));
  const writes: number[] = [];
  const releases: (() => void)[] = [];
  const kept: Promise<unknown>[] = [];
  const inner = {
    updateGameState: (_code: string, s: GameState) =>
      new Promise<Room>((resolve) => releases.push(() => (writes.push(s.round), resolve(room(s))))),
    updateRoomStatus: async (_code: string, status: string) => room(state(0), status),
    getRoom: async () => room(state(0)),
  } as unknown as IStorage;
  const writer = new LatestStateWriter((code, s) => inner.updateGameState(code, s), (w) => kept.push(w));
  const storage = new DoBackedStorage(inner, { get: async () => cached, put: async (r) => void (cached = r) }, writer);
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const flush = async () => {
    await tick();
    while (releases.length) {
      releases.shift()!();
      await tick();
      await tick();
    }
    await Promise.all(kept);
  };
  return { storage, writes, flush, cached: () => cached };
}

describe("DoBackedStorage", () => {
  it("devolve a jogada sem esperar o Postgres", async () => {
    const { storage, writes } = setup();
    const saved = await storage.updateGameState("ABCD", state(2));
    expect(saved.gameState).toEqual(state(2));
    expect((await storage.getRoom("ABCD"))?.gameState).toEqual(state(2));
    expect(writes).toEqual([]);
  });

  it("grava no Postgres em segundo plano, juntando jogadas seguidas na mais nova", async () => {
    const { storage, writes, flush } = setup();
    await storage.updateGameState("ABCD", state(2));
    await storage.updateGameState("ABCD", state(3));
    await storage.updateGameState("ABCD", state(4));
    await flush();
    expect(writes).toEqual([2, 4]);
  });

  it("mudar o status não troca a partida em cache pela cópia atrasada do banco", async () => {
    const { storage, cached } = setup();
    await storage.updateGameState("ABCD", state(7));
    await storage.updateRoomStatus("ABCD", "finished");
    expect(cached()?.status).toBe("finished");
    expect(cached()?.gameState).toEqual(state(7));
  });
});
