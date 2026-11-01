import { and, eq, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import {
  dailyEntries,
  matchResults,
  type DailyEntry,
  type InsertMatchResult,
  type MatchResult,
} from "@shared/schema";

export type NewDailyEntry = Pick<DailyEntry, "day" | "playerKey" | "roomCode" | "playerId">;
export type PlayerResultFilter = { kind?: string; day?: string };

export interface CompetitionStore {
  getDailyEntry(day: string, playerKey: string): Promise<DailyEntry | undefined>;
  getDailyEntryByRoom(roomCode: string): Promise<DailyEntry | undefined>;
  /** Em corrida entre requisições, devolve a entrada que ficou gravada. */
  createDailyEntry(entry: NewDailyEntry): Promise<DailyEntry>;
  /** Ignora resultados já gravados para a mesma sala e jogador; devolve só os novos. */
  insertMatchResults(rows: InsertMatchResult[]): Promise<MatchResult[]>;
  getResultsForDay(day: string, kind: string): Promise<MatchResult[]>;
  getResultsForWeek(week: string): Promise<MatchResult[]>;
  getPlayerResults(playerKey: string, filter?: PlayerResultFilter): Promise<MatchResult[]>;
}

export type CompetitionDb = PgDatabase<any, any, any>;

let schemaReady: Promise<void> | null = null;

/** Cria as tabelas sob demanda, como o Worker já faz com `rooms`. */
function ensureCompetitionSchema(db: CompetitionDb): Promise<void> {
  schemaReady ??= (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS daily_entries (
        day TEXT NOT NULL,
        player_key TEXT NOT NULL,
        room_code TEXT NOT NULL,
        player_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (day, player_key)
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS daily_entries_room_idx ON daily_entries (room_code)`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS match_results (
        id SERIAL PRIMARY KEY,
        player_key TEXT NOT NULL,
        display_name TEXT NOT NULL,
        kind TEXT NOT NULL,
        day TEXT NOT NULL,
        week TEXT NOT NULL,
        room_code TEXT NOT NULL,
        won BOOLEAN NOT NULL,
        score INTEGER NOT NULL,
        points INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS match_results_room_player_idx ON match_results (room_code, player_key)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS match_results_day_idx ON match_results (day)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS match_results_week_idx ON match_results (week)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS match_results_player_idx ON match_results (player_key)`);
  })().catch((err) => {
    schemaReady = null;
    throw err;
  });
  return schemaReady;
}

export class DrizzleCompetitionStore implements CompetitionStore {
  constructor(private resolveDb: () => Promise<CompetitionDb | null> | CompetitionDb | null) {}

  private async db(): Promise<CompetitionDb> {
    const db = await this.resolveDb();
    if (!db) throw new Error("Database not initialized");
    await ensureCompetitionSchema(db);
    return db;
  }

  async getDailyEntry(day: string, playerKey: string): Promise<DailyEntry | undefined> {
    const db = await this.db();
    const [entry] = await db
      .select()
      .from(dailyEntries)
      .where(and(eq(dailyEntries.day, day), eq(dailyEntries.playerKey, playerKey)));
    return entry;
  }

  async getDailyEntryByRoom(roomCode: string): Promise<DailyEntry | undefined> {
    const db = await this.db();
    const [entry] = await db.select().from(dailyEntries).where(eq(dailyEntries.roomCode, roomCode));
    return entry;
  }

  async createDailyEntry(entry: NewDailyEntry): Promise<DailyEntry> {
    const db = await this.db();
    const [created] = await db.insert(dailyEntries).values(entry).onConflictDoNothing().returning();
    if (created) return created;
    const existing = await this.getDailyEntry(entry.day, entry.playerKey);
    if (!existing) throw new Error("Daily entry conflict without existing row");
    return existing;
  }

  async insertMatchResults(rows: InsertMatchResult[]): Promise<MatchResult[]> {
    if (rows.length === 0) return [];
    const db = await this.db();
    return await db.insert(matchResults).values(rows).onConflictDoNothing().returning();
  }

  async getResultsForDay(day: string, kind: string): Promise<MatchResult[]> {
    const db = await this.db();
    return await db
      .select()
      .from(matchResults)
      .where(and(eq(matchResults.day, day), eq(matchResults.kind, kind)));
  }

  async getResultsForWeek(week: string): Promise<MatchResult[]> {
    const db = await this.db();
    return await db.select().from(matchResults).where(eq(matchResults.week, week));
  }

  async getPlayerResults(playerKey: string, filter: PlayerResultFilter = {}): Promise<MatchResult[]> {
    const db = await this.db();
    return await db
      .select()
      .from(matchResults)
      .where(
        and(
          eq(matchResults.playerKey, playerKey),
          filter.kind ? eq(matchResults.kind, filter.kind) : undefined,
          filter.day ? eq(matchResults.day, filter.day) : undefined,
        ),
      );
  }
}

/** Ranking em memória para LAN/dev sem banco. */
export class MemoryCompetitionStore implements CompetitionStore {
  private entries: DailyEntry[] = [];
  private results: MatchResult[] = [];

  async getDailyEntry(day: string, playerKey: string): Promise<DailyEntry | undefined> {
    return this.entries.find((e) => e.day === day && e.playerKey === playerKey);
  }

  async getDailyEntryByRoom(roomCode: string): Promise<DailyEntry | undefined> {
    return this.entries.find((e) => e.roomCode === roomCode);
  }

  async createDailyEntry(entry: NewDailyEntry): Promise<DailyEntry> {
    const existing = await this.getDailyEntry(entry.day, entry.playerKey);
    if (existing) return existing;
    const created: DailyEntry = { ...entry, createdAt: new Date() };
    this.entries.push(created);
    return created;
  }

  async insertMatchResults(rows: InsertMatchResult[]): Promise<MatchResult[]> {
    const inserted: MatchResult[] = [];
    for (const row of rows) {
      const duplicate = this.results.some(
        (r) => r.roomCode === row.roomCode && r.playerKey === row.playerKey,
      );
      if (duplicate) continue;
      const created: MatchResult = {
        ...row,
        id: this.results.length + 1,
        createdAt: row.createdAt ?? new Date(),
      };
      this.results.push(created);
      inserted.push(created);
    }
    return inserted;
  }

  async getResultsForDay(day: string, kind: string): Promise<MatchResult[]> {
    return this.results.filter((r) => r.day === day && r.kind === kind);
  }

  async getResultsForWeek(week: string): Promise<MatchResult[]> {
    return this.results.filter((r) => r.week === week);
  }

  async getPlayerResults(playerKey: string, filter: PlayerResultFilter = {}): Promise<MatchResult[]> {
    return this.results.filter(
      (r) =>
        r.playerKey === playerKey &&
        (!filter.kind || r.kind === filter.kind) &&
        (!filter.day || r.day === filter.day),
    );
  }
}
