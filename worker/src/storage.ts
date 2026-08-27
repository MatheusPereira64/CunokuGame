import { eq, sql } from "drizzle-orm";
import { rooms, type Room, type InsertRoom, type GameState } from "../../shared/schema";
import type { IStorage } from "../../server/storage";
import { createDb, ensureSchema, type WorkerDb } from "./db";
import type { Env } from "./env";

export class WorkerDatabaseStorage implements IStorage {
  constructor(private db: WorkerDb) {}

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    await ensureSchema(this.db);
    const insertData = {
      ...insertRoom,
      gameState: (insertRoom as { gameState?: GameState | null }).gameState ?? null,
    };
    const [room] = await this.db.insert(rooms).values(insertData).returning();
    return room;
  }

  async getRoom(code: string): Promise<Room | undefined> {
    await ensureSchema(this.db);
    const [room] = await this.db.select().from(rooms).where(eq(rooms.code, code));
    return room;
  }

  async listRooms(): Promise<Room[]> {
    await ensureSchema(this.db);
    return await this.db.select().from(rooms);
  }

  async updateGameState(code: string, state: GameState): Promise<Room> {
    await ensureSchema(this.db);
    const [room] = await this.db
      .update(rooms)
      .set({ gameState: state })
      .where(eq(rooms.code, code))
      .returning();
    return room;
  }

  async updateRoomStatus(code: string, status: string): Promise<Room> {
    await ensureSchema(this.db);
    const [room] = await this.db
      .update(rooms)
      .set({ status })
      .where(eq(rooms.code, code))
      .returning();
    return room;
  }
}

/** Storage em memória para `wrangler dev` sem DATABASE_URL/Hyperdrive. */
export class WorkerMemoryStorage implements IStorage {
  private static rooms = new Map<string, Room>();

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const room: Room = {
      id: WorkerMemoryStorage.rooms.size + 1,
      ...insertRoom,
      createdAt: new Date(),
    } as Room;
    WorkerMemoryStorage.rooms.set(insertRoom.code, room);
    return room;
  }

  async getRoom(code: string): Promise<Room | undefined> {
    return WorkerMemoryStorage.rooms.get(code);
  }

  async listRooms(): Promise<Room[]> {
    return Array.from(WorkerMemoryStorage.rooms.values());
  }

  async updateGameState(code: string, state: GameState): Promise<Room> {
    const room = WorkerMemoryStorage.rooms.get(code);
    if (!room) throw new Error(`Room ${code} not found`);
    const updated = { ...room, gameState: state };
    WorkerMemoryStorage.rooms.set(code, updated);
    return updated;
  }

  async updateRoomStatus(code: string, status: string): Promise<Room> {
    const room = WorkerMemoryStorage.rooms.get(code);
    if (!room) throw new Error(`Room ${code} not found`);
    const updated = { ...room, status };
    WorkerMemoryStorage.rooms.set(code, updated);
    return updated;
  }
}

export function createStorage(env: Env): IStorage {
  const db = createDb(env);
  if (db) return new WorkerDatabaseStorage(db);
  return new WorkerMemoryStorage();
}

/** Ping leve para warm-up / health. */
export async function pingDb(env: Env): Promise<boolean> {
  const db = createDb(env);
  if (!db) return false;
  await ensureSchema(db);
  await db.execute(sql`SELECT 1`);
  return true;
}
