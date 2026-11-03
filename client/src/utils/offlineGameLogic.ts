import { GameState, GameAction, Player } from "@shared/schema";
import { BotPlayer } from "@/utils/botPlayer";
import { randomFloat, randomInt, shuffleInPlace } from "@shared/secureRandom";
import {
  abilityTouchesSealedCard,
  applyForcedTrade,
  applyQueen,
  applySeal,
  applyWind,
  drawForPower,
  expireSeals,
  FINAL_ROUNDS,
  finalRoundsEnded,
  isSealed,
  recordSwap,
  replaceableIndexes,
} from "@shared/cardPowers";

/**
 * Processa uma ação do jogador no jogo offline
 */
export function processOfflineAction(
  gameState: GameState,
  action: GameAction,
  playerId: string
): GameState {
  const newState = { ...gameState };
  const playerIndex = newState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return gameState;

  const player = newState.players[playerIndex];
  switch (action.type) {
    case "draw_deck":
      return drawFromDeck(newState);
    case "draw_discard":
      return drawFromDiscard(newState);
    case "discard_drawn":
      return discardDrawn(newState, player, playerId);
    case "replace_card":
      return replaceDrawn(newState, player, action.handIndex, playerId);
    case "use_ability":
      return useDrawnAbility(newState, player, action, playerId);
    case "matched_discard":
      return matchedDiscard(newState, player, action.cardIndex);
    case "declare_finish":
      return declareFinish(newState, player, playerId);
    case "discard_from_hand":
      return discardFromHand(newState, player, action.cardIndex, playerId);
    default:
      return newState;
  }
}

function finishDeck(newState: GameState, message: string): GameState {
  newState.turnPhase = "finished";
  calculateFinalScores(newState);
  newState.logs.push(message);
  return newState;
}

function recycleDeck(newState: GameState): boolean {
  if (newState.discardPile.length <= 1) return false;
  const topDiscard = newState.discardPile.pop();
  newState.deck = [...newState.discardPile];
  newState.discardPile = topDiscard ? [topDiscard] : [];
  shuffleInPlace(newState.deck);
  return true;
}

function drawFromDeck(newState: GameState): GameState {
  if (newState.deck.length === 0) {
    if (!recycleDeck(newState)) return finishDeck(newState, "Baralho acabou! Jogo finalizado.");
    newState.logs.push("Baralho reciclado e embaralhado");
  }
  const drawnCard = newState.deck.pop();
  if (!drawnCard) return finishDeck(newState, "Baralho acabou! Jogo finalizado.");
  newState.drawnCard = drawnCard;
  newState.drawnFromDiscard = false;
  newState.turnPhase = "action";
  return newState;
}

function drawFromDiscard(newState: GameState): GameState {
  const discardCard = newState.discardPile.pop();
  if (!discardCard) return newState;
  newState.drawnCard = discardCard;
  newState.drawnFromDiscard = true;
  newState.turnPhase = "action";
  return newState;
}

function advanceTurn(newState: GameState) {
  const nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
  if (nextPlayerIndex === 0) newState.round++;
  if (finalRoundsEnded(newState, nextPlayerIndex)) {
    newState.turnPhase = "finished";
    calculateFinalScores(newState);
    return;
  }
  newState.currentPlayerIndex = nextPlayerIndex;
  expireSeals(newState);
}

function discardDrawn(newState: GameState, player: Player, playerId: string): GameState {
  if (!newState.drawnCard) return newState;
  if (newState.forcedReplace && replaceableIndexes(newState, player).length > 0) return newState;
  const discardedCard = newState.drawnCard;
  newState.discardPile.push(discardedCard);
  newState.drawnCard = null;
  newState.drawnFromDiscard = false;
  newState.forcedReplace = false;
  newState.jokerRevealed = false;
  newState.turnPhase = "draw";
  newState.logs.push(`${player.name} discarded ${discardedCard.rank}`);
  advanceTurn(newState);
  return newState;
}

function replaceDrawn(newState: GameState, player: Player, handIndex: number | undefined, playerId: string): GameState {
  if (!(newState.drawnCard && handIndex !== undefined)) return newState;
  if (newState.jokerRevealed || isSealed(newState, player.hand[handIndex]?.id)) return newState;
  newState.forcedReplace = false;
  const oldCard = player.hand[handIndex];
  player.hand[handIndex] = newState.drawnCard;
  if (oldCard) {
    newState.discardPile.push(oldCard);
    newState.logs.push(`${player.name} replaced a card`);
  }
  newState.drawnCard = null;
  newState.drawnFromDiscard = false;
  newState.turnPhase = "draw";
  advanceTurn(newState);
  return newState;
}

type AbilityAction = Extract<GameAction, { type: "use_ability" }>;

