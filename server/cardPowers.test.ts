import { describe, expect, it } from "vitest";
import type { Card, GameState, Player } from "@shared/schema";
import { filterGameStateForPlayer } from "@shared/gameFilter";
import { JOKER_REVEAL_MS, KING_REVEAL_MS } from "@shared/cardPowers";
import { processOfflineAction } from "../client/src/utils/offlineGameLogic";
import { BotPlayer as OfflineBot } from "../client/src/utils/botPlayer";
import { BotPlayer } from "./bot";
import { autoPlayDisconnectedTurn } from "./disconnectTurn";
import { GameLogic } from "./game";
import { handlePlayerAction, type RoomMessenger } from "./roomHandlers";
import type { IStorage } from "./storage";

const card = (id: string, rank: Card["rank"], value = 5): Card => ({ id, rank, value, suit: "hearts", isFaceUp: false });

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

function stateWith(drawn: Card | null, overrides: Partial<GameState> = {}): GameState {
  return {
    deck: [card("d1", "6"), card("d2", "7"), card("d3", "8"), card("d4", "9")],
    discardPile: [card("top", "10")],
    players: [
      player("ana", [card("a1", "Q", 12), card("a2", "J", 11), card("a3", "3", 3), card("a4", "4", 4)]),
      player("bia", [card("b1", "5"), card("b2", "6"), card("b3", "7"), card("b4", "8")]),
      player("caio", [card("c1", "9"), card("c2", "K", 0)]),
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

const server = (s: GameState, a: any, id = "ana") => GameLogic.processAction(s, a, id);
const use = (ability: string, extra: object = {}) => ({ type: "use_ability", ability, ...extra });

describe.each([
  ["servidor", (s: GameState, a: any, id = "ana") => server(s, a, id).newState],
  ["offline", (s: GameState, a: any, id = "ana") => processOfflineAction(structuredClone(s), a, id)],
])("poderes (%s)", (_name, act) => {
  describe("Valete", () => {
    it("compra outra carta, descarta o Valete e obriga a substituir", () => {
      const after = act(stateWith(card("x", "J", 11)), use("jack"));
      expect(after.discardPile.at(-1)!.id).toBe("x");
      expect(after.drawnCard?.id).toBe("d4");
      expect(after.forcedReplace).toBe(true);
      expect(after.currentPlayerIndex).toBe(0);
    });

    it("não deixa descartar nem usar poder da nova carta", () => {
      const forced = act(stateWith(card("x", "J", 11)), use("jack"));
      expect(act(forced, { type: "discard_drawn" }).drawnCard?.id).toBe("d4");
      expect(act(forced, use("swap", { targetPlayerId: "bia", targetCardIndex: 0, targetCardIndex2: 0 })).drawnCard?.id).toBe("d4");
    });

    it("termina o turno ao substituir", () => {
      const forced = act(stateWith(card("x", "J", 11)), use("jack"));
      const after = act(forced, { type: "replace_card", handIndex: 0 });
      expect(after.players[0]!.hand[0]!.id).toBe("d4");
      expect(after.discardPile.at(-1)!.id).toBe("a1");
      expect(after.forcedReplace).toBe(false);
      expect(after.currentPlayerIndex).toBe(1);
    });

    it("libera o descarte quando toda a mão está selada, para não travar o jogo", () => {
      const state = stateWith(card("x", "J", 11), {
        players: [player("ana", [card("a1", "Q", 12)]), player("bia", [card("b1", "5")])],
        sealedCards: [{ cardId: "a1", sealerId: "bia" }],
      });
      const forced = act(state, use("jack"));
      expect(act(forced, { type: "discard_drawn" }).drawnCard).toBeNull();
    });
  });

  describe("Rainha", () => {
    it("o oponente compra 2 e quem usou compra 1", () => {
      const after = act(stateWith(card("x", "Q", 12)), use("queen", { targetPlayerId: "bia" }));
      expect(after.players[1]!.hand).toHaveLength(6);
      expect(after.players[0]!.hand).toHaveLength(5);
      expect(after.deck).toHaveLength(1);
      expect(after.discardPile.at(-1)!.id).toBe("x");
      expect(after.currentPlayerIndex).toBe(1);
    });

    it("respeita o limite de 6 cartas", () => {
      const state = stateWith(card("x", "Q", 12));
      state.players[1]!.hand.push(card("b5", "2"));
      const after = act(state, use("queen", { targetPlayerId: "bia" }));
      expect(after.players[1]!.hand).toHaveLength(6);
    });

    it("recusa usar em si mesmo", () => {
      expect(act(stateWith(card("x", "Q", 12)), use("queen", { targetPlayerId: "ana" })).drawnCard?.id).toBe("x");
    });
  });

  describe("Selo (3 e 4)", () => {
    const sealB2 = (s: GameState) => act(s, use("seal", { targetPlayerId: "bia", targetCardIndex: 1 }));

    it.each(["3", "4"] as const)("carta %s sela uma carta de outro jogador", (rank) => {
      const after = sealB2(stateWith(card("x", rank, Number(rank))));
      expect(after.sealedCards).toEqual([{ cardId: "b2", sealerId: "ana" }]);
      expect(after.discardPile.at(-1)!.id).toBe("x");
    });

    it("também pode selar a própria carta", () => {
      const after = act(stateWith(card("x", "3", 3)), use("seal", { targetPlayerId: "ana", targetCardIndex: 0 }));
      expect(after.sealedCards?.[0]?.cardId).toBe("a1");
    });

    it("impede substituir e descartar a carta selada", () => {
      const sealed = sealB2(stateWith(card("x", "3", 3)));
      const replaced = act({ ...sealed, drawnCard: card("y", "6"), turnPhase: "action" }, { type: "replace_card", handIndex: 1 }, "bia");
      expect(replaced.players[1]!.hand[1]!.id).toBe("b2");
      expect(replaced.drawnCard?.id).toBe("y");

      const before = structuredClone(sealed);
      before.discardPile.push(card("t2", "6"));
      const discarded = act(before, { type: "discard_from_hand", cardIndex: 1 }, "bia");
      expect(discarded.players[1]!.hand).toHaveLength(4);
    });

    it("impede que a carta selada seja trocada ou espiada", () => {
      const sealed = sealB2(stateWith(card("x", "3", 3)));
      const turn = { ...sealed, currentPlayerIndex: 0, turnPhase: "action" as const };
      const swap = act({ ...turn, drawnCard: card("s", "9") }, use("swap", {
        targetPlayerId: "ana", targetCardIndex: 0, targetPlayerId2: "bia", targetCardIndex3: 1,
      }));
      expect(swap.players[1]!.hand[1]!.id).toBe("b2");
      expect(swap.drawnCard?.id).toBe("s");
    });

    it("dura até chegar de novo a vez de quem selou", () => {
      let state = sealB2(stateWith(card("x", "3", 3)));
      expect(state.currentPlayerIndex).toBe(1);
      state = act({ ...state, drawnCard: card("n1", "6"), turnPhase: "action" }, { type: "discard_drawn" }, "bia");
      expect(state.sealedCards).toHaveLength(1);
      state = act({ ...state, drawnCard: card("n2", "6"), turnPhase: "action" }, { type: "discard_drawn" }, "caio");
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.sealedCards).toHaveLength(0);
    });

    it("o selo acompanha a carta quando o Vento troca os ids", () => {
      const sealed = sealB2(stateWith(card("x", "3", 3)));
      const after = act({ ...sealed, currentPlayerIndex: 0, drawnCard: card("w", "A", 1), turnPhase: "action" }, use("wind", { targetPlayerId: "bia" }));
      const id = after.sealedCards![0]!.cardId;
      expect(id).not.toBe("b2");
      const carried = after.players[1]!.hand.find((c) => c.id === id);
      expect(carried?.rank).toBe("6");
    });
  });

  describe("Coringa", () => {
    const revealed = (s = stateWith(card("x", "Joker", -1))) => act(s, use("joker_reveal"));

    it("mantém a vez até decidir a troca e não permite guardar o Coringa", () => {
      const after = revealed();
      expect(after.jokerRevealed).toBe(true);
      expect(after.currentPlayerIndex).toBe(0);
      expect(act(after, { type: "replace_card", handIndex: 0 }).players[0]!.hand[0]!.id).toBe("a1");
    });

    it("força a troca por uma carta do baralho e passa a vez", () => {
      const after = act(revealed(), use("joker_force", { targetPlayerId: "bia", targetCardIndex: 2 }));
      expect(after.players[1]!.hand[2]!.id).toBe("d4");
      expect(after.discardPile.map((c) => c.id)).toContain("b3");
      expect(after.discardPile.at(-1)!.id).toBe("x");
      expect(after.jokerRevealed).toBe(false);
      expect(after.currentPlayerIndex).toBe(1);
    });

    it("a troca é opcional: terminar só descarta o Coringa", () => {
      const after = act(revealed(), { type: "discard_drawn" });
      expect(after.discardPile.at(-1)!.id).toBe("x");
      expect(after.jokerRevealed).toBe(false);
      expect(after.currentPlayerIndex).toBe(1);
      expect(after.players[1]!.hand.map((c) => c.id)).toEqual(["b1", "b2", "b3", "b4"]);
    });

    it("recusa forçar carta selada ou a si mesmo", () => {
      const state = stateWith(card("x", "Joker", -1), { sealedCards: [{ cardId: "b1", sealerId: "bia" }] });
      const open = revealed(state);
      expect(act(open, use("joker_force", { targetPlayerId: "bia", targetCardIndex: 0 })).jokerRevealed).toBe(true);
      expect(act(open, use("joker_force", { targetPlayerId: "ana", targetCardIndex: 0 })).jokerRevealed).toBe(true);
    });
  });

  it("Rei passa a vez sem mudar nenhuma carta", () => {
    const before = stateWith(card("x", "K", 0));
    const after = act(before, use("king", { targetPlayerId: "bia" }));
    expect(after.currentPlayerIndex).toBe(1);
    expect(after.discardPile.at(-1)!.id).toBe("x");
    expect(after.players[1]!.knownCards).toEqual({});
  });

  it("nenhum poder funciona com carta vinda do descarte", () => {
    for (const rank of ["J", "Q", "K", "Joker", "3"] as const) {
      const state = stateWith(card("x", rank), { drawnFromDiscard: true });
      const after = act(state, use("any", { targetPlayerId: "bia", targetCardIndex: 0 }));
      expect(after.drawnCard?.id).toBe("x");
      expect(after.jokerRevealed ?? false).toBe(false);
    }
  });

  it("troca entre dois outros jogadores usa as cartas escolhidas", () => {
    const after = act(stateWith(card("x", "9", 9)), use("swap", {
      targetPlayerId: "bia", targetCardIndex: 0, targetPlayerId2: "caio", targetCardIndex3: 1,
    }));
    expect(after.players[1]!.hand[0]!.id).toBe("c2");
    expect(after.players[2]!.hand[1]!.id).toBe("b1");
  });

  it("troca com o próprio jogador funciona", () => {
    const after = act(stateWith(card("x", "9", 9)), use("swap", {
      targetPlayerId: "ana", targetCardIndex: 0, targetPlayerId2: "bia", targetCardIndex3: 1,
    }));
    expect(after.players[0]!.hand[0]!.id).toBe("b2");
    expect(after.players[1]!.hand[1]!.id).toBe("a1");
  });
});

describe("revelações ficam só com quem usou", () => {
  it("Rei envia as faces em mensagem privada, sem marcá-las no estado público", () => {
    const { newState, privateReveal } = server(stateWith(card("x", "K", 0)), use("king", { targetPlayerId: "bia" }));
    expect(privateReveal).toMatchObject({ playerId: "ana", durationMs: KING_REVEAL_MS });
    expect(privateReveal!.reveals[0]!.cards.map((c) => c.id)).toEqual(["b1", "b2", "b3", "b4"]);
    const seen = filterGameStateForPlayer(newState, "caio").players[1]!;
    expect(seen.hand.every((c) => c.isHidden)).toBe(true);
    expect(filterGameStateForPlayer(newState, "ana").players[1]!.hand.every((c) => c.isHidden)).toBe(true);
  });

  it("Rei pode revelar as próprias cartas", () => {
    const { privateReveal } = server(stateWith(card("x", "K", 0)), use("king", { targetPlayerId: "ana" }));
    expect(privateReveal!.reveals[0]!.playerId).toBe("ana");
    expect(privateReveal!.reveals[0]!.cards).toHaveLength(4);
  });

  it("Coringa revela todos por 40 segundos e deixa as seladas viradas", () => {
    const state = stateWith(card("x", "Joker", -1), { sealedCards: [{ cardId: "b1", sealerId: "bia" }] });
    const { privateReveal } = server(state, use("joker_reveal"));
    expect(privateReveal!.durationMs).toBe(JOKER_REVEAL_MS);
    expect(privateReveal!.reveals).toHaveLength(3);
    const bia = privateReveal!.reveals.find((r) => r.playerId === "bia")!;
    expect(bia.cards.map((c) => c.id)).toEqual(["b2", "b3", "b4"]);
  });

  it("carta selada que o dono conhece fica mascarada para os outros", () => {
    const state = stateWith(null, { sealedCards: [{ cardId: "b1", sealerId: "ana" }] });
    expect(filterGameStateForPlayer(state, "ana").sealedCards).toEqual([{ cardId: "b1", sealerId: "ana" }]);
    expect(filterGameStateForPlayer(state, "ana").players[1]!.hand[0]!.isHidden).toBe(true);
  });
});

describe("servidor", () => {
  it("só quem está na vez usa a carta comprada", () => {
    const after = server(stateWith(card("x", "K", 0)), use("king", { targetPlayerId: "ana" }), "bia");
    expect(after.privateReveal).toBeUndefined();
    expect(after.newState.drawnCard?.id).toBe("x");
  });

  it("jogador desconectado com Valete não trava a partida", () => {
    const forced = server(stateWith(card("x", "J", 11)), use("jack")).newState;
    forced.players[0]!.isConnected = false;
    forced.reconnectPlayerId = "ana";
    forced.reconnectDeadline = 1;
    forced.turnPhase = "action";
    const after = autoPlayDisconnectedTurn(forced, 10);
    expect(after.drawnCard).toBeNull();
    expect(after.currentPlayerIndex).toBe(1);
  });

  it("é reprodutível com a seed do desafio diário", () => {
    const hands = () => {
      const state = stateWith(card("x", "Q", 12), { seed: "dia", deck: [] });
      state.discardPile = [card("p1", "2"), card("p2", "3"), card("p3", "4"), card("p4", "5"), card("p5", "6")];
      const after = server(state, use("queen", { targetPlayerId: "bia" })).newState;
      return after.players[1]!.hand.map((c) => c.rank);
    };
    expect(hands()).toEqual(hands());
  });

  it("baralho vazio sem descarte não trava a Rainha", () => {
    const state = stateWith(card("x", "Q", 12), { deck: [], discardPile: [] });
    const after = server(state, use("queen", { targetPlayerId: "bia" })).newState;
    expect(after.players[1]!.hand).toHaveLength(4);
    expect(after.currentPlayerIndex).toBe(1);
  });
});

describe.each([
  ["servidor", BotPlayer],
  ["offline", OfflineBot],
])("bots (%s)", (_name, Bot) => {
  const bots = (drawn: Card, overrides: Partial<GameState> = {}) =>
    stateWith(drawn, {
      players: [
        player("bot", [card("x1", "Q", 12), card("x2", "9", 9)], [], true),
        player("bia", [card("b1", "5"), card("b2", "6")]),
        player("caio", [card("c1", "9")]),
      ],
      ...overrides,
    });

  it.each(["medium", "hard"] as const)("%s usa a Rainha em quem tem menos cartas", (difficulty) => {
    const action = new Bot("bot", difficulty, "bot").decideTurn(bots(card("q", "Q", 12)), 0);
    expect(action).toMatchObject({ type: "use_ability", ability: "queen", targetPlayerId: "caio" });
  });

  it("substitui uma carta quando o Valete obriga", () => {
    const state = bots(card("n", "6"), { forcedReplace: true });
    state.players[0]!.knownCards = { "0": true };
    expect(new Bot("bot", "easy", "bot").decideTurn(state, 0)).toEqual({ type: "replace_card", handIndex: 0 });
  });

  it("evita carta selada ao substituir", () => {
    const state = bots(card("n", "6"), { forcedReplace: true, sealedCards: [{ cardId: "x1", sealerId: "bia" }] });
    state.players[0]!.knownCards = { "0": true };
    expect(new Bot("bot", "hard", "bot").decideTurn(state, 0)).toEqual({ type: "replace_card", handIndex: 1 });
  });

  it("bot fácil nunca escolhe carta selada", () => {
    const state = bots(card("n", "6"), { sealedCards: [{ cardId: "x1", sealerId: "bia" }] });
    for (let i = 0; i < 40; i++) {
      const action = new Bot("bot", "easy", "bot").decideTurn(state, 0);
      if (action.type === "replace_card") expect(action.handIndex).toBe(1);
    }
  });

  it("descarta o Coringa revelado em vez de travar", () => {
    const state = bots(card("j", "Joker", -1), { jokerRevealed: true });
    expect(new Bot("bot", "hard", "bot").decideTurn(state, 0).type).toBe("discard_drawn");
  });
});

describe("revelação na sala", () => {
  it("envia as faces só para quem usou o poder", async () => {
    let room = { code: "AAAA", gameMode: "multiplayer", gameState: stateWith(card("x", "K", 0)) } as any;
    const storage = {
      getRoom: async () => room,
      updateGameState: async (_code: string, gameState: GameState) => (room = { ...room, gameState }),
    } as unknown as IStorage;
    const sent: { to: string | null; msg: any }[] = [];
    const messenger: RoomMessenger = {
      send: (to, msg) => sent.push({ to, msg }),
      broadcast: (msg) => sent.push({ to: null, msg }),
      getConnectedPlayerIds: () => [],
      connectionCount: () => 0,
    };

    await handlePlayerAction(storage, messenger, "AAAA", "ana", use("king", { targetPlayerId: "bia" }), () => {});

    const reveals = sent.filter((s) => s.msg.type === "private_reveal");
    expect(reveals).toHaveLength(1);
    expect(reveals[0]!.to).toBe("ana");
    expect(reveals[0]!.msg.reveals[0].cards).toHaveLength(4);
    expect(sent.filter((s) => s.to === null).every((s) => JSON.stringify(s.msg).indexOf('"reveals"') === -1)).toBe(true);
  });
});
