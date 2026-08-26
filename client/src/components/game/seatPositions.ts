export interface SeatPosition {
  /** Percentual horizontal dentro da mesa (0-100) */
  left: number;
  /** Percentual vertical dentro da mesa (0-100) */
  top: number;
}

/**
 * Posições dos assentos dos oponentes ao redor da mesa elíptica.
 * O jogador local fica sempre embaixo, no centro; os oponentes são
 * distribuídos em arco pelas laterais e pelo topo.
 */
const SEAT_LAYOUTS: Record<number, SeatPosition[]> = {
  1: [{ left: 50, top: 20 }],
  2: [
    { left: 30, top: 22 },
    { left: 70, top: 22 },
  ],
  3: [
    { left: 16, top: 44 },
    { left: 50, top: 16 },
    { left: 84, top: 44 },
  ],
  4: [
    { left: 13, top: 50 },
    { left: 33, top: 17 },
    { left: 67, top: 17 },
    { left: 87, top: 50 },
  ],
  5: [
    { left: 11, top: 54 },
    { left: 27, top: 20 },
    { left: 50, top: 13 },
    { left: 73, top: 20 },
    { left: 89, top: 54 },
  ],
};

export function getSeatPositions(opponentCount: number): SeatPosition[] {
  return SEAT_LAYOUTS[opponentCount] ?? SEAT_LAYOUTS[5];
}
