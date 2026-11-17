import type { Card, GameAction, GameState } from "./schema";
import { isSealed } from "./cardPowers";
import { decideBotTurn } from "./botBrain";

/**
 * Professor: olha a jogada que o jogador acabou de fazer e, quando havia uma melhor,
 * explica com as cartas dele. Usa só o que o jogador sabe (as cartas que ele já viu).
 */
export type CoachTip = {
  key: string;
  vars: Record<string, string>;
  tone: "hint" | "praise";
};

/** Diferença mínima de pontos para valer um comentário: o Professor não corrige detalhe. */
const WORTH_MENTIONING = 3;
const NICE_SWAP = 5;

type KnownCard = { index: number; card: Card };

function knownCards(state: GameState, playerIndex: number): KnownCard[] {
  const player = state.players[playerIndex];
  return player.hand
    .map((card, index) => ({ index, card }))
    .filter(({ index, card }) => player.knownCards[index.toString()] && !isSealed(state, card.id));
}

function worstKnown(state: GameState, playerIndex: number): KnownCard | null {
  const known = knownCards(state, playerIndex);
  if (known.length === 0) return null;
  return known.reduce((worst, c) => (c.card.value > worst.card.value ? c : worst), known[0]);
}

function slot(index: number) {
  return String(index + 1);
}

export function coachTip(state: GameState, playerIndex: number, action: GameAction): CoachTip | null {
  const player = state.players[playerIndex];
  if (!player || state.winnerId) return null;
  if (state.turnPhase === "draw" && action.type === "draw_deck") return drawTip(state, playerIndex);
  const drawn = state.drawnCard;
  if (!drawn || state.turnPhase !== "action" || state.forcedReplace || state.jokerRevealed) return null;
  if (action.type === "discard_drawn") return discardTip(state, playerIndex, drawn);
  if (action.type === "replace_card") return replaceTip(state, playerIndex, drawn, action.handIndex);
  return null;
}

/** Carta de valor zero ou negativo no descarte vale mais que uma compra às cegas. */
function drawTip(state: GameState, playerIndex: number): CoachTip | null {
  const top = state.discardPile[state.discardPile.length - 1];
  const worst = worstKnown(state, playerIndex);
  if (!top || top.value > 0 || !worst || worst.card.value - top.value < NICE_SWAP) return null;
  return { key: "coach.takeDiscard", vars: { rank: top.rank, worst: worst.card.rank, slot: slot(worst.index) }, tone: "hint" };
}

function discardTip(state: GameState, playerIndex: number, drawn: Card): CoachTip | null {
  const worst = worstKnown(state, playerIndex);
  if (worst && worst.card.value - drawn.value >= WORTH_MENTIONING) {
    return {
      key: "coach.shouldSwap",
      vars: { rank: drawn.rank, worst: worst.card.rank, slot: slot(worst.index), diff: String(worst.card.value - drawn.value) },
      tone: "hint",
    };
  }
  // Sem troca boa, o poder da carta comprada costuma valer a pena
  if (!state.drawnFromDiscard && decideBotTurn(state, playerIndex, "hard").type === "use_ability") {
    return { key: "coach.unusedPower", vars: { rank: drawn.rank }, tone: "hint" };
  }
  return null;
}

function replaceTip(state: GameState, playerIndex: number, drawn: Card, handIndex: number): CoachTip | null {
  const player = state.players[playerIndex];
  const replaced = player.hand[handIndex];
  if (!replaced || !player.knownCards[handIndex.toString()]) return null;
  if (replaced.value < drawn.value) {
    return {
      key: "coach.swappedUp",
      vars: { old: replaced.rank, rank: drawn.rank, diff: String(drawn.value - replaced.value) },
      tone: "hint",
    };
  }
  const worst = worstKnown(state, playerIndex);
  if (worst && worst.index !== handIndex && worst.card.value - replaced.value >= WORTH_MENTIONING) {
    return {
      key: "coach.betterSlot",
      vars: { rank: drawn.rank, worst: worst.card.rank, slot: slot(worst.index), old: replaced.rank },
      tone: "hint",
    };
  }
  if (replaced.value - drawn.value >= NICE_SWAP) {
    return { key: "coach.niceSwap", vars: { diff: String(replaced.value - drawn.value) }, tone: "praise" };
  }
  return null;
}
