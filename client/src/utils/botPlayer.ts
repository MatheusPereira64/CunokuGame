import { GameState, GameAction } from "@shared/schema";
import { decideBotFinish, decideBotTurn, type BotDifficulty } from "@shared/botBrain";
import { randomUUID } from "@shared/secureRandom";

export type { BotDifficulty };

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
