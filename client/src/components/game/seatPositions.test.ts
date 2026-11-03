import { describe, it, expect } from "vitest";
import { getSeatPositions, opponentsInTurnOrder } from "./seatPositions";

describe("getSeatPositions", () => {
  it("retorna layout exato para 1–5 oponentes", () => {
    expect(getSeatPositions(1)).toHaveLength(1);
    expect(getSeatPositions(2)).toHaveLength(2);
    expect(getSeatPositions(3)).toHaveLength(3);
    expect(getSeatPositions(4)).toHaveLength(4);
    expect(getSeatPositions(5)).toHaveLength(5);
  });

  it("faz fallback para layout de 5 quando count inválido", () => {
    expect(getSeatPositions(0)).toEqual(getSeatPositions(5));
    expect(getSeatPositions(99)).toEqual(getSeatPositions(5));
  });

  it("mantém assentos fora da zona central segura", () => {
    for (const count of [1, 2, 3, 4, 5]) {
      for (const seat of getSeatPositions(count)) {
        expect(seat.left).toBeGreaterThanOrEqual(0);
        expect(seat.left).toBeLessThanOrEqual(100);
        expect(seat.top).toBeGreaterThanOrEqual(0);
        expect(seat.top).toBeLessThanOrEqual(100);
        expect(["left", "top", "right"]).toContain(seat.side);
        // Zona segura aproximada do centro: não deve sentar no meio-baixo
        expect(seat.top).toBeLessThan(50);
      }
    }
  });
});

describe("opponentsInTurnOrder", () => {
  const players = ["a", "b", "c", "d"].map((id) => ({ id }));
  const order = (me: string) => opponentsInTurnOrder(players, me).map((p) => p.id);

  it("começa por quem joga logo depois do jogador local, em qualquer posição", () => {
    expect(order("a")).toEqual(["b", "c", "d"]);
    expect(order("b")).toEqual(["c", "d", "a"]);
    expect(order("c")).toEqual(["d", "a", "b"]);
    expect(order("d")).toEqual(["a", "b", "c"]);
  });

  it("os assentos vão da esquerda para a direita, formando o sentido horário", () => {
    for (const count of [2, 3, 4, 5]) {
      const lefts = getSeatPositions(count).map((seat) => seat.left);
      expect(lefts).toEqual([...lefts].sort((x, y) => x - y));
    }
  });

  it("mantém todos quando o jogador não está na mesa", () => {
    expect(opponentsInTurnOrder(players, "x")).toEqual(players);
  });
});
