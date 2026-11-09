import { and, eq, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import {
  dailyEntries,
  matchResults,
  type DailyEntry,
  type InsertMatchResult,
  type MatchResult,
} from "@shared/schema";
import { rankFromWins, type RankTier } from "@shared/rank";
import { getPlayerByToken, getRankSummaries } from "@shared/rankService";

export type NewDailyEntry = Pick<DailyEntry, "day" | "rankPlayerId" | "roomCode" | "playerId">;
export type PlayerResultFilter = { kind?: string; day?: string };
export type RankAccount = { id: string; displayName: string };
export type RankSummary = { displayName: string; rank: RankTier };

export interface CompetitionStore {
  /** Conta do ranking dona do token; é a única identidade aceita no desafio e na liga. */
  getAccountByToken(token: string): Promise<RankAccount | null>;
  getAccountSummaries(ids: string[]): Promise<Map<string, RankSummary>>;
  getDailyEntry(day: string, rankPlayerId: string): Promise<DailyEntry | undefined>;
  getDailyEntryByRoom(roomCode: string): Promise<DailyEntry | undefined>;
  /** Em corrida entre requisições, devolve a entrada que ficou gravada. */
  createDailyEntry(entry: NewDailyEntry): Promise<DailyEntry>;
  /** Ignora resultados já gravados para a mesma sala e jogador; devolve só os novos. */
  insertMatchResults(rows: InsertMatchResult[]): Promise<MatchResult[]>;
  getResultsForDay(day: string, kind: string): Promise<MatchResult[]>;
  getResultsForWeek(week: string): Promise<MatchResult[]>;
  getPlayerResults(rankPlayerId: string, filter?: PlayerResultFilter): Promise<MatchResult[]>;
}

export type CompetitionDb = PgDatabase<any, any, any>;

let schemaReady: Promise<void> | null = null;

/** Cria as tabelas sob demanda, como o Worker já faz com `rooms`. */
function ensureCompetitionSchema(db: CompetitionDb): Promise<void> {
  schemaReady ??= (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS daily_entries (
        day TEXT NOT NULL,
        rank_player_id TEXT NOT NULL,
        room_code TEXT NOT NULL,
        player_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (day, rank_player_id)
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS daily_entries_room_idx ON daily_entries (room_code)`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS match_results (
        id SERIAL PRIMARY KEY,
        rank_player_id TEXT NOT NULL,
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
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS match_results_room_player_idx ON match_results (room_code, rank_player_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS match_results_day_idx ON match_results (day)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS match_results_week_idx ON match_results (week)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS match_results_player_idx ON match_results (rank_player_id)`);
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

  async getAccountByToken(token: string): Promise<RankAccount | null> {
    const row = await getPlayerByToken(await this.db(), token);
    return row ? { id: row.id, displayName: row.displayName || row.nickname || "" } : null;
  }

  async getAccountSummaries(ids: string[]): Promise<Map<string, RankSummary>> {
    return getRankSummaries(await this.db(), ids);
  }

  async getDailyEntry(day: string, rankPlayerId: string): Promise<DailyEntry | undefined> {
    const db = await this.db();
    const [entry] = await db
      .select()
      .from(dailyEntries)
      .where(and(eq(dailyEntries.day, day), eq(dailyEntries.rankPlayerId, rankPlayerId)));
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
    const existing = await this.getDailyEntry(entry.day, entry.rankPlayerId);
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

  async getPlayerResults(rankPlayerId: string, filter: PlayerResultFilter = {}): Promise<MatchResult[]> {
    const db = await this.db();
    return await db
      .select()
      .from(matchResults)
      .where(
        and(
          eq(matchResults.rankPlayerId, rankPlayerId),
          filter.kind ? eq(matchResults.kind, filter.kind) : undefined,
          filter.day ? eq(matchResults.day, filter.day) : undefined,
        ),
      );
  }
}

/** Em memória para LAN/dev sem banco, onde não há contas: serve só de leitura vazia e aos testes. */
export class MemoryCompetitionStore implements CompetitionStore {
  private entries: DailyEntry[] = [];
  private results: MatchResult[] = [];
  private accounts = new Map<string, RankAccount>();

  addAccount(token: string, account: RankAccount): void {
    this.accounts.set(token, account);
  }

  async getAccountByToken(token: string): Promise<RankAccount | null> {
    return this.accounts.get(token) ?? null;
  }

  async getAccountSummaries(ids: string[]): Promise<Map<string, RankSummary>> {
    const summaries = new Map<string, RankSummary>();
    for (const account of Array.from(this.accounts.values())) {
      if (ids.includes(account.id)) {
        summaries.set(account.id, { displayName: account.displayName, rank: rankFromWins(0) });
      }
    }
    return summaries;
  }

  async getDailyEntry(day: string, rankPlayerId: string): Promise<DailyEntry | undefined> {
    return this.entries.find((e) => e.day === day && e.rankPlayerId === rankPlayerId);
  }

  async getDailyEntryByRoom(roomCode: string): Promise<DailyEntry | undefined> {
    return this.entries.find((e) => e.roomCode === roomCode);
  }

  async createDailyEntry(entry: NewDailyEntry): Promise<DailyEntry> {
    const existing = await this.getDailyEntry(entry.day, entry.rankPlayerId);
    if (existing) return existing;
    const created: DailyEntry = { ...entry, createdAt: new Date() };
    this.entries.push(created);
    return created;
  }

  async insertMatchResults(rows: InsertMatchResult[]): Promise<MatchResult[]> {
    const inserted: MatchResult[] = [];
    for (const row of rows) {
      const duplicate = this.results.some(
        (r) => r.roomCode === row.roomCode && r.rankPlayerId === row.rankPlayerId,
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

  async getPlayerResults(rankPlayerId: string, filter: PlayerResultFilter = {}): Promise<MatchResult[]> {
    return this.results.filter(
      (r) =>
        r.rankPlayerId === rankPlayerId &&
        (!filter.kind || r.kind === filter.kind) &&
        (!filter.day || r.day === filter.day),
    );
  }
}
