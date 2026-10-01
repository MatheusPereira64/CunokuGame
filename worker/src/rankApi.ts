import { api } from "../../shared/routes";
import {
  bearerToken,
  getLeaderboard,
  getMe,
  loginRankPlayer,
  recordRankMatch,
  registerRankPlayer,
  updateRankProfile,
} from "../../shared/rankService";
import { createDb, ensureSchema } from "./db";
import type { Env } from "./env";
import { corsHeaders } from "./cors";

async function getRankDb(env: Env) {
  const db = createDb(env);
  if (!db) return null;
  await ensureSchema(db);
  return db;
}

type RankJson = (data: unknown, status?: number) => Response;

async function dispatchRankRoute(
  request: Request,
  db: NonNullable<Awaited<ReturnType<typeof getRankDb>>>,
  path: string,
  method: string,
  json: RankJson,
): Promise<Response | null> {
  if (method === "POST" && path === api.rank.register.path) {
    const body = api.rank.register.input.parse(await request.json());
    const result = await registerRankPlayer(db, body);
    if ("error" in result) return json({ message: result.error }, result.status);
    return json(result, 201);
  }
  if (method === "POST" && path === api.rank.login.path) {
    const body = api.rank.login.input.parse(await request.json());
    const result = await loginRankPlayer(db, body);
    if ("error" in result) return json({ message: result.error }, result.status);
    return json(result);
  }
  if (method === "GET" && path === api.rank.leaderboard.path) {
    const limit = Number(new URL(request.url).searchParams.get("limit") || "50");
    const entries = await getLeaderboard(db, limit);
    return json({ entries });
  }
  return dispatchAuthedRankRoute(request, db, path, method, json);
}

async function dispatchAuthedRankRoute(
  request: Request,
  db: NonNullable<Awaited<ReturnType<typeof getRankDb>>>,
  path: string,
  method: string,
  json: RankJson,
): Promise<Response | null> {
  const token = bearerToken(request.headers.get("authorization"));
  if (method === "GET" && path === api.rank.me.path) {
    if (!token) return json({ message: "unauthorized" }, 401);
    const result = await getMe(db, token);
    if ("error" in result) return json({ message: result.error }, result.status);
    return json(result);
  }
  if (method === "PATCH" && path === api.rank.profile.path) {
    if (!token) return json({ message: "unauthorized" }, 401);
    const body = api.rank.profile.input.parse(await request.json());
    const result = await updateRankProfile(db, token, body);
    if ("error" in result) return json({ message: result.error }, result.status);
    return json(result);
  }
  if (method === "POST" && path === api.rank.matchResult.path) {
    if (!token) return json({ message: "unauthorized" }, 401);
    const body = api.rank.matchResult.input.parse(await request.json());
    const result = await recordRankMatch(db, token, body);
    if ("error" in result) return json({ message: result.error }, result.status);
    return json(result);
  }
  return null;
}

export async function handleRankApi(request: Request, env: Env, path: string, method: string): Promise<Response | null> {
  if (!path.startsWith("/api/rank")) return null;

  const headers = {
    "content-type": "application/json; charset=utf-8",
    ...corsHeaders(request),
  };
  const json: RankJson = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers });

  const db = await getRankDb(env);
  if (!db) {
    return json({ message: "Database unavailable" }, 503);
  }

  try {
    const handled = await dispatchRankRoute(request, db, path, method, json);
    if (handled) return handled;
  } catch (err: any) {
    return json({ message: err?.message || "Invalid input" }, 400);
  }

  return json({ message: "Not found" }, 404);
}
