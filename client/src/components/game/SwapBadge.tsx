import { SWAP_COLORS, type SwapHighlight } from "./swapHighlight";

/** Número da carta na mão, igual ao usado na janela de habilidade. */
export function SwapBadge({ highlight, number }: { highlight?: SwapHighlight; number: number }) {
  if (!highlight) return null;
  return (
    <span
      className="pointer-events-none absolute -top-2 left-1/2 z-30 flex h-5 min-w-5 -translate-x-1/2 items-center justify-center rounded-full px-1 text-[11px] font-black text-black shadow"
      style={{ backgroundColor: SWAP_COLORS[highlight] }}
    >
      {number}
    </span>
  );
}
