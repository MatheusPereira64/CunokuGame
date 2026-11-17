import { afterEach, describe, expect, it, vi } from "vitest";
import { currentTableHold, holdPileCard, landOnPile, releaseAll, visiblePileIndex } from "./tableHold";

const pile = (...ids: string[]) => ids.map((id) => ({ id }));
const heldCards = () => [...currentTableHold().pileCards].sort();

describe("espera da pilha de descarte", () => {
  afterEach(() => {
    vi.useRealTimers();
    releaseAll();
  });

  it("mostra a carta de baixo enquanto a do topo está voando", () => {
    expect(visiblePileIndex(pile("a", "b", "c"), new Set(["c"]))).toBe(1);
    expect(visiblePileIndex(pile("a", "b", "c"), new Set(["b", "c"]))).toBe(0);
    expect(visiblePileIndex(pile("a"), new Set(["a"]))).toBe(-1);
  });

  it("libera só a carta que pousou", () => {
    holdPileCard("a");
    holdPileCard("b");
    landOnPile("b");
    expect(heldCards()).toEqual(["a"]);
  });

  it("uma carta sem animação não atrasa as seguintes (sem travar em cadeia)", () => {
    vi.useFakeTimers();
    holdPileCard("a"); // "a" nunca será animada
    vi.advanceTimersByTime(3000); // vence pelo limite de segurança
    expect(heldCards()).toEqual([]);
    holdPileCard("b");
    landOnPile("b"); // a animação de "b" pousou: aparece na hora, sem esperar o limite
    expect(heldCards()).toEqual([]);
  });

  it("se a animação não pousar, a carta aparece pelo limite de segurança", () => {
    vi.useFakeTimers();
    holdPileCard("a");
    vi.advanceTimersByTime(2000);
    expect(heldCards()).toEqual(["a"]);
    vi.advanceTimersByTime(600);
    expect(heldCards()).toEqual([]);
  });
});
