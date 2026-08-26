import { describe, it, expect } from "vitest";
import { compareSemver, isNewerVersion, normalizeVersion } from "./appVersion";

describe("normalizeVersion", () => {
  it("remove prefixo v", () => {
    expect(normalizeVersion("v1.2.3")).toBe("1.2.3");
    expect(normalizeVersion("V2.0.0")).toBe("2.0.0");
  });
});

describe("compareSemver / isNewerVersion", () => {
  it("compara major.minor.patch", () => {
    expect(compareSemver("1.0.1", "1.0.0")).toBeGreaterThan(0);
    expect(compareSemver("1.0.0", "1.0.1")).toBeLessThan(0);
    expect(compareSemver("1.0.0", "v1.0.0")).toBe(0);
    expect(compareSemver("2.0.0", "1.9.9")).toBeGreaterThan(0);
  });

  it("detecta update remoto", () => {
    expect(isNewerVersion("1.0.1", "1.0.0")).toBe(true);
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
    expect(isNewerVersion("0.9.9", "1.0.0")).toBe(false);
  });
});
