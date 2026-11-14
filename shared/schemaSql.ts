import { sql, type SQL } from "drizzle-orm";

/** Tabela das salas; o servidor Node e o Worker criam igual. */
export const CREATE_ROOMS_TABLE: SQL = sql`
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
`;

/**
 * Criação e migrações das tabelas do ranking, na ordem em que devem rodar.
 * Usado pelo servidor Node e pelo Worker, que não têm migrações do drizzle-kit em produção.
 */
export const RANK_SCHEMA_STATEMENTS: readonly SQL[] = [
  sql`
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
  `,
  sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS frame_id TEXT NOT NULL DEFAULT 'none'`,
  sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS title_id TEXT NOT NULL DEFAULT 'none'`,
  sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS banner_id TEXT NOT NULL DEFAULT 'default'`,
  sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS progress JSONB NOT NULL DEFAULT '{}'::jsonb`,
  sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS achievements JSONB NOT NULL DEFAULT '[]'::jsonb`,
  sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS email TEXT`,
  sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS password_hash TEXT`,
  sql`ALTER TABLE rank_players ADD COLUMN IF NOT EXISTS password_salt TEXT`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS rank_players_email_key ON rank_players (email)`,
  // Contas novas escolhem o nome depois e não têm PIN
  sql`ALTER TABLE rank_players ALTER COLUMN nickname DROP NOT NULL`,
  sql`ALTER TABLE rank_players ALTER COLUMN pin_hash DROP NOT NULL`,
  sql`ALTER TABLE rank_players ALTER COLUMN pin_salt DROP NOT NULL`,
  sql`
    CREATE TABLE IF NOT EXISTS rank_sessions (
      token_hash TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `,
];

/** Roda as instruções em sequência (cada uma depende da anterior). */
export async function applyRankSchema(db: { execute: (query: SQL) => Promise<unknown> }): Promise<void> {
  for (const statement of RANK_SCHEMA_STATEMENTS) {
    await db.execute(statement);
  }
}
