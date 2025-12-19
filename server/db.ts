import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Only require DATABASE_URL in production
// In development, we use MemoryStorage instead
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set in production. Did you forget to provision a database?",
  );
}

// Only create pool and db if DATABASE_URL is set
export const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;
export const db = pool ? drizzle({ client: pool, schema }) : null;
