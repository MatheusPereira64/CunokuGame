import { describe, it, expect } from "vitest";
import { hasSpecialAbility, getAbilityDescription, emptySeatCount } from "./helpers";
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

describe("hasSpecialAbility", () => {
  it("retorna false para null/undefined", () => {
    expect(hasSpecialAbility(null)).toBe(false);
    expect(hasSpecialAbility(undefined)).toBe(false);
  });

  it("reconhece todas as cartas do baralho", () => {
    for (const rank of ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "Joker"] as const) {
      expect(hasSpecialAbility(card(rank))).toBe(true);
    }
  });

});

describe("getAbilityDescription", () => {
  const t = (key: string) => key;

  it("mapeia descrições por rank", () => {
    expect(getAbilityDescription("A", t)).toBe("game.abilityWind");
    expect(getAbilityDescription("2", t)).toBe("game.abilityWind");
    expect(getAbilityDescription("3", t)).toBe("game.abilitySeal");
    expect(getAbilityDescription("4", t)).toBe("game.abilitySeal");
    expect(getAbilityDescription("J", t)).toBe("game.abilityJack");
    expect(getAbilityDescription("Q", t)).toBe("game.abilityQueen");
    expect(getAbilityDescription("Joker", t)).toBe("game.abilityJoker");
    expect(getAbilityDescription("5", t)).toBe("game.abilityPeekOpponent");
    expect(getAbilityDescription("6", t)).toBe("game.abilityPeekOpponent");
    expect(getAbilityDescription("7", t)).toBe("game.abilityPeekOwn");
    expect(getAbilityDescription("8", t)).toBe("game.abilityPeekOwn");
    expect(getAbilityDescription("9", t)).toBe("game.abilitySwap");
    expect(getAbilityDescription("10", t)).toBe("game.abilitySwap");
    expect(getAbilityDescription("K", t)).toBe("game.abilityKing");
  });
});

describe("emptySeatCount", () => {
  it("completa até o limite da sala", () => {
    expect(emptySeatCount(1, 6)).toBe(5);
    expect(emptySeatCount(2, 2)).toBe(0);
  });

  it("assume 4 lugares quando o servidor não informa o limite", () => {
    expect(emptySeatCount(1, null)).toBe(3);
  });

  it("nunca fica negativo", () => {
    expect(emptySeatCount(5, 4)).toBe(0);
  });
});
