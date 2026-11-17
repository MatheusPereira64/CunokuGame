import { describe, expect, it } from "vitest";
import type { Card, GameState, Player } from "./schema";
import { decideBotFinish, estimatedHandScore, UNKNOWN_CARD_ESTIMATE } from "./botBrain";

function card(rank: Card["rank"], value: number, id: string): Card {
  return { id, suit: "spades", rank, value, isFaceUp: false };
}

function player(id: string, values: number[], known: number[]): Player {
  return {
    id,
    name: id,
    isBot: true,
    isConnected: true,
    hand: values.map((v, i) => card(v === 0 ? "K" : "5", v, `${id}-${i}`)),
    score: 0,
    knownCards: Object.fromEntries(known.map((i) => [String(i), true])),
  };
}

function state(bot: Player, patch: Partial<GameState> = {}, others: Player[] = [player("rival", [9, 9, 9, 9], [])]): GameState {
  return {
    deck: [],
    discardPile: [],
    players: [bot, ...others],
    currentPlayerIndex: 0,
    turnPhase: "draw",
    drawnCard: null,
    drawnFromDiscard: false,
    round: 6,
    winnerId: null,
    logs: [],
    ...patch,
  };
}

/** Repete a decisão (que tem sorteio) e conta quantas vezes o bot declarou. */
function declares(s: GameState, difficulty: "easy" | "medium" | "hard", tries = 200) {
  let count = 0;
  for (let i = 0; i < tries; i++) if (decideBotFinish(s, 0, difficulty)) count++;
  return count;
}

describe("estimatedHandScore", () => {
  it("usa o valor das cartas conhecidas e a média nas desconhecidas", () => {
    const bot = player("bot", [0, 1, 9, 9], [0, 1]);
    expect(estimatedHandScore(state(bot), 0)).toBe(0 + 1 + 2 * UNKNOWN_CARD_ESTIMATE);
  });

  it("não espia as cartas que o bot nunca viu", () => {
    const low = player("bot", [0, 0, 0, 0], [0]);
    const high = player("bot", [0, 10, 10, 10], [0]);
    expect(estimatedHandScore(state(low), 0)).toBe(estimatedHandScore(state(high), 0));
  });
});

describe("decideBotFinish", () => {
  const perfect = player("bot", [0, 0, 0, -1], [0, 1, 2, 3]);

  it("nunca declara antes da rodada 5, em nenhuma dificuldade", () => {
    for (const d of ["easy", "medium", "hard"] as const) {
      expect(declares(state(perfect, { round: 4 }), d)).toBe(0);
    }
  });

  it("não declara depois de alguém já ter declarado nem fora da hora de comprar", () => {
    expect(declares(state(perfect, { isFinalRound: true }), "hard")).toBe(0);
    expect(declares(state(perfect, { turnPhase: "action" }), "hard")).toBe(0);
  });

  it("difícil sempre declara quando sabe que tem 0 pontos ou menos", () => {
    expect(declares(state(perfect), "hard")).toBe(200);
  });

  it("com cartas desconhecidas a estimativa sobe e o bot não arrisca", () => {
    // Na verdade a mão vale 0, mas o bot só conhece uma carta: estima 15
    const blind = player("bot", [0, 0, 0, 0], [0]);
    for (const d of ["easy", "medium", "hard"] as const) {
      expect(declares(state(blind), d)).toBe(0);
    }
  });

  // Oponente com 2 cartas: quase sem vantagem, vale só o limite de pontos de cada dificuldade
  const shortRival = [player("rival", [9, 9], [])];

  it("cada dificuldade tem um limite de pontos", () => {
    const seven = player("bot", [2, 2, 2, 1], [0, 1, 2, 3]);
    expect(declares(state(seven, {}, shortRival), "easy")).toBeGreaterThan(0);
    expect(declares(state(seven, {}, shortRival), "medium")).toBeGreaterThan(0);
    expect(declares(state(seven, {}, shortRival), "hard")).toBe(0);
    const nine = player("bot", [3, 3, 2, 1], [0, 1, 2, 3]);
    expect(declares(state(nine, {}, shortRival), "easy")).toBeGreaterThan(0);
    expect(declares(state(nine, {}, shortRival), "medium")).toBe(0);
  });

  it("declara quando acha que está bem à frente do oponente", () => {
    // Estima 8 pontos; o oponente tem 4 cartas que nunca viu (estimadas em 16)
    const eight = player("bot", [2, 2, 2, 2], [0, 1, 2, 3]);
    expect(declares(state(eight, {}, shortRival), "hard")).toBe(0);
    expect(declares(state(eight), "hard")).toBeGreaterThan(80); // cerca de 60% das vezes
  });

  it("nas rodadas longas o bot fica mais disposto a encerrar", () => {
    const eight = player("bot", [2, 2, 2, 2], [0, 1, 2, 3]);
    expect(declares(state(eight, { round: 6 }, shortRival), "medium")).toBe(0);
    expect(declares(state(eight, { round: 10 }, shortRival), "medium")).toBeGreaterThan(0);
  });
});

describe("memória do bot", () => {
  it("médio troca uma carta desconhecida quando compra uma carta baixa", async () => {
    const { decideBotTurn } = await import("./botBrain");
    const bot = player("bot", [9, 9, 9, 9], []);
    const s = state(bot, { turnPhase: "action", drawnCard: card("K", 0, "drawn") });
    expect(decideBotTurn(s, 0, "medium")).toEqual({ type: "replace_card", handIndex: 0 });
  });
});
