import type { GameState, Player, Room } from "@shared/schema";
import { filterGameStateForPlayer } from "@shared/gameFilter";
import { GameLogic } from "./game";
import { BotPlayer, createBots, type BotDifficulty } from "./bot";
import { autoPlayDisconnectedTurn, syncReconnectWindow } from "./disconnectTurn";
import type { IStorage } from "./storage";
import { EMOTE_COOLDOWN_MS, isEmoteId } from "@shared/emotes";
import { recordFinishedMatch, type RecordedReward } from "./competition";
import type { CompetitionStore } from "./competitionStore";
import { QUICK_MATCH_MODE } from "@shared/matchQueue";

export type RoomMessenger = {
  /** Envia JSON a um jogador conectado. */
  send(playerId: string, msg: unknown): void;
  /** Broadcast; se excludePlayerId, não envia a ele. Filtra game_state por jogador. */
  broadcast(msg: unknown, excludePlayerId?: string | null): void;
  getConnectedPlayerIds(): string[];
  connectionCount(): number;
};

export type PlayerLook = { iconId?: string; accent?: string };

/** O valor vem do cliente e é reenviado aos outros: aceita só o formato de um id. */
function cleanLookId(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,32}$/.test(value) ? value : undefined;
}

export type RoomSessionData = {
  playerNames: Map<string, string>;
  /** Ícone e cor do perfil de cada jogador. */
  playerLooks: Map<string, PlayerLook>;
  bots: BotPlayer[];
  /** playerId da sala → conta do ranking, validada pelo token no join. */
  rankPlayerIds: Map<string, string>;
  lastEmoteAt: Map<string, number>;
};

export function createEmptySession(): RoomSessionData {
  return { playerNames: new Map(), playerLooks: new Map(), bots: [], rankPlayerIds: new Map(), lastEmoteAt: new Map() };
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
    ...session.playerLooks.get(id),
  }));
}

export async function handleJoinMessage(
  storage: IStorage,
  session: RoomSessionData,
  messenger: RoomMessenger,
  msg: { code: string; playerId: string; name: string; rankToken?: unknown; iconId?: unknown; accent?: unknown },
  registerConnection: (playerId: string) => void,
  /** Envio direto no socket que está entrando (antes de estar no mapa). */
  reply: (msg: unknown) => void,
  scheduleFollowUp?: (roomCode: string, state: GameState) => void,
  competition?: CompetitionStore,
): Promise<void> {
  const { code, playerId, name, rankToken } = msg;
  const room = await storage.getRoom(code);
  if (!room) {
    reply({ type: "error", message: "Room not found" });
    return;
  }

  const maxPlayers = (room as { maxPlayers?: number }).maxPlayers || 4;

  await rememberRankAccount(competition, session, playerId, rankToken);

  if (room.gameState) {
    const state = room.gameState as GameState;
    const existing = state.players.find((p) => p.id === playerId && !p.isBot);
    if (!existing) {
      reply({ type: "error", message: "Game has already started" });
      return;
    }
    existing.isConnected = true;
    if (name) {
      existing.name = name;
      session.playerNames.set(playerId, name);
    }
    registerConnection(playerId);
    const synced = syncReconnectWindow(state);
    await storage.updateGameState(code, synced);
    messenger.broadcast({ type: "game_state", state: synced });
    scheduleFollowUp?.(code, synced);
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
  session.playerLooks.set(playerId, { iconId: cleanLookId(msg.iconId), accent: cleanLookId(msg.accent) });

  const lobbyPlayers = buildLobbyPlayers(session, messenger.getConnectedPlayerIds());
  messenger.broadcast(
    {
      type: "lobby_state",
      players: lobbyPlayers,
      hostId: room.hostId,
      maxPlayers,
    },
    null,
  );
  messenger.broadcast({ type: "player_joined", playerId, name }, playerId);
}

/** Marca o jogador como desconectado se não houver outro socket dele. */
export async function handlePlayerDisconnect(
  storage: IStorage,
  messenger: RoomMessenger,
  roomCode: string,
  playerId: string,
  scheduleFollowUp?: (roomCode: string, state: GameState) => void,
): Promise<void> {
  if (messenger.getConnectedPlayerIds().includes(playerId)) return;
  const room = await storage.getRoom(roomCode);
  if (!room?.gameState) return;
  const state = room.gameState as GameState;
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.isBot || !player.isConnected) return;
  player.isConnected = false;
  const synced = syncReconnectWindow(state);
  await storage.updateGameState(roomCode, synced);
  messenger.broadcast({ type: "game_state", state: synced });
  scheduleFollowUp?.(roomCode, synced);
}

