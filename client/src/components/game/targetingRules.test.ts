import { describe, expect, it } from "vitest";
import {
  abilityTargeting,
  buildAbilityAction,
  canPickCard,
  canPickPlayer,
  targetingPrompt,
  togglePick,
  type TargetingSpec,
} from "./targetingRules";

const spec = (rank: Parameters<typeof abilityTargeting>[0], joker = false) => abilityTargeting(rank, joker) as TargetingSpec;

describe("abilityTargeting", () => {
  it("cada poder pede o alvo certo", () => {
    expect(spec("5")).toMatchObject({ pick: "card", who: "others", slots: 1 });
    expect(spec("7")).toMatchObject({ pick: "card", who: "self" });
    expect(spec("9")).toMatchObject({ pick: "card", who: "anyone", slots: 2 });
    expect(spec("A")).toMatchObject({ pick: "player", who: "others" });
    expect(spec("3")).toMatchObject({ pick: "card", who: "anyone" });
    expect(spec("K")).toMatchObject({ pick: "player", who: "anyone" });
    expect(spec("Q")).toMatchObject({ pick: "player", who: "others" });
    expect(spec("J").pick).toBe("none");
    expect(spec("Joker").pick).toBe("none");
    expect(spec("Joker", true)).toMatchObject({ pick: "card", who: "others" });
  });

  it("quem pode ser escolhido", () => {
    expect(canPickPlayer(spec("5"), "me", "me")).toBe(false);
    expect(canPickPlayer(spec("7"), "bia", "me")).toBe(false);
    expect(canPickPlayer(spec("K"), "me", "me")).toBe(true);
  });

  it("carta selada nunca pode ser escolhida", () => {
    expect(canPickCard(spec("5"), [], { playerId: "bia", cardIndex: 0 }, "me", true)).toBe(false);
    expect(canPickCard(spec("5"), [], { playerId: "bia", cardIndex: 0 }, "me", false)).toBe(true);
  });

  it("na troca, a segunda carta é de outro jogador", () => {
    const first = [{ playerId: "bia", cardIndex: 1 }];
    expect(canPickCard(spec("9"), first, { playerId: "bia", cardIndex: 2 }, "me", false)).toBe(false);
    expect(canPickCard(spec("9"), first, { playerId: "me", cardIndex: 0 }, "me", false)).toBe(true);
    expect(canPickCard(spec("9"), first, { playerId: "bia", cardIndex: 1 }, "me", false)).toBe(true);
    expect(targetingPrompt(spec("9"), first)).toBe("target.swapSecond");
    expect(targetingPrompt(spec("9"), [])).toBe("target.swapFirst");
  });

  it("tocar de novo desmarca, e uma escolha nova substitui a última", () => {
    const one = togglePick(spec("5"), [], { playerId: "bia", cardIndex: 0 });
    expect(togglePick(spec("5"), one, { playerId: "bia", cardIndex: 0 })).toEqual([]);
    expect(togglePick(spec("5"), one, { playerId: "caio", cardIndex: 2 })).toEqual([{ playerId: "caio", cardIndex: 2 }]);
  });
});

describe("buildAbilityAction", () => {
  it("troca comigo em qualquer ordem vira swap_me", () => {
    const expected = { kind: "swap_me", myCardIndex: 0, targetPlayerId: "bia", targetCardIndex: 3 };
    expect(buildAbilityAction("9", false, [{ playerId: "me", cardIndex: 0 }, { playerId: "bia", cardIndex: 3 }], "me")).toEqual(expected);
    expect(buildAbilityAction("10", false, [{ playerId: "bia", cardIndex: 3 }, { playerId: "me", cardIndex: 0 }], "me")).toEqual(expected);
  });

  it("troca entre dois oponentes", () => {
    expect(buildAbilityAction("9", false, [{ playerId: "bia", cardIndex: 1 }, { playerId: "caio", cardIndex: 2 }], "me")).toEqual({
      kind: "swap_others",
      player1Id: "bia",
      card1Index: 1,
      player2Id: "caio",
      card2Index: 2,
    });
  });

  it("sem escolha completa não monta ação", () => {
    expect(buildAbilityAction("9", false, [{ playerId: "bia", cardIndex: 1 }], "me")).toBeNull();
    expect(buildAbilityAction("5", false, [], "me")).toBeNull();
    expect(buildAbilityAction("Q", false, [], "me")).toBeNull();
  });

  it("os outros poderes", () => {
    const bia0 = [{ playerId: "bia", cardIndex: 0 }];
    expect(buildAbilityAction("5", false, bia0, "me")).toEqual({ kind: "peek_opponent", targetPlayerId: "bia", targetCardIndex: 0 });
    expect(buildAbilityAction("7", false, [{ playerId: "me", cardIndex: 2 }], "me")).toEqual({ kind: "peek_own", cardIndex: 2 });
    expect(buildAbilityAction("3", false, bia0, "me")).toEqual({ kind: "seal", targetPlayerId: "bia", cardIndex: 0 });
    expect(buildAbilityAction("A", false, [{ playerId: "bia" }], "me")).toEqual({ kind: "wind", targetPlayerId: "bia" });
    expect(buildAbilityAction("Q", false, [{ playerId: "bia" }], "me")).toEqual({ kind: "queen", targetPlayerId: "bia" });
    expect(buildAbilityAction("K", false, [{ playerId: "me" }], "me")).toEqual({ kind: "king", targetPlayerId: "me" });
    expect(buildAbilityAction("J", false, [], "me")).toEqual({ kind: "jack" });
    expect(buildAbilityAction("Joker", false, [], "me")).toEqual({ kind: "joker_reveal" });
    expect(buildAbilityAction("Joker", true, bia0, "me")).toEqual({ kind: "joker_force", targetPlayerId: "bia", cardIndex: 0 });
  });
});
