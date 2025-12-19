import { db } from "./db";
import { rooms, type Room, type InsertRoom, type GameState } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  createRoom(room: InsertRoom): Promise<Room>;
  getRoom(code: string): Promise<Room | undefined>;
  listRooms(): Promise<Room[]>;
  updateGameState(code: string, state: GameState): Promise<Room>;
  updateRoomStatus(code: string, status: string): Promise<Room>;
}

export class DatabaseStorage implements IStorage {
  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    if (!db) throw new Error("Database not initialized");
    const [room] = await db.insert(rooms).values(insertRoom).returning();
    return room;
  }

  async getRoom(code: string): Promise<Room | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [room] = await db.select().from(rooms).where(eq(rooms.code, code));
    return room;
  }

  async listRooms(): Promise<Room[]> {
    if (!db) throw new Error("Database not initialized");
    return await db.select().from(rooms);
  }

  async updateGameState(code: string, state: GameState): Promise<Room> {
    if (!db) throw new Error("Database not initialized");
    const [room] = await db
      .update(rooms)
      .set({ gameState: state })
      .where(eq(rooms.code, code))
      .returning();
    return room;
  }

  async updateRoomStatus(code: string, status: string): Promise<Room> {
    if (!db) throw new Error("Database not initialized");
    const [room] = await db
      .update(rooms)
      .set({ status })
      .where(eq(rooms.code, code))
      .returning();
    return room;
  }
}

// Memory storage for development when DATABASE_URL is not set
export class MemoryStorage implements IStorage {
  private rooms: Map<string, Room> = new Map();

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const room: Room = {
      id: this.rooms.size + 1,
      ...insertRoom,
      createdAt: new Date(),
    } as Room;
    this.rooms.set(insertRoom.code, room);
    return room;
  }

  async getRoom(code: string): Promise<Room | undefined> {
    return this.rooms.get(code);
  }

  async listRooms(): Promise<Room[]> {
    return Array.from(this.rooms.values());
  }

  async updateGameState(code: string, state: GameState): Promise<Room> {
    const room = this.rooms.get(code);
    if (!room) throw new Error(`Room ${code} not found`);
    const updated = { ...room, gameState: state };
    this.rooms.set(code, updated);
    return updated;
  }

  async updateRoomStatus(code: string, status: string): Promise<Room> {
    const room = this.rooms.get(code);
    if (!room) throw new Error(`Room ${code} not found`);
    const updated = { ...room, status };
    this.rooms.set(code, updated);
    return updated;
  }
}

// Use memory storage in development if DATABASE_URL is not set
export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemoryStorage();
