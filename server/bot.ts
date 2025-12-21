import { GameState, GameAction, Player } from "@shared/schema";
import { randomUUID } from "crypto";

export type BotDifficulty = "easy" | "medium" | "hard";

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
    const player = state.players[playerIndex];
    
    // Check if there's a drawn card to handle
    if (state.drawnCard && state.turnPhase === "action") {
      return this.decideAction(state, playerIndex);
    }

    // Otherwise, decide whether to draw from deck or discard pile
    if (state.turnPhase === "draw") {
      return this.decideDraw(state);
    }

    // Default: draw from deck
    return { type: "draw_deck" };
  }

  private decideDraw(state: GameState): GameAction {
    if (this.difficulty === "easy") {
      // Easy: always draw from deck
      return { type: "draw_deck" };
    }

    if (this.difficulty === "medium") {
      // Medium: 70% deck, 30% discard
      return Math.random() < 0.7 ? { type: "draw_deck" } : { type: "draw_discard" };
    }

    // Hard: analyze discard pile card value
    const discardCard = state.discardPile[state.discardPile.length - 1];
    const highValueCards = [11, 12, 10]; // J, Q, 10
    
    // If discard is a good card (low value), take it
    if (discardCard.value < 5 || discardCard.value === -1) {
      return { type: "draw_discard" };
    }

    return { type: "draw_deck" };
  }

  private decideAction(state: GameState, playerIndex: number): GameAction {
    const drawnCard = state.drawnCard!;
    const player = state.players[playerIndex];

    if (this.difficulty === "easy") {
      // Easy: 50% discard, 50% swap random card
      if (Math.random() < 0.5) {
        return { type: "discard_drawn" };
      }
      const randomIdx = Math.floor(Math.random() * 4);
      return { type: "replace_card", handIndex: randomIdx };
    }

    if (this.difficulty === "medium") {
      // Medium: compare values
      const knownIndices = Object.entries(player.knownCards)
        .filter(([_, known]) => known)
        .map(([idx]) => parseInt(idx));

      if (knownIndices.length > 0) {
        // Check if any known card is worse than drawn
        const worstKnownIdx = knownIndices.reduce((worst, idx) => {
          const worstVal = player.hand[worst]?.value ?? 0;
          const currentVal = player.hand[idx]?.value ?? 0;
          return currentVal > worstVal ? idx : worst;
        });

        if (player.hand[worstKnownIdx]?.value > drawnCard.value) {
          return { type: "replace_card", handIndex: worstKnownIdx };
        }
      }

      return { type: "discard_drawn" };
    }

    // Hard: intelligent strategy
    const knownCards = Object.entries(player.knownCards)
      .filter(([_, known]) => known)
      .map(([idx]) => ({ idx: parseInt(idx), card: player.hand[parseInt(idx)] }));

    if (knownCards.length > 0) {
      // Find the worst known card
      const worstIdx = knownCards.reduce((worst, current) => 
        current.card.value > worst.card.value ? current : worst
      ).idx;

      // If drawn card is significantly better, swap
      if (player.hand[worstIdx].value - drawnCard.value > 1) {
        return { type: "replace_card", handIndex: worstIdx };
      }
    }

    // Otherwise, try to peek unknown cards (use ability 7/8)
    if (drawnCard.rank === "7" || drawnCard.rank === "8") {
      const unknownIndices = Object.entries(player.knownCards)
        .filter(([_, known]) => !known)
        .map(([idx]) => parseInt(idx));

      if (unknownIndices.length > 0) {
        const peekIdx = unknownIndices[0];
        return { type: "use_ability", ability: "peek_own", targetPlayerId: player.id, targetCardIndex: peekIdx };
      }
    }

    return { type: "discard_drawn" };
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
          .map(([idx]) => p.hand[parseInt(idx)]?.value || 0);
        const knownSum = knownCards.reduce((sum, val) => sum + val, 0);
        const unknownCount = 4 - knownCards.length;
        // Estima média de 5 pontos por carta desconhecida (valor médio aproximado)
        return knownSum + (unknownCount * 5);
      })
      .filter(score => score > 0);

    if (this.difficulty === "easy") {
      // Easy: declara apenas com pontuação muito boa e probabilidade baixa
      // Score < 10: 30% chance
      // Score < 8: 50% chance
      // Score < 6: 80% chance
      if (totalScore >= 10) return false;
      
      let probability = 0.3;
      if (totalScore < 8) probability = 0.5;
      if (totalScore < 6) probability = 0.8;
      
      return Math.random() < probability;
    }

    if (this.difficulty === "medium") {
      // Medium: declara com pontuação boa e probabilidade média
      // Score < 8: 40% chance
      // Score < 6: 60% chance
      // Score < 4: 85% chance
      if (totalScore >= 8) return false;
      
      let probability = 0.4;
      if (totalScore < 6) probability = 0.6;
      if (totalScore < 4) probability = 0.85;
      
      // Se outros jogadores parecem ter pontuação pior, aumenta probabilidade
      if (knownScores.length > 0) {
        const avgOtherScore = knownScores.reduce((sum, s) => sum + s, 0) / knownScores.length;
        if (totalScore < avgOtherScore - 2) {
          probability += 0.15; // Bônus se está claramente na frente
        }
      }
      
      return Math.random() < Math.min(probability, 0.95);
    }

    // Hard: declara com pontuação excelente e probabilidade alta
    // Score < 6: 50% chance
    // Score < 4: 75% chance
    // Score < 2: 95% chance
    // Score <= 0: 100% chance (sempre declara)
    if (totalScore <= 0) return true; // Sempre declara com pontuação perfeita ou negativa
    
    if (totalScore >= 6) return false;
    
    let probability = 0.5;
    if (totalScore < 4) probability = 0.75;
    if (totalScore < 2) probability = 0.95;
    
    // Hard bots são mais agressivos: se outros parecem ter pior pontuação, aumenta significativamente
    if (knownScores.length > 0) {
      const avgOtherScore = knownScores.reduce((sum, s) => sum + s, 0) / knownScores.length;
      if (totalScore < avgOtherScore - 1) {
        probability += 0.2; // Bônus maior para bots hard
      }
      // Se está claramente na frente, aumenta ainda mais
      if (totalScore < avgOtherScore - 3) {
        probability += 0.15;
      }
    }
    
    // Considera também o round: quanto mais rounds passaram, mais propenso a declarar
    if (state.round >= 7) {
      probability += 0.1; // Bônus após muitos rounds
    }
    
    return Math.random() < Math.min(probability, 0.98);
  }
}

export function createBots(count: number, difficulty: BotDifficulty): BotPlayer[] {
  const names = ["Bot Alpha", "Bot Beta", "Bot Gamma", "Bot Delta", "Bot Epsilon"];
  return Array.from({ length: count }).map((_, i) => 
    new BotPlayer(names[i] || `Bot ${i}`, difficulty)
  );
}
