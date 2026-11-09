import { describe, expect, it } from "vitest";
import type { Card, GameState, Player } from "@shared/schema";
import { filterGameStateForPlayer } from "@shared/gameFilter";
import { processOfflineAction } from "../client/src/utils/offlineGameLogic";
import { applyBotReactions } from "@shared/cardPowers";
import { GameLogic } from "./game";

const card = (id: string, rank: Card["rank"]): Card => ({ id, rank, value: 5, suit: "hearts", isFaceUp: false });

function player(id: string, hand: Card[], known: number[] = []): Player {
  return {
    id,
    name: id,
    isBot: false,
    isConnected: true,
    hand,
    score: 0,
    knownCards: Object.fromEntries(known.map((i) => [String(i), true])),
  };
}

const sixCards = (prefix: string) => ["5", "6", "7", "8", "9", "2"].map((rank, i) => card(`${prefix}${i}`, rank as Card["rank"]));

/** Vez da Ana, antes de comprar; o topo da pilha é um 10. */
function table(overrides: Partial<GameState> = {}): GameState {
  return {
    deck: [card("d1", "6"), card("d2", "7"), card("d3", "8"), card("d4", "9")],
    discardPile: [card("top", "10")],
    players: [
      player("ana", [card("a1", "10"), card("a2", "4"), card("a3", "3")], [1]),
      player("bia", [card("b1", "5"), card("b2", "10"), card("b3", "7")], [0]),
      player("caio", [card("c1", "9"), card("c2", "K")]),
    ],
    currentPlayerIndex: 0,
    turnPhase: "draw",
    drawnCard: null,
    drawnFromDiscard: false,
    round: 2,
    winnerId: null,
    logs: [],
    finalRoundDeclarerId: null,
    isFinalRound: false,
    ...overrides,
  };
}

const discard = (cardIndex: unknown, type = "matched_discard") => ({ type, cardIndex });

