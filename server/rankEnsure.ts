import { applyRankSchema } from "@shared/schemaSql";
import { getDb } from "./db";

let ready = false;

export async function ensureRankSchema(): Promise<any | null> {
  const database = await getDb();
  if (!database) return null;
  if (!ready) {
    await applyRankSchema(database);
    ready = true;
  }
  return database;
}
