import type { Position } from "./types";

/** Tamanho da carta que voa nas animações: acompanha o tamanho das cartas da mesa. */
export function flyingCardSize(isCompact: boolean) {
  return isCompact
    ? { className: "w-14 h-20", halfW: 28, halfH: 40 }
    : { className: "w-20 h-[7.5rem]", halfW: 40, halfH: 60 };
}

/**
 * Centro atual de um elemento da mesa. A mesa se reorganiza durante a jogada
 * (a carta comprada entra ou sai do centro), então o destino é medido no meio do voo.
 */
export function measureCenter(selector: string): Position | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(selector);
  if (!el?.isConnected) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
