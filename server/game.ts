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
      // Rule: "Cartas sempre do lado aveso para ninguem ver" - todas as cartas começam viradas
      p.knownCards = {}; 
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

  static handleAbility(
    state: GameState, 
    rank: Rank, 
    sourceId: string, 
    targetId?: string, 
    cardIdx?: number,
    targetCardIdx?: number
  ): { success: boolean; message: string; privateInfo?: { card: Card; playerName: string } } {
    const sourcePlayer = state.players.find(p => p.id === sourceId);
    if (!sourcePlayer) return { success: false, message: "Source player not found" };

    // 7,8: See own card
    if (rank === "7" || rank === "8") {
      if (!targetId || targetId !== sourceId || cardIdx === undefined) {
        return { success: false, message: "Invalid target for peek own card" };
      }
      if (cardIdx < 0 || cardIdx >= sourcePlayer.hand.length) {
        return { success: false, message: "Invalid card index" };
      }
      sourcePlayer.knownCards[cardIdx.toString()] = true;
      return { success: true, message: `You peeked at your card: ${sourcePlayer.hand[cardIdx].rank} of ${sourcePlayer.hand[cardIdx].suit}` };
    }
    
    // 5,6: See opponent card
    if (rank === "5" || rank === "6") {
      if (!targetId || targetId === sourceId || cardIdx === undefined) {
        return { success: false, message: "Invalid target for peek opponent card" };
      }
      const targetPlayer = state.players.find(p => p.id === targetId);
      if (!targetPlayer) {
        return { success: false, message: "Target player not found" };
      }
      if (cardIdx < 0 || cardIdx >= targetPlayer.hand.length) {
        return { success: false, message: "Invalid card index" };
      }
      const peekedCard = targetPlayer.hand[cardIdx];
      return { 
        success: true, 
        message: `You peeked at ${targetPlayer.name}'s card`,
        privateInfo: { card: peekedCard, playerName: targetPlayer.name }
      };
    }

    // 9,10: Swap cards between 2 players
    if (rank === "9" || rank === "10") {
      if (!targetId || targetId === sourceId) {
        return { success: false, message: "Must select a different player to swap" };
      }
      const targetPlayer = state.players.find(p => p.id === targetId);
      if (!targetPlayer) {
        return { success: false, message: "Target player not found" };
      }
      
      // Se não especificou índices, troca cartas aleatórias
      const sourceCardIdx = cardIdx !== undefined ? cardIdx : Math.floor(Math.random() * sourcePlayer.hand.length);
      const targetCardIdx = targetCardIdx !== undefined ? targetCardIdx : Math.floor(Math.random() * targetPlayer.hand.length);
      
      if (sourceCardIdx < 0 || sourceCardIdx >= sourcePlayer.hand.length ||
          targetCardIdx < 0 || targetCardIdx >= targetPlayer.hand.length) {
        return { success: false, message: "Invalid card indices for swap" };
      }

      // Troca as cartas
      const sourceCard = sourcePlayer.hand[sourceCardIdx];
      const targetCard = targetPlayer.hand[targetCardIdx];
      
      sourcePlayer.hand[sourceCardIdx] = targetCard;
      targetPlayer.hand[targetCardIdx] = sourceCard;
      
      // Reset knownCards para as cartas trocadas (elas se tornam desconhecidas)
      delete sourcePlayer.knownCards[sourceCardIdx.toString()];
      delete targetPlayer.knownCards[targetCardIdx.toString()];
      
      return { 
        success: true, 
        message: `Swapped cards with ${targetPlayer.name}` 
      };
    }

    return { success: false, message: "No ability for this card" };
  }

  static processAction(state: GameState, action: any, playerId: string): { 
    newState: GameState; 
    privateMessage?: { playerId: string; message: string; card?: Card; playerName?: string } 
  } {
    const newState = JSON.parse(JSON.stringify(state)); // Deep copy
    const playerIndex = newState.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      return { newState: state };
    }

    const player = newState.players[playerIndex];

    switch (action.type) {
      case "draw_deck":
        if (newState.deck.length === 0) {
          // Recicla pilha de descarte se baralho vazio
          const topDiscard = newState.discardPile.pop();
          newState.deck = [...newState.discardPile];
          newState.discardPile = topDiscard ? [topDiscard] : [];
          // Embaralha
          for (let i = newState.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newState.deck[i], newState.deck[j]] = [newState.deck[j], newState.deck[i]];
          }
        }
        const drawnCard = newState.deck.pop();
        if (drawnCard) {
          newState.drawnCard = drawnCard;
          newState.turnPhase = "action";
        }
        break;

      case "draw_discard":
        const discardCard = newState.discardPile.pop();
        if (discardCard) {
          newState.drawnCard = discardCard;
          newState.turnPhase = "action";
        }
        break;

      case "discard_drawn":
        if (newState.drawnCard) {
          newState.discardPile.push(newState.drawnCard);
          newState.drawnCard = null;
          newState.turnPhase = "draw";
          newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
        }
        break;

      case "replace_card":
        if (newState.drawnCard && action.handIndex !== undefined) {
          const oldCard = player.hand[action.handIndex];
          player.hand[action.handIndex] = newState.drawnCard;
          if (oldCard) {
            newState.discardPile.push(oldCard);
          }
          newState.drawnCard = null;
          newState.turnPhase = "draw";
          newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
        }
        break;

      case "use_ability":
        if (!newState.drawnCard) {
          return { newState };
        }
        const abilityResult = this.handleAbility(
          newState,
          newState.drawnCard.rank,
          playerId,
          action.targetPlayerId,
          action.targetCardIndex,
          action.targetCardIndex2
        );
        
        if (abilityResult.success) {
          // Descarta a carta após usar habilidade
          newState.discardPile.push(newState.drawnCard);
          newState.drawnCard = null;
          newState.turnPhase = "draw";
          newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
          
          // Se há informação privada (cartas 5 e 6), retorna para enviar mensagem privada
          if (abilityResult.privateInfo) {
            return {
              newState,
              privateMessage: {
                playerId,
                message: abilityResult.message,
                card: abilityResult.privateInfo.card,
                playerName: abilityResult.privateInfo.playerName
              }
            };
          }
        }
        break;

      case "declare_finish":
        newState.turnPhase = "finished";
        // TODO: Implementar lógica completa de fim de jogo
        break;
    }

    return { newState };
  }
}
