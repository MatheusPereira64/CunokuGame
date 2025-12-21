import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database tables if in production and DATABASE_URL is set
  if (process.env.NODE_ENV === "production" && process.env.DATABASE_URL) {
    try {
      const { db } = await import("./db");
      if (db) {
        // Check if rooms table exists, if not, create it
        const { sql } = await import("drizzle-orm");
        try {
          await db.execute(sql`SELECT 1 FROM rooms LIMIT 1`);
          log("Database tables verified");
        } catch (err: any) {
          // Table doesn't exist or has wrong structure, create/recreate it
          log("Creating database tables...");
          try {
            // Drop table if exists (only in case of structure mismatch)
            await db.execute(sql`DROP TABLE IF EXISTS rooms CASCADE;`);
          } catch (dropErr: any) {
            log(`Warning: Could not drop existing table: ${dropErr.message}`, "db-init");
          }
          
          // Create table with correct structure
          await db.execute(sql`
            CREATE TABLE rooms (
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
          log("Database tables created successfully");
          
          // Verify table was created
          try {
            await db.execute(sql`SELECT 1 FROM rooms LIMIT 1`);
            log("Database table verified after creation");
          } catch (verifyErr: any) {
            log(`Error: Table verification failed after creation: ${verifyErr.message}`, "db-init");
            throw verifyErr;
          }
        }
      }
    } catch (err: any) {
      log(`Warning: Could not initialize database: ${err.message}`, "db-init");
      // Continue anyway - will use MemoryStorage if database fails
    }
  }
  
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  // In production, always use 0.0.0.0 to accept connections from anywhere
  // In development on Windows, use 127.0.0.1 for local testing
  const host = process.env.NODE_ENV === "production" 
    ? "0.0.0.0" 
    : (process.platform === "win32" ? "127.0.0.1" : "0.0.0.0");
  httpServer.listen(
    port,
    host,
    () => {
      log(`serving on ${host}:${port}`);
    },
  );
})();
