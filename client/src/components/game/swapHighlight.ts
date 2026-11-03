import { createContext, useContext } from "react";

/** Mesmas cores na animação da troca e no destaque que fica nas cartas depois dela. */
export const SWAP_COLORS = {
  /** Carta que saiu do primeiro jogador e foi para o segundo */
  toSecond: "#fbbf24",
  /** Carta que saiu do segundo jogador e foi para o primeiro */
  toFirst: "#22d3ee",
} as const;

export type SwapHighlight = keyof typeof SWAP_COLORS;

/** Cartas recém-trocadas na mesa, por id. */
export const SwapHighlightContext = createContext<Record<string, SwapHighlight>>({});

export function useSwapHighlights() {
  return useContext(SwapHighlightContext);
}

/** Levanta a carta acima das vizinhas: em mãos em leque ela fica parcialmente coberta. */
export function swapCardStyle(highlight: SwapHighlight | undefined, baseZIndex?: number): React.CSSProperties | undefined {
  if (!highlight) return baseZIndex === undefined ? undefined : { zIndex: baseZIndex };
  return {
    zIndex: 40,
    transform: "translateY(-6px)",
    boxShadow: `0 0 0 3px ${SWAP_COLORS[highlight]}, 0 0 16px 4px ${SWAP_COLORS[highlight]}`,
    borderRadius: "0.5rem",
  };
}
