import type { GameAction, GameState } from "./schema";
import { HAND_LIMIT, isSealed, replaceableIndexes } from "./cardPowers";
import { stateRandom } from "./seededRandom";

/**
 * Decisões de jogada dos bots, iguais online (servidor) e offline (cliente).
 * Sem seed na partida, stateRandom usa o RNG seguro, então o offline continua aleatório.
 */
export type BotDifficulty = "easy" | "medium" | "hard";

/** Vento vale a pena contra quem mais conhece a própria mão. */
function pickWindTarget(state: GameState, playerIndex: number): string | null {
  let best: { id: string; known: number } | null = null;
  state.players.forEach((p, i) => {
    if (i === playerIndex) return;
    const known = Object.values(p.knownCards).filter(Boolean).length;
    if (known > 0 && (!best || known > best.known)) best = { id: p.id, known };
  });
  return (best as { id: string; known: number } | null)?.id ?? null;
}

/** Rainha: mira quem tem menos cartas, porque quem chegou ao limite não compra mais. */
function pickQueenTarget(state: GameState, playerIndex: number): string | null {
  const others = state.players.filter((p, i) => i !== playerIndex && p.hand.length < HAND_LIMIT);
  if (others.length === 0) return null;
  return others.reduce((fewest, p) => (p.hand.length < fewest.hand.length ? p : fewest), others[0]).id;
}

/** Valete obriga a substituir: escolhe a pior carta conhecida ou a primeira livre. */
function forcedReplaceAction(state: GameState, playerIndex: number): GameAction {
  const player = state.players[playerIndex];
  const free = replaceableIndexes(state, player);
  if (free.length === 0) return { type: "discard_drawn" };
  const known = free.filter((i) => player.knownCards[i.toString()]);
  const pool = known.length > 0 ? known : free;
  const worst = pool.reduce((a, b) => ((player.hand[b]?.value ?? 0) > (player.hand[a]?.value ?? 0) ? b : a), pool[0]);
  return { type: "replace_card", handIndex: worst };
}

/** Ás e 2 sem carta melhor para trocar: atrapalham a memória de um oponente. */
function windAction(state: GameState, playerIndex: number): GameAction | null {
  const drawnCard = state.drawnCard!;
  if ((drawnCard.rank !== "A" && drawnCard.rank !== "2") || state.drawnFromDiscard) return null;
  const windTarget = pickWindTarget(state, playerIndex);
  return windTarget ? { type: "use_ability", ability: "wind", targetPlayerId: windTarget } : null;
}

function queenAction(state: GameState, playerIndex: number): GameAction | null {
  if (state.drawnCard!.rank !== "Q" || state.drawnFromDiscard) return null;
  const queenTarget = pickQueenTarget(state, playerIndex);
  return queenTarget ? { type: "use_ability", ability: "queen", targetPlayerId: queenTarget } : null;
}

export function decideBotTurn(state: GameState, playerIndex: number, difficulty: BotDifficulty): GameAction {
  if (state.drawnCard && state.turnPhase === "action") return decideAction(state, playerIndex, difficulty);
  // Só se compra do baralho: a pilha de descarte não é uma fonte de compra
  return { type: "draw_deck" };
}

function decideAction(state: GameState, playerIndex: number, difficulty: BotDifficulty): GameAction {
  if (state.forcedReplace) return forcedReplaceAction(state, playerIndex);
  if (state.jokerRevealed) return { type: "discard_drawn" };
  if (difficulty === "easy") return decideEasyAction(state, playerIndex);
  if (difficulty === "medium") return decideMediumAction(state, playerIndex);
  return decideHardAction(state, playerIndex);
}

/** Fácil: 50% descarta, 50% troca uma carta qualquer. */
function decideEasyAction(state: GameState, playerIndex: number): GameAction {
  const player = state.players[playerIndex];
  const random = stateRandom(state, "action");
  if (random() < 0.5) return { type: "discard_drawn" };
  const free = replaceableIndexes(state, player);
  if (free.length === 0) return { type: "discard_drawn" };
  return { type: "replace_card", handIndex: free[Math.floor(random() * free.length)] };
}

