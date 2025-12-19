import { Card, GameState, Player, Rank, Suit, RANKS, SUITS } from "@shared/schema";
import { randomUUID } from "crypto";

export class GameLogic {
  static createInitialState(players: Player[]): GameState {
    const deck = this.createDeck();
    
    // Deal 4 cards to each player
    players.forEach(p => {
      p.hand = [];
      for (let i = 0; i < 4; i++) {
        const card = deck.pop();
        if (card) {
          card.ownerId = p.id;
          p.hand.push(card);
        }
      }
      // Players usually start knowing 2 of their cards? Or 0? 
      // Rule: "Cartas sempre do lado aveso para ninguem ver" implies 0 known initially, 
      // but standard "Golf" rules usually allow seeing 2 cards at start. 
      // Prompt doesn't specify initial peek, assuming 0 for now or maybe 2.
      // Let's assume standard "Golf/Cabo" rules: peek 2 at start.
      p.knownCards = { "0": true, "1": true }; 
    });

    return {
      deck,
      discardPile: [deck.pop()!], // Start with one discarded
      players,
      currentPlayerIndex: 0,
      turnPhase: "draw",
      drawnCard: null,
      round: 1,
      winnerId: null,
      logs: ["Game started!"]
    };
  }

  static createDeck(): Card[] {
    const deck: Card[] = [];
    SUITS.forEach(suit => {
      RANKS.forEach(rank => {
        if (rank === "Joker") return; // Handle jokers separately if needed (usually 2)
        deck.push({
          id: randomUUID(),
          suit,
          rank,
          value: this.getCardValue(rank),
          isFaceUp: false
        });
      });
    });
    // Add 2 Jokers
    deck.push({ id: randomUUID(), suit: "spades", rank: "Joker", value: -1, isFaceUp: false });
    deck.push({ id: randomUUID(), suit: "hearts", rank: "Joker", value: -1, isFaceUp: false });

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  static getCardValue(rank: Rank): number {
    if (rank === "Joker") return -1;
    if (rank === "K") return 0;
    if (rank === "A") return 1;
    if (rank === "J") return 11;
    if (rank === "Q") return 12;
    return parseInt(rank) || 0;
  }

  static handleAbility(state: GameState, rank: Rank, sourceId: string, targetId?: string, cardIdx?: number): string {
    // 7,8: See own card
    if (rank === "7" || rank === "8") {
      if (!targetId || targetId !== sourceId || cardIdx === undefined) return "Invalid target";
      const p = state.players.find(p => p.id === sourceId);
      if (p) p.knownCards[cardIdx] = true;
      return "Peeked own card";
    }
    
    // 5,6: See opponent card
    if (rank === "5" || rank === "6") {
      if (!targetId || targetId === sourceId || cardIdx === undefined) return "Invalid target";
      // This logic needs to send the info ONLY to the source player via WS private message, 
      // but for simplicity in state, we mark it known? No, only source knows it.
      // We'll return the card info in the log or a special "private" field.
      // ideally we shouldn't modify global state 'knownCards' if only one person sees it.
      // For MVP, we'll send a "toast" to the player.
      return `Peeked opponent card`;
    }

    // 9,10: Swap
    if (rank === "9" || rank === "10") {
       // Requires complex swapping logic between two players
       // For MVP, simplistic swap: random card or specific if provided?
       // "Faça 2 jogadores trocarem 1 carta"
       return "Swap capability triggered";
    }

    return "No ability";
  }
}
