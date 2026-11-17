import { GameState, GameAction } from "@shared/schema";
import { decideBotFinish, decideBotTurn, type BotDifficulty } from "@shared/botBrain";

export type { BotDifficulty };

function randomUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export class BotPlayer {
  id: string;
  name: string;
  difficulty: BotDifficulty;

  constructor(name: string, difficulty: BotDifficulty = "medium") {
    this.id = randomUUID();
    this.name = name;
    this.difficulty = difficulty;
  }

  decideTurn(state: GameState, playerIndex: number): GameAction {
    return decideBotTurn(state, playerIndex, this.difficulty);
  }

  /** Declara Cunoku antes de comprar? Mesma regra do servidor (shared/botBrain). */
  decideFinish(state: GameState, playerIndex: number): boolean {
    return decideBotFinish(state, playerIndex, this.difficulty);
  }
}
