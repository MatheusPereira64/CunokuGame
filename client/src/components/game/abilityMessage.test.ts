import { describe, expect, it } from "vitest";
import { abilityMessage } from "./helpers";

describe("abilityMessage", () => {
  it("espiar a própria carta aponta para mim", () => {
    expect(abilityMessage({ kind: "peek_own", cardIndex: 2, cardId: "c2" }, "eu")).toEqual({
      type: "use_ability",
      ability: "peek_own",
      targetPlayerId: "eu",
      targetCardIndex: 2,
      targetCardId: "c2",
    });
  });

  it("as duas trocas usam a habilidade swap com os campos do servidor", () => {
    const mine = abilityMessage({ kind: "swap_me", myCardIndex: 0, targetPlayerId: "bia", targetCardIndex: 3, myCardId: "a", targetCardId: "b" }, "eu");
    expect(mine).toMatchObject({ ability: "swap", targetPlayerId: "eu", targetCardIndex: 0, targetPlayerId2: "bia", targetCardIndex3: 3, targetCardId: "a", targetCardId2: "b" });
    const others = abilityMessage(
      { kind: "swap_others", player1Id: "ana", card1Index: 1, player2Id: "bia", card2Index: 2, card1Id: "x", card2Id: "y" },
      "eu",
    );
    expect(others).toMatchObject({ ability: "swap", targetPlayerId: "ana", targetCardIndex: 1, targetPlayerId2: "bia", targetCardIndex3: 2 });
  });

  it("selar e forçar usam cardIndex como targetCardIndex", () => {
    expect(abilityMessage({ kind: "seal", targetPlayerId: "bia", cardIndex: 1 }, "eu")).toMatchObject({ ability: "seal", targetPlayerId: "bia", targetCardIndex: 1 });
    expect(abilityMessage({ kind: "joker_force", targetPlayerId: "bia", cardIndex: 0 }, "eu")).toMatchObject({ ability: "joker_force", targetCardIndex: 0 });
  });

  it("habilidades sem alvo de carta", () => {
    expect(abilityMessage({ kind: "jack" }, "eu")).toEqual({ type: "use_ability", ability: "jack" });
    expect(abilityMessage({ kind: "wind", targetPlayerId: "bia" }, "eu")).toEqual({ type: "use_ability", ability: "wind", targetPlayerId: "bia" });
  });
});
