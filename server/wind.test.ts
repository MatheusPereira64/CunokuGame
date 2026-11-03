import { describe, expect, it } from "vitest";
import type { Card, GameState, Player } from "@shared/schema";
import { filterGameStateForPlayer } from "@shared/gameFilter";
import { processOfflineAction } from "../client/src/utils/offlineGameLogic";
import { BotPlayer as OfflineBot } from "../client/src/utils/botPlayer";
import { BotPlayer } from "./bot";
import { GameLogic } from "./game";

function card(id: string, rank: Card["rank"], value: number): Card {
  return { id, rank, value, suit: "hearts", isFaceUp: false };
}

function player(id: string, hand: Card[], known: number[] = [], isBot = false): Player {
  return {
    id,
    name: id,
    isBot,
    isConnected: true,
    hand,
    score: 0,
    knownCards: Object.fromEntries(known.map((i) => [String(i), true])),
  };
}

function stateWith(drawn: Card, overrides: Partial<GameState> = {}): GameState {
  return {
    deck: [card("d1", "K", 0)],
    discardPile: [card("top", "9", 9)],
    players: [
      player("ana", [card("a1", "Q", 12), card("a2", "J", 11)]),
      player("bia", [card("b1", "3", 3), card("b2", "4", 4), card("b3", "K", 0), card("b4", "Joker", -1)], [0, 2]),
    ],
    currentPlayerIndex: 0,
    turnPhase: "action",
    drawnCard: drawn,
    drawnFromDiscard: false,
    round: 2,
    winnerId: null,
    logs: [],
    finalRoundDeclarerId: null,
    isFinalRound: false,
    ...overrides,
  };
}

const wind = { type: "use_ability", ability: "wind", targetPlayerId: "bia" };
const sum = (p: Player) => p.hand.reduce((total, c) => total + c.value, 0);

describe.each([
  ["servidor", (s: GameState, a: any, id: string) => GameLogic.processAction(s, a, id).newState],
  ["offline", (s: GameState, a: any, id: string) => processOfflineAction(structuredClone(s), a, id)],
])("Vento (%s)", (_name, act) => {
  it.each(["A", "2"] as const)("carta %s embaralha a mão do oponente, sem mudar a soma", (rank) => {
    const before = stateWith(card("x", rank, rank === "A" ? 1 : 2));
    const after = act(before, wind, "ana");
    const target = after.players[1]!;

    expect(target.hand).toHaveLength(4);
    expect(sum(target)).toBe(sum(before.players[1]!));
    expect(target.hand.map((c) => c.rank).sort()).toEqual(["3", "4", "Joker", "K"].sort());
    expect(target.knownCards).toEqual({});
    expect(after.players[0]!.hand.map((c) => c.id)).toEqual(["a1", "a2"]);
  });

  it("descarta a carta usada, passa a vez e registra o uso publicamente", () => {
    const after = act(stateWith(card("x", "A", 1)), wind, "ana");
    expect(after.discardPile.at(-1)!.id).toBe("x");
    expect(after.drawnCard).toBeNull();
    expect(after.currentPlayerIndex).toBe(1);
    expect(after.lastWind).toEqual({ count: 1, byId: "ana", targetId: "bia" });
    expect(after.logs.at(-1)).toBe("ana usou o Vento nas cartas de bia");
  });

  it("troca os ids para a posição antiga não entregar a carta", () => {
    const after = act(stateWith(card("x", "A", 1)), wind, "ana");
    const ids = after.players[1]!.hand.map((c) => c.id);
    for (const old of ["b1", "b2", "b3", "b4"]) expect(ids).not.toContain(old);
    expect(new Set(ids).size).toBe(4);
  });
});

describe("Vento: regras do servidor", () => {
  const act = (s: GameState, a: any, id = "ana") => GameLogic.processAction(s, a, id).newState;

  it("recusa a si mesmo e jogador inexistente, mantendo a carta comprada", () => {
    for (const targetPlayerId of ["ana", "ninguem", undefined]) {
      const after = act(stateWith(card("x", "A", 1)), { ...wind, targetPlayerId });
      expect(after.drawnCard?.id).toBe("x");
      expect(after.lastWind ?? null).toBeNull();
    }
  });

  it("não funciona com carta comprada do descarte", () => {
    const after = act(stateWith(card("x", "A", 1), { drawnFromDiscard: true }), wind);
    expect(after.drawnCard?.id).toBe("x");
    expect(after.players[1]!.knownCards).toEqual({ "0": true, "2": true });
  });

  it.each(["3", "4"] as const)("carta %s não tem habilidade", (rank) => {
    const before = stateWith(card("x", rank, Number(rank)));
    const after = act(before, wind);
    expect(after.drawnCard?.id).toBe("x");
    expect(after.players[1]!.hand.map((c) => c.id)).toEqual(["b1", "b2", "b3", "b4"]);
  });

  it("conta os usos e não revela a nova posição aos outros jogadores", () => {
    const once = act(stateWith(card("x", "A", 1)), wind);
    const seen = filterGameStateForPlayer(once, "ana").players[1]!;
    expect(seen.hand.every((c) => c.isHidden)).toBe(true);

    const again = act({ ...once, currentPlayerIndex: 0, drawnCard: card("y", "2", 2), turnPhase: "action" }, wind);
    expect(again.lastWind?.count).toBe(2);
  });

  it("é reprodutível com a seed do desafio diário", () => {
    const order = () => {
      const after = act(stateWith(card("x", "A", 1), { seed: "dia", logs: ["a"] }), wind);
      return after.players[1]!.hand.map((c) => c.rank);
    };
    expect(order()).toEqual(order());
  });
});

describe.each([
  ["servidor", BotPlayer],
  ["offline", OfflineBot],
])("bots usam o Vento (%s)", (_name, Bot) => {
  const botState = (drawn: Card, overrides: Partial<GameState> = {}) =>
    stateWith(drawn, {
      players: [
        player("bot", [card("c1", "Q", 12), card("c2", "J", 11)], [], true),
        player("bia", [card("b1", "3", 3)], [0]),
        player("caio", [card("d1", "3", 3), card("d2", "4", 4)], [0, 1]),
      ],
      ...overrides,
    });

  it.each(["medium", "hard"] as const)("%s mira quem mais conhece a própria mão", (difficulty) => {
    const action = new Bot("bot", difficulty, "bot").decideTurn(botState(card("x", "A", 1)), 0);
    expect(action).toMatchObject({ type: "use_ability", ability: "wind", targetPlayerId: "caio" });
  });

  it("descarta quando ninguém conhece cartas", () => {
    const state = botState(card("x", "A", 1));
    state.players.forEach((p) => (p.knownCards = {}));
    expect(new Bot("bot", "hard", "bot").decideTurn(state, 0).type).toBe("discard_drawn");
  });

  it("não tenta usar com carta vinda do descarte, o que travaria o turno", () => {
    const state = botState(card("x", "A", 1), { drawnFromDiscard: true });
    expect(new Bot("bot", "hard", "bot").decideTurn(state, 0).type).toBe("discard_drawn");
  });

  it("prefere trocar uma carta alta conhecida a usar o Vento", () => {
    const state = botState(card("x", "A", 1));
    state.players[0]!.knownCards = { "0": true };
    expect(new Bot("bot", "hard", "bot").decideTurn(state, 0)).toEqual({ type: "replace_card", handIndex: 0 });
  });
});