function useDrawnAbility(newState: GameState, player: Player, action: AbilityAction, playerId: string): GameState {
  if (!newState.drawnCard || newState.drawnFromDiscard || newState.forcedReplace) return newState;
  const rank = newState.drawnCard.rank;
  if (rank === "J") return useJack(newState, player, playerId);
  if (rank === "Joker") return useJoker(newState, player, action, playerId);
  if (abilityTouchesSealedCard(newState, rank, playerId, action)) return newState;
  const target = newState.players.find((p) => p.id === action.targetPlayerId);
  if (rank === "3" || rank === "4") {
    if (!applySeal(newState, playerId, action.targetPlayerId, action.targetCardIndex)) return newState;
    newState.logs.push(`${player.name} selou uma carta de ${target?.name}`);
  }
  if (rank === "Q") {
    if (!target || target.id === playerId) return newState;
    applyQueen(newState, player, target, randomFloat);
    newState.logs.push(`${player.name} usou a Rainha em ${target.name}`);
  }
  if (rank === "K") {
    if (!target) return newState;
    newState.logs.push(`${player.name} usou o Rei para ver as cartas de ${target.name}`);
  }
  if (rank === "7" || rank === "8") peekOwnCard(player, action, playerId);
  if (rank === "5" || rank === "6") peekOpponentCard(newState, action, playerId);
  if (rank === "9" || rank === "10") swapCards(newState, player, action, playerId);
  if (rank === "A" || rank === "2") windOnOpponent(newState, player, action, playerId);
  newState.discardPile.push(newState.drawnCard);
  newState.drawnCard = null;
  newState.drawnFromDiscard = false;
  newState.turnPhase = "draw";
  advanceTurn(newState);
  return newState;
}

/** Valete: vai para o descarte e a nova carta precisa substituir uma da mão. */
function useJack(newState: GameState, player: Player, playerId: string): GameState {
  const jack = newState.drawnCard!;
  const next = drawForPower(newState, randomFloat);
  newState.discardPile.push(jack);
  newState.logs.push(`${player.name} usou o Valete e comprou mais uma carta`);
  newState.drawnCard = next;
  if (next) {
    newState.forcedReplace = true;
    return newState;
  }
  newState.turnPhase = "draw";
  advanceTurn(newState);
  return newState;
}

/** Coringa em duas etapas: revela primeiro; a tela mostra as faces a partir do estado local. */
function useJoker(newState: GameState, player: Player, action: AbilityAction, playerId: string): GameState {
  if (!newState.jokerRevealed) {
    newState.jokerRevealed = true;
    newState.logs.push(`${player.name} usou o Coringa para ver as cartas de todos`);
    return newState;
  }
  if (!applyForcedTrade(newState, playerId, action.targetPlayerId, action.targetCardIndex, randomFloat)) return newState;
  const target = newState.players.find((p) => p.id === action.targetPlayerId);
  newState.logs.push(`${player.name} forçou ${target?.name} a trocar uma carta`);
  newState.discardPile.push(newState.drawnCard!);
  newState.drawnCard = null;
  newState.jokerRevealed = false;
  newState.turnPhase = "draw";
  advanceTurn(newState);
  return newState;
}

function peekOwnCard(player: Player, action: AbilityAction, playerId: string) {
  if (action.targetCardIndex === undefined || action.targetPlayerId !== playerId) return;
  const cardIdx = action.targetCardIndex;
  if (cardIdx < 0 || cardIdx >= player.hand.length) return;
  player.knownCards[cardIdx.toString()] = true;
}

function peekOpponentCard(newState: GameState, action: AbilityAction, playerId: string) {
  if (!action.targetPlayerId || action.targetPlayerId === playerId || action.targetCardIndex === undefined) return;
  const targetPlayer = newState.players.find(p => p.id === action.targetPlayerId);
  if (!targetPlayer) return;
  const cardIdx = action.targetCardIndex;
  if (cardIdx < 0 || cardIdx >= targetPlayer.hand.length) return;
}

function swapCards(newState: GameState, player: Player, action: AbilityAction, playerId: string) {
  const first = action.targetPlayerId2 ? newState.players.find(p => p.id === action.targetPlayerId) : player;
  const second = newState.players.find(p => p.id === (action.targetPlayerId2 ?? action.targetPlayerId));
  if (!first || !second || first.id === second.id) return;
  const firstIndex = action.targetCardIndex ?? randomInt(first.hand.length);
  const secondIndex = (action.targetPlayerId2 ? action.targetCardIndex3 : action.targetCardIndex2) ?? randomInt(second.hand.length);
  if (!cardInHand(first, firstIndex) || !cardInHand(second, secondIndex)) return;
  const firstCard = first.hand[firstIndex];
  first.hand[firstIndex] = second.hand[secondIndex];
  second.hand[secondIndex] = firstCard;
  delete first.knownCards[firstIndex.toString()];
  delete second.knownCards[secondIndex.toString()];
  recordSwap(newState, first, firstIndex, second, secondIndex);
}

function windOnOpponent(newState: GameState, player: Player, action: AbilityAction, playerId: string) {
  if (!action.targetPlayerId || action.targetPlayerId === playerId) return;
  const target = newState.players.find(p => p.id === action.targetPlayerId);
  if (!target) return;
  applyWind(newState, playerId, target, randomFloat);
  newState.logs.push(`${player.name} usou o Vento nas cartas de ${target.name}`);
}

