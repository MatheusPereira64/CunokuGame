import { generateRoomCode, newPlayerId } from "../../shared/roomCode";
import { api } from "../../shared/routes";
import { bearerToken } from "../../shared/rankService";
import { toPublicRoom } from "../../shared/gameFilter";
import { getDailyStatus, getLeagueStandings, startDailyChallenge } from "../../server/competition";
import { createCompetitionStore, createStorage, pingDb } from "./storage";
import type { Env } from "./env";
import { RoomDurableObject } from "./room-do";
import { MatchQueueDurableObject } from "./match-queue-do";
import { handleRankApi } from "./rankApi";
import { corsHeaders } from "./cors";

export { RoomDurableObject, MatchQueueDurableObject };

function json(data: unknown, status = 200, request?: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(request ? corsHeaders(request) : {}),
    },
  });
}

async function handleReadApi(request: Request, env: Env, url: URL, path: string, method: string): Promise<Response | null> {
  const storage = createStorage(env);
  if (method === "GET" && path === "/api/health") {
    const dbOk = await pingDb(env).catch(() => false);
    return json({ ok: true, db: dbOk, memory: !dbOk }, 200, request);
  }
  if (method === "GET" && path === api.lan.info.path) {
    return json({ port: 443, addresses: [], joinBaseUrls: [url.origin] }, 200, request);
  }
  if (method === "GET" && path === api.rooms.list.path) {
    const rooms = await storage.listRooms();
    return json(rooms.filter((room) => room.gameMode !== "daily").map(toPublicRoom), 200, request);
  }
  const getMatch = /^\/api\/rooms\/([^/]+)$/.exec(path);
  if (method === "GET" && getMatch) {
    const code = decodeURIComponent(getMatch[1]!).toUpperCase();
    const room = await storage.getRoom(code);
    if (!room || room.gameMode === "daily") return json({ message: "Room not found" }, 404, request);
    return json(toPublicRoom(room), 200, request);
  }
  return null;
}

/** Semeia o Durable Object da sala (cache local + bots/WS). Falha não impede a resposta. */
async function seedRoomObject(env: Env, room: { code: string }): Promise<void> {
  try {
    await env.ROOM.get(env.ROOM.idFromName(room.code)).fetch(
      new Request("https://room.internal/init", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ room }),
      }),
    );
  } catch (e) {
    console.warn("Room DO init failed", e);
  }
}

async function createRoom(request: Request, env: Env): Promise<Response> {
  try {
    const input = api.rooms.create.input.parse(await request.json());
    const roomCode = generateRoomCode(4);
    const playerId = newPlayerId();
    const room = await createStorage(env).createRoom({
      code: roomCode,
      hostId: playerId,
      status: "waiting" as const,
      gameMode: input.gameMode || "multiplayer",
      botDifficulty: input.botDifficulty || "medium",
      maxPlayers: input.maxPlayers || 4,
      botCount: input.botCount || 0,
    });
    await seedRoomObject(env, room);
    return json({ code: roomCode, playerId }, 201, request);
  } catch (err: any) {
    return json({ message: err?.message || "Invalid input" }, 400, request);
  }
}

async function joinRoom(request: Request, env: Env): Promise<Response> {
  try {
    const { code } = api.rooms.join.input.parse(await request.json());
    const room = await createStorage(env).getRoom(code.toUpperCase());
    if (!room || room.gameMode === "daily") return json({ message: "Room not found" }, 404, request);
    return json({ code: room.code, playerId: newPlayerId(), room: toPublicRoom(room) }, 200, request);
  } catch {
    return json({ message: "Invalid input" }, 400, request);
  }
}

/** A fila pública vive em um Durable Object só; a resposta dele ganha os cabeçalhos de CORS. */
async function forwardToMatchQueue(request: Request, env: Env): Promise<Response> {
  const upstream = await env.MATCH_QUEUE.get(env.MATCH_QUEUE.idFromName("public")).fetch(request);
  const headers = new Headers(upstream.headers);
  for (const [key, value] of Object.entries(corsHeaders(request))) headers.set(key, value);
  return new Response(upstream.body, { status: upstream.status, headers });
}

async function startDaily(request: Request, env: Env): Promise<Response> {
  const token = bearerToken(request.headers.get("authorization"));
  const started = await startDailyChallenge(createStorage(env), createCompetitionStore(env), token);
  if (!started) return json({ message: "unauthorized" }, 401, request);
  const { createdRoom, ...result } = started;
  if (createdRoom) await seedRoomObject(env, createdRoom);
  return json(result, 200, request);
}

type ApiHandler = (request: Request, env: Env) => Promise<Response>;

const API_ROUTES: Record<string, ApiHandler> = {
  [`POST ${api.rooms.create.path}`]: createRoom,
  [`POST ${api.rooms.join.path}`]: joinRoom,
  [`GET ${api.daily.status.path}`]: async (request, env) =>
    json(await getDailyStatus(createCompetitionStore(env), bearerToken(request.headers.get("authorization"))), 200, request),
  [`POST ${api.daily.start.path}`]: startDaily,
  [`GET ${api.league.standings.path}`]: async (request, env) =>
    json(await getLeagueStandings(createCompetitionStore(env), bearerToken(request.headers.get("authorization"))), 200, request),
};

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });

  const rankRes = await handleRankApi(request, env, path, method);
  if (rankRes) return rankRes;

  const readRes = await handleReadApi(request, env, url, path, method);
  if (readRes) return readRes;

  if (path === api.matchmaking.enqueue.path || path.startsWith("/api/matchmaking/")) return forwardToMatchQueue(request, env);

  const handler = API_ROUTES[`${method} ${path}`];
  return handler ? handler(request, env) : json({ message: "Not found" }, 404, request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket → Durable Object da sala (?code=XXXX)
    if (url.pathname === "/ws" || url.pathname.startsWith("/ws/")) {
      const code =
        url.searchParams.get("code") ||
        url.pathname.replace(/^\/ws\/?/, "").split("/")[0] ||
        "";
      if (!code) {
        return new Response("Missing room code (?code=XXXX)", { status: 400 });
      }
      const id = env.ROOM.idFromName(code.toUpperCase());
      const stub = env.ROOM.get(id);
      const doUrl = new URL(request.url);
      doUrl.searchParams.set("code", code.toUpperCase());
      return stub.fetch(new Request(doUrl.toString(), request));
    }

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env, url);
    }

    // Static assets (SPA)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
