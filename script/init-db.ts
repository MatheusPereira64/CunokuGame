import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";
import * as schema from "../shared/schema";

async function initDatabase() {
  if (!db || !pool) {
    console.log("DATABASE_URL not set, skipping database initialization");
    return;
  }

  try {
    console.log("Initializing database...");
    
    // Check if rooms table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rooms'
      );
    `);
    
    const tableExists = (tableCheck.rows[0] as any)?.exists;
    
    if (!tableExists) {
      console.log("Creating rooms table...");
      
      // Create rooms table
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
        );
      `);
      
      console.log("Database initialized successfully!");
    } else {
      console.log("Database tables already exist, skipping initialization.");
    }
  } catch (err: any) {
    console.error("Error initializing database:", err);
    throw err;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

initDatabase()
  .then(() => {
    console.log("Database initialization complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });

