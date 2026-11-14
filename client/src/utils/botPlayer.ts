import { GameState, GameAction } from "@shared/schema";
import { decideBotTurn, type BotDifficulty } from "@shared/botBrain";

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

  // Decide if bot wants to call "Cunoku" (end game)
  decideFinish(state: GameState, playerIndex: number): boolean {
    const player = state.players[playerIndex];
    const totalScore = player.hand.reduce((sum, card) => sum + card.value, 0);

    if (this.difficulty === "easy") {
      // Easy: call after round 3
      return state.round > 3 && totalScore < 15;
    }

    if (this.difficulty === "medium") {
      // Medium: call if score < 8
      return totalScore < 8;
    }

    // Hard: call if score is good AND others likely have worse
    return totalScore < 5;
  }
}

