import type { CSSProperties } from "react";

export type SeatSide = "left" | "top" | "right";

export interface SeatPosition {
  /** Percentual horizontal dentro da mesa (0-100) */
  left: number;
  /** Percentual vertical dentro da mesa (0-100) */
  top: number;
  /** Lado do arco — orienta avatar e leque para fora do centro */
  side: SeatSide;
}

/**
 * Posições dos assentos dos oponentes no arco externo da mesa.
 * O jogador local fica sempre embaixo; os oponentes ficam longe da
 * zona segura central (~35–65% horizontal, ~40–70% vertical) reservada
 * para baralho / carta comprada / descarte. Cada assento se prende à borda do seu lado,
 * e não pelo centro: assim uma mão grande cresce para dentro e nunca sai da mesa.
 */
const SEAT_LAYOUTS: Record<number, SeatPosition[]> = {
  1: [{ left: 50, top: 3, side: "top" }],
  2: [
    { left: 24, top: 4, side: "top" },
    { left: 76, top: 4, side: "top" },
  ],
  3: [
    { left: 1.5, top: 46, side: "left" },
    { left: 50, top: 3, side: "top" },
    { left: 98.5, top: 46, side: "right" },
  ],
  4: [
    { left: 1.5, top: 46, side: "left" },
    { left: 32, top: 3, side: "top" },
    { left: 68, top: 3, side: "top" },
    { left: 98.5, top: 46, side: "right" },
  ],
  5: [
    { left: 1.5, top: 46, side: "left" },
    { left: 26, top: 3, side: "top" },
    { left: 50, top: 3, side: "top" },
    { left: 74, top: 3, side: "top" },
    { left: 98.5, top: 46, side: "right" },
  ],
};

/**
 * Oponentes na ordem dos assentos (esquerda, topo, direita): quem joga logo depois de mim
 * senta à minha esquerda, então o turno anda no sentido horário na tela de todos os jogadores.
 */
export function opponentsInTurnOrder<T extends { id: string }>(players: T[], localPlayerId: string): T[] {
  const me = players.findIndex((p) => p.id === localPlayerId);
  if (me === -1) return players;
  return [...players.slice(me + 1), ...players.slice(0, me)];
}

/** Estilo de posição do assento: `left` e `top` medem até a borda da mesa mais próxima. */
export function seatStyle({ left, top, side }: SeatPosition): CSSProperties {
  if (side === "left") return { left: `${left}%`, top: `${top}%`, transform: "translateY(-50%)" };
  if (side === "right") return { right: `${100 - left}%`, top: `${top}%`, transform: "translateY(-50%)" };
  return { left: `${left}%`, top: `${top}%`, transform: "translateX(-50%)" };
}

export function getSeatPositions(opponentCount: number): SeatPosition[] {
  return SEAT_LAYOUTS[opponentCount] ?? SEAT_LAYOUTS[5];
}
