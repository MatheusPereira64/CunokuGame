import type { Hyperdrive } from "@cloudflare/workers-types";

export type Env = {
  ASSETS: Fetcher;
  ROOM: DurableObjectNamespace;
  HYPERDRIVE?: Hyperdrive;
  /** Fallback quando Hyperdrive não está configurado (dev / Neon direto). */
  DATABASE_URL?: string;
};
