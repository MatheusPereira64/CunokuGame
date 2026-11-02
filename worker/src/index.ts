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
  const getMatch = path.match(/^\/api\/rooms\/([^/]+)$/);
  if (method === "GET" && getMatch) {
    const code = decodeURIComponent(getMatch[1]!).toUpperCase();
    const room = await storage.getRoom(code);
    if (!room || room.gameMode === "daily") return json({ message: "Room not found" }, 404, request);
    return json(toPublicRoom(room), 200, request);
  }
  return null;
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const storage = createStorage(env);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }

  const rankRes = await handleRankApi(request, env, path, method);
  if (rankRes) return rankRes;

  const readRes = await handleReadApi(request, env, url, path, method);
  if (readRes) return readRes;

  if (method === "POST" && path === api.rooms.create.path) {
    try {
      const body = await request.json();
      const input = api.rooms.create.input.parse(body);
      const roomCode = generateRoomCode(4);
      const playerId = newPlayerId();
      const roomData = {
        code: roomCode,
        hostId: playerId,
        status: "waiting" as const,
        gameMode: input.gameMode || "multiplayer",
        botDifficulty: input.botDifficulty || "medium",
        maxPlayers: input.maxPlayers || 4,
        botCount: input.botCount || 0,
      };
      const room = await storage.createRoom(roomData);

      // Semeia o Durable Object da sala (cache local + bots/WS)
      try {
        const id = env.ROOM.idFromName(roomCode);
        await env.ROOM.get(id).fetch(
          new Request("https://room.internal/init", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ room }),
          }),
        );
      } catch (e) {
        console.warn("Room DO init failed", e);
      }

      return json({ code: roomCode, playerId }, 201, request);
    } catch (err: any) {
      return json({ message: err?.message || "Invalid input" }, 400, request);
    }
  }

  if (path === api.matchmaking.enqueue.path || path.startsWith("/api/matchmaking/")) {
    const id = env.MATCH_QUEUE.idFromName("public");
    const stub = env.MATCH_QUEUE.get(id);
    const upstream = await stub.fetch(request);
    const headers = new Headers(upstream.headers);
    for (const [key, value] of Object.entries(corsHeaders(request))) {
      headers.set(key, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  }

  if (method === "POST" && path === api.rooms.join.path) {
    try {
      const body = await request.json();
      const { code } = api.rooms.join.input.parse(body);
      const room = await storage.getRoom(code.toUpperCase());
      if (!room || room.gameMode === "daily") return json({ message: "Room not found" }, 404, request);
      const playerId = newPlayerId();
      return json({ code: room.code, playerId, room: toPublicRoom(room) }, 200, request);
    } catch {
      return json({ message: "Invalid input" }, 400, request);
    }
  }

  if (method === "GET" && path === api.daily.status.path) {
    const store = createCompetitionStore(env);
    const token = bearerToken(request.headers.get("authorization"));
    return json(await getDailyStatus(store, token), 200, request);
  }

  if (method === "POST" && path === api.daily.start.path) {
    const token = bearerToken(request.headers.get("authorization"));
    const started = await startDailyChallenge(storage, createCompetitionStore(env), token);
    if (!started) return json({ message: "unauthorized" }, 401, request);
    const { createdRoom, ...result } = started;
    if (createdRoom) {
      try {
        const id = env.ROOM.idFromName(createdRoom.code);
        await env.ROOM.get(id).fetch(
          new Request("https://room.internal/init", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ room: createdRoom }),
          }),
        );
      } catch (e) {
        console.warn("Room DO init failed", e);
      }
    }
    return json(result, 200, request);
  }

  if (method === "GET" && path === api.league.standings.path) {
    const store = createCompetitionStore(env);
    const token = bearerToken(request.headers.get("authorization"));
    return json(await getLeagueStandings(store, token), 200, request);
  }

  return json({ message: "Not found" }, 404, request);
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
