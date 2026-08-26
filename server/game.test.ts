import { describe, it, expect } from "vitest";
import { GameLogic } from "./game";
import type { Player, Card, GameState } from "@shared/schema";

function makePlayer(id: string, name: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    name,
    isBot: false,
    isConnected: true,
    hand: [],
    score: 0,
    knownCards: {},
    ...overrides,
  };
}

function makeCard(overrides: Partial<Card> & Pick<Card, "rank">): Card {
  return {
    id: overrides.id ?? `card-${overrides.rank}`,
    suit: overrides.suit ?? "hearts",
    rank: overrides.rank,
    value: overrides.value ?? GameLogic.getCardValue(overrides.rank),
    isFaceUp: overrides.isFaceUp ?? false,
    ownerId: overrides.ownerId,
  };
}

describe("GameLogic.getCardValue", () => {
  it("mapeia valores especiais das regras", () => {
    expect(GameLogic.getCardValue("Joker")).toBe(-1);
    expect(GameLogic.getCardValue("K")).toBe(0);
    expect(GameLogic.getCardValue("A")).toBe(1);
    expect(GameLogic.getCardValue("J")).toBe(11);
    expect(GameLogic.getCardValue("Q")).toBe(12);
    expect(GameLogic.getCardValue("10")).toBe(10);
    expect(GameLogic.getCardValue("5")).toBe(5);
  });
});

describe("GameLogic.createDeck", () => {
  it("cria 54 cartas por baralho (52 + 2 jokers)", () => {
    const deck = GameLogic.createDeck(1);
    expect(deck).toHaveLength(54);
    expect(deck.filter((c) => c.rank === "Joker")).toHaveLength(2);
  });

  it("escala o tamanho com múltiplos baralhos", () => {
    expect(GameLogic.createDeck(2)).toHaveLength(108);
    expect(GameLogic.createDeck(3)).toHaveLength(162);
  });
});

describe("GameLogic.createInitialState", () => {
  it("distribui 4 cartas por jogador e inicia descarte", () => {
    const players = [makePlayer("p1", "Alice"), makePlayer("p2", "Bob")];
    const state = GameLogic.createInitialState(players);

    expect(state.players).toHaveLength(2);
    expect(state.players[0].hand).toHaveLength(4);
    expect(state.players[1].hand).toHaveLength(4);
    expect(state.discardPile).toHaveLength(1);
    expect(state.turnPhase).toBe("draw");
    expect(state.round).toBe(1);
    expect(state.drawnCard).toBeNull();
    expect(state.winnerId).toBeNull();
    // 1 deck (54) - 8 mãos - 1 descarte = 45
    expect(state.deck.length).toBe(45);
  });

  it("usa mais baralhos com mais jogadores", () => {
    const players = [
      makePlayer("p1", "A"),
      makePlayer("p2", "B"),
      makePlayer("p3", "C"),
      makePlayer("p4", "D"),
      makePlayer("p5", "E"),
    ];
    const state = GameLogic.createInitialState(players);
    // ceil(5/2)=3 decks → 162 - 20 mãos - 1 descarte = 141
    expect(state.deck.length).toBe(141);
  });
});

