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
  // Cada gravação cria um cliente; sem idle_timeout a conexão ficava aberta até o Neon recusar novas
  const client = postgres(connectionString, { max: 1, idle_timeout: 5, connect_timeout: 10, prepare: false });
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
  await db.execute(sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS email TEXT`);
  await db.execute(sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS password_hash TEXT`);
  await db.execute(sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS password_salt TEXT`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS rank_players_email_key ON rank_players (email)`);
  // Contas novas escolhem o nome depois e não têm PIN
  await db.execute(sql`ALTER TABLE rank_players ALTER COLUMN nickname DROP NOT NULL`);
  await db.execute(sql`ALTER TABLE rank_players ALTER COLUMN pin_hash DROP NOT NULL`);
  await db.execute(sql`ALTER TABLE rank_players ALTER COLUMN pin_salt DROP NOT NULL`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS rank_sessions (
      token_hash TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  schemaReady = true;
}