/** Compra e descarta pelo jogador que não voltou a tempo. */
export async function resolveDisconnectedTurn(
  storage: IStorage,
  messenger: RoomMessenger,
  roomCode: string,
  playerId: string,
): Promise<GameState | null> {
  const room = await storage.getRoom(roomCode);
  const state = room?.gameState as GameState | undefined;
  if (!state || state.reconnectPlayerId !== playerId) return null;
  const next = autoPlayDisconnectedTurn(state);
  if (next === state) return state;
  await storage.updateGameState(roomCode, next);
  messenger.broadcast({ type: "game_state", state: next });
  return next;
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

  if (room.gameState) return;

  const quickMatch = room.gameMode === QUICK_MATCH_MODE;
  if (room.hostId !== playerId && !quickMatch) {
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
    ...session.playerLooks.get(id),
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
  session?: RoomSessionData,
  competition?: CompetitionStore,
): Promise<void> {
  if (!roomCode || !playerId) return;

  const room = await storage.getRoom(roomCode);
  if (!room || !room.gameState) return;

  const state = room.gameState as GameState;
  if (state.winnerId) return;
  const result = GameLogic.processAction(state, action as never, playerId);
  result.newState = syncReconnectWindow(result.newState);

  await storage.updateGameState(roomCode, result.newState);
  const rewards = await settleFinishedMatch(competition, room, result.newState, session);
  messenger.broadcast({ type: "game_state", state: result.newState });
  sendRewards(messenger, rewards);

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

  if (result.privateReveal) {
    messenger.send(playerId, {
      type: "private_reveal",
      reveals: result.privateReveal.reveals,
      durationMs: result.privateReveal.durationMs,
    });
  }

  const next = result.newState.players[result.newState.currentPlayerIndex];
  if (!result.newState.winnerId && (next?.isBot || result.newState.reconnectDeadline)) {
    scheduleBot(roomCode, result.newState);
  }
}

export async function executeBotTurn(
  storage: IStorage,
  session: RoomSessionData,
  messenger: RoomMessenger,
  roomCode: string,
  scheduleBot: (roomCode: string, state: GameState) => void,
  competition?: CompetitionStore,
): Promise<void> {
  const room = await storage.getRoom(roomCode);
  if (!room || !room.gameState) return;

  let updatedState = room.gameState as GameState;
  if (updatedState.winnerId) return;
  const currentPlayer = updatedState.players[updatedState.currentPlayerIndex];
  if (!currentPlayer?.isBot) return;

  // Salas do desafio diário nascem fora do lobby: o bot é reconstruído a partir do estado
  const bot =
    session.bots.find((b) => b.id === currentPlayer.id) ??
    new BotPlayer(currentPlayer.name, (room.botDifficulty as BotDifficulty) || "medium", currentPlayer.id);

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
    const rewards = await settleFinishedMatch(competition, room, updatedState, session);
    messenger.broadcast({ type: "game_state", state: updatedState });
    sendRewards(messenger, rewards);
  }

  const synced = syncReconnectWindow(updatedState);
  if (synced !== updatedState) {
    updatedState = synced;
    await storage.updateGameState(roomCode, updatedState);
    messenger.broadcast({ type: "game_state", state: updatedState });
  }

  const next = updatedState.players[updatedState.currentPlayerIndex];
  if (!updatedState.winnerId && (next?.isBot || updatedState.reconnectDeadline)) {
    scheduleBot(roomCode, updatedState);
  }
}

/** O token nunca é confiado sem validação: é ele que liga o jogador da sala à conta do ranking. */
async function rememberRankAccount(
  competition: CompetitionStore | undefined,
  session: RoomSessionData,
  playerId: string,
  rankToken: unknown,
): Promise<void> {
  if (!competition || typeof rankToken !== "string" || !rankToken) return;
  try {
    const account = await competition.getAccountByToken(rankToken);
    if (account) session.rankPlayerIds.set(playerId, account.id);
  } catch (e) {
    console.error("Failed to validate rank token", e);
  }
}

/** Registra o resultado uma única vez; falha de ranking nunca pode travar a partida. */
async function settleFinishedMatch(
  competition: CompetitionStore | undefined,
  room: Room,
  state: GameState,
  session: RoomSessionData | undefined,
): Promise<RecordedReward[]> {
  if (!state.winnerId || !competition || !session) return [];
  try {
    return await recordFinishedMatch(competition, room, state, session.rankPlayerIds);
  } catch (e) {
    console.error("Failed to record match result", e);
    return [];
  }
}

function sendRewards(messenger: RoomMessenger, rewards: RecordedReward[]): void {
  for (const { playerId, reward } of rewards) {
    messenger.send(playerId, { type: "match_reward", ...reward });
  }
}

export function handleEmote(
  session: RoomSessionData,
  messenger: RoomMessenger,
  playerId: string,
  emoteId: unknown,
  now = Date.now(),
): void {
  if (!isEmoteId(emoteId)) return;
  const last = session.lastEmoteAt.get(playerId) ?? 0;
  // Pequena folga em relação ao cooldown do cliente por causa da latência
  if (now - last < EMOTE_COOLDOWN_MS - 250) return;
  session.lastEmoteAt.set(playerId, now);
  messenger.broadcast({ type: "emote", playerId, emoteId });
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
