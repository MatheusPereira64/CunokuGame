import { describe, expect, it } from "vitest";
import type { Card, GameState, Player } from "./schema";
import { coachTip } from "./coach";
import { EMPTY_TALLY, evaluateFeats, isRewardUnlocked, tallyAction } from "./matchFeats";

function card(rank: Card["rank"], value: number, id = `${rank}-${value}`): Card {
  return { id, suit: "spades", rank, value, isFaceUp: false };
}

function player(id: string, hand: Card[], known: number[] = []): Player {
  return {
    id,
    name: id,
    isBot: id !== "me",
    isConnected: true,
    hand,
    score: 0,
    knownCards: Object.fromEntries(known.map((i) => [String(i), true])),
  };
}

function state(patch: Partial<GameState>): GameState {
  return {
    deck: [],
    discardPile: [],
    players: [player("me", [card("9", 9, "a"), card("3", 3, "b")], [0, 1]), player("bot", [card("5", 5, "c")])],
    currentPlayerIndex: 0,
    turnPhase: "action",
    drawnCard: null,
    drawnFromDiscard: false,
    round: 3,
    winnerId: null,
    logs: [],
    ...patch,
  };
}

describe("coachTip", () => {
  it("aponta a troca que baixaria a mão quando o jogador descarta uma carta baixa", () => {
    const tip = coachTip(state({ drawnCard: card("A", 1) }), 0, { type: "discard_drawn" });
    expect(tip).toEqual({ key: "coach.shouldSwap", vars: { rank: "A", worst: "9", slot: "1", diff: "8" }, tone: "hint" });
  });

  it("avisa quando a troca aumenta os pontos da mão", () => {
    const tip = coachTip(state({ drawnCard: card("8", 8) }), 0, { type: "replace_card", handIndex: 1 });
    expect(tip?.key).toBe("coach.swappedUp");
    expect(tip?.vars.diff).toBe("5");
  });

  it("sugere trocar a pior carta conhecida em vez de outra", () => {
    const tip = coachTip(state({ drawnCard: card("2", 2) }), 0, { type: "replace_card", handIndex: 1 });
    expect(tip?.key).toBe("coach.betterSlot");
    expect(tip?.vars.slot).toBe("1");
  });

  it("elogia uma troca boa", () => {
    const tip = coachTip(state({ drawnCard: card("K", 0) }), 0, { type: "replace_card", handIndex: 0 });
    expect(tip).toEqual({ key: "coach.niceSwap", vars: { diff: "9" }, tone: "praise" });
  });

  it("não usa cartas que o jogador não conhece", () => {
    const s = state({ drawnCard: card("A", 1) });
    s.players[0].knownCards = {};
    expect(coachTip(s, 0, { type: "discard_drawn" })?.key).not.toBe("coach.shouldSwap");
  });

  it("lembra do Rei no descarte na hora de comprar", () => {
    const s = state({ turnPhase: "draw", discardPile: [card("K", 0)] });
    expect(coachTip(s, 0, { type: "draw_deck" })?.key).toBe("coach.takeDiscard");
  });
});

describe("conquistas de jogada", () => {
  it("conta Rainhas e Cunoku com uma carta desconhecida", () => {
    const s = state({});
    s.players[0].knownCards = { "0": true };
    let tally = tallyAction(EMPTY_TALLY, s, "me", { type: "use_ability", ability: "queen", targetPlayerId: "bot" });
    tally = tallyAction(tally, s, "me", { type: "declare_finish" });
    expect(tally).toEqual({ queensUsed: 1, cunokuBlind: true });
  });

  it("libera só as conquistas novas", () => {
    const s = state({ winnerId: "me", finalRoundDeclarerId: "me" });
    s.players[0].score = 0;
    const feats = evaluateFeats({
      state: s,
      playerId: "me",
      tally: { queensUsed: 3, cunokuBlind: true },
      vsProfessor: true,
      already: ["queens_3"],
    });
    expect(feats).toEqual(["win_zero", "cunoku_blind", "professor_class"]);
  });

  it("sem vitória não ganha as conquistas de vitória", () => {
    const s = state({ winnerId: "bot" });
    expect(evaluateFeats({ state: s, playerId: "me", tally: EMPTY_TALLY, vsProfessor: false, already: [] })).toEqual([]);
  });

  it("cosmético sem conquista vem liberado", () => {
    expect(isRewardUnlocked("back", "seigaiha", [])).toBe(true);
    expect(isRewardUnlocked("back", "kin", [])).toBe(false);
    expect(isRewardUnlocked("back", "kin", ["win_zero"])).toBe(true);
  });
});
