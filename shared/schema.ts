import { pgTable, text, serial, integer, boolean, timestamp, jsonb, primaryKey, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === CARD GAME TYPES ===
export const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "Joker"] as const;

export const SuitSchema = z.enum(SUITS);
export const RankSchema = z.enum(RANKS);

export type Suit = z.infer<typeof SuitSchema>;
export type Rank = z.infer<typeof RankSchema>;

export interface Card {
  id: string; // Unique ID for tracking
  suit: Suit;
  rank: Rank;
  value: number; // Game value (King=0, Joker=-1, etc)
  isFaceUp: boolean;
  /** Dono atual da carta (opcional; usado na distribuição) */
  ownerId?: string;
  /** Face mascarada pelo servidor: suit/rank/value são apenas marcadores */
  isHidden?: boolean;
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  isConnected: boolean;
  hand: Card[]; // 4 cards usually
  score: number; // Total score across rounds
  knownCards: Record<string, boolean>; // Indices of own cards known to player
}

export interface GameState {
  deck: Card[];
  discardPile: Card[];
  players: Player[];
  currentPlayerIndex: number;
  turnPhase: "waiting" | "draw" | "action" | "discard" | "finished";
  drawnCard: Card | null; // The card currently drawn but not yet placed/discarded
  drawnFromDiscard: boolean; // True if drawnCard was taken from discard pile (can't use abilities)
  round: number;
  winnerId: string | null;
  logs: string[];
  finalRoundDeclarerId?: string | null; // ID do jogador que declarou fim de jogo
  isFinalRound?: boolean; // Se está na rodada final
  seed?: string | null; // Seed do desafio diário (nunca enviada aos clientes)
  dailyDay?: string | null; // Dia (UTC) do desafio diário; ausente em partidas comuns
  /** Último uso do Vento, público para todos verem; count identifica cada uso. */
  lastWind?: { count: number; byId: string; targetId: string } | null;
  /** 3 e 4: cartas que não podem ser vistas, trocadas nem descartadas até a vez de quem selou. */
  sealedCards?: { cardId: string; sealerId: string }[];
  /** Valete: a carta comprada precisa substituir uma da mão. */
  forcedReplace?: boolean;
  /** Coringa: já revelou as cartas e falta decidir a troca forçada. */
  jokerRevealed?: boolean;
  /** Epoch ms: jogador offline tem até esse instante para voltar no turno dele */
  reconnectDeadline?: number | null;
  reconnectPlayerId?: string | null;
}

// === TABLE DEFINITIONS ===
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  hostId: text("host_id").notNull(),
  status: text("status").notNull().default("waiting"), // waiting, playing, finished
  gameMode: text("game_mode").notNull().default("multiplayer"), // multiplayer, vs_bots
  botDifficulty: text("bot_difficulty").default("medium"), // easy, medium, hard
  maxPlayers: integer("max_players").default(4), // Maximum number of players
  botCount: integer("bot_count").default(0), // Number of bots to add
  gameState: jsonb("game_state").$type<GameState>(),
  createdAt: timestamp("created_at").defaultNow(),
});

