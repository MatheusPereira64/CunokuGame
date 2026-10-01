import { describe, it, expect } from "vitest";
import { hasSpecialAbility, getAbilityDescription, abilityConfirmDisabled } from "./helpers";
import type { Card } from "@shared/schema";

function card(rank: Card["rank"]): Card {
  return { id: "1", suit: "clubs", rank, value: 0, isFaceUp: false };
}

const swapBase = {
  isPeekOpponent: false,
  isPeekOwn: false,
  isSwap: true,
  swapMode: "two_others" as const,
  swapStep: 1 as const,
  targetPlayer: null as string | null,
  targetCard: null as number | null,
  myCardIndex: null as number | null,
  firstPlayerSelection: null as { playerId: string; cardIndex: number } | null,
  targetPlayer2: null as string | null,
  targetCard2: null as number | null,
};

describe("abilityConfirmDisabled (swap two_others)", () => {
  it("desabilita no passo 1 sem jogador/carta", () => {
    expect(abilityConfirmDisabled(swapBase)).toBe(true);
  });

  it("habilita no passo 1 com primeiro jogador e carta", () => {
    expect(
      abilityConfirmDisabled({
        ...swapBase,
        targetPlayer: "bot-a",
        targetCard: 2,
      }),
    ).toBe(false);
  });

  it("desabilita no passo 2 até segundo jogador e carta", () => {
    expect(
      abilityConfirmDisabled({
        ...swapBase,
        swapStep: 2,
        firstPlayerSelection: { playerId: "bot-a", cardIndex: 1 },
      }),
    ).toBe(true);

    expect(
      abilityConfirmDisabled({
        ...swapBase,
        swapStep: 2,
        firstPlayerSelection: { playerId: "bot-a", cardIndex: 1 },
        targetPlayer2: "bot-b",
        targetCard2: 0,
      }),
    ).toBe(false);
  });
});

describe("hasSpecialAbility", () => {
  it("retorna false para null/undefined", () => {
    expect(hasSpecialAbility(null)).toBe(false);
    expect(hasSpecialAbility(undefined)).toBe(false);
  });

  it("reconhece cartas 5–10", () => {
    for (const rank of ["5", "6", "7", "8", "9", "10"] as const) {
      expect(hasSpecialAbility(card(rank))).toBe(true);
    }
  });

  it("não marca cartas sem habilidade", () => {
    for (const rank of ["A", "2", "3", "4", "J", "Q", "K", "Joker"] as const) {
      expect(hasSpecialAbility(card(rank))).toBe(false);
    }
  });
});

describe("getAbilityDescription", () => {
  const t = (key: string) => key;

  it("mapeia descrições por rank", () => {
    expect(getAbilityDescription("5", t)).toBe("game.abilityPeekOpponent");
    expect(getAbilityDescription("6", t)).toBe("game.abilityPeekOpponent");
    expect(getAbilityDescription("7", t)).toBe("game.abilityPeekOwn");
    expect(getAbilityDescription("8", t)).toBe("game.abilityPeekOwn");
    expect(getAbilityDescription("9", t)).toBe("game.abilitySwap");
    expect(getAbilityDescription("10", t)).toBe("game.abilitySwap");
    expect(getAbilityDescription("K", t)).toBe("");
  });
});
