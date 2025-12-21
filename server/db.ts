import * as schema from "@shared/schema";

// Only require DATABASE_URL in production
// In development, we use MemoryStorage instead
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set in production. Did you forget to provision a database?",
  );
}

// Detect if DATABASE_URL is for Neon (contains 'neon.tech') or standard PostgreSQL
// Railway, Render, and other providers use standard PostgreSQL connection strings
// Force standard PostgreSQL for Railway (contains 'railway' or 'postgres.railway')
const dbUrl = process.env.DATABASE_URL || '';
const isNeonDatabase = dbUrl.includes('neon.tech') && !dbUrl.includes('railway');
const isRailway = dbUrl.includes('railway') || dbUrl.includes('postgres.railway');

console.log("Database URL detected:", {
  hasUrl: !!process.env.DATABASE_URL,
  urlPreview: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 50)}...` : 'none',
  isNeon: isNeonDatabase,
  isRailway: isRailway,
  willUseNeon: isNeonDatabase && !isRailway,
  willUsePg: !isNeonDatabase || isRailway,
  nodeEnv: process.env.NODE_ENV
});

let pool: any = null;
let db: any = null;
let initPromise: Promise<void> | null = null;

// Initialize database connection (lazy initialization)
async function initDatabase() {
  if (initPromise) return initPromise;
  
  if (!process.env.DATABASE_URL) {
    return Promise.resolve();
  }
  
  initPromise = (async () => {
    try {
      console.log("Initializing database connection...", { 
        isNeonDatabase, 
        isRailway,
        willUseNeon: isNeonDatabase && !isRailway,
        willUsePg: !isNeonDatabase || isRailway,
        hasUrl: !!process.env.DATABASE_URL 
      });
      
      // Always use pg for Railway, even if URL looks like Neon
      if (isNeonDatabase && !isRailway) {
        // Use Neon serverless driver
        console.log("Loading Neon Database driver...");
        const { Pool: NeonPool, neonConfig } = await import('@neondatabase/serverless');
        const ws = await import("ws");
        neonConfig.webSocketConstructor = ws.default;
        pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
        const { drizzle: neonDrizzle } = await import('drizzle-orm/neon-serverless');
        db = neonDrizzle({ client: pool, schema });
        console.log("✓ Using Neon Database (serverless)");
      } else {
        // Use standard PostgreSQL driver (for Railway, Render, etc.)
        console.log("Loading standard PostgreSQL driver (pg)...");
        const { Pool: PgPool } = await import('pg');
        pool = new PgPool({ connectionString: process.env.DATABASE_URL });
        const { drizzle: pgDrizzle } = await import('drizzle-orm/node-postgres');
        db = pgDrizzle({ client: pool, schema });
        console.log("✓ Using standard PostgreSQL (pg driver)");
      }
    } catch (err: any) {
      console.error("✗ Error initializing database connection:", err.message);
      console.error("Error stack:", err.stack);
      console.error("Error details:", {
        name: err.name,
        code: err.code,
        isNeon: isNeonDatabase,
        urlPreview: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 50)}...` : 'none'
      });
      throw new Error(`Failed to initialize database: ${err.message}`);
    }
  })();
  
  return initPromise;
}

// Initialize on first access
export async function getDb() {
  await initDatabase();
  return db;
}

export async function getPool() {
  await initDatabase();
  return pool;
}

// For backward compatibility, export sync versions (will be null until initialized)
export { pool, db };
