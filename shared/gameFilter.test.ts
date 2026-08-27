import { describe, it, expect } from "vitest";
import { filterGameStateForPlayer } from "./gameFilter";
import type { Card, GameState, Player } from "./schema";

function card(partial: Partial<Card> & Pick<Card, "id" | "rank">): Card {
  return {
    suit: "hearts",
    value: 5,
    isFaceUp: false,
    ...partial,
  };
}

function player(id: string, hand: Card[]): Player {
  return {
    id,
    name: id,
    isBot: false,
    isConnected: true,
    hand,
    score: 0,
    knownCards: {},
  };
}

function baseState(players: Player[]): GameState {
  return {
    deck: [card({ id: "deck1", rank: "K", value: 0 })],
    discardPile: [card({ id: "disc1", rank: "10", value: 10 })],
    players,
    currentPlayerIndex: 0,
    turnPhase: "action",
    drawnCard: null,
    drawnFromDiscard: false,
    round: 1,
    winnerId: null,
    logs: [],
    finalRoundDeclarerId: null,
    isFinalRound: false,
  };
}

describe("filterGameStateForPlayer", () => {
  it("oculta faces das mãos dos oponentes, preservando ids", () => {
    const secret = card({ id: "secret-card", rank: "6", suit: "diamonds", value: 6 });
    const state = baseState([
      player("p1", [card({ id: "mine", rank: "2", value: 2 })]),
      player("p2", [secret]),
    ]);

    const filtered = filterGameStateForPlayer(state, "p1");
    expect(filtered.players[0]!.hand[0]!.rank).toBe("2");
    expect(filtered.players[1]!.hand[0]!.id).toBe("secret-card");
    expect(filtered.players[1]!.hand[0]!.rank).not.toBe("6");
    expect(filtered.discardPile[0]!.rank).toBe("10");
  });

  it("revela mãos no fim da partida", () => {
    const secret = card({ id: "secret-card", rank: "6", suit: "diamonds", value: 6 });
    const state = baseState([
      player("p1", []),
      player("p2", [secret]),
    ]);
    state.turnPhase = "finished";
    state.winnerId = "p1";

    const filtered = filterGameStateForPlayer(state, "p1");
    expect(filtered.players[1]!.hand[0]!.rank).toBe("6");
  });
});
