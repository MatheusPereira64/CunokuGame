import { describe, it, expect } from "vitest";
import { randomChance, randomFloat, randomInt, shuffleInPlace } from "./secureRandom";

describe("secureRandom", () => {
  it("randomFloat fica em [0,1)", () => {
    for (let i = 0; i < 20; i++) {
      const v = randomFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("randomInt respeita o limite", () => {
    for (let i = 0; i < 20; i++) {
      expect(randomInt(5)).toBeLessThan(5);
      expect(randomInt(5)).toBeGreaterThanOrEqual(0);
    }
  });

  it("shuffleInPlace preserva elementos", () => {
    const src = [1, 2, 3, 4, 5];
    const copy = [...src];
    shuffleInPlace(copy);
    expect(copy.sort()).toEqual(src);
  });

  it("randomChance retorna boolean", () => {
    expect(typeof randomChance(0)).toBe("boolean");
    expect(randomChance(0)).toBe(false);
    expect(randomChance(1)).toBe(true);
  });
});
