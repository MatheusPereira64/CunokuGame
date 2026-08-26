import { describe, it, expect } from "vitest";
import { generateRoomCode } from "./secureRandom";

describe("generateRoomCode", () => {
  it("gera códigos do tamanho pedido com alfabeto seguro", () => {
    const code = generateRoomCode(4);
    expect(code).toHaveLength(4);
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });

  it("produz códigos distintos em sequência", () => {
    const codes = new Set(Array.from({ length: 40 }, () => generateRoomCode(4)));
    expect(codes.size).toBeGreaterThan(30);
  });

  it("rejeita comprimento inválido", () => {
    expect(() => generateRoomCode(0)).toThrow();
  });
});
