import type { GameState, Player } from "@shared/schema";
import { filterGameStateForPlayer } from "@shared/gameFilter";
import { GameLogic } from "./game";
import { BotPlayer, createBots, type BotDifficulty } from "./bot";
import type { IStorage } from "./storage";

export type RoomMessenger = {
  /** Envia JSON a um jogador conectado. */
  send(playerId: string, msg: unknown): void;
  /** Broadcast; se excludePlayerId, não envia a ele. Filtra game_state por jogador. */
  broadcast(msg: unknown, excludePlayerId?: string | null): void;
  getConnectedPlayerIds(): string[];
  connectionCount(): number;
};

export type RoomSessionData = {
  playerNames: Map<string, string>;
  bots: BotPlayer[];
};

export function createEmptySession(): RoomSessionData {
  return { playerNames: new Map(), bots: [] };
}

export function serializeBots(bots: BotPlayer[]): { id: string; name: string; difficulty: BotDifficulty }[] {
  return bots.map((b) => ({ id: b.id, name: b.name, difficulty: b.difficulty }));
}

export function deserializeBots(
  raw: { id: string; name: string; difficulty: BotDifficulty }[],
): BotPlayer[] {
  return raw.map((b) => new BotPlayer(b.name, b.difficulty, b.id));
}

export function buildLobbyPlayers(session: RoomSessionData, connectedIds: string[]): Player[] {
  return connectedIds.map((id) => ({
    id,
    name: session.playerNames.get(id) || `Player ${id.substring(0, 4)}`,
    isBot: false,
    isConnected: true,
    hand: [],
    score: 0,
    knownCards: {},
  }));
}

export async function handleJoinMessage(
  storage: IStorage,
  session: RoomSessionData,
  messenger: RoomMessenger,
  msg: { code: string; playerId: string; name: string },
  registerConnection: (playerId: string) => void,
  /** Envio direto no socket que está entrando (antes de estar no mapa). */
  reply: (msg: unknown) => void,
): Promise<void> {
  const { code, playerId, name } = msg;
  const room = await storage.getRoom(code);
  if (!room) {
    reply({ type: "error", message: "Room not found" });
    return;
  }

  const maxPlayers = (room as { maxPlayers?: number }).maxPlayers || 4;

  if (room.gameState) {
    reply({ type: "error", message: "Game has already started" });
    return;
  }

  if (
    messenger.connectionCount() >= maxPlayers &&
    !messenger.getConnectedPlayerIds().includes(playerId)
  ) {
    reply({
      type: "error",
      message: `Room is full (max ${maxPlayers} players)`,
    });
    return;
  }

  registerConnection(playerId);
  session.playerNames.set(playerId, name);

  const lobbyPlayers = buildLobbyPlayers(session, messenger.getConnectedPlayerIds());
  messenger.broadcast(
    {
      type: "lobby_state",
      players: lobbyPlayers,
      hostId: room.hostId,
    },
    null,
  );
  messenger.broadcast({ type: "player_joined", playerId, name }, playerId);
}

export async function handleStartGame(
  storage: IStorage,
  session: RoomSessionData,
  messenger: RoomMessenger,
  roomCode: string,
  playerId: string,
  scheduleBot: (roomCode: string, state: GameState) => void,
): Promise<void> {
  if (!roomCode) {
    messenger.send(playerId, {
      type: "error",
      message: "No room associated with connection. Please reconnect.",
    });
    return;
  }

  const room = await storage.getRoom(roomCode);
  if (!room) {
    messenger.send(playerId, { type: "error", message: "Room not found" });
    return;
  }

  if (room.hostId !== playerId) {
    messenger.send(playerId, { type: "error", message: "Only the host can start the game" });
    return;
  }

  const connectedPlayers = messenger.getConnectedPlayerIds();
  if (connectedPlayers.length < 2) {
    messenger.send(playerId, {
      type: "error",
      message: "Need at least 2 players to start",
    });
    return;
  }

  const players: Player[] = connectedPlayers.map((id) => ({
    id,
    name: session.playerNames.get(id) || `Player ${id.substring(0, 4)}`,
    isBot: false,
    isConnected: true,
    hand: [],
    score: 0,
    knownCards: {},
  }));

  const maxPlayers = (room as { maxPlayers?: number }).maxPlayers || 4;
  const botCount = (room as { botCount?: number }).botCount || 0;
  const botDifficulty = (room.botDifficulty as BotDifficulty) || "medium";
  const availableSlots = maxPlayers - players.length;
  const botsToAdd = Math.min(botCount, availableSlots);

  if (botsToAdd > 0) {
    const bots = createBots(botsToAdd, botDifficulty);
    session.bots = bots;
    for (const bot of bots) {
      players.push({
        id: bot.id,
        name: bot.name,
        isBot: true,
        isConnected: true,
        hand: [],
        score: 0,
        knownCards: {},
      });
    }
  }

  if (players.length < 2) {
    messenger.send(playerId, {
      type: "error",
      message: "Need at least 2 players (including bots) to start",
    });
    return;
  }

  const newState = GameLogic.createInitialState(players);
  await storage.updateGameState(roomCode, newState);
  await storage.updateRoomStatus(roomCode, "playing");
  messenger.broadcast({ type: "game_state", state: newState });

  if (newState.players[0]?.isBot) {
    scheduleBot(roomCode, newState);
  }
}

