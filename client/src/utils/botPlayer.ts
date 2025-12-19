import { GameState, GameAction, Player } from "@shared/schema";

export type BotDifficulty = "easy" | "medium" | "hard";

function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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
    
    // If discard is a good card (low value), take it
    if (discardCard && (discardCard.value < 5 || discardCard.value === -1)) {
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