describe("GameLogic.processAction", () => {
  function baseState(overrides: Partial<GameState> = {}): GameState {
    const p1 = makePlayer("p1", "Alice", {
      hand: [
        makeCard({ id: "h1", rank: "2" }),
        makeCard({ id: "h2", rank: "3" }),
        makeCard({ id: "h3", rank: "4" }),
        makeCard({ id: "h4", rank: "K" }),
      ],
    });
    const p2 = makePlayer("p2", "Bob", {
      hand: [
        makeCard({ id: "h5", rank: "5" }),
        makeCard({ id: "h6", rank: "6" }),
        makeCard({ id: "h7", rank: "7" }),
        makeCard({ id: "h8", rank: "8" }),
      ],
    });

    return {
      deck: [makeCard({ id: "d1", rank: "9" }), makeCard({ id: "d2", rank: "10" })],
      discardPile: [makeCard({ id: "disc", rank: "A" })],
      players: [p1, p2],
      currentPlayerIndex: 0,
      turnPhase: "draw",
      drawnCard: null,
      drawnFromDiscard: false,
      round: 1,
      winnerId: null,
      logs: [],
      finalRoundDeclarerId: null,
      isFinalRound: false,
      ...overrides,
    };
  }

  it("ignora jogador inexistente", () => {
    const state = baseState();
    const result = GameLogic.processAction(state, { type: "draw_deck" }, "missing");
    expect(result.newState).toBe(state);
  });

  it("compra do baralho e entra em action", () => {
    const state = baseState();
    const result = GameLogic.processAction(state, { type: "draw_deck" }, "p1");

    expect(result.newState.drawnCard?.rank).toBe("10");
    expect(result.newState.turnPhase).toBe("action");
    expect(result.newState.drawnFromDiscard).toBe(false);
    expect(result.newState.deck).toHaveLength(1);
  });

  it("descarta a carta comprada e avança o turno", () => {
    const state = baseState({
      turnPhase: "action",
      drawnCard: makeCard({ id: "drawn", rank: "9" }),
    });
    const result = GameLogic.processAction(state, { type: "discard_drawn" }, "p1");

    expect(result.newState.drawnCard).toBeNull();
    expect(result.newState.currentPlayerIndex).toBe(1);
    expect(result.newState.turnPhase).toBe("draw");
    expect(result.newState.discardPile.at(-1)?.rank).toBe("9");
  });

  it("substitui carta da mão pela comprada", () => {
    const state = baseState({
      turnPhase: "action",
      drawnCard: makeCard({ id: "drawn", rank: "Q", value: 12 }),
    });
    const result = GameLogic.processAction(state, { type: "replace_card", handIndex: 0 }, "p1");

    expect(result.newState.players[0].hand[0].rank).toBe("Q");
    expect(result.newState.discardPile.at(-1)?.rank).toBe("2");
    expect(result.newState.drawnCard).toBeNull();
    expect(result.newState.currentPlayerIndex).toBe(1);
  });

  it("declara Cunoku e inicia rodada final", () => {
    const state = baseState({ round: 5 });
    const result = GameLogic.processAction(state, { type: "declare_finish" }, "p1");

    expect(result.newState.isFinalRound).toBe(true);
    expect(result.newState.finalRoundDeclarerId).toBe("p1");
  });
});

describe("GameLogic.handleAbility", () => {
  it("permite peek da própria carta (7/8)", () => {
    const player = makePlayer("p1", "Alice", {
      hand: [makeCard({ rank: "K" }), makeCard({ rank: "2" })],
    });
    const state: GameState = {
      deck: [],
      discardPile: [],
      players: [player, makePlayer("p2", "Bob")],
      currentPlayerIndex: 0,
      turnPhase: "action",
      drawnCard: makeCard({ rank: "7" }),
      drawnFromDiscard: false,
      round: 1,
      winnerId: null,
      logs: [],
    };

    const result = GameLogic.handleAbility(state, "7", "p1", "p1", 0);
    expect(result.success).toBe(true);
    expect(player.knownCards["0"]).toBe(true);
  });

  it("rejeita peek próprio com alvo inválido", () => {
    const state: GameState = {
      deck: [],
      discardPile: [],
      players: [makePlayer("p1", "Alice"), makePlayer("p2", "Bob")],
      currentPlayerIndex: 0,
      turnPhase: "action",
      drawnCard: makeCard({ rank: "8" }),
      drawnFromDiscard: false,
      round: 1,
      winnerId: null,
      logs: [],
    };

    const result = GameLogic.handleAbility(state, "8", "p1", "p2", 0);
    expect(result.success).toBe(false);
  });
});