function cardInHand(player: Player, index: number) {
  return index >= 0 && index < player.hand.length;
}

function reindexKnownCards(player: Player, removedIndex: number) {
  delete player.knownCards[removedIndex.toString()];
  const newKnownCards: Record<string, boolean> = {};
  Object.keys(player.knownCards).forEach((key) => {
    const idx = Number.parseInt(key);
    if (idx < removedIndex) newKnownCards[key] = true;
    else if (idx > removedIndex) newKnownCards[(idx - 1).toString()] = true;
  });
  player.knownCards = newKnownCards;
}

function matchedDiscard(newState: GameState, player: Player, cardIndex: number | undefined): GameState {
  if (cardIndex === undefined) return newState;
  const cardToDiscard = player.hand[cardIndex];
  if (!cardToDiscard || !player.knownCards[cardIndex.toString()] || isSealed(newState, cardToDiscard.id)) return newState;
  const lastDiscarded = newState.discardPile[newState.discardPile.length - 1];
  if (!lastDiscarded || lastDiscarded.rank !== cardToDiscard.rank) return newState;
  player.hand.splice(cardIndex, 1);
  newState.discardPile.push(cardToDiscard);
  reindexKnownCards(player, cardIndex);
  newState.logs.push(`${player.name} discarded matching ${cardToDiscard.rank}`);
  return newState;
}

function declareFinish(newState: GameState, player: Player, playerId: string): GameState {
  if (newState.isFinalRound) return newState;
  if (newState.round < 5) {
    newState.logs.push(`${player.name} cannot declare finish yet. Need at least 5 rounds.`);
    return newState;
  }
  newState.finalRoundDeclarerId = playerId;
  newState.isFinalRound = true;
  newState.finalRoundsLeft = FINAL_ROUNDS;
  newState.turnPhase = "draw";
  newState.logs.push(`${player.name} declared CUNOKU! Final round begins.`);
  return newState;
}

function discardFromHand(newState: GameState, player: Player, cardIndex: number | undefined, playerId: string): GameState {
  if (cardIndex === undefined || newState.discardPile.length === 0) return newState;
  const cardToDiscard = player.hand[cardIndex];
  const topDiscard = newState.discardPile[newState.discardPile.length - 1];
  if (!cardToDiscard || !topDiscard || isSealed(newState, cardToDiscard.id)) return newState;
  if (cardToDiscard.rank !== topDiscard.rank) return punishWrongDiscard(newState, player, playerId);
  player.hand.splice(cardIndex, 1);
  newState.discardPile.push(cardToDiscard);
  reindexKnownCards(player, cardIndex);
  newState.logs.push(`${player.name} discarded ${cardToDiscard.rank} from hand`);
  advanceTurn(newState);
  return newState;
}

function punishWrongDiscard(newState: GameState, player: Player, playerId: string): GameState {
  if (player.hand.length >= 6) {
    newState.logs.push(`${player.name} tried to discard wrong card! Loses turn (has 6 cards).`);
    advanceTurn(newState);
    return newState;
  }
  const cardsDrawn = drawPenaltyCards(newState, player);
  if (cardsDrawn == null) return newState;
  newState.logs.push(`${player.name} tried to discard wrong card! Draws ${cardsDrawn} card${cardsDrawn > 1 ? "s" : ""} as penalty.`);
  return newState;
}

function drawPenaltyCards(newState: GameState, player: Player): number | null {
  let cardsDrawn = 0;
  for (let i = 0; i < 2; i++) {
    if (newState.deck.length === 0) {
      if (!recycleDeck(newState)) {
        finishDeck(newState, "Baralho acabou durante punição! Jogo finalizado.");
        return null;
      }
    }
    const penaltyCard = newState.deck.pop();
    if (!penaltyCard) {
      finishDeck(newState, "Baralho acabou durante punição! Jogo finalizado.");
      return null;
    }
    player.hand.push(penaltyCard);
    cardsDrawn++;
  }
  return cardsDrawn;
}

/**
 * Calcula pontuações finais e determina vencedor
 */
function calculateFinalScores(state: GameState): void {
  state.players.forEach(player => {
    player.hand.forEach((_, index) => {
      player.knownCards[index.toString()] = true;
    });
    player.score = player.hand.reduce((sum, card) => sum + card.value, 0);
  });

  const sortedPlayers = [...state.players].sort((a, b) => a.score - b.score);
  state.winnerId = sortedPlayers[0].id;
  state.logs.push(`Game finished! Winner: ${sortedPlayers[0].name} with ${sortedPlayers[0].score} points`);
}

/**
 * Processa turno de um bot
 */
export function processBotTurn(
  gameState: GameState,
  botPlayer: BotPlayer,
  playerIndex: number
): GameState {
  const action = botPlayer.decideTurn(gameState, playerIndex);
  return processOfflineAction(gameState, action, gameState.players[playerIndex].id);
}
