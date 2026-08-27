import { generateRoomCode, newPlayerId } from "../../shared/roomCode";
import { api } from "../../shared/routes";
import { createStorage, pingDb } from "./storage";
import type { Env } from "./env";
import { RoomDurableObject } from "./room-do";
import { handleRankApi } from "./rankApi";
import { corsHeaders } from "./cors";

export { RoomDurableObject };

function json(data: unknown, status = 200, request?: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(request ? corsHeaders(request) : {}),
    },
  });
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

  if (method === "GET" && path === "/api/health") {
    const dbOk = await pingDb(env).catch(() => false);
    return json({ ok: true, db: dbOk, memory: !dbOk }, 200, request);
  }

  if (method === "GET" && path === api.lan.info.path) {
    return json({
      port: 443,
      addresses: [],
      joinBaseUrls: [url.origin],
    }, 200, request);
  }

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

  if (method === "POST" && path === api.rooms.join.path) {
    try {
      const body = await request.json();
      const { code } = api.rooms.join.input.parse(body);
      const room = await storage.getRoom(code.toUpperCase());
      if (!room) return json({ message: "Room not found" }, 404, request);
      const playerId = newPlayerId();
      return json({ code: room.code, playerId, room }, 200, request);
    } catch {
      return json({ message: "Invalid input" }, 400, request);
    }
  }

  if (method === "GET" && path === api.rooms.list.path) {
    const rooms = await storage.listRooms();
    return json(rooms, 200, request);
  }

  const getMatch = path.match(/^\/api\/rooms\/([^/]+)$/);
  if (method === "GET" && getMatch) {
    const code = decodeURIComponent(getMatch[1]!).toUpperCase();
    const room = await storage.getRoom(code);
    if (!room) return json({ message: "Room not found" }, 404, request);
    return json(room, 200, request);
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
