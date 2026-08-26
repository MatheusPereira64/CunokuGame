import { describe, it, expect } from "vitest";
import { hasSpecialAbility, getAbilityDescription } from "./helpers";
import type { Card } from "@shared/schema";

function card(rank: Card["rank"]): Card {
  return { id: "1", suit: "clubs", rank, value: 0, isFaceUp: false };
}

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
