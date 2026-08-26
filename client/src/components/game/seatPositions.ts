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
 * para baralho / carta comprada / descarte.
 */
const SEAT_LAYOUTS: Record<number, SeatPosition[]> = {
  1: [{ left: 50, top: 12, side: "top" }],
  2: [
    { left: 28, top: 14, side: "top" },
    { left: 72, top: 14, side: "top" },
  ],
  3: [
    { left: 9, top: 40, side: "left" },
    { left: 50, top: 11, side: "top" },
    { left: 91, top: 40, side: "right" },
  ],
  4: [
    { left: 8, top: 38, side: "left" },
    { left: 32, top: 12, side: "top" },
    { left: 68, top: 12, side: "top" },
    { left: 92, top: 38, side: "right" },
  ],
  5: [
    { left: 8, top: 42, side: "left" },
    { left: 26, top: 13, side: "top" },
    { left: 50, top: 10, side: "top" },
    { left: 74, top: 13, side: "top" },
    { left: 92, top: 42, side: "right" },
  ],
};

export function getSeatPositions(opponentCount: number): SeatPosition[] {
  return SEAT_LAYOUTS[opponentCount] ?? SEAT_LAYOUTS[5];
}
