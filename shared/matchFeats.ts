import type { GameAction, GameState } from "./schema";

/**
 * Conquistas de jogada, guardadas no aparelho: valem também offline e sem conta.
 * Cada uma libera um cosmético da mesa (verso, tapete ou emote exclusivo).
 */
export const FEAT_IDS = ["win_zero", "cunoku_blind", "queens_3", "professor_class"] as const;
export type FeatId = (typeof FEAT_IDS)[number];

export type FeatReward = { type: "back" | "mat" | "emote"; id: string };

export const FEAT_REWARDS: Record<FeatId, FeatReward[]> = {
  win_zero: [{ type: "back", id: "kin" }, { type: "emote", id: "party" }],
  cunoku_blind: [{ type: "mat", id: "kin" }, { type: "emote", id: "ninja" }],
  queens_3: [{ type: "back", id: "murasaki" }, { type: "emote", id: "crown" }],
  professor_class: [{ type: "emote", id: "grad" }],
};

/** Quantas Rainhas o jogador precisa usar numa partida para a conquista. */
export const QUEENS_FOR_FEAT = 3;

/** O que só dá para saber durante a partida, contado a cada jogada enviada. */
export type MatchTally = {
  queensUsed: number;
  /** Declarou Cunoku sem conhecer exatamente uma das próprias cartas. */
  cunokuBlind: boolean;
};

export const EMPTY_TALLY: MatchTally = { queensUsed: 0, cunokuBlind: false };

function unknownCardCount(state: GameState, playerId: string): number {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return 0;
  return me.hand.filter((_, i) => !me.knownCards[i.toString()]).length;
}

/** Atualiza a contagem com a jogada que o jogador acabou de enviar. */
export function tallyAction(tally: MatchTally, state: GameState, playerId: string, action: GameAction): MatchTally {
  if (action.type === "use_ability" && action.ability === "queen") {
    return { ...tally, queensUsed: tally.queensUsed + 1 };
  }
  if (action.type === "declare_finish" && unknownCardCount(state, playerId) === 1) {
    return { ...tally, cunokuBlind: true };
  }
  return tally;
}

/** Conquistas ganhas nesta partida que o jogador ainda não tinha. */
export function evaluateFeats(args: {
  state: GameState;
  playerId: string;
  tally: MatchTally;
  vsProfessor: boolean;
  already: readonly string[];
}): FeatId[] {
  const { state, playerId, tally } = args;
  if (!state.winnerId) return [];
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return [];
  const won = state.winnerId === playerId;
  const earned: Record<FeatId, boolean> = {
    win_zero: won && me.score <= 0,
    cunoku_blind: won && tally.cunokuBlind && state.finalRoundDeclarerId === playerId,
    queens_3: tally.queensUsed >= QUEENS_FOR_FEAT,
    professor_class: args.vsProfessor,
  };
  const have = new Set(args.already);
  return FEAT_IDS.filter((id) => earned[id] && !have.has(id));
}

/** Conquista que libera um cosmético; null quando ele já vem liberado. */
export function featForReward(type: FeatReward["type"], id: string): FeatId | null {
  for (const feat of FEAT_IDS) {
    if (FEAT_REWARDS[feat].some((r) => r.type === type && r.id === id)) return feat;
  }
  return null;
}

export function isRewardUnlocked(type: FeatReward["type"], id: string, feats: readonly string[]): boolean {
  const feat = featForReward(type, id);
  return feat === null || feats.includes(feat);
}
