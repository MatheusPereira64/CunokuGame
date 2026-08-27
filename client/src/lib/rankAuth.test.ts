import { describe, expect, it } from "vitest";
import { countsForGlobalRank } from "./rankAuth";

describe("countsForGlobalRank", () => {
  const me = "p1";

  it("rejeita offline / só bots", () => {
    expect(
      countsForGlobalRank(true, [{ id: me }, { id: "b1", isBot: true }], me),
    ).toBe(false);
    expect(
      countsForGlobalRank(false, [{ id: me }, { id: "b1", isBot: true }], me),
    ).toBe(false);
  });

  it("aceita multiplayer com outro humano", () => {
    expect(
      countsForGlobalRank(
        false,
        [
          { id: me, isBot: false },
          { id: "p2", isBot: false },
        ],
        me,
      ),
    ).toBe(true);
    expect(
      countsForGlobalRank(
        false,
        [
          { id: me },
          { id: "p2" },
          { id: "b1", isBot: true },
        ],
        me,
      ),
    ).toBe(true);
  });
});
