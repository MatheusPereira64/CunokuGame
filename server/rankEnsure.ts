import { sql } from "drizzle-orm";
import { getDb } from "./db";

let ready = false;

export async function ensureRankSchema(): Promise<any | null> {
  const database = await getDb();
  if (!database) return null;
  if (!ready) {
    await database.execute(sql`
      CREATE TABLE IF NOT EXISTS rank_players (
        id TEXT PRIMARY KEY,
        nickname TEXT NOT NULL UNIQUE,
        pin_hash TEXT NOT NULL,
        pin_salt TEXT NOT NULL,
        display_name TEXT NOT NULL DEFAULT '',
        icon_id TEXT NOT NULL DEFAULT 'spade',
        accent TEXT NOT NULL DEFAULT 'indigo',
        wins INTEGER NOT NULL DEFAULT 0,
        games_played INTEGER NOT NULL DEFAULT 0,
        best_score INTEGER,
        auth_token_hash TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await database.execute(sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS frame_id TEXT NOT NULL DEFAULT 'none'`);
    await database.execute(sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS title_id TEXT NOT NULL DEFAULT 'none'`);
    await database.execute(sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS banner_id TEXT NOT NULL DEFAULT 'default'`);
    await database.execute(sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS progress JSONB NOT NULL DEFAULT '{}'::jsonb`);
    await database.execute(sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS achievements JSONB NOT NULL DEFAULT '[]'::jsonb`);
    ready = true;
  }
  return database;
}
