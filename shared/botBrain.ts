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
  if (state.turnPhase === "draw") return decideDraw(state, difficulty);
  return { type: "draw_deck" };
}

function decideDraw(state: GameState, difficulty: BotDifficulty): GameAction {
  // Fácil sempre compra do baralho
  if (difficulty === "easy") return { type: "draw_deck" };
  // Médio: 70% baralho, 30% descarte
  if (difficulty === "medium") {
    return stateRandom(state, "draw")() < 0.7 ? { type: "draw_deck" } : { type: "draw_discard" };
  }
  // Difícil: pega do descarte quando a carta é baixa
  const discardCard = state.discardPile[state.discardPile.length - 1];
  if (discardCard && (discardCard.value < 5 || discardCard.value === -1)) return { type: "draw_discard" };
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

  return queenAction(state, playerIndex) ?? windAction(state, playerIndex) ?? { type: "discard_drawn" };
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

  const wind = windAction(state, playerIndex);
  if (wind) return wind;

  // Espia uma carta própria desconhecida com 7/8
  if (drawnCard.rank === "7" || drawnCard.rank === "8") {
    const unknown = Object.entries(player.knownCards).find(([, known]) => !known);
    if (unknown) {
      return { type: "use_ability", ability: "peek_own", targetPlayerId: player.id, targetCardIndex: Number.parseInt(unknown[0]) };
    }
  }

  return { type: "discard_drawn" };
}
