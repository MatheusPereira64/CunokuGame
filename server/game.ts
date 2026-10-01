import { Card, GameState, Player, Rank, Suit, RANKS, SUITS } from "@shared/schema";
import { randomInt, shuffleInPlace } from "@shared/secureRandom";

type AbilityResult = {
  success: boolean;
  message: string;
  privateInfo?: { card: Card; playerName: string };
  swapInfo?: { player1Name: string; player1CardIndex: number; player2Name: string; player2CardIndex: number };
};

type ActionResult = {
  newState: GameState;
  privateMessage?: { playerId: string; message: string; card?: Card; playerName?: string; targetPlayerId?: string; targetCardIndex?: number };
  swapInfo?: { player1Id: string; player1Name: string; player1CardIndex: number; player2Id: string; player2Name: string; player2CardIndex: number };
};

export class GameLogic {
  static createInitialState(players: Player[]): GameState {
    // Cria baralho baseado no número de jogadores
    // Para cada jogador adicional além de 2, adiciona mais um baralho completo
    const numberOfDecks = Math.max(1, Math.ceil(players.length / 2));
    const deck = this.createDeck(numberOfDecks);
    
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
      drawnFromDiscard: false,
      round: 1,
      winnerId: null,
      logs: [`Game started! Deck size: ${deck.length + 1} cards (${numberOfDecks} deck${numberOfDecks > 1 ? 's' : ''})`],
      finalRoundDeclarerId: null,
      isFinalRound: false
    };
  }

  static createDeck(numberOfDecks: number = 1): Card[] {
    const deck: Card[] = [];
    
    // Cria múltiplos baralhos conforme necessário
    for (let deckNum = 0; deckNum < numberOfDecks; deckNum++) {
      SUITS.forEach(suit => {
        RANKS.forEach(rank => {
          if (rank === "Joker") return; // Handle jokers separately
          deck.push({
            id: crypto.randomUUID(),
            suit,
            rank,
            value: this.getCardValue(rank),
            isFaceUp: false
          });
        });
      });
      // Add 2 Jokers per deck
      deck.push({ id: crypto.randomUUID(), suit: "spades", rank: "Joker", value: -1, isFaceUp: false });
      deck.push({ id: crypto.randomUUID(), suit: "hearts", rank: "Joker", value: -1, isFaceUp: false });
    }

    shuffleInPlace(deck);
    return deck;
  }

  static getCardValue(rank: Rank): number {
    if (rank === "Joker") return -1;
    if (rank === "K") return 0;
    if (rank === "A") return 1;
    if (rank === "J") return 11;
    if (rank === "Q") return 12;
    return Number.parseInt(rank) || 0;
  }

  static handleAbility(
    state: GameState,
    rank: Rank,
    sourceId: string,
    targetId?: string,
    cardIdx?: number,
    targetCardIdx?: number,
    targetPlayerId2?: string,
    targetCardIdx2?: number
  ): AbilityResult {
    const sourcePlayer = state.players.find(p => p.id === sourceId);
    if (!sourcePlayer) return { success: false, message: "Source player not found" };
    if (rank === "7" || rank === "8") return this.peekOwnCard(sourcePlayer, sourceId, targetId, cardIdx);
    if (rank === "5" || rank === "6") return this.peekOpponentCard(state, sourceId, targetId, cardIdx);
    if (rank === "9" || rank === "10") {
      return this.swapByRank(state, sourcePlayer, sourceId, targetId, cardIdx, targetCardIdx, targetPlayerId2, targetCardIdx2);
    }
    return { success: false, message: "No ability for this card" };
  }

  private static peekOwnCard(sourcePlayer: Player, sourceId: string, targetId?: string, cardIdx?: number): AbilityResult {
    if (!targetId || targetId !== sourceId || cardIdx === undefined) {
      return { success: false, message: "Invalid target for peek own card" };
    }
    if (cardIdx < 0 || cardIdx >= sourcePlayer.hand.length) {
      return { success: false, message: "Invalid card index" };
    }
    sourcePlayer.knownCards[cardIdx.toString()] = true;
    const card = sourcePlayer.hand[cardIdx];
    return { success: true, message: `You peeked at your card: ${card.rank} of ${card.suit}` };
  }

  private static peekOpponentCard(state: GameState, sourceId: string, targetId?: string, cardIdx?: number): AbilityResult {
    if (!targetId || targetId === sourceId || cardIdx === undefined) {
      return { success: false, message: "Invalid target for peek opponent card" };
    }
    const targetPlayer = state.players.find(p => p.id === targetId);
    if (!targetPlayer) return { success: false, message: "Target player not found" };
    if (cardIdx < 0 || cardIdx >= targetPlayer.hand.length) {
      return { success: false, message: "Invalid card index" };
    }
    return {
      success: true,
      message: `You peeked at ${targetPlayer.name}'s card`,
      privateInfo: { card: targetPlayer.hand[cardIdx], playerName: targetPlayer.name },
    };
  }

  private static swapByRank(
    state: GameState,
    sourcePlayer: Player,
    sourceId: string,
    targetId?: string,
    cardIdx?: number,
    targetCardIdx?: number,
    targetPlayerId2?: string,
    targetCardIdx2?: number,
  ): AbilityResult {
    if (targetPlayerId2) return this.swapBetweenPlayers(state, sourcePlayer, targetId, targetPlayerId2, cardIdx, targetCardIdx2);
    if (targetId && targetId !== sourceId) return this.swapWithOpponent(state, sourcePlayer, targetId, cardIdx, targetCardIdx);
    return { success: false, message: "No ability for this card" };
  }

  private static swapBetweenPlayers(
    state: GameState,
    sourcePlayer: Player,
    targetId: string | undefined,
    targetPlayerId2: string,
    cardIdx?: number,
    targetCardIdx2?: number,
  ): AbilityResult {
    const player1 = state.players.find(p => p.id === targetId);
    const player2 = state.players.find(p => p.id === targetPlayerId2);
    if (!player1 || !player2 || player1.id === player2.id) {
      return { success: false, message: "Must select two different players to swap" };
    }
    const cardIdx1 = cardIdx !== undefined ? cardIdx : randomInt(player1.hand.length);
    const cardIdx2 = targetCardIdx2 !== undefined ? targetCardIdx2 : randomInt(player2.hand.length);
    if (cardIdx1 < 0 || cardIdx1 >= player1.hand.length || cardIdx2 < 0 || cardIdx2 >= player2.hand.length) {
      return { success: false, message: "Invalid card indices for swap" };
    }
    return this.exchangeCards(sourcePlayer, player1, cardIdx1, player2, cardIdx2, true);
  }

  private static swapWithOpponent(
    state: GameState,
    sourcePlayer: Player,
    targetId: string,
    cardIdx?: number,
    targetCardIdx?: number,
  ): AbilityResult {
    const targetPlayer = state.players.find(p => p.id === targetId);
    if (!targetPlayer) return { success: false, message: "Target player not found" };
    const sourceCardIdx = cardIdx !== undefined ? cardIdx : randomInt(sourcePlayer.hand.length);
    const finalTargetCardIdx = targetCardIdx !== undefined ? targetCardIdx : randomInt(targetPlayer.hand.length);
    if (sourceCardIdx < 0 || sourceCardIdx >= sourcePlayer.hand.length || finalTargetCardIdx < 0 || finalTargetCardIdx >= targetPlayer.hand.length) {
      return { success: false, message: "Invalid card indices for swap" };
    }
    return this.exchangeCards(sourcePlayer, sourcePlayer, sourceCardIdx, targetPlayer, finalTargetCardIdx, false);
  }

  private static exchangeCards(
    sourcePlayer: Player,
    player1: Player,
    cardIdx1: number,
    player2: Player,
    cardIdx2: number,
    nameBothPlayers: boolean,
  ): AbilityResult {
    const card1 = player1.hand[cardIdx1];
    const card2 = player2.hand[cardIdx2];
    player1.hand[cardIdx1] = card2;
    player2.hand[cardIdx2] = card1;
    delete player1.knownCards[cardIdx1.toString()];
    delete player2.knownCards[cardIdx2.toString()];
    const message = nameBothPlayers
      ? `${sourcePlayer.name} swapped card ${cardIdx1 + 1} of ${player1.name} with card ${cardIdx2 + 1} of ${player2.name}`
      : `${sourcePlayer.name} swapped card ${cardIdx1 + 1} with card ${cardIdx2 + 1} of ${player2.name}`;
    return {
      success: true,
      message,
      swapInfo: {
        player1Name: player1.name,
        player1CardIndex: cardIdx1 + 1,
        player2Name: player2.name,
        player2CardIndex: cardIdx2 + 1,
      },
    };
  }

  private static finishBecauseDeckEmpty(newState: GameState, message: string): ActionResult {
    newState.turnPhase = "finished";
    this.calculateFinalScores(newState);
    newState.logs.push(message);
    return { newState };
  }

  private static advanceTurn(newState: GameState, playerId: string) {
    const nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    if (nextPlayerIndex === 0) newState.round++;
    if (newState.isFinalRound && newState.finalRoundDeclarerId === playerId) {
      newState.turnPhase = "finished";
      this.calculateFinalScores(newState);
      return;
    }
    newState.currentPlayerIndex = nextPlayerIndex;
  }

  private static reindexKnownCards(player: Player, removedIndex: number) {
    delete player.knownCards[removedIndex.toString()];
    const newKnownCards: Record<string, boolean> = {};
    Object.keys(player.knownCards).forEach((key) => {
      const idx = Number.parseInt(key);
      if (idx < removedIndex) newKnownCards[key] = true;
      else if (idx > removedIndex) newKnownCards[(idx - 1).toString()] = true;
    });
    player.knownCards = newKnownCards;
  }

  static processAction(state: GameState, action: any, playerId: string): ActionResult {
    const newState: GameState = structuredClone(state);
    const playerIndex = newState.players.findIndex((p: Player) => p.id === playerId);
    if (playerIndex === -1) return { newState: state };

    const player = newState.players[playerIndex];
    switch (action.type) {
      case "draw_deck":
        return this.drawFromDeck(newState, playerIndex);
      case "draw_discard":
        return this.drawFromDiscardPile(newState, playerIndex);
      case "discard_drawn":
        return this.discardDrawnCard(newState, playerIndex, playerId);
      case "replace_card":
        return this.replaceDrawnCard(newState, player, action, playerId, playerIndex);
      case "use_ability":
        return this.applyDrawnAbility(newState, action, playerId, playerIndex);
      case "matched_discard":
        return this.matchedDiscard(newState, player, action);
      case "declare_finish":
        return this.declareFinish(newState, playerId, playerIndex);
      case "discard_from_hand":
        return this.discardFromHand(newState, player, action, playerId, playerIndex);
      default:
        return { newState };
    }
  }


  private static drawFromDeck(newState: GameState, playerIndex: number): ActionResult {
    if (newState.deck.length === 0) {
      if (newState.discardPile.length <= 1) {
        return this.finishBecauseDeckEmpty(newState, "Baralho acabou! Jogo finalizado.");
      }
      const topDiscard = newState.discardPile.pop();
      newState.deck = [...newState.discardPile];
      newState.discardPile = topDiscard ? [topDiscard] : [];
      shuffleInPlace(newState.deck);
      newState.logs.push("Baralho reciclado e embaralhado");
    }
    const drawnCard = newState.deck.pop();
    if (!drawnCard) return this.finishBecauseDeckEmpty(newState, "Baralho acabou! Jogo finalizado.");
    newState.drawnCard = drawnCard;
    newState.drawnFromDiscard = false;
    newState.turnPhase = "action";
    newState.logs.push(`${newState.players[playerIndex].name} comprou uma carta do baralho`);
    return { newState };
  }

  private static drawFromDiscardPile(newState: GameState, playerIndex: number): ActionResult {
    const discardCard = newState.discardPile.pop();
    if (discardCard) {
      newState.drawnCard = discardCard;
      newState.drawnFromDiscard = true;
      newState.turnPhase = "action";
      newState.logs.push(`${newState.players[playerIndex].name} comprou a carta ${discardCard.rank} de ${discardCard.suit} da pilha de descarte`);
    }
    return { newState };
  }

  private static discardDrawnCard(newState: GameState, playerIndex: number, playerId: string): ActionResult {
    if (!newState.drawnCard) return { newState };
    const discardedCard = newState.drawnCard;
    newState.discardPile.push(discardedCard);
    newState.drawnCard = null;
    newState.drawnFromDiscard = false;
    newState.turnPhase = "draw";
    newState.logs.push(`${newState.players[playerIndex].name} descartou a carta ${discardedCard.rank} de ${discardedCard.suit}`);
    this.advanceTurn(newState, playerId);
    return { newState };
  }

  private static replaceDrawnCard(newState: GameState, player: Player, action: any, playerId: string, playerIndex: number): ActionResult {
    if (!(newState.drawnCard && action.handIndex !== undefined)) return { newState };
    const oldCard = player.hand[action.handIndex];
    player.hand[action.handIndex] = newState.drawnCard;
    if (oldCard) {
      newState.discardPile.push(oldCard);
      newState.logs.push(`${newState.players[playerIndex].name} substituiu a carta ${action.handIndex + 1} da mão`);
    }
    newState.drawnCard = null;
    newState.drawnFromDiscard = false;
    newState.turnPhase = "draw";
    this.advanceTurn(newState, playerId);
    return { newState };
  }

  private static applyDrawnAbility(newState: GameState, action: any, playerId: string, playerIndex: number): ActionResult {
    if (!newState.drawnCard || newState.drawnFromDiscard) return { newState };
    const abilityRank = newState.drawnCard.rank;
    const abilityResult = this.handleAbility(
      newState,
      abilityRank,
      playerId,
      action.targetPlayerId,
      action.targetCardIndex,
      action.targetCardIndex2,
      action.targetPlayerId2,
      action.targetCardIndex3,
    );
    if (!abilityResult.success) return { newState };
    this.logAbility(newState, playerIndex, abilityRank, action.targetPlayerId, abilityResult.swapInfo);
    newState.discardPile.push(newState.drawnCard);
    newState.drawnCard = null;
    newState.drawnFromDiscard = false;
    newState.turnPhase = "draw";
    this.advanceTurn(newState, playerId);
    return this.abilityActionResult(newState, playerId, action, abilityResult);
  }

  private static logAbility(
    newState: GameState,
    playerIndex: number,
    abilityRank: string,
    targetPlayerId: string | undefined,
    swapInfo?: { player1CardIndex: number; player1Name: string; player2CardIndex: number; player2Name: string },
  ) {
    const actor = newState.players[playerIndex].name;
    if (swapInfo) {
      newState.logs.push(`${actor} trocou a carta ${swapInfo.player1CardIndex} de ${swapInfo.player1Name} com a carta ${swapInfo.player2CardIndex} de ${swapInfo.player2Name}`);
      return;
    }
    if (abilityRank === "7" || abilityRank === "8") {
      newState.logs.push(`${actor} usou habilidade para ver uma de suas cartas`);
      return;
    }
    if (abilityRank === "5" || abilityRank === "6") {
      const targetPlayer = newState.players.find((p: Player) => p.id === targetPlayerId);
      if (targetPlayer) newState.logs.push(`${actor} usou habilidade para ver uma carta de ${targetPlayer.name}`);
    }
  }

  private static abilityActionResult(
    newState: GameState,
    playerId: string,
    action: any,
    abilityResult: {
      message: string;
      privateInfo?: { card: Card; playerName: string };
      swapInfo?: { player1Name: string; player1CardIndex: number; player2Name: string; player2CardIndex: number };
    },
  ): ActionResult {
    if (abilityResult.privateInfo) {
      return {
        newState,
        privateMessage: {
          playerId,
          message: abilityResult.message,
          card: abilityResult.privateInfo.card,
          playerName: abilityResult.privateInfo.playerName,
          targetPlayerId: action.targetPlayerId,
          targetCardIndex: action.targetCardIndex,
        },
        swapInfo: abilityResult.swapInfo ? this.swapIds(newState, abilityResult.swapInfo) : undefined,
      };
    }
    if (abilityResult.swapInfo) return { newState, swapInfo: this.swapIds(newState, abilityResult.swapInfo) };
    return { newState };
  }

  private static swapIds(
    newState: GameState,
    swapInfo: { player1Name: string; player1CardIndex: number; player2Name: string; player2CardIndex: number },
  ) {
    const player1 = newState.players.find((p: Player) => p.name === swapInfo.player1Name);
    const player2 = newState.players.find((p: Player) => p.name === swapInfo.player2Name);
    return {
      player1Id: player1?.id || "",
      player1Name: swapInfo.player1Name,
      player1CardIndex: swapInfo.player1CardIndex,
      player2Id: player2?.id || "",
      player2Name: swapInfo.player2Name,
      player2CardIndex: swapInfo.player2CardIndex,
    };
  }

  private static matchedDiscard(newState: GameState, player: Player, action: any): ActionResult {
    if (action.cardIndex === undefined) return { newState };
    const cardToDiscard = player.hand[action.cardIndex];
    const lastDiscarded = newState.discardPile[newState.discardPile.length - 1];
    if (!cardToDiscard || !player.knownCards[action.cardIndex.toString()] || !lastDiscarded || lastDiscarded.rank !== cardToDiscard.rank) {
      return { newState };
    }
    player.hand.splice(action.cardIndex, 1);
    newState.discardPile.push(cardToDiscard);
    this.reindexKnownCards(player, action.cardIndex);
    newState.logs.push(`${player.name} descartou a carta ${cardToDiscard.rank} de ${cardToDiscard.suit} (corresponde ao descarte)`);
    return { newState };
  }

  private static declareFinish(newState: GameState, playerId: string, playerIndex: number): ActionResult {
    if (newState.round < 5) {
      newState.logs.push(`${newState.players[playerIndex].name} cannot declare finish yet. Need at least 5 rounds.`);
      return { newState };
    }
    newState.finalRoundDeclarerId = playerId;
    newState.isFinalRound = true;
    newState.turnPhase = "draw";
    newState.logs.push(`${newState.players[playerIndex].name} declarou CUNOKU! Rodada final iniciada.`);
    return { newState };
  }

  private static discardFromHand(newState: GameState, player: Player, action: any, playerId: string, playerIndex: number): ActionResult {
    if (action.cardIndex === undefined || newState.discardPile.length === 0) return { newState };
    const cardToDiscard = player.hand[action.cardIndex];
    const topDiscard = newState.discardPile[newState.discardPile.length - 1];
    if (!cardToDiscard || !topDiscard) return { newState };
    if (cardToDiscard.rank !== topDiscard.rank) return this.punishWrongDiscard(newState, player, playerId, playerIndex);
    player.hand.splice(action.cardIndex, 1);
    newState.discardPile.push(cardToDiscard);
    this.reindexKnownCards(player, action.cardIndex);
    newState.logs.push(`${newState.players[playerIndex].name} descartou a carta ${cardToDiscard.rank} de ${cardToDiscard.suit} da mão`);
    this.advanceTurn(newState, playerId);
    return { newState };
  }

  private static punishWrongDiscard(newState: GameState, player: Player, playerId: string, playerIndex: number): ActionResult {
    if (player.hand.length >= 6) {
      newState.logs.push(`${newState.players[playerIndex].name} tentou descartar carta errada! Perde a vez (tem 6 cartas).`);
      this.advanceTurn(newState, playerId);
      return { newState };
    }
    const drawn = this.drawPenaltyCards(newState, player);
    if (drawn.ended) return { newState };
    const cardsDrawn = drawn.count;
    newState.logs.push(`${newState.players[playerIndex].name} tentou descartar carta errada! Compra ${cardsDrawn} carta${cardsDrawn > 1 ? "s" : ""} como punição.`);
    return { newState };
  }

  private static drawPenaltyCards(newState: GameState, player: Player): { ended: boolean; count: number } {
    let cardsDrawn = 0;
    for (let i = 0; i < 2; i++) {
      if (newState.deck.length === 0) {
        if (newState.discardPile.length <= 1) {
          this.finishBecauseDeckEmpty(newState, "Baralho acabou durante punição! Jogo finalizado.");
          return { ended: true, count: cardsDrawn };
        }
        const topDiscardCard = newState.discardPile.pop();
        newState.deck = [...newState.discardPile];
        newState.discardPile = topDiscardCard ? [topDiscardCard] : [];
        shuffleInPlace(newState.deck);
      }
      const penaltyCard = newState.deck.pop();
      if (!penaltyCard) {
        this.finishBecauseDeckEmpty(newState, "Baralho acabou durante punição! Jogo finalizado.");
        return { ended: true, count: cardsDrawn };
      }
      player.hand.push(penaltyCard);
      cardsDrawn++;
    }
    return { ended: false, count: cardsDrawn };
  }

  static calculateFinalScores(state: GameState): void {
    // Revela todas as cartas
    state.players.forEach(player => {
      // Marca todas as cartas como conhecidas para revelação
      player.hand.forEach((_, index) => {
        player.knownCards[index.toString()] = true;
      });
      
      // Calcula pontuação total
      player.score = player.hand.reduce((sum, card) => sum + card.value, 0);
    });
    
    // Encontra o vencedor (menor pontuação)
    const sortedPlayers = [...state.players].sort((a, b) => a.score - b.score);
    state.winnerId = sortedPlayers[0].id;
    
    state.logs.push(`Game finished! Winner: ${sortedPlayers[0].name} with ${sortedPlayers[0].score} points`);
  }
}
