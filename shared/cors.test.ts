import { describe, it, expect } from "vitest";
import { resolveCorsOrigin } from "../worker/src/cors";

describe("resolveCorsOrigin", () => {
  it("aceita origins conhecidos", () => {
    expect(resolveCorsOrigin("https://cunoku.cunokugame.workers.dev")).toBe(
      "https://cunoku.cunokugame.workers.dev",
    );
    expect(resolveCorsOrigin("http://localhost:5173")).toBe("http://localhost:5173");
    expect(resolveCorsOrigin("capacitor://localhost")).toBe("capacitor://localhost");
    expect(resolveCorsOrigin("http://192.168.0.10:5000")).toBe("http://192.168.0.10:5000");
  });

  it("rejeita origins arbitrários", () => {
    expect(resolveCorsOrigin("https://evil.example")).toBeNull();
    expect(resolveCorsOrigin(null)).toBeNull();
  });
});
