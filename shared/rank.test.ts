import { describe, expect, it } from "vitest";
import {
  effectiveRank,
  normalizeNickname,
  rankFromWins,
  isValidPin,
} from "./rank";

describe("rankFromWins", () => {
  it("mapeia thresholds", () => {
    expect(rankFromWins(0)).toBe("bronze");
    expect(rankFromWins(4)).toBe("bronze");
    expect(rankFromWins(5)).toBe("silver");
    expect(rankFromWins(14)).toBe("silver");
    expect(rankFromWins(15)).toBe("gold");
    expect(rankFromWins(29)).toBe("gold");
    expect(rankFromWins(30)).toBe("platinum");
    expect(rankFromWins(49)).toBe("platinum");
    expect(rankFromWins(50)).toBe("diamond");
    expect(rankFromWins(79)).toBe("diamond");
    expect(rankFromWins(80)).toBe("grandmaster");
    expect(rankFromWins(119)).toBe("grandmaster");
    expect(rankFromWins(120)).toBe("celestial");
    expect(rankFromWins(199)).toBe("celestial");
    expect(rankFromWins(200)).toBe("godlike");
  });
});

describe("effectiveRank", () => {
  it("Entity para TOP 10", () => {
    expect(effectiveRank(0, 1)).toBe("entity");
    expect(effectiveRank(3, 10)).toBe("entity");
    expect(effectiveRank(200, 11)).toBe("godlike");
    expect(effectiveRank(4, null)).toBe("bronze");
  });
});

describe("normalizeNickname", () => {
  it("aceita apelidos válidos", () => {
    expect(normalizeNickname("Matheus")).toBe("matheus");
    expect(normalizeNickname(" player_1 ")).toBe("player_1");
  });
  it("rejeita inválidos", () => {
    expect(normalizeNickname("ab")).toBeNull();
    expect(normalizeNickname("bad-name")).toBeNull();
    expect(normalizeNickname("nome com espaço!!")).toBeNull();
  });
});

describe("isValidPin", () => {
  it("aceita 4–6 dígitos", () => {
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("123456")).toBe(true);
    expect(isValidPin("12")).toBe(false);
    expect(isValidPin("abcdef")).toBe(false);
  });
});
