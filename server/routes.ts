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
      console.log("POST /api/rooms - Request body:", JSON.stringify(req.body));
      console.log("POST /api/rooms - Storage type:", process.env.DATABASE_URL ? "DatabaseStorage" : "MemoryStorage");
      
      const input = api.rooms.create.input.parse(req.body);
      console.log("POST /api/rooms - Parsed input:", input);
      
      const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      const playerId = randomUUID();
      
      console.log("POST /api/rooms - Creating room with code:", roomCode);
      
      // Prepare room data according to InsertRoom schema (gameState is omitted from schema)
      const roomData: any = {
        code: roomCode,
        hostId: playerId,
        status: "waiting",
        gameMode: input.gameMode || "multiplayer",
        botDifficulty: input.botDifficulty || "medium",
        maxPlayers: input.maxPlayers || 4,
        botCount: input.botCount || 0,
      };
      
      console.log("POST /api/rooms - Room data to insert:", JSON.stringify(roomData));
      
      const newRoom = await storage.createRoom(roomData);

      console.log("POST /api/rooms - Room created successfully:", roomCode);
      res.status(201).json({ code: roomCode, playerId });
    } catch (err: any) {
      console.error("Error creating room:", err);
      console.error("Error stack:", err.stack);
      
      let message: string;
      if (err instanceof z.ZodError) {
        message = `Validation error: ${err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
        console.error("Zod validation errors:", err.errors);
      } else if (err.message) {
        message = err.message;
      } else {
        message = "Invalid input";
      }
      
      res.status(400).json({ message, details: err instanceof z.ZodError ? err.errors : undefined });
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
    
    // Armazena room e player no próprio WebSocket para acesso posterior
    (ws as any).currentRoom = null;
    (ws as any).currentPlayer = null;

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        console.log("WS message received:", msg.type, msg);
        
        if (msg.type === "join") {
          // { type: 'join', code, playerId, name }
          const { code, playerId, name } = msg;
          currentRoom = code;
          currentPlayer = playerId;
          // Armazena também no WebSocket
          (ws as any).currentRoom = code;
          (ws as any).currentPlayer = playerId;

          // Get current state
          const room = await storage.getRoom(code);
          if (!room) {
            ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
            return;
          }

          // Verifica se a sala está cheia
          const maxPlayers = (room as any).maxPlayers || 4;
          const currentConnections = roomsMap.get(code)?.size || 0;
          
          // Se o jogo já começou, não permite novos jogadores
          if (room.gameState) {
            ws.send(JSON.stringify({ type: "error", message: "Game has already started" }));
            return;
          }
          
          // Verifica limite de jogadores
          if (currentConnections >= maxPlayers) {
            ws.send(JSON.stringify({ type: "error", message: `Room is full (max ${maxPlayers} players)` }));
            return;
          }

          if (!roomsMap.has(code)) roomsMap.set(code, new Map());
          roomsMap.get(code)!.set(playerId, ws);
          
          // Armazena nome do jogador para uso posterior
          if (!(roomsMap.get(code) as any)?.playerNames) {
            (roomsMap.get(code) as any).playerNames = new Map();
          }
          (roomsMap.get(code) as any).playerNames.set(playerId, name);

          let state = room.gameState as GameState;
          
          // Se o jogo já está em andamento, envia o estado atual
          if (state) {
            ws.send(JSON.stringify({ type: "game_state", state }));
            // Broadcast join para outros jogadores
            broadcast(code, { type: "player_joined", playerId, name }, ws);
          } else {
            // Se ainda não começou, atualiza o lobby para TODOS os jogadores
            const connectedPlayers = Array.from(roomsMap.get(code)!.keys());
            const playerNames = (roomsMap.get(code) as any)?.playerNames || new Map();
            const lobbyPlayers = connectedPlayers.map(id => ({
              id,
              name: playerNames.get(id) || `Player ${id.substring(0, 4)}`,
              isBot: false,
              isConnected: true,
              hand: [],
              score: 0,
              knownCards: {}
            })) as Player[];
            
            console.log("join: Sending lobby_state to all players. Players:", lobbyPlayers.length, lobbyPlayers.map(p => p.name));
            // Envia lobby_state para TODOS os jogadores conectados (incluindo o que acabou de entrar)
            // Inclui hostId para que o cliente saiba quem é o host
            const lobbyMessage = { 
              type: "lobby_state", 
              players: lobbyPlayers,
              hostId: room.hostId 
            };
            
            // Envia para TODOS, incluindo o novo jogador
            const clients = roomsMap.get(code);
            if (clients) {
              let sentCount = 0;
              clients.forEach((client, clientPlayerId) => {
                if (client.readyState === WebSocket.OPEN) {
                  console.log(`Sending lobby_state to player ${clientPlayerId} (${(roomsMap.get(code) as any)?.playerNames?.get(clientPlayerId) || 'unknown'})`);
                  try {
                    client.send(JSON.stringify(lobbyMessage));
                    sentCount++;
                  } catch (err) {
                    console.error("Error sending lobby_state to", clientPlayerId, ":", err);
                  }
                } else {
                  console.log(`Skipping player ${clientPlayerId} - WebSocket not OPEN (state: ${client.readyState})`);
                }
              });
              console.log(`lobby_state sent to ${sentCount} players`);
            } else {
              console.error("No clients found for room", code);
            }
            
            // Também envia player_joined para notificar outros jogadores (exceto o novo)
            broadcast(code, { type: "player_joined", playerId, name }, ws);
          }
        }

        if (msg.type === "start_game") {
          // Tenta recuperar room e player do WebSocket se não estiverem definidos
          const roomCode = currentRoom || (ws as any).currentRoom;
          const playerId = currentPlayer || (ws as any).currentPlayer;
          
          console.log("start_game received from player:", playerId, "in room:", roomCode);
          console.log("currentRoom from closure:", currentRoom, "from ws:", (ws as any).currentRoom);
          
          // Initialize game
          if (!roomCode) {
            console.error("start_game: No current room");
            ws.send(JSON.stringify({ type: "error", message: "No room associated with connection. Please reconnect." }));
            return;
          }
          
          // Atualiza variáveis locais
          currentRoom = roomCode;
          currentPlayer = playerId;
          
          const room = await storage.getRoom(roomCode);
          if (!room) {
            console.error("start_game: Room not found:", roomCode);
            ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
            return;
          }
          
          // Verifica se o jogador que está iniciando é o host
          if (room.hostId !== playerId) {
            console.error("start_game: Only host can start game. Host:", room.hostId, "Player:", playerId);
            ws.send(JSON.stringify({ type: "error", message: "Only the host can start the game" }));
            return;
          }
          
          const connectedPlayers = Array.from(roomsMap.get(roomCode)!.keys());
          console.log("start_game: Connected players:", connectedPlayers.length, connectedPlayers);
          
          if (connectedPlayers.length < 2) {
            console.log("start_game: Not enough players");
            ws.send(JSON.stringify({ 
              type: "error", 
              message: "Need at least 2 players to start" 
            }));
            return;
          }
          
          // Create Players - busca nomes do mapa
          const playerNames = (roomsMap.get(roomCode) as any)?.playerNames || new Map();
          const players: Player[] = connectedPlayers.map(id => ({
            id,
            name: playerNames.get(id) || `Player ${id.substring(0, 4)}`,
            isBot: false,
            isConnected: true,
            hand: [],
            score: 0,
            knownCards: {}
          }));

          // Adiciona bots se configurado
          const maxPlayers = (room as any).maxPlayers || 4;
          const botCount = (room as any).botCount || 0;
          const botDifficulty = (room.botDifficulty as any) || "medium";
          
          // Calcula quantos bots adicionar (não pode exceder maxPlayers)
          const totalSlots = maxPlayers;
          const humanPlayers = players.length;
          const availableSlots = totalSlots - humanPlayers;
          const botsToAdd = Math.min(botCount, availableSlots);
          
          if (botsToAdd > 0) {
            const bots = createBots(botsToAdd, botDifficulty);
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
            if (!roomsMap.has(roomCode)) roomsMap.set(roomCode, new Map());
            if (!(roomsMap.get(roomCode) as any).bots) {
              (roomsMap.get(roomCode) as any).bots = [];
            }
            bots.forEach(bot => {
              (roomsMap.get(roomCode) as any).bots.push(bot);
            });
          }
          
          // Verifica se há jogadores suficientes (incluindo bots)
          if (players.length < 2) {
            ws.send(JSON.stringify({ 
              type: "error", 
              message: "Need at least 2 players (including bots) to start" 
            }));
            return;
          }

          const newState = GameLogic.createInitialState(players);
          console.log("start_game: Created game state with", newState.players.length, "players");
          await storage.updateGameState(roomCode, newState);
          await storage.updateRoomStatus(roomCode, "playing");
          
          console.log("start_game: Broadcasting game state to all players in room:", roomCode);
          broadcast(roomCode, { type: "game_state", state: newState });
          
          // Auto-trigger first bot turn if exists
          if (newState.players[0].isBot) {
            scheduleNextBotTurn(roomCode, newState);
          }
        }

        if (msg.type === "player_action") {
          // Handle logic (draw, discard, etc)
          const roomCode = currentRoom || (ws as any).currentRoom;
          const playerId = currentPlayer || (ws as any).currentPlayer;
          
          if (!roomCode || !playerId) {
            console.error("player_action: No room or player associated");
            return;
          }
          
          const room = await storage.getRoom(roomCode);
          if (!room || !room.gameState) return;
          
          let state = room.gameState as GameState;
          
          // Processa ação usando GameLogic.processAction
          const result = GameLogic.processAction(state, msg.action, playerId);
          
          await storage.updateGameState(roomCode, result.newState);
          broadcast(roomCode, { type: "game_state", state: result.newState });
          
          // Se alguém declarou Cunoku, envia notificação para todos
          if (msg.action.type === "declare_finish" && result.newState.isFinalRound) {
            const declarer = result.newState.players.find(p => p.id === playerId);
            if (declarer) {
              broadcast(roomCode, { 
                type: "cunoku_declared", 
                playerName: declarer.name 
              });
            }
          }
          
          // Envia mensagem privada se houver (para cartas 5 e 6)
          if (result.privateMessage) {
            ws.send(JSON.stringify({
              type: "private_info",
              message: result.privateMessage.message,
              card: result.privateMessage.card,
              playerName: result.privateMessage.playerName
            }));
          }
          
          // Check if next player is bot
          if (result.newState.players[result.newState.currentPlayerIndex]?.isBot) {
            scheduleNextBotTurn(roomCode, result.newState);
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

  function broadcast(roomCode: string, msg: any, exclude?: WebSocket) {
    const clients = roomsMap.get(roomCode);
    if (clients) {
      clients.forEach(client => {
        // Exclui o cliente especificado (se fornecido) para evitar enviar mensagem de volta ao remetente
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(msg));
        }
      });
    }
  }

  function scheduleNextBotTurn(roomCode: string, state: GameState) {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer?.isBot) return;

    // Envia mensagem "Bot está pensando" para todos os clientes
    broadcast(roomCode, { 
      type: "bot_thinking", 
      botName: currentPlayer.name 
    });

    // Espera 3 segundos antes de executar a ação
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
    }, 3000); // 3 segundos de delay
  }

  return httpServer;
}