/** Médio: troca a pior carta conhecida se a comprada for menor. */
function decideMediumAction(state: GameState, playerIndex: number): GameAction {
  const drawnCard = state.drawnCard!;
  const player = state.players[playerIndex];
  const knownIndices = Object.entries(player.knownCards)
    .filter(([, known]) => known)
    .map(([idx]) => Number.parseInt(idx))
    .filter((idx) => !isSealed(state, player.hand[idx]?.id));

  if (knownIndices.length > 0) {
    const worstKnownIdx = knownIndices.reduce((worst, idx) => {
      const worstVal = player.hand[worst]?.value ?? 0;
      const currentVal = player.hand[idx]?.value ?? 0;
      return currentVal > worstVal ? idx : worst;
    }, knownIndices[0]);
    if (player.hand[worstKnownIdx]?.value > drawnCard.value) {
      return { type: "replace_card", handIndex: worstKnownIdx };
    }
  }

  return queenAction(state, playerIndex) ?? lowCardOrWind(state, playerIndex, 2) ?? { type: "discard_drawn" };
}

/**
 * Ás e 2 servem para duas coisas: melhorar a própria mão ou atrapalhar um oponente (Vento).
 * Com duas ou mais cartas desconhecidas, melhorar a mão rende mais; com a mão já conhecida,
 * o Vento passa na frente. Sem alvo para o Vento, a carta baixa sempre vai para a mão.
 */
function lowCardOrWind(state: GameState, playerIndex: number, maxValue: number): GameAction | null {
  const player = state.players[playerIndex];
  const unknown = player.hand.filter((_, i) => !player.knownCards[i.toString()]).length;
  if (unknown >= 2) return lowCardIntoUnknown(state, playerIndex, maxValue) ?? windAction(state, playerIndex);
  return windAction(state, playerIndex) ?? lowCardIntoUnknown(state, playerIndex, maxValue);
}

/**
 * Carta baixa comprada vale mais que uma carta desconhecida (que em média vale ~5):
 * troca pela primeira desconhecida. Sem olhar a carta: é a aposta que um jogador faria.
 */
function lowCardIntoUnknown(state: GameState, playerIndex: number, maxValue: number): GameAction | null {
  const drawn = state.drawnCard;
  if (!drawn || drawn.value > maxValue) return null;
  const player = state.players[playerIndex];
  const unknown = replaceableIndexes(state, player).find((i) => !player.knownCards[i.toString()]);
  return unknown === undefined ? null : { type: "replace_card", handIndex: unknown };
}

/** Difícil: troca quando ganha bem, usa Rainha/Valete/Vento e espia cartas desconhecidas. */
function decideHardAction(state: GameState, playerIndex: number): GameAction {
  const drawnCard = state.drawnCard!;
  const player = state.players[playerIndex];
  const knownCards = Object.entries(player.knownCards)
    .filter(([, known]) => known)
    .map(([idx]) => ({ idx: Number.parseInt(idx), card: player.hand[Number.parseInt(idx)] }))
    .filter(({ card }) => card && !isSealed(state, card.id));

  if (knownCards.length > 0) {
    const worstIdx = knownCards.reduce((worst, current) => (current.card.value > worst.card.value ? current : worst), knownCards[0]).idx;
    if (player.hand[worstIdx].value - drawnCard.value > 1) {
      return { type: "replace_card", handIndex: worstIdx };
    }
  }

  const queen = queenAction(state, playerIndex);
  if (queen) return queen;
  // Valete só compensa com uma carta alta conhecida para trocar
  if (drawnCard.rank === "J" && !state.drawnFromDiscard && knownCards.some(({ card }) => card.value >= 8)) {
    return { type: "use_ability", ability: "jack" };
  }

  const lowOrWind = lowCardOrWind(state, playerIndex, 3);
  if (lowOrWind) return lowOrWind;

  // Espia uma carta própria desconhecida com 7/8
  if (drawnCard.rank === "7" || drawnCard.rank === "8") {
    const unknown = Object.entries(player.knownCards).find(([, known]) => !known);
    if (unknown) {
      return { type: "use_ability", ability: "peek_own", targetPlayerId: player.id, targetCardIndex: Number.parseInt(unknown[0]) };
    }
  }

  return { type: "discard_drawn" };
}