describe.each([
  ["servidor", (s: GameState, a: any, id: string) => GameLogic.processAction(s, a, id).newState],
  ["offline", (s: GameState, a: any, id: string) => processOfflineAction(structuredClone(s), a, id)],
])("descarte livre (%s)", (_name, act) => {
  const bia = (state: GameState) => state.players[1]!;

  describe("fora da vez", () => {
    it("aceita a carta igual ao topo, mesmo desconhecida, sem mexer na vez de ninguém", () => {
      const after = act(table(), discard(1), "bia");
      expect(bia(after).hand.map((c) => c.id)).toEqual(["b1", "b3"]);
      expect(after.discardPile.at(-1)?.id).toBe("b2");
      expect(after.currentPlayerIndex).toBe(0);
      expect(after.turnPhase).toBe("draw");
      expect(after.skipNextTurnIds ?? []).toEqual([]);
    });

    it("mantém o que o jogador sabe sobre as outras cartas", () => {
      const state = table();
      bia(state).knownCards = { "0": true, "2": true };
      expect(bia(act(state, discard(1), "bia")).knownCards).toEqual({ "0": true, "1": true });
    });

    it("pune o erro com 2 cartas, e a carta tentada continua na mão", () => {
      const after = act(table(), discard(0), "bia");
      expect(bia(after).hand).toHaveLength(5);
      expect(bia(after).hand[0]!.id).toBe("b1");
      expect(after.discardPile.at(-1)?.id).toBe("top");
      expect(after.deck).toHaveLength(2);
      expect(after.currentPlayerIndex).toBe(0);
    });

    it("também vale enquanto outro jogador decide a carta comprada", () => {
      const after = act(table({ turnPhase: "action", drawnCard: card("x", "6") }), discard(1), "bia");
      expect(bia(after).hand).toHaveLength(2);
      expect(after.drawnCard?.id).toBe("x");
      expect(after.currentPlayerIndex).toBe(0);
    });

    it("a ação antiga do app desatualizado segue a mesma regra e não passa a vez dos outros", () => {
      const after = act(table(), discard(1, "discard_from_hand"), "bia");
      expect(bia(after).hand).toHaveLength(2);
      expect(after.currentPlayerIndex).toBe(0);
    });
  });

  describe("na própria vez", () => {
    it("acertar não encerra a vez, e ainda dá para comprar", () => {
      const after = act(table(), discard(0), "ana");
      expect(after.players[0]!.hand).toHaveLength(2);
      expect(after.currentPlayerIndex).toBe(0);
      expect(after.turnPhase).toBe("draw");
      expect(act(after, { type: "draw_deck" }, "ana").turnPhase).toBe("action");
    });

    it("errar compra 2 cartas e mantém a vez", () => {
      const after = act(table(), discard(1), "ana");
      expect(after.players[0]!.hand).toHaveLength(5);
      expect(after.currentPlayerIndex).toBe(0);
    });

    it("depois de comprar, a mão fica travada até resolver a carta comprada", () => {
      const state = table({ turnPhase: "action", drawnCard: card("x", "6") });
      expect(act(state, discard(0), "ana").players[0]!.hand).toHaveLength(3);
      expect(act(state, discard(1), "ana").players[0]!.hand).toHaveLength(3);
    });

    it("com 6 cartas, errar perde a vez atual", () => {
      const state = table();
      state.players[0]!.hand = sixCards("a");
      const after = act(state, discard(0), "ana");
      expect(after.players[0]!.hand).toHaveLength(6);
      expect(after.currentPlayerIndex).toBe(1);
      expect(after.skipNextTurnIds ?? []).toEqual([]);
    });
  });

  describe("com 6 cartas fora da vez", () => {
    const fullHand = () => {
      const state = table();
      bia(state).hand = sixCards("b");
      return state;
    };

    it("errar não compra cartas nem muda a vez agora, e o estado público avisa todos", () => {
      const after = act(fullHand(), discard(0), "bia");
      expect(bia(after).hand).toHaveLength(6);
      expect(after.currentPlayerIndex).toBe(0);
      expect(after.skipNextTurnIds).toEqual(["bia"]);
      expect(filterGameStateForPlayer(after, "caio").skipNextTurnIds).toEqual(["bia"]);
    });

    it("perde só a próxima vez", () => {
      const missed = act(fullHand(), discard(0), "bia");
      const afterAna = act({ ...missed, turnPhase: "action", drawnCard: card("x", "6") }, { type: "discard_drawn" }, "ana");
      expect(afterAna.currentPlayerIndex).toBe(2);
      expect(afterAna.skipNextTurnIds).toEqual([]);
      const afterCaio = act({ ...afterAna, turnPhase: "action", drawnCard: card("y", "6") }, { type: "discard_drawn" }, "caio");
      expect(afterCaio.currentPlayerIndex).toBe(0);
      const afterAna2 = act({ ...afterCaio, turnPhase: "action", drawnCard: card("z", "6") }, { type: "discard_drawn" }, "ana");
      expect(afterAna2.currentPlayerIndex).toBe(1);
    });

    it("errar de novo não acumula", () => {
      const once = act(fullHand(), discard(0), "bia");
      expect(act(once, discard(1), "bia").skipNextTurnIds).toEqual(["bia"]);
    });

    it("pular quem declarou Cunoku ainda conta a rodada final", () => {
      const state = fullHand();
      Object.assign(state, { isFinalRound: true, finalRoundDeclarerId: "bia", finalRoundsLeft: 2 });
      const missed = act(state, discard(0), "bia");
      const after = act({ ...missed, turnPhase: "action", drawnCard: card("x", "6") }, { type: "discard_drawn" }, "ana");
      expect(after.finalRoundsLeft).toBe(1);
      expect(after.currentPlayerIndex).toBe(2);
    });
  });

  describe("o que é ignorado", () => {
    it("carta selada, mesmo igual ao topo", () => {
      const state = table({ sealedCards: [{ cardId: "b2", sealerId: "ana" }] as GameState["sealedCards"] });
      const after = act(state, discard(1), "bia");
      expect(bia(after).hand).toHaveLength(3);
      expect(after.discardPile.at(-1)?.id).toBe("top");
    });

    it.each([[9], [-1], ["1"], [undefined]])("índice inválido %s não pune", (index) => {
      const after = act(table(), discard(index), "bia");
      expect(bia(after).hand).toHaveLength(3);
      expect(after.deck).toHaveLength(4);
    });

    it("partida encerrada", () => {
      const after = act(table({ turnPhase: "finished", winnerId: "ana" }), discard(0), "bia");
      expect(bia(after).hand).toHaveLength(3);
    });

    it("sala de espera", () => {
      expect(bia(act(table({ turnPhase: "waiting" }), discard(0), "bia")).hand).toHaveLength(3);
    });
  });

  it("um poder com índice que ficou velho depois do descarte não quebra a partida", () => {
    const shrunk = act(table({ turnPhase: "action", drawnCard: card("s", "9") }), discard(1), "bia");
    const after = act(
      shrunk,
      { type: "use_ability", ability: "swap", targetPlayerId: "ana", targetCardIndex: 0, targetPlayerId2: "bia", targetCardIndex3: 2 },
      "ana",
    );
    expect(bia(after).hand).toHaveLength(2);
    expect(after.players[0]!.hand).toHaveLength(3);
  });

  it("baralho vazio durante a punição encerra a partida sem travar", () => {
    const after = act(table({ deck: [], discardPile: [card("top", "10")] }), discard(0), "bia");
    expect(after.turnPhase).toBe("finished");
  });
});

