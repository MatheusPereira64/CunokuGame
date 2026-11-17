import { GameState, GameAction } from "@shared/schema";
import { decideBotFinish, decideBotTurn, type BotDifficulty } from "@shared/botBrain";

export type { BotDifficulty };

export class BotPlayer {
  id: string;
  name: string;
  difficulty: BotDifficulty;

  constructor(name: string, difficulty: BotDifficulty = "medium", id?: string) {
    this.id = id ?? crypto.randomUUID();
    this.name = name;
    this.difficulty = difficulty;
  }

  decideTurn(state: GameState, playerIndex: number): GameAction {
    return decideBotTurn(state, playerIndex, this.difficulty);
  }

  /** Declara Cunoku antes de comprar? Mesma regra do offline (shared/botBrain). */
  decideFinish(state: GameState, playerIndex: number): boolean {
    return decideBotFinish(state, playerIndex, this.difficulty);
  }
}

export function createBots(count: number, difficulty: BotDifficulty): BotPlayer[] {
  const names = ["Bot Alpha", "Bot Beta", "Bot Gamma", "Bot Delta", "Bot Epsilon"];
  return Array.from({ length: count }).map((_, i) => 
    new BotPlayer(names[i] || `Bot ${i}`, difficulty)
  );
}
