import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { competitionStore, storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import type { GameState } from "@shared/schema";
import { generateRoomCode, newPlayerId } from "@shared/roomCode";
import { PLAYER_KEY_HEADER } from "@shared/competition";
import { buildLanInfo } from "./lanInfo";
import { getDailyStatus, getLeagueStandings, startDailyChallenge } from "./competition";
import {
  createEmptySession,
  createFilteringMessenger,
  executeBotTurn,
  handleEmote,
  handleJoinMessage,
  handlePlayerAction,
  handleStartGame,
  type RoomSessionData,
} from "./roomHandlers";

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
      if (!room || room.gameMode === "daily") return res.status(404).json({ message: "Room not found" });
      const playerId = newPlayerId();
      res.json({ code, playerId, room });
    } catch {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.rooms.list.path, async (_req, res) => {
    const rooms = await storage.listRooms();
    res.json(rooms.filter((room) => room.gameMode !== "daily"));
  });

  app.get(api.rooms.get.path, async (req, res) => {
    const room = await storage.getRoom(req.params.code);
    if (!room || room.gameMode === "daily") return res.status(404).json({ message: "Room not found" });
    res.json(room);
  });

  app.get(api.daily.status.path, async (req, res) => {
    try {
      res.json(await getDailyStatus(competitionStore, req.header(PLAYER_KEY_HEADER)));
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Failed to load daily challenge" });
    }
  });

  app.post(api.daily.start.path, async (req, res) => {
    const parsed = api.daily.start.input.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input" });
    try {
      const { createdRoom: _createdRoom, ...result } = await startDailyChallenge(
        storage,
        competitionStore,
        parsed.data,
      );
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Failed to start daily challenge" });
    }
  });

  app.get(api.league.standings.path, async (req, res) => {
    try {
      res.json(await getLeagueStandings(competitionStore, req.header(PLAYER_KEY_HEADER)));
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Failed to load league" });
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

    // Um único timer por sala: retomar o desafio diário não pode duplicar o turno do bot
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
  }

  wss.on("connection", (ws) => {
    let currentRoom: string | null = null;
    let currentPlayer: string | null = null;

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "join") {
          const { code, playerId, name, playerKey } = msg;
          currentRoom = code;
          currentPlayer = playerId;
          const live = getOrCreateLive(code);
          const messenger = makeMessenger(code);

          await handleJoinMessage(
            storage,
            live.session,
            messenger,
            { code, playerId, name, playerKey },
            (id) => {
              live.sockets.set(id, ws);
            },
            (m) => {
              if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
            },
            scheduleNextBotTurn,
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
      if (currentRoom && currentPlayer) {
        roomsLive.get(currentRoom)?.sockets.delete(currentPlayer);
      }
    });
  });

  return httpServer;
}