describe("bots reagem ao descarte", () => {
  const discardAs = (s: GameState, botId: string, cardIndex: number) =>
    GameLogic.processAction(s, { type: "matched_discard", cardIndex }, botId).newState;

  function withBot(known: number[]) {
    const state = table();
    state.players[1] = { ...state.players[1]!, isBot: true, knownCards: Object.fromEntries(known.map((i) => [String(i), true])) };
    return state;
  }

  it("descarta só a carta que sabe ser igual ao topo", () => {
    const after = applyBotReactions(withBot([1]), discardAs, () => true);
    expect(after.players[1]!.hand.map((c) => c.id)).toEqual(["b1", "b3"]);
    expect(after.discardPile.at(-1)?.id).toBe("b2");
  });

  it("não arrisca carta que não conhece", () => {
    const state = withBot([0]);
    expect(applyBotReactions(state, discardAs, () => true)).toBe(state);
  });

  it("bot que não reage fica parado", () => {
    const state = withBot([1]);
    expect(applyBotReactions(state, discardAs, () => false)).toBe(state);
  });
});

describe("alvo do poder pelo id da carta", () => {
  it("acha a carta escolhida mesmo depois de a mão mudar", () => {
    const shrunk = GameLogic.processAction(table({ turnPhase: "action", drawnCard: card("s", "9") }), discard(1), "bia").newState;
    const after = GameLogic.processAction(
      shrunk,
      { type: "use_ability", ability: "swap", targetPlayerId: "ana", targetCardIndex: 0, targetCardId: "a1", targetPlayerId2: "bia", targetCardIndex3: 0, targetCardId2: "b3" },
      "ana",
    ).newState;
    expect(after.players[0]!.hand[0]!.id).toBe("b3");
    expect(after.players[1]!.hand.map((c) => c.id)).toEqual(["b1", "a1"]);
  });

  it("se a carta escolhida saiu da mão, o poder não acontece", () => {
    const shrunk = GameLogic.processAction(table({ turnPhase: "action", drawnCard: card("s", "5") }), discard(1), "bia").newState;
    const after = GameLogic.processAction(
      shrunk,
      { type: "use_ability", ability: "peek_opponent", targetPlayerId: "bia", targetCardIndex: 1, targetCardId: "b2" },
      "ana",
    ).newState;
    expect(after.drawnCard?.id).toBe("s");
    expect(after.turnPhase).toBe("action");
  });
});
