import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../../shared/schema";
import type { Env } from "./env";

export type WorkerDb = PostgresJsDatabase<typeof schema>;

let schemaReady = false;

export function getConnectionString(env: Env): string | null {
  if (env.HYPERDRIVE?.connectionString) return env.HYPERDRIVE.connectionString;
  if (env.DATABASE_URL) return env.DATABASE_URL;
  return null;
}

export function createDb(env: Env): WorkerDb | null {
  const connectionString = getConnectionString(env);
  if (!connectionString) return null;
  const client = postgres(connectionString, { max: 5, prepare: false });
  return drizzle(client, { schema });
}

export async function ensureSchema(db: WorkerDb): Promise<void> {
  if (schemaReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      host_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      game_mode TEXT NOT NULL DEFAULT 'multiplayer',
      bot_difficulty TEXT DEFAULT 'medium',
      max_players INTEGER DEFAULT 4,
      bot_count INTEGER DEFAULT 0,
      game_state JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
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
  await db.execute(sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS frame_id TEXT NOT NULL DEFAULT 'none'`);
  await db.execute(sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS title_id TEXT NOT NULL DEFAULT 'none'`);
  await db.execute(sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS banner_id TEXT NOT NULL DEFAULT 'default'`);
  await db.execute(sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS progress JSONB NOT NULL DEFAULT '{}'::jsonb`);
  await db.execute(sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS achievements JSONB NOT NULL DEFAULT '[]'::jsonb`);
  schemaReady = true;
}
