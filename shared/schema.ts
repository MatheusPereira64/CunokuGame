import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
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
  turnPhase: "draw" | "action" | "discard" | "finished";
  drawnCard: Card | null; // The card currently drawn but not yet placed/discarded
  drawnFromDiscard: boolean; // True if drawnCard was taken from discard pile (can't use abilities)
  round: number;
  winnerId: string | null;
  logs: string[];
  finalRoundDeclarerId?: string | null; // ID do jogador que declarou fim de jogo
  isFinalRound?: boolean; // Se está na rodada final
}

// === TABLE DEFINITIONS ===
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  hostId: text("host_id").notNull(),
  status: text("status").notNull().default("waiting"), // waiting, playing, finished
  gameMode: text("game_mode").notNull().default("multiplayer"), // multiplayer, vs_bots
  botDifficulty: text("bot_difficulty").default("medium"), // easy, medium, hard
  gameState: jsonb("game_state").$type<GameState>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===
export const insertRoomSchema = createInsertSchema(rooms).omit({ id: true, createdAt: true, gameState: true });

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

// === API TYPES ===
export type CreateRoomRequest = { playerName: string; gameMode?: "multiplayer" | "vs_bots"; botDifficulty?: "easy" | "medium" | "hard" };
export type JoinRoomRequest = { code: string; name: string };
export type RoomResponse = Room & { playerCount: number };

// === WEBSOCKET TYPES ===
export type WsMessage =
  | { type: "connect"; playerId: string; roomCode: string }
  | { type: "game_state"; state: GameState }
  | { type: "player_action"; action: GameAction }
  | { type: "error"; message: string }
  | WsPrivateMessage;

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
};

