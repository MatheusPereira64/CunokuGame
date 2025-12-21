import { getDb } from "./db";
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
    const database = await getDb();
    if (!database) {
      console.error("Database not initialized - DATABASE_URL:", process.env.DATABASE_URL ? "SET" : "NOT SET");
      throw new Error("Database not initialized. Please check DATABASE_URL environment variable.");
    }
    try {
      console.log("DatabaseStorage.createRoom - Inserting room:", insertRoom.code);
      console.log("DatabaseStorage.createRoom - Full insert data:", JSON.stringify(insertRoom, null, 2));
      
      // Ensure gameState is explicitly set to null if not provided
      const insertData = {
        ...insertRoom,
        gameState: (insertRoom as any).gameState ?? null
      };
      
      const [room] = await database.insert(rooms).values(insertData).returning();
      console.log("DatabaseStorage.createRoom - Room created:", room.id);
      return room;
    } catch (err: any) {
      console.error("DatabaseStorage.createRoom - Full error object:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
      console.error("DatabaseStorage.createRoom - Error message:", err.message);
      console.error("DatabaseStorage.createRoom - Error code:", err.code);
      console.error("DatabaseStorage.createRoom - Error detail:", err.detail);
      console.error("DatabaseStorage.createRoom - Error constraint:", err.constraint);
      console.error("DatabaseStorage.createRoom - Insert data:", JSON.stringify(insertRoom));
      
      // Try to extract more information from the error
      let errorMessage = "Unknown error";
      if (err.message) {
        errorMessage = err.message;
      } else if (err.code) {
        errorMessage = `Database error code: ${err.code}`;
      } else if (err.detail) {
        errorMessage = err.detail;
      }
      
      // Add constraint information if available
      if (err.constraint) {
        errorMessage += ` (constraint: ${err.constraint})`;
      }
      
      throw new Error(`Failed to create room in database: ${errorMessage}`);
    }
  }

  async getRoom(code: string): Promise<Room | undefined> {
    const database = await getDb();
    if (!database) throw new Error("Database not initialized");
    const [room] = await database.select().from(rooms).where(eq(rooms.code, code));
    return room;
  }

  async listRooms(): Promise<Room[]> {
    const database = await getDb();
    if (!database) throw new Error("Database not initialized");
    return await database.select().from(rooms);
  }

  async updateGameState(code: string, state: GameState): Promise<Room> {
    const database = await getDb();
    if (!database) throw new Error("Database not initialized");
    const [room] = await database
      .update(rooms)
      .set({ gameState: state })
      .where(eq(rooms.code, code))
      .returning();
    return room;
  }

  async updateRoomStatus(code: string, status: string): Promise<Room> {
    const database = await getDb();
    if (!database) throw new Error("Database not initialized");
    const [room] = await database
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
