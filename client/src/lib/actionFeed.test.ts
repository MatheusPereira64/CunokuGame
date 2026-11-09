import { describe, expect, it } from "vitest";
import { cardLabel, parseActionLog, seatTextKey, targetsViewer } from "./actionFeed";

const players = [
  { id: "me", name: "Ana" },
  { id: "p2", name: "Ana Paula" },
  { id: "b1", name: "Kenji" },
];

describe("avisos da mesa a partir do log", () => {
  it("reconhece compras, descartes e trocas", () => {
    expect(parseActionLog("Kenji comprou uma carta do baralho", players)).toMatchObject({ actorId: "b1", kind: "draw_deck" });
    expect(parseActionLog("Kenji comprou a carta 7 de hearts da pilha de descarte", players)).toMatchObject({
      kind: "draw_discard",
      vars: { card: "7♥" },
    });
    expect(parseActionLog("Kenji descartou a carta Q de spades", players)).toMatchObject({ kind: "discard", vars: { card: "Q♠" } });
    expect(parseActionLog("Kenji substituiu a carta 2 da mão", players)).toMatchObject({ kind: "replace" });
  });

  it("usa o nome mais longo do jogador", () => {
    expect(parseActionLog("Ana Paula comprou uma carta do baralho", players)?.actorId).toBe("p2");
  });

  it("habilidades apontam o alvo e avisam quem foi atingido", () => {
    const peek = parseActionLog("Kenji usou habilidade para ver uma carta de Ana", players)!;
    expect(peek).toMatchObject({ kind: "peek", targetIds: ["me"] });
    expect(targetsViewer(peek, "me")).toBe(true);
    expect(seatTextKey(peek, "me")).toBe("feed.peek.you");
    expect(seatTextKey(peek, "p2")).toBe("feed.peek");

    const swap = parseActionLog("Kenji trocou a carta 1 de Ana Paula com a carta 3 de Ana", players)!;
    expect(swap.targetIds).toEqual(["p2", "me"]);
    expect(targetsViewer(swap, "me")).toBe(true);

    const wind = parseActionLog("Ana usou o Vento nas cartas de Kenji", players)!;
    expect(targetsViewer(wind, "me")).toBe(false);
    expect(targetsViewer(wind, "b1")).toBe(true);
  });

  it("penalidades e linhas desconhecidas", () => {
    expect(parseActionLog("Kenji tentou descartar carta errada! Compra 2 cartas.", players)?.kind).toBe("penalty_draw");
    expect(parseActionLog("Kenji tentou descartar carta errada! Perde a vez (tem 8 cartas).", players)?.kind).toBe("penalty_skip");
    expect(parseActionLog("Baralho reciclado e embaralhado", players)).toBeNull();
    expect(parseActionLog("Kenji declarou CUNOKU! Faltam 2 rodadas.", players)).toBeNull();
  });

  it("formata cartas", () => {
    expect(cardLabel("10", "diamonds")).toBe("10♦");
    expect(cardLabel("Joker", "spades")).toBe("🃏");
  });
});
