import { describe, expect, it } from "vitest";
import type { Card, GameState, Player } from "@shared/schema";
import { filterGameStateForPlayer } from "@shared/gameFilter";
import { processOfflineAction } from "../client/src/utils/offlineGameLogic";
import { GameLogic } from "./game";

const card = (id: string, rank: Card["rank"] = "6"): Card => ({ id, rank, value: 6, suit: "hearts", isFaceUp: false });

function player(id: string): Player {
  return {
    id,
    name: id,
    isBot: false,
    isConnected: true,
    hand: [card(`${id}1`), card(`${id}2`), card(`${id}3`), card(`${id}4`)],
    score: 0,
    knownCards: {},
  };
}

function stateWith(ids: string[], currentPlayerIndex = 0): GameState {
  return {
    deck: Array.from({ length: 60 }, (_, i) => card(`d${i}`)),
    discardPile: [card("top", "10")],
    players: ids.map(player),
    currentPlayerIndex,
    turnPhase: "draw",
    drawnCard: null,
    drawnFromDiscard: false,
    round: 5,
    winnerId: null,
    logs: [],
    finalRoundDeclarerId: null,
    isFinalRound: false,
  };
}

const engines: [string, (s: GameState, a: any, id: string) => GameState][] = [
  ["servidor", (s, a, id) => GameLogic.processAction(s, a, id).newState],
  ["offline", (s, a, id) => processOfflineAction(structuredClone(s), a, id)],
];

describe.each(engines)("fim de jogo (%s)", (_name, act) => {
  /** Joga turnos comprando e descartando até acabar; devolve quem jogou, em ordem. */
  function playUntilEnd(start: GameState, limit = 50) {
    let state = start;
    const turns: string[] = [];
    for (let i = 0; i < limit && !state.winnerId; i++) {
      const id = state.players[state.currentPlayerIndex]!.id;
      turns.push(id);
      state = act(state, { type: "draw_deck" }, id);
      state = act(state, { type: "discard_drawn" }, id);
    }
    return { state, turns };
  }

  it("acaba depois de 3 rodadas completas contando do turno de quem declarou", () => {
    const declared = act(stateWith(["a", "b", "c"]), { type: "declare_finish" }, "a");
    expect(declared.finalRoundsLeft).toBe(3);
    expect(declared.winnerId).toBeNull();

    const { state, turns } = playUntilEnd(declared);
    expect(turns).toEqual(["a", "b", "c", "a", "b", "c", "a", "b", "c"]);
    expect(state.winnerId).not.toBeNull();
    expect(state.turnPhase).toBe("finished");
  });

  it("funciona quando quem declara não é o primeiro da mesa", () => {
    const declared = act(stateWith(["a", "b", "c"], 1), { type: "declare_finish" }, "b");
    expect(playUntilEnd(declared).turns).toEqual(["b", "c", "a", "b", "c", "a", "b", "c", "a"]);
  });

  it("com 2 jogadores cada um joga 3 vezes", () => {
    const declared = act(stateWith(["a", "b"]), { type: "declare_finish" }, "a");
    expect(playUntilEnd(declared).turns).toEqual(["a", "b", "a", "b", "a", "b"]);
  });

  it("conta as rodadas restantes ao passar por quem declarou", () => {
    let state = act(stateWith(["a", "b"]), { type: "declare_finish" }, "a");
    const pass = (id: string) => act(act(state, { type: "draw_deck" }, id), { type: "discard_drawn" }, id);
    state = pass("a");
    expect(state.finalRoundsLeft).toBe(3);
    state = pass("b");
    expect(state.finalRoundsLeft).toBe(2);
  });

  it("substituir uma carta também conta como turno", () => {
    let state = act(stateWith(["a", "b"]), { type: "declare_finish" }, "a");
    for (const id of ["a", "b", "a", "b", "a"]) {
      state = act(act(state, { type: "draw_deck" }, id), { type: "replace_card", handIndex: 0 }, id);
      expect(state.winnerId).toBeNull();
    }
    state = act(act(state, { type: "draw_deck" }, "b"), { type: "replace_card", handIndex: 0 }, "b");
    expect(state.winnerId).not.toBeNull();
  });

  it("não aceita outra declaração nem reinicia a contagem", () => {
    const declared = act(stateWith(["a", "b"]), { type: "declare_finish" }, "a");
    const moved = { ...declared, currentPlayerIndex: 1, finalRoundsLeft: 1 };
    const again = act(moved, { type: "declare_finish" }, "b");
    expect(again.finalRoundDeclarerId).toBe("a");
    expect(again.finalRoundsLeft).toBe(1);
  });

  it("ainda exige a rodada 5 para declarar", () => {
    const early = act({ ...stateWith(["a", "b"]), round: 4 }, { type: "declare_finish" }, "a");
    expect(early.isFinalRound).toBe(false);
  });

  describe("registro da troca", () => {
    const withNine = () => ({ ...stateWith(["a", "b", "c"]), drawnCard: card("x", "9"), turnPhase: "action" as const });

    it("diz para onde cada carta foi, com o jogador local envolvido", () => {
      const after = act(withNine(), { type: "use_ability", ability: "swap", targetPlayerId: "a", targetCardIndex: 0, targetPlayerId2: "b", targetCardIndex3: 2 }, "a");
      expect(after.lastSwap).toEqual({
        count: 1,
        player1Id: "a",
        player1CardIndex: 0,
        player1CardId: "b3",
        player2Id: "b",
        player2CardIndex: 2,
        player2CardId: "a1",
      });
    });

    it("também registra a troca entre dois outros jogadores", () => {
      const after = act(withNine(), { type: "use_ability", ability: "swap", targetPlayerId: "b", targetCardIndex: 1, targetPlayerId2: "c", targetCardIndex3: 3 }, "a");
      expect(after.lastSwap).toMatchObject({ player1Id: "b", player1CardId: "c4", player2Id: "c", player2CardId: "b2" });
    });

    it("não revela a face das cartas a quem vê a troca", () => {
      const after = act(withNine(), { type: "use_ability", ability: "swap", targetPlayerId: "a", targetCardIndex: 0, targetPlayerId2: "b", targetCardIndex3: 2 }, "a");
      const seen = filterGameStateForPlayer(after, "c");
      expect(seen.lastSwap?.count).toBe(1);
      expect(seen.players[0]!.hand[0]!.isHidden).toBe(true);
      expect(seen.players[1]!.hand[2]!.isHidden).toBe(true);
    });
  });
});

describe("cartas mascaradas continuam com o mesmo id depois da troca", () => {
  it("os destaques encontram a carta na mesa de qualquer jogador", () => {
    const state: GameState = { ...stateWith(["a", "b", "c"]), drawnCard: card("x", "10"), turnPhase: "action" };
    const after = GameLogic.processAction(state, { type: "use_ability", ability: "swap", targetPlayerId: "b", targetCardIndex: 0, targetPlayerId2: "c", targetCardIndex3: 0 }, "a").newState;
    const seen = filterGameStateForPlayer(after, "a");
    expect(seen.players[1]!.hand[0]!.id).toBe(seen.lastSwap!.player1CardId);
    expect(seen.players[2]!.hand[0]!.id).toBe(seen.lastSwap!.player2CardId);
  });
});