export async function handlePlayerAction(
  storage: IStorage,
  messenger: RoomMessenger,
  roomCode: string,
  playerId: string,
  action: unknown,
  scheduleBot: (roomCode: string, state: GameState) => void,
): Promise<void> {
  if (!roomCode || !playerId) return;

  const room = await storage.getRoom(roomCode);
  if (!room || !room.gameState) return;

  const state = room.gameState as GameState;
  const result = GameLogic.processAction(state, action as never, playerId);

  await storage.updateGameState(roomCode, result.newState);
  messenger.broadcast({ type: "game_state", state: result.newState });

  if ((action as { type?: string }).type === "declare_finish" && result.newState.isFinalRound) {
    const declarer = result.newState.players.find((p) => p.id === playerId);
    if (declarer) {
      messenger.broadcast({ type: "cunoku_declared", playerName: declarer.name });
    }
  }

  if (result.privateMessage) {
    messenger.send(playerId, {
      type: "private_info",
      message: result.privateMessage.message,
      card: result.privateMessage.card,
      playerName: result.privateMessage.playerName,
      targetPlayerId: result.privateMessage.targetPlayerId,
      targetCardIndex: result.privateMessage.targetCardIndex,
    });
  }

  if (result.swapInfo) {
    messenger.broadcast({ type: "card_swap", swapInfo: result.swapInfo });
  }

  if (result.newState.players[result.newState.currentPlayerIndex]?.isBot) {
    scheduleBot(roomCode, result.newState);
  }
}

export async function executeBotTurn(
  storage: IStorage,
  session: RoomSessionData,
  messenger: RoomMessenger,
  roomCode: string,
  scheduleBot: (roomCode: string, state: GameState) => void,
): Promise<void> {
  const room = await storage.getRoom(roomCode);
  if (!room || !room.gameState) return;

  let updatedState = room.gameState as GameState;
  const currentPlayer = updatedState.players[updatedState.currentPlayerIndex];
  if (!currentPlayer?.isBot) return;

  const bot = session.bots.find((b) => b.id === currentPlayer.id);
  if (!bot) return;

  const playerIdx = updatedState.players.findIndex((p) => p.id === currentPlayer.id);

  if (
    updatedState.turnPhase === "draw" &&
    !updatedState.isFinalRound &&
    bot.decideFinish(updatedState, playerIdx)
  ) {
    const logsBefore = [...updatedState.logs];
    const finishResult = GameLogic.processAction(
      updatedState,
      { type: "declare_finish" },
      currentPlayer.id,
    );
    updatedState = finishResult.newState;

    const newLogs = updatedState.logs.slice(logsBefore.length);
    const botLogs = newLogs.filter((log) => log.includes(currentPlayer.name));
    if (botLogs.length > 0) {
      const lastBotLog = botLogs[botLogs.length - 1]!;
      messenger.broadcast({
        type: "bot_action",
        botName: currentPlayer.name,
        message: lastBotLog.replace(`${currentPlayer.name} `, ""),
      });
    }

    await storage.updateGameState(roomCode, updatedState);
    messenger.broadcast({ type: "game_state", state: updatedState });

    if (updatedState.isFinalRound) {
      messenger.broadcast({ type: "cunoku_declared", playerName: currentPlayer.name });
    }
  } else {
    const logsBefore = [...updatedState.logs];
    const action = bot.decideTurn(updatedState, playerIdx);
    const result = GameLogic.processAction(updatedState, action, currentPlayer.id);
    updatedState = result.newState;

    const newLogs = updatedState.logs.slice(logsBefore.length);
    const botLogs = newLogs.filter((log) => log.includes(currentPlayer.name));
    if (botLogs.length > 0) {
      const lastBotLog = botLogs[botLogs.length - 1]!;
      messenger.broadcast({
        type: "bot_action",
        botName: currentPlayer.name,
        message: lastBotLog.replace(`${currentPlayer.name} `, ""),
      });
    }

    await storage.updateGameState(roomCode, updatedState);
    messenger.broadcast({ type: "game_state", state: updatedState });
  }

  if (updatedState.players[updatedState.currentPlayerIndex]?.isBot) {
    scheduleBot(roomCode, updatedState);
  }
}

/** Cria messenger que filtra game_state por jogador. */
export function createFilteringMessenger(
  getSocket: (playerId: string) => { send: (data: string) => void; open: boolean } | undefined,
  getIds: () => string[],
): RoomMessenger {
  const sendRaw = (playerId: string, msg: unknown) => {
    const sock = getSocket(playerId);
    if (sock?.open) {
      sock.send(JSON.stringify(msg));
    }
  };

  return {
    send: sendRaw,
    broadcast(msg: unknown, excludePlayerId?: string | null) {
      const m = msg as { type?: string; state?: GameState };
      for (const id of getIds()) {
        if (excludePlayerId && id === excludePlayerId) continue;
        if (m.type === "game_state" && m.state) {
          sendRaw(id, { ...m, state: filterGameStateForPlayer(m.state, id) });
        } else {
          sendRaw(id, msg);
        }
      }
    },
    getConnectedPlayerIds: getIds,
    connectionCount: () => getIds().length,
  };
}
