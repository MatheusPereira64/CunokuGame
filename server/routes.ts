import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { GameLogic } from "./game";
import { BotPlayer, createBots } from "./bot";
import { z } from "zod";
import { GameState, Player } from "@shared/schema";
import { randomUUID } from "crypto";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // === HTTP ROUTES ===
  app.post(api.rooms.create.path, async (req, res) => {
    try {
      const input = api.rooms.create.input.parse(req.body);
      const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      const playerId = randomUUID();
      
      const newRoom = await storage.createRoom({
        code: roomCode,
        hostId: playerId,
        status: "waiting",
        gameMode: input.gameMode || "multiplayer",
        botDifficulty: input.botDifficulty || "medium",
        gameState: null
      });

      res.status(201).json({ code: roomCode, playerId });
    } catch (err: any) {
      console.error("Error creating room:", err);
      const message = err instanceof z.ZodError 
        ? `Validation error: ${err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        : err.message || "Invalid input";
      res.status(400).json({ message });
    }
  });

  app.post(api.rooms.join.path, async (req, res) => {
    try {
      const { code, playerName } = api.rooms.join.input.parse(req.body);
      const room = await storage.getRoom(code);
      if (!room) return res.status(404).json({ message: "Room not found" });
      
      const playerId = randomUUID();
      // Logic to add player to room state would happen in WS connect usually, 
      // or we update DB here. Let's update DB here for persistence.
      // But GameState is null until game starts. 
      // We'll use a temporary "lobby" store or just let WS handle joining.
      
      res.json({ code, playerId, room });
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.rooms.list.path, async (req, res) => {
    const rooms = await storage.listRooms();
    res.json(rooms);
  });

  app.get(api.rooms.get.path, async (req, res) => {
    const room = await storage.getRoom(req.params.code);
    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json(room);
  });

  // === WEBSOCKET SERVER ===
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  // In-memory map for active connections: roomCode -> { playerId: ws }
  const roomsMap = new Map<string, Map<string, WebSocket>>();

  wss.on("connection", (ws) => {
    let currentRoom: string | null = null;
    let currentPlayer: string | null = null;

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === "join") {
          // { type: 'join', code, playerId, name }
          const { code, playerId, name } = msg;
          currentRoom = code;
          currentPlayer = playerId;

          if (!roomsMap.has(code)) roomsMap.set(code, new Map());
          roomsMap.get(code)!.set(playerId, ws);

          // Get current state
          const room = await storage.getRoom(code);
          if (!room) return;

          let state = room.gameState as GameState;
          
          // If waiting and no state, initialize lobby state effectively (or just list players)
          // For MVP, if state is null, we create a dummy state or wait for "start"
          // Let's assume the first join creates a basic state if null? 
          // No, separate "start_game" action is better.
          
          // Broadcast join
          broadcast(code, { type: "player_joined", playerId, name });
          
          // Send current state
          if (state) ws.send(JSON.stringify({ type: "game_state", state }));
        }

        if (msg.type === "start_game") {
          // Initialize game
          if (!currentRoom) return;
          
          const room = await storage.getRoom(currentRoom);
          if (!room) return;
          
          const connectedPlayers = Array.from(roomsMap.get(currentRoom)!.keys());
          
          // Create Players
          const players: Player[] = connectedPlayers.map(id => ({
            id,
            name: "Player " + id.substr(0,4), // Simplified name resolution
            isBot: false,
            isConnected: true,
            hand: [],
            score: 0,
            knownCards: {}
          }));

          // Add bots if vs_bots mode
          if (room.gameMode === "vs_bots") {
            const bots = createBots(3, (room.botDifficulty as any) || "medium");
            bots.forEach(bot => {
              players.push({
                id: bot.id,
                name: bot.name,
                isBot: true,
                isConnected: true,
                hand: [],
                score: 0,
                knownCards: {}
              });
            });
            
            // Store bot instances in memory for turn handling
            if (!roomsMap.has(currentRoom)) roomsMap.set(currentRoom, new Map());
            bots.forEach(bot => {
              // Mark bot connections (no actual WS)
              const botPlayers = (roomsMap.get(currentRoom) as any).bots || [];
              botPlayers.push(bot);
              (roomsMap.get(currentRoom) as any).bots = botPlayers;
            });
          }

          const newState = GameLogic.createInitialState(players);
          await storage.updateGameState(currentRoom, newState);
          await storage.updateRoomStatus(currentRoom, "playing");
          
          broadcast(currentRoom, { type: "game_state", state: newState });
          
          // Auto-trigger first bot turn if exists
          if (newState.players[0].isBot) {
            scheduleNextBotTurn(currentRoom, newState);
          }
        }

        if (msg.type === "game_action") {
          // Handle logic (draw, discard, etc)
          const room = await storage.getRoom(currentRoom!);
          if (!room || !room.gameState) return;
          
          let state = room.gameState as GameState;
          
          // Simple pass-through for demo + update DB
          // TODO: Implement GameLogic.processAction(state, msg.action)
          
          await storage.updateGameState(currentRoom!, state);
          broadcast(currentRoom!, { type: "game_state", state });
          
          // Check if next player is bot
          if (state.players[state.currentPlayerIndex]?.isBot) {
            scheduleNextBotTurn(currentRoom!, state);
          }
        }

      } catch (e) {
        console.error("WS Error", e);
      }
    });

    ws.on("close", () => {
      if (currentRoom && currentPlayer) {
        roomsMap.get(currentRoom)?.delete(currentPlayer);
        // Handle disconnect logic
      }
    });
  });

  function broadcast(roomCode: string, msg: any) {
    const clients = roomsMap.get(roomCode);
    if (clients) {
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(msg));
        }
      });
    }
  }

  function scheduleNextBotTurn(roomCode: string, state: GameState) {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer?.isBot) return;

    // Simulate bot delay (0.5-2 seconds)
    const delay = 500 + Math.random() * 1500;
    
    setTimeout(async () => {
      const room = await storage.getRoom(roomCode);
      if (!room || !room.gameState) return;

      const botList = (roomsMap.get(roomCode) as any)?.bots || [];
      const bot = botList.find((b: BotPlayer) => b.id === currentPlayer.id);
      if (!bot) return;

      // Get current state
      let updatedState = room.gameState as GameState;
      const playerIdx = updatedState.players.findIndex(p => p.id === currentPlayer.id);
      
      // Make a decision
      const action = bot.decideTurn(updatedState, playerIdx);
      
      // TODO: Apply action to state
      // updatedState = GameLogic.processAction(updatedState, action)
      
      // Check if should finish
      if (bot.decideFinish(updatedState, playerIdx)) {
        // TODO: Process finish action
      }

      await storage.updateGameState(roomCode, updatedState);
      broadcast(roomCode, { type: "game_state", state: updatedState });

      // Schedule next bot if applicable
      if (updatedState.players[updatedState.currentPlayerIndex]?.isBot) {
        scheduleNextBotTurn(roomCode, updatedState);
      }
    }, delay);
  }

  return httpServer;
}
