import { api } from "../../shared/routes";
import { matchMetricSchema, metricKeysForMatch, metricsSummary, recordMetrics } from "../../shared/metrics";
import {
  bearerToken,
  getLeaderboard,
  getPublicProfile,
  getMe,
  linkRankEmail,
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
type RankDb = NonNullable<Awaited<ReturnType<typeof getRankDb>>>;
type RankResult = { error: string; status: number } | object;
type RouteCtx = { request: Request; db: RankDb; json: RankJson; token: string | null };
type RouteHandler = (ctx: RouteCtx) => Promise<Response>;

/** Resultado de um serviço do ranking: erro vira { message } com o status dele. */
function reply(json: RankJson, result: RankResult, okStatus = 200): Response {
  if ("error" in result) return json({ message: result.error }, result.status);
  return json(result, okStatus);
}

/** Rota que exige o token do jogador logado. */
function authed(run: (ctx: RouteCtx & { token: string }) => Promise<Response>): RouteHandler {
  return (ctx) => (ctx.token ? run({ ...ctx, token: ctx.token }) : Promise.resolve(ctx.json({ message: "unauthorized" }, 401)));
}

function searchParam(request: Request, name: string, fallback: string): number {
  return Number(new URL(request.url).searchParams.get(name) || fallback);
}

/** Rotas exatas: "MÉTODO caminho" → handler. */
const RANK_ROUTES: Record<string, RouteHandler> = {
  [`POST ${api.rank.register.path}`]: async ({ request, db, json }) =>
    reply(json, await registerRankPlayer(db, api.rank.register.input.parse(await request.json())), 201),
  [`POST ${api.rank.login.path}`]: async ({ request, db, json }) =>
    reply(json, await loginRankPlayer(db, api.rank.login.input.parse(await request.json()))),
  [`POST ${api.metrics.match.path}`]: async ({ request, db, json }) => {
    const parsed = matchMetricSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ message: "Invalid metric" }, 400);
    await recordMetrics(db, new Date().toISOString().slice(0, 10), metricKeysForMatch(parsed.data));
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  },
  [`GET ${api.metrics.summary.path}`]: async ({ request, db, json }) => json(await metricsSummary(db, searchParam(request, "days", "30"))),
  [`GET ${api.rank.leaderboard.path}`]: async ({ request, db, json }) =>
    json({ entries: await getLeaderboard(db, searchParam(request, "limit", "50")) }),
  [`GET ${api.rank.me.path}`]: authed(async ({ db, json, token }) => reply(json, await getMe(db, token))),
  [`PATCH ${api.rank.profile.path}`]: authed(async ({ request, db, json, token }) =>
    reply(json, await updateRankProfile(db, token, api.rank.profile.input.parse(await request.json()))),
  ),
  [`POST ${api.rank.linkEmail.path}`]: authed(async ({ request, db, json, token }) =>
    reply(json, await linkRankEmail(db, token, api.rank.linkEmail.input.parse(await request.json()))),
  ),
  [`POST ${api.rank.matchResult.path}`]: authed(async ({ request, db, json, token }) =>
    reply(json, await recordRankMatch(db, token, api.rank.matchResult.input.parse(await request.json()))),
  ),
};

async function dispatchRankRoute(request: Request, db: RankDb, path: string, method: string, json: RankJson): Promise<Response | null> {
  const ctx: RouteCtx = { request, db, json, token: bearerToken(request.headers.get("authorization")) };
  const handler = RANK_ROUTES[`${method} ${path}`];
  if (handler) return handler(ctx);
  if (method === "GET" && path.startsWith(api.profile.view.path)) {
    const profile = await getPublicProfile(db, decodeURIComponent(path.slice(api.profile.view.path.length)));
    return profile ? json({ profile }) : json({ message: "Profile not found" }, 404);
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
