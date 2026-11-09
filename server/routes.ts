import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { competitionStore, storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import type { GameState } from "@shared/schema";
import { generateRoomCode, newPlayerId } from "@shared/roomCode";
import { toPublicRoom } from "@shared/gameFilter";
import { buildLanInfo } from "./lanInfo";
import { getDailyStatus, getLeagueStandings, startDailyChallenge } from "./competition";
import {
  createEmptySession,
  createFilteringMessenger,
  executeBotTurn,
  handleEmote,
  handleJoinMessage,
  handlePlayerAction,
  handlePlayerDisconnect,
  handleRematch,
  handleStartGame,
  resolveDisconnectedTurn,
  resolveTimedOutTurn,
  type RoomSessionData,
} from "./roomHandlers";
import { ensureRankSchema } from "./rankEnsure";
import { getMatchmaker } from "./matchmaking";
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
  botTimer?: ReturnType<typeof setTimeout>;
};

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get(api.lan.info.path, (_req, res) => {
    const port = Number.parseInt(process.env.PORT || "5000", 10);
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
      if (!room || room.gameMode === "daily") return res.status(404).json({ message: "Room not found" });
      const playerId = newPlayerId();
      res.json({ code, playerId, room: toPublicRoom(room) });
    } catch {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post(api.matchmaking.enqueue.path, async (req, res) => {
    try {
      const { playerName } = api.matchmaking.enqueue.input.parse(req.body);
      const result = await getMatchmaker().enqueue(playerName);
      res.set("Cache-Control", "no-store");
      res.json(result);
    } catch {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get("/api/matchmaking/:ticketId", async (req, res) => {
    const result = await getMatchmaker().status(req.params.ticketId);
    if (!result) return res.status(404).json({ message: "Ticket not found" });
    res.set("Cache-Control", "no-store");
    res.json(result);
  });

  app.delete("/api/matchmaking/:ticketId", async (req, res) => {
    await getMatchmaker().leave(req.params.ticketId);
    res.status(204).end();
  });

  app.get(api.rooms.list.path, async (_req, res) => {
    const rooms = await storage.listRooms();
    res.json(rooms.filter((room) => room.gameMode !== "daily").map(toPublicRoom));
  });

  app.get(api.rooms.get.path, async (req, res) => {
    const room = await storage.getRoom(req.params.code);
    if (!room || room.gameMode === "daily") return res.status(404).json({ message: "Room not found" });
    res.json(toPublicRoom(room));
  });

  app.get(api.daily.status.path, async (req, res) => {
    try {
      res.json(await getDailyStatus(competitionStore, bearerToken(req.header("authorization"))));
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Failed to load daily challenge" });
    }
  });

  app.post(api.daily.start.path, async (req, res) => {
    try {
      const started = await startDailyChallenge(storage, competitionStore, bearerToken(req.header("authorization")));
      if (!started) return res.status(401).json({ message: "unauthorized" });
      const { createdRoom: _createdRoom, ...result } = started;
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Failed to start daily challenge" });
    }
  });

  app.get(api.league.standings.path, async (req, res) => {
    try {
      res.json(await getLeagueStandings(competitionStore, bearerToken(req.header("authorization"))));
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Failed to load league" });
    }
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

  const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function clearDisconnectTimer(roomCode: string) {
    const timer = disconnectTimers.get(roomCode);
    if (!timer) return;
    clearTimeout(timer);
    disconnectTimers.delete(roomCode);
  }

  function scheduleNextBotTurn(roomCode: string, state: GameState) {
    const currentPlayer = state.players[state.currentPlayerIndex];
    const playing = !state.winnerId && state.turnPhase !== "finished" && state.turnPhase !== "waiting";

    if (playing && currentPlayer?.isBot) {
      clearDisconnectTimer(roomCode);
      const messenger = makeMessenger(roomCode);
      messenger.broadcast({ type: "bot_thinking", botName: currentPlayer.name });
      // Um único timer por sala: retomar a partida não pode duplicar o turno do bot
      const pending = getOrCreateLive(roomCode);
      if (pending.botTimer) clearTimeout(pending.botTimer);
      pending.botTimer = setTimeout(() => {
        const live = roomsLive.get(roomCode);
        if (!live) return;
        void executeBotTurn(
          storage,
          live.session,
          makeMessenger(roomCode),
          roomCode,
          scheduleNextBotTurn,
          competitionStore,
        );
      }, 3000);
      return;
    }

    clearDisconnectTimer(roomCode);
    const reconnectPlayerId = state.reconnectDeadline ? state.reconnectPlayerId : null;
    const deadline = reconnectPlayerId ? state.reconnectDeadline : state.turnDeadline;
    if (!deadline) return;
    const delay = Math.max(0, deadline - Date.now());
    const timer = setTimeout(() => {
      disconnectTimers.delete(roomCode);
      void (async () => {
        const live = roomsLive.get(roomCode);
        if (!live) return;
        const messenger = makeMessenger(roomCode);
        const next = reconnectPlayerId
          ? await resolveDisconnectedTurn(storage, messenger, roomCode, reconnectPlayerId)
          : await resolveTimedOutTurn(storage, messenger, roomCode);
        if (next) scheduleNextBotTurn(roomCode, next);
      })();
    }, delay);
    disconnectTimers.set(roomCode, timer);
  }

  wss.on("connection", (ws) => {
    let currentRoom: string | null = null;
    let currentPlayer: string | null = null;

    ws.on("message", async (data) => {
      try {
        if (data.toString() === "ping") {
          ws.send("pong");
          return;
        }
        const msg = JSON.parse(data.toString());

        if (msg.type === "join") {
          const { code, playerId, name, rankToken, iconId, accent } = msg;
          currentRoom = code;
          currentPlayer = playerId;
          const live = getOrCreateLive(code);
          const messenger = makeMessenger(code);

          await handleJoinMessage(
            storage,
            live.session,
            messenger,
            { code, playerId, name, rankToken, iconId, accent },
            (id) => {
              live.sockets.set(id, ws);
            },
            (m) => {
              if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
            },
            scheduleNextBotTurn,
            competitionStore,
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

        if (msg.type === "rematch") {
          if (!currentRoom || !currentPlayer) return;
          await handleRematch(storage, makeMessenger(currentRoom), currentRoom, currentPlayer, scheduleNextBotTurn);
          return;
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
            getOrCreateLive(roomCode).session,
            competitionStore,
          );
        }

        if (msg.type === "emote") {
          const roomCode = currentRoom;
          const playerId = currentPlayer;
          if (!roomCode || !playerId) return;
          handleEmote(getOrCreateLive(roomCode).session, makeMessenger(roomCode), playerId, msg.emoteId);
        }
      } catch (e) {
        console.error("WS Error", e);
      }
    });

    ws.on("close", () => {
      if (!currentRoom || !currentPlayer) return;
      const live = roomsLive.get(currentRoom);
      if (!live || live.sockets.get(currentPlayer) !== ws) return;
      live.sockets.delete(currentPlayer);
      void handlePlayerDisconnect(
        storage,
        makeMessenger(currentRoom),
        currentRoom,
        currentPlayer,
        scheduleNextBotTurn,
      );
    });
  });

  return httpServer;
}
