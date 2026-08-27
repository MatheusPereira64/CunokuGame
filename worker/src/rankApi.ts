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

async function getRankDb(env: Env) {
  const db = createDb(env);
  if (!db) return null;
  await ensureSchema(db);
  return db;
}

export async function handleRankApi(request: Request, env: Env, path: string, method: string): Promise<Response | null> {
  if (!path.startsWith("/api/rank")) return null;

  const db = await getRankDb(env);
  if (!db) {
    return Response.json(
      { message: "Database unavailable" },
      {
        status: 503,
        headers: { "access-control-allow-origin": "*", "content-type": "application/json" },
      },
    );
  }

  const cors = { "access-control-allow-origin": "*", "content-type": "application/json; charset=utf-8" };
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: cors });

  try {
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

    if (method === "GET" && path === api.rank.me.path) {
      const token = bearerToken(request.headers.get("authorization"));
      if (!token) return json({ message: "unauthorized" }, 401);
      const result = await getMe(db, token);
      if ("error" in result) return json({ message: result.error }, result.status);
      return json(result);
    }

    if (method === "PATCH" && path === api.rank.profile.path) {
      const token = bearerToken(request.headers.get("authorization"));
      if (!token) return json({ message: "unauthorized" }, 401);
      const body = api.rank.profile.input.parse(await request.json());
      const result = await updateRankProfile(db, token, body);
      if ("error" in result) return json({ message: result.error }, result.status);
      return json(result);
    }

    if (method === "POST" && path === api.rank.matchResult.path) {
      const token = bearerToken(request.headers.get("authorization"));
      if (!token) return json({ message: "unauthorized" }, 401);
      const body = api.rank.matchResult.input.parse(await request.json());
      const result = await recordRankMatch(db, token, body);
      if ("error" in result) return json({ message: result.error }, result.status);
      return json(result);
    }

    if (method === "GET" && path === api.rank.leaderboard.path) {
      const limit = Number(new URL(request.url).searchParams.get("limit") || "50");
      const entries = await getLeaderboard(db, limit);
      return json({ entries });
    }
  } catch (err: any) {
    return json({ message: err?.message || "Invalid input" }, 400);
  }

  return json({ message: "Not found" }, 404);
}
