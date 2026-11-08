import type { GameState, Room } from "../../shared/schema";
import type { IStorage } from "../../server/storage";

/** O armazenamento do Durable Object, separado do runtime para dar para testar. */
export interface RoomCache {
  get(): Promise<Room | undefined>;
  put(room: Room): Promise<void>;
}

/**
 * Grava a partida no Postgres em segundo plano, sempre a versão mais nova.
 * Várias jogadas seguidas viram uma gravação só: o banco é cópia, não a fonte da partida.
 */
export class LatestStateWriter {
  private pending = new Map<string, GameState>();
  private running = false;

  constructor(
    private write: (code: string, state: GameState) => Promise<unknown>,
    /** Mantém o objeto vivo até a gravação terminar */
    private keepAlive: (work: Promise<unknown>) => void,
  ) {}

  push(code: string, state: GameState): void {
    this.pending.set(code, state);
    this.kick();
  }

  private kick(): void {
    if (this.running || this.pending.size === 0) return;
    this.running = true;
    const work = this.drain().finally(() => {
      this.running = false;
      this.kick();
    });
    this.keepAlive(work);
  }

  private async drain(): Promise<void> {
    while (this.pending.size > 0) {
      const [code, state] = this.pending.entries().next().value as [string, GameState];
      this.pending.delete(code);
      try {
        await this.write(code, state);
      } catch (e) {
        console.error("Room backup write failed", e);
      }
    }
  }
}

/**
 * A partida vive no armazenamento do Durable Object: rápido e serializado pelo runtime.
 * Esperar o Postgres a cada jogada atrasava todos e abria brecha para eventos se cruzarem.
 */
export class DoBackedStorage implements IStorage {
  constructor(
    private inner: IStorage,
    private cache: RoomCache,
    private writer: LatestStateWriter,
  ) {}

  async createRoom(room: Parameters<IStorage["createRoom"]>[0]): Promise<Room> {
    const created = await this.inner.createRoom(room);
    await this.cache.put(created);
    return created;
  }

  async getRoom(code: string): Promise<Room | undefined> {
    const cached = await this.cache.get();
    if (cached && cached.code === code) return cached;
    const room = await this.inner.getRoom(code);
    if (room) await this.cache.put(room);
    return room;
  }

  async listRooms(): Promise<Room[]> {
    return this.inner.listRooms();
  }

  async updateGameState(code: string, state: GameState): Promise<Room> {
    const current = await this.getRoom(code);
    if (!current) return this.inner.updateGameState(code, state);
    const room = { ...current, gameState: state };
    await this.cache.put(room);
    this.writer.push(code, state);
    return room;
  }

  async updateRoomStatus(code: string, status: string): Promise<Room> {
    const saved = await this.inner.updateRoomStatus(code, status);
    // O Postgres pode estar atrás: a partida em cache é sempre a mais nova
    const current = await this.cache.get();
    const room = current?.code === code ? { ...saved, gameState: current.gameState } : saved;
    await this.cache.put(room);
    return room;
  }
}
