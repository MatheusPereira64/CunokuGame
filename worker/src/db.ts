import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../shared/schema";
import { applyRankSchema, CREATE_ROOMS_TABLE } from "../../shared/schemaSql";
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
  await db.execute(CREATE_ROOMS_TABLE);
  await applyRankSchema(db);
  schemaReady = true;
}