/** Sala do desafio diário de cada jogador: garante uma tentativa por dia e permite retomar. */
export const dailyEntries = pgTable("daily_entries", {
  day: text("day").notNull(),
  rankPlayerId: text("rank_player_id").notNull(),
  roomCode: text("room_code").notNull(),
  playerId: text("player_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.day, t.rankPlayerId] }),
  index("daily_entries_room_idx").on(t.roomCode),
]);

/** Resultado registrado pelo servidor; base do ranking do dia e da liga semanal. */
export const matchResults = pgTable("match_results", {
  id: serial("id").primaryKey(),
  rankPlayerId: text("rank_player_id").notNull(),
  displayName: text("display_name").notNull(),
  kind: text("kind").notNull(), // daily, online
  day: text("day").notNull(),
  week: text("week").notNull(),
  roomCode: text("room_code").notNull(),
  won: boolean("won").notNull(),
  score: integer("score").notNull(),
  points: integer("points").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  uniqueIndex("match_results_room_player_idx").on(t.roomCode, t.rankPlayerId),
  index("match_results_day_idx").on(t.day),
  index("match_results_week_idx").on(t.week),
  index("match_results_player_idx").on(t.rankPlayerId),
]);

// === SCHEMAS ===
export const insertRoomSchema = createInsertSchema(rooms).omit({ id: true, createdAt: true, gameState: true });

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type DailyEntry = typeof dailyEntries.$inferSelect;
export type MatchResult = typeof matchResults.$inferSelect;
export type InsertMatchResult = typeof matchResults.$inferInsert;

/** Contas leves para ranking global (apelido + PIN). */
export const rankPlayers = pgTable("rank_players", {
  id: text("id").primaryKey(),
  nickname: text("nickname").notNull().unique(),
  pinHash: text("pin_hash").notNull(),
  pinSalt: text("pin_salt").notNull(),
  displayName: text("display_name").notNull().default(""),
  iconId: text("icon_id").notNull().default("spade"),
  accent: text("accent").notNull().default("indigo"),
  frameId: text("frame_id").notNull().default("none"),
  titleId: text("title_id").notNull().default("none"),
  bannerId: text("banner_id").notNull().default("default"),
  wins: integer("wins").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  bestScore: integer("best_score"),
  progress: jsonb("progress").$type<Record<string, unknown>>().notNull().default({}),
  achievements: jsonb("achievements").$type<string[]>().notNull().default([]),
  authTokenHash: text("auth_token_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** Um login por aparelho: entrar em outro dispositivo não derruba os demais. */
export const rankSessions = pgTable("rank_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  playerId: text("player_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type RankPlayer = typeof rankPlayers.$inferSelect;
export type InsertRankPlayer = typeof rankPlayers.$inferInsert;

// === API TYPES ===
export type CreateRoomRequest = { playerName: string; gameMode?: "multiplayer" | "vs_bots"; botDifficulty?: "easy" | "medium" | "hard" };
export type JoinRoomRequest = { code: string; name: string };
export type RoomResponse = Room & { playerCount: number };

// === WEBSOCKET TYPES ===
export type WsMessage =
  | { type: "connect"; playerId: string; roomCode: string }
  | { type: "game_state"; state: GameState }
  | { type: "lobby_state"; players: Player[]; hostId?: string }
  | { type: "player_joined"; playerId: string; name: string }
  | { type: "player_action"; action: GameAction }
  | { type: "error"; message: string }
  | { type: "cunoku_declared"; playerName: string }
  | { type: "bot_thinking"; botName: string }
  | { type: "bot_action"; botName: string; message: string }
  | { type: "card_swap"; swapInfo: { player1Id: string; player1Name: string; player1CardIndex: number; player2Id: string; player2Name: string; player2CardIndex: number } }
  | { type: "emote"; playerId: string; emoteId: string }
  | { type: "private_reveal"; reveals: { playerId: string; cards: Card[] }[]; durationMs: number }
  | ({ type: "match_reward" } & MatchReward)
  | WsPrivateMessage;

/** Pontos de liga da partida e, no desafio diário, a posição no ranking do dia. */
export type MatchReward = {
  points: number;
  daily?: { rank: number; total: number; streak: number };
};

export type GameAction =
  | { type: "draw_deck" }
  | { type: "draw_discard" }
  | { type: "discard_drawn" }
  | { type: "replace_card"; handIndex: number } // Replace hand card with drawn card
  | { type: "use_ability"; ability: string; targetPlayerId?: string; targetCardIndex?: number; targetCardIndex2?: number; targetPlayerId2?: string; targetCardIndex3?: number }
  | { type: "declare_finish" }
  | { type: "matched_discard"; cardIndex: number } // Rule: Discard same card out of turn
  | { type: "discard_from_hand"; cardIndex: number }; // Rule: Discard card from hand if matches top of discard pile

export type WsPrivateMessage = {
  type: "private_info";
  message: string;
  card?: Card;
  playerName?: string;
  targetPlayerId?: string;
  targetCardIndex?: number;
};

