import { GameState, GameAction } from "@shared/schema";
import { stateRandom } from "@shared/seededRandom";
import { decideBotTurn, type BotDifficulty } from "@shared/botBrain";

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

  // Decide if bot wants to call "Cunoku" (end game)
  // Regra: só pode declarar após round 5
  // Lógica: quanto menor a pontuação (soma das cartas), maior a tendência de declarar
  // Bots com dificuldade maior são mais propensos a declarar com boas pontuações
  decideFinish(state: GameState, playerIndex: number): boolean {
    // Regra obrigatória: só pode declarar após round 5
    if (state.round < 5) {
      return false;
    }

    const player = state.players[playerIndex];
    const totalScore = player.hand.reduce((sum, card) => sum + card.value, 0);

    // Calcula pontuação média dos outros jogadores (se possível estimar)
    const otherPlayers = state.players.filter((p, idx) => idx !== playerIndex);
    const knownScores = otherPlayers
      .map(p => {
        // Tenta estimar pontuação baseada em cartas conhecidas
        const knownCards = Object.entries(p.knownCards)
          .filter(([_, known]) => known)
          .map(([idx]) => p.hand[Number.parseInt(idx)]?.value || 0);
        const knownSum = knownCards.reduce((sum, val) => sum + val, 0);
        const unknownCount = 4 - knownCards.length;
        // Estima média de 5 pontos por carta desconhecida (valor médio aproximado)
        return knownSum + (unknownCount * 5);
      })
      .filter(score => score > 0);

    const random = stateRandom(state, "finish");
    if (this.difficulty === "easy") return shouldEasyBotFinish(totalScore, random);
    if (this.difficulty === "medium") return shouldMediumBotFinish(totalScore, knownScores, random);
    return shouldHardBotFinish(totalScore, knownScores, state.round, random);
  }
}

function shouldEasyBotFinish(totalScore: number, random: () => number): boolean {
  if (totalScore >= 10) return false;
  let probability = 0.3;
  if (totalScore < 8) probability = 0.5;
  if (totalScore < 6) probability = 0.8;
  return random() < probability;
}

function shouldMediumBotFinish(totalScore: number, knownScores: number[], random: () => number): boolean {
  if (totalScore >= 8) return false;
  let probability = 0.4;
  if (totalScore < 6) probability = 0.6;
  if (totalScore < 4) probability = 0.85;
  if (knownScores.length > 0) {
    const avgOtherScore = knownScores.reduce((sum, s) => sum + s, 0) / knownScores.length;
    if (totalScore < avgOtherScore - 2) probability += 0.15;
  }
  return random() < Math.min(probability, 0.95);
}

function shouldHardBotFinish(totalScore: number, knownScores: number[], round: number, random: () => number): boolean {
  if (totalScore <= 0) return true;
  if (totalScore >= 6) return false;
  let probability = 0.5;
  if (totalScore < 4) probability = 0.75;
  if (totalScore < 2) probability = 0.95;
  probability += hardBotLeadBonus(totalScore, knownScores);
  if (round >= 7) probability += 0.1;
  return random() < Math.min(probability, 0.98);
}

function hardBotLeadBonus(totalScore: number, knownScores: number[]): number {
  if (knownScores.length === 0) return 0;
  const avgOtherScore = knownScores.reduce((sum, s) => sum + s, 0) / knownScores.length;
  let bonus = 0;
  if (totalScore < avgOtherScore - 1) bonus += 0.2;
  if (totalScore < avgOtherScore - 3) bonus += 0.15;
  return bonus;
}

export function createBots(count: number, difficulty: BotDifficulty): BotPlayer[] {
  const names = ["Bot Alpha", "Bot Beta", "Bot Gamma", "Bot Delta", "Bot Epsilon"];
  return Array.from({ length: count }).map((_, i) => 
    new BotPlayer(names[i] || `Bot ${i}`, difficulty)
  );
}
