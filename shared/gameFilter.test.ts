import { describe, it, expect } from "vitest";
import { filterGameStateForPlayer, toPublicRoom } from "./gameFilter";
import type { Card, GameState, Player, Room } from "./schema";

function card(id: string, rank: Card["rank"], value: number, suit: Card["suit"] = "hearts"): Card {
  return { id, rank, value, suit, isFaceUp: false };
}

function player(id: string, hand: Card[], known: number[] = []): Player {
  return {
    id,
    name: id,
    isBot: false,
    isConnected: true,
    hand,
    score: 0,
    knownCards: Object.fromEntries(known.map((i) => [i.toString(), true])),
  };
}

function baseState(): GameState {
  return {
    deck: [card("deck-bottom", "K", 0, "clubs"), card("deck-top", "9", 9, "diamonds")],
    discardPile: [card("disc1", "10", 10)],
    players: [
      player("p1", [card("p1-known", "2", 2), card("p1-unknown", "3", 3)], [0]),
      player("p2", [card("p2-known", "6", 6, "diamonds"), card("p2-unknown", "Q", 10, "clubs")], [0]),
    ],
    currentPlayerIndex: 0,
    turnPhase: "action",
    drawnCard: card("drawn", "7", 7),
    drawnFromDiscard: false,
    round: 1,
    winnerId: null,
    logs: [],
    finalRoundDeclarerId: null,
    isFinalRound: false,
    seed: "segredo-do-dia",
    dailyDay: "2026-11-01",
  };
}

function expectMasked(c: Card) {
  expect(c.isHidden).toBe(true);
  expect(c).toMatchObject({ suit: "spades", rank: "A", value: 0 });
  expect(c.ownerId).toBeUndefined();
}

describe("filterGameStateForPlayer", () => {
  it("mascara a mão do oponente preservando quantidade e ids", () => {
    const [, p2] = filterGameStateForPlayer(baseState(), "p1").players;
    expect(p2!.hand.map((c) => c.id)).toEqual(["p2-known", "p2-unknown"]);
    p2!.hand.forEach(expectMasked);
  });

  it("não expõe o que o oponente já conhece", () => {
    const [, p2] = filterGameStateForPlayer(baseState(), "p1").players;
    expect(p2!.knownCards).toEqual({});
  });

  it("na própria mão só mantém a face das cartas conhecidas", () => {
    const { players } = filterGameStateForPlayer(baseState(), "p1");
    const [known, unknown] = players[0]!.hand;
    expect(known).toMatchObject({ id: "p1-known", rank: "2", value: 2 });
    expect(known!.isHidden).toBeUndefined();
    expect(unknown!.id).toBe("p1-unknown");
    expectMasked(unknown!);
    expect(players[0]!.knownCards).toEqual({ "0": true });
  });

  it("mascara conteúdo, ordem e ids do baralho mantendo a quantidade", () => {
    const { deck } = filterGameStateForPlayer(baseState(), "p1");
    expect(deck).toHaveLength(2);
    deck.forEach(expectMasked);
    expect(JSON.stringify(deck)).not.toContain("deck-top");
  });

  it("drawnCard só vai para o jogador do turno", () => {
    expect(filterGameStateForPlayer(baseState(), "p1").drawnCard?.rank).toBe("7");
    expect(filterGameStateForPlayer(baseState(), "p2").drawnCard).toBeNull();
  });

  it("não envia a seed e mantém o descarte público", () => {
    const filtered = filterGameStateForPlayer(baseState(), "p2");
    expect(filtered.seed).toBeUndefined();
    expect(filtered.dailyDay).toBe("2026-11-01");
    expect(filtered.discardPile[0]).toMatchObject({ id: "disc1", rank: "10" });
  });

  it("nenhuma face oculta aparece no JSON enviado ao oponente", () => {
    const payload = JSON.stringify(filterGameStateForPlayer(baseState(), "p2"));
    for (const secret of ['"rank":"K"', '"rank":"9"', '"rank":"7"', '"rank":"2"', '"rank":"3"', "segredo-do-dia"]) {
      expect(payload).not.toContain(secret);
    }
  });

  it("revela as mãos no fim, mas não o baralho nem a seed", () => {
    const state = baseState();
    state.turnPhase = "finished";
    state.winnerId = "p1";
    state.drawnCard = null;

    for (const viewer of ["p1", "p2"]) {
      const filtered = filterGameStateForPlayer(state, viewer);
      expect(filtered.players[0]!.hand.map((c) => c.rank)).toEqual(["2", "3"]);
      expect(filtered.players[1]!.hand.map((c) => c.rank)).toEqual(["6", "Q"]);
      expect(filtered.players[1]!.knownCards).toEqual({ "0": true });
      filtered.deck.forEach(expectMasked);
      expect(filtered.seed).toBeUndefined();
    }
  });

  it("não altera o estado original do servidor", () => {
    const state = baseState();
    const before = structuredClone(state);
    filterGameStateForPlayer(state, "p1");
    expect(state).toEqual(before);
  });
});

describe("toPublicRoom", () => {
  it("remove o estado da partida das respostas HTTP", () => {
    const room = { id: 1, code: "ABCD", status: "playing", gameState: baseState() } as unknown as Room;
    const publicRoom = toPublicRoom(room);
    expect(publicRoom).toMatchObject({ code: "ABCD", status: "playing" });
    expect(publicRoom).not.toHaveProperty("gameState");
  });
});
