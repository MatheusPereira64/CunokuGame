import type { Card, GameState, Player } from "./schema";
import { randomFloat, shuffleInPlace } from "./secureRandom";

/** Regras dos poderes compartilhadas entre o servidor e a partida offline. */
export const HAND_LIMIT = 6;
export const KING_REVEAL_MS = 20_000;
export const JOKER_REVEAL_MS = 40_000;

export type CardReveal = { playerId: string; cards: Card[] };

export function isSealed(state: GameState, cardId: string | undefined): boolean {
  return !!cardId && !!state.sealedCards?.some((s) => s.cardId === cardId);
}

/** Id novo, sem relação com o antigo: cartas mascaradas mantêm o id e ele não pode ligar uma carta à sua face. */
export function withFreshId(card: Card): Card {
  const id = Array.from({ length: 4 }, () => Math.floor(randomFloat() * 0x1_0000_0000).toString(16).padStart(8, "0")).join("");
  return { ...card, id };
}

/** O selo vale uma rodada: termina quando chega de novo a vez de quem selou. */
export function expireSeals(state: GameState): void {
  const current = state.players[state.currentPlayerIndex]?.id;
  if (!state.sealedCards?.length) return;
  state.sealedCards = state.sealedCards.filter((s) => s.sealerId !== current);
}

/** Cartas da mão que podem receber a carta comprada. */
export function replaceableIndexes(state: GameState, player: Player): number[] {
  return player.hand.flatMap((card, i) => (isSealed(state, card.id) ? [] : [i]));
}

/** Compra para um poder: recicla o descarte se preciso e devolve null se não houver carta. */
export function drawForPower(state: GameState, random: () => number): Card | null {
  if (state.deck.length === 0) {
    if (state.discardPile.length <= 1) return null;
    const top = state.discardPile.pop();
    state.deck = state.discardPile.map(withFreshId);
    state.discardPile = top ? [top] : [];
    shuffleInPlace(state.deck, random);
  }
  return state.deck.pop() ?? null;
}

function giveCards(state: GameState, player: Player, count: number, random: () => number): void {
  for (let i = 0; i < count && player.hand.length < HAND_LIMIT; i++) {
    const card = drawForPower(state, random);
    if (!card) return;
    player.hand.push(card);
  }
}

/** Rainha: o alvo compra 2 cartas e quem usou compra 1, sempre respeitando o limite da mão. */
export function applyQueen(state: GameState, source: Player, target: Player, random: () => number): void {
  giveCards(state, target, 2, random);
  giveCards(state, source, 1, random);
}

/** 3 e 4: sela uma carta de qualquer jogador; devolve false se a escolha for inválida. */
export function applySeal(state: GameState, sealerId: string, targetId: string | undefined, cardIndex: number | undefined): boolean {
  const target = state.players.find((p) => p.id === targetId);
  const card = cardIndex === undefined ? undefined : target?.hand[cardIndex];
  if (!card || isSealed(state, card.id)) return false;
  state.sealedCards = [...(state.sealedCards ?? []), { cardId: card.id, sealerId }];
  return true;
}

/** Faces que um poder de revelação mostra: carta selada continua virada. */
export function revealCards(state: GameState, playerIds: string[]): CardReveal[] {
  return state.players
    .filter((p) => playerIds.includes(p.id))
    .map((p) => ({ playerId: p.id, cards: p.hand.filter((c) => !isSealed(state, c.id)) }));
}

/** Coringa: troca a carta escolhida do alvo por uma do baralho; a antiga vai para o descarte. */
export function applyForcedTrade(
  state: GameState,
  sourceId: string,
  targetId: string | undefined,
  cardIndex: number | undefined,
  random: () => number,
): boolean {
  const target = state.players.find((p) => p.id === targetId);
  if (!target || target.id === sourceId || cardIndex === undefined) return false;
  const old = target.hand[cardIndex];
  if (!old || isSealed(state, old.id)) return false;
  const card = drawForPower(state, random);
  if (!card) return false;
  target.hand[cardIndex] = card;
  state.discardPile.push(old);
  delete target.knownCards[cardIndex.toString()];
  return true;
}

/** Vento: embaralha a mão com ids novos, e o selo acompanha a carta selada. */
export function applyWind(state: GameState, sourceId: string, target: Player, random: () => number): void {
  target.hand = target.hand.map((card) => {
    const fresh = withFreshId(card);
    state.sealedCards = state.sealedCards?.map((s) => (s.cardId === card.id ? { ...s, cardId: fresh.id } : s));
    return fresh;
  });
  shuffleInPlace(target.hand, random);
  target.knownCards = {};
  state.lastWind = { count: (state.lastWind?.count ?? 0) + 1, byId: sourceId, targetId: target.id };
}

type TargetFields = {
  targetPlayerId?: string;
  targetCardIndex?: number;
  targetCardIndex2?: number;
  targetPlayerId2?: string;
  targetCardIndex3?: number;
};

/** Espiar e trocar não alcançam carta selada. */
export function abilityTouchesSealedCard(state: GameState, rank: string, sourceId: string, action: TargetFields): boolean {
  const cardAt = (playerId: string | undefined, index: number | undefined) =>
    index === undefined ? undefined : state.players.find((p) => p.id === playerId)?.hand[index];
  const touched: (Card | undefined)[] = [];
  if (["5", "6", "7", "8"].includes(rank)) {
    touched.push(cardAt(action.targetPlayerId, action.targetCardIndex));
  } else if (rank === "9" || rank === "10") {
    touched.push(
      action.targetPlayerId2
        ? cardAt(action.targetPlayerId, action.targetCardIndex)
        : cardAt(sourceId, action.targetCardIndex),
      action.targetPlayerId2
        ? cardAt(action.targetPlayerId2, action.targetCardIndex3)
        : cardAt(action.targetPlayerId, action.targetCardIndex2),
    );
  }
  return touched.some((card) => isSealed(state, card?.id));
}
