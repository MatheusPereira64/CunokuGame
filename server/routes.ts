import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import type { GameState } from "@shared/schema";
import { generateRoomCode, newPlayerId } from "@shared/roomCode";
import { buildLanInfo } from "./lanInfo";
import {
  createEmptySession,
  createFilteringMessenger,
  executeBotTurn,
  handleJoinMessage,
  handlePlayerAction,
  handleStartGame,
  type RoomSessionData,
} from "./roomHandlers";
import { ensureRankSchema } from "./rankEnsure";
import {
  bearerToken,
  getLeaderboard,
  getMe,
  loginRankPlayer,
  recordRankMatch,
  registerRankPlayer,
  updateRankProfile,
} from "@shared/rankService";

type RoomLive = {
  sockets: Map<string, WebSocket>;
  session: RoomSessionData;
};

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get(api.lan.info.path, (_req, res) => {
    const port = parseInt(process.env.PORT || "5000", 10);
    const info = buildLanInfo(port);
    res.json(api.lan.info.responses[200].parse(info));
  });

  app.post(api.rooms.create.path, async (req, res) => {
    try {
      const input = api.rooms.create.input.parse(req.body);
      const roomCode = generateRoomCode(4);
      const playerId = newPlayerId();

      const roomData = {
        code: roomCode,
        hostId: playerId,
        status: "waiting",
        gameMode: input.gameMode || "multiplayer",
        botDifficulty: input.botDifficulty || "medium",
        maxPlayers: input.maxPlayers || 4,
        botCount: input.botCount || 0,
      };

      await storage.createRoom(roomData);
      res.status(201).json({ code: roomCode, playerId });
    } catch (err: any) {
      let message: string;
      if (err instanceof z.ZodError) {
        message = `Validation error: ${err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`;
      } else if (err.message) {
        message = err.message;
      } else {
        message = "Invalid input";
      }
      res.status(400).json({
        message,
        details: err instanceof z.ZodError ? err.errors : undefined,
      });
    }
  });

  app.post(api.rooms.join.path, async (req, res) => {
    try {
      const { code } = api.rooms.join.input.parse(req.body);
      const room = await storage.getRoom(code);
      if (!room) return res.status(404).json({ message: "Room not found" });
      const playerId = newPlayerId();
      res.json({ code, playerId, room });
    } catch {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.rooms.list.path, async (_req, res) => {
    const rooms = await storage.listRooms();
    res.json(rooms);
  });

  app.get(api.rooms.get.path, async (req, res) => {
    const room = await storage.getRoom(req.params.code);
    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json(room);
  });

  app.post(api.rank.register.path, async (req, res) => {
    try {
      const db = await ensureRankSchema();
      if (!db) return res.status(503).json({ message: "Database unavailable" });
      const input = api.rank.register.input.parse(req.body);
      const result = await registerRankPlayer(db, input);
      if ("error" in result) return res.status(result.status).json({ message: result.error });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ message: err?.message || "Invalid input" });
    }
  });

  app.post(api.rank.login.path, async (req, res) => {
    try {
      const db = await ensureRankSchema();
      if (!db) return res.status(503).json({ message: "Database unavailable" });
      const input = api.rank.login.input.parse(req.body);
      const result = await loginRankPlayer(db, input);
      if ("error" in result) return res.status(result.status).json({ message: result.error });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err?.message || "Invalid input" });
    }
  });

  app.get(api.rank.me.path, async (req, res) => {
    try {
      const db = await ensureRankSchema();
      if (!db) return res.status(503).json({ message: "Database unavailable" });
      const token = bearerToken(req.header("authorization"));
      if (!token) return res.status(401).json({ message: "unauthorized" });
      const result = await getMe(db, token);
      if ("error" in result) return res.status(result.status).json({ message: result.error });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err?.message || "Invalid input" });
    }
  });

  app.patch(api.rank.profile.path, async (req, res) => {
    try {
      const db = await ensureRankSchema();
      if (!db) return res.status(503).json({ message: "Database unavailable" });
      const token = bearerToken(req.header("authorization"));
      if (!token) return res.status(401).json({ message: "unauthorized" });
      const input = api.rank.profile.input.parse(req.body);
      const result = await updateRankProfile(db, token, input);
      if ("error" in result) return res.status(result.status).json({ message: result.error });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err?.message || "Invalid input" });
    }
  });

  app.post(api.rank.matchResult.path, async (req, res) => {
    try {
      const db = await ensureRankSchema();
      if (!db) return res.status(503).json({ message: "Database unavailable" });
      const token = bearerToken(req.header("authorization"));
      if (!token) return res.status(401).json({ message: "unauthorized" });
      const input = api.rank.matchResult.input.parse(req.body);
      const result = await recordRankMatch(db, token, input);
      if ("error" in result) return res.status(result.status).json({ message: result.error });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err?.message || "Invalid input" });
    }
  });

  app.get(api.rank.leaderboard.path, async (req, res) => {
    try {
      const db = await ensureRankSchema();
      if (!db) return res.status(503).json({ message: "Database unavailable" });
      const limit = Number(req.query.limit || "50");
      const entries = await getLeaderboard(db, limit);
      res.json({ entries });
    } catch (err: any) {
      res.status(400).json({ message: err?.message || "Invalid input" });
    }
  });

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const roomsLive = new Map<string, RoomLive>();

  function getOrCreateLive(code: string): RoomLive {
    let live = roomsLive.get(code);
    if (!live) {
      live = { sockets: new Map(), session: createEmptySession() };
      roomsLive.set(code, live);
    }
    return live;
  }

  function makeMessenger(code: string) {
    const live = getOrCreateLive(code);
    return createFilteringMessenger(
      (playerId) => {
        const ws = live.sockets.get(playerId);
        if (!ws) return undefined;
        return {
          open: ws.readyState === WebSocket.OPEN,
          send: (data) => ws.send(data),
        };
      },
      () => Array.from(live.sockets.keys()),
    );
  }

  function scheduleNextBotTurn(roomCode: string, state: GameState) {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer?.isBot) return;

    const messenger = makeMessenger(roomCode);
    messenger.broadcast({ type: "bot_thinking", botName: currentPlayer.name });

    setTimeout(() => {
      const live = roomsLive.get(roomCode);
      if (!live) return;
      void executeBotTurn(
        storage,
        live.session,
        makeMessenger(roomCode),
        roomCode,
        scheduleNextBotTurn,
      );
    }, 3000);
  }

  wss.on("connection", (ws) => {
    let currentRoom: string | null = null;
    let currentPlayer: string | null = null;

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "join") {
          const { code, playerId, name } = msg;
          currentRoom = code;
          currentPlayer = playerId;
          const live = getOrCreateLive(code);
          const messenger = makeMessenger(code);

          await handleJoinMessage(
            storage,
            live.session,
            messenger,
            { code, playerId, name },
            (id) => {
              live.sockets.set(id, ws);
            },
            (m) => {
              if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
            },
          );
        }

        if (msg.type === "start_game") {
          const roomCode = currentRoom;
          const playerId = currentPlayer;
          if (!roomCode || !playerId) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "No room associated with connection. Please reconnect.",
              }),
            );
            return;
          }
          const live = getOrCreateLive(roomCode);
          await handleStartGame(
            storage,
            live.session,
            makeMessenger(roomCode),
            roomCode,
            playerId,
            scheduleNextBotTurn,
          );
        }

        if (msg.type === "player_action") {
          const roomCode = currentRoom;
          const playerId = currentPlayer;
          if (!roomCode || !playerId) return;
          await handlePlayerAction(
            storage,
            makeMessenger(roomCode),
            roomCode,
            playerId,
            msg.action,
            scheduleNextBotTurn,
          );
        }
      } catch (e) {
        console.error("WS Error", e);
      }
    });

    ws.on("close", () => {
      if (currentRoom && currentPlayer) {
        roomsLive.get(currentRoom)?.sockets.delete(currentPlayer);
      }
    });
  });

  return httpServer;
}