// ============================================
// DECLARAR CUNOKU (fim de jogo)
// ============================================

/** Valor médio de uma carta do baralho (≈5,5): o que o bot supõe de uma carta que não viu. */
export const UNKNOWN_CARD_ESTIMATE = 5;
/** Oponentes também trocam as cartas ruins: cada carta deles vale um pouco menos que a média. */
const OPPONENT_CARD_ESTIMATE = 4;
/** Rodada mínima para declarar, igual à regra do jogo. */
const FINISH_MIN_ROUND = 5;
/** Depois desta rodada os bots ficam mais ousados, para a partida não se arrastar. */
const LATE_ROUND = 7;

/** Pontos que o jogador acha que tem: cartas que ele conhece pelo valor, as outras pela média. */
export function estimatedHandScore(state: GameState, playerIndex: number): number {
  const player = state.players[playerIndex];
  return player.hand.reduce(
    (sum, card, i) => sum + (player.knownCards[i.toString()] ? card.value : UNKNOWN_CARD_ESTIMATE),
    0,
  );
}

/**
 * Melhor (menor) estimativa entre os oponentes. O bot não conhece as cartas deles:
 * só vê quantas cartas cada um tem.
 */
function bestOpponentEstimate(state: GameState, playerIndex: number): number | null {
  const sizes = state.players.filter((_, i) => i !== playerIndex).map((p) => p.hand.length * OPPONENT_CARD_ESTIMATE);
  return sizes.length > 0 ? Math.min(...sizes) : null;
}

/**
 * Decide se o bot declara Cunoku antes de comprar. Usa só o que um jogador de verdade saberia:
 * o valor das próprias cartas que já viu e quantas cartas os oponentes têm.
 * Quanto menor a estimativa, maior a chance; o difícil arrisca menos pontos e lê melhor a mesa.
 */
export function decideBotFinish(state: GameState, playerIndex: number, difficulty: BotDifficulty): boolean {
  if (state.round < FINISH_MIN_ROUND || state.isFinalRound || state.turnPhase !== "draw" || state.winnerId) return false;
  // Na reta longa da partida, cada rodada a mais deixa o bot mais disposto a encerrar
  const boldness = Math.max(0, state.round - LATE_ROUND) * 1.5;
  const score = estimatedHandScore(state, playerIndex) - boldness;
  const rival = bestOpponentEstimate(state, playerIndex);
  const random = stateRandom(state, "finish");
  // Vantagem: quanto o bot acha que está na frente do oponente mais perigoso
  const lead = rival === null ? 0 : rival - score;
  if (difficulty === "easy") return easyFinish(score, lead, random);
  if (difficulty === "medium") return mediumFinish(score, lead, random);
  return hardFinish(score, lead, random);
}

/** Fácil: só declara com a mão claramente baixa ou muito à frente, e às vezes hesita. */
function easyFinish(score: number, lead: number, random: () => number): boolean {
  let probability = 0;
  if (score < 12 || lead >= 6) probability = 0.3;
  if (score < 7 || lead >= 10) probability = 0.6;
  return random() < probability;
}

/** Médio: declara quando acha que está bem à frente. */
function mediumFinish(score: number, lead: number, random: () => number): boolean {
  let probability = 0;
  if (score < 8 || lead >= 7) probability = 0.45;
  if (score < 5 || lead >= 10) probability = 0.8;
  return random() < probability;
}

/** Difícil: lê a vantagem mais cedo e não deixa passar uma mão zerada. */
function hardFinish(score: number, lead: number, random: () => number): boolean {
  if (score <= 0) return true;
  let probability = 0;
  if (score < 6 || lead >= 6) probability = 0.6;
  if (score < 3 || lead >= 9) probability = 0.92;
  return random() < probability;
}
