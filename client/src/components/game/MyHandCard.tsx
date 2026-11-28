import { motion, AnimatePresence } from "framer-motion";
import type { Card } from "@shared/schema";
import { PlayingCard } from "@/components/PlayingCard";
import { Button } from "@/components/Button";
import { cn, fit } from "@/lib/utils";
import { useI18n } from "@/contexts/i18n-context";
import { ArrowUpDown, Lock } from "lucide-react";
import { swapCardStyle, type SwapHighlight } from "./swapHighlight";
import { SwapBadge } from "./SwapBadge";

/** Como a mão está disposta: compacta (celular deitado), em leque (mão grande) ou aberta. */
export type HandLayout = "compact" | "fan" | "open";

/** Estado de uma carta da minha mão, já calculado pela área do jogador. */
export interface HandCardState {
  index: number;
  card: Card;
  /** Virada para baixo (desconhecida, selada ou esperando a animação) */
  hidden: boolean;
  face: Card;
  sealed: boolean;
  selected: boolean;
  hovered: boolean;
  /** Fora da vez, a carta é igual à do topo do descarte */
  canMatch: boolean;
  canQuickDiscard: boolean;
  isSafeDiscard: boolean;
  showDiscardButton: boolean;
  canReplace: boolean;
  /** Escondida enquanto a distribuição ou a animação da mesa não chega até ela */
  dealClass: string | false;
  heldInvisible: boolean;
  canLift: boolean;
  swapHighlight: SwapHighlight | undefined;
}

function wrapperClass(layout: HandLayout, index: number): string {
  if (layout === "compact") return "min-w-[52px] flex-shrink-0";
  if (layout === "fan") return cn("shrink-0", index > 0 && "-ml-8 md:-ml-12");
  return "min-w-[88px]";
}

function cardSizeClass(layout: HandLayout): string {
  if (layout === "compact") return "w-12 h-[4.25rem]";
  if (layout === "fan") return "w-16 h-24 md:w-20 md:h-28";
  return "w-[4.5rem] h-[6.5rem] md:w-24 md:h-36";
}

function stackStyle(c: HandCardState, layout: HandLayout): { zIndex: number } | undefined {
  if (c.swapHighlight) return { zIndex: 40 };
  if (layout === "fan") return { zIndex: c.hovered ? 40 : c.index + 1 };
  return undefined;
}

/** Seta de troca: aparece sobre a carta quando dá para trocá-la pela comprada. */
function ReplaceArrow({ compact }: { compact: boolean }) {
  const { t } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.85 }}
      transition={{ duration: 0.15 }}
      className={cn("absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center", fit(compact, "-top-6", "-top-9"))}
    >
      <div className="rounded-full bg-green-500 text-white shadow-lg shadow-green-500/40 p-1 ring-2 ring-green-300/80">
        <ArrowUpDown className={cn(fit(compact, "w-3 h-3", "w-5 h-5"))} strokeWidth={2.5} />
      </div>
      {!compact && (
        <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-green-300 drop-shadow-md whitespace-nowrap">
          {t("game.swapHint")}
        </span>
      )}
    </motion.div>
  );
}

function SealedBadge({ compact }: { compact: boolean }) {
  const { t } = useI18n();
  return (
    <div className="absolute -top-1.5 -right-1.5 z-20 rounded-full bg-indigo-700 p-1 text-white shadow" title={t("game.sealed")} aria-label={t("game.sealed")}>
      <Lock className={fit(compact, "w-2.5 h-2.5", "w-3.5 h-3.5")} />
    </div>
  );
}

function MatchLabel({ compact }: { compact: boolean }) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 z-20 whitespace-nowrap font-bold text-orange-400 uppercase tracking-wider animate-pulse",
        fit(compact, "-top-3 text-[8px]", "-top-4 text-[10px]"),
      )}
    >
      {t("game.match")}
    </div>
  );
}

/** Descarte livre: dentro da carta, para aparecer sem empurrar a mão para cima. */
function QuickDiscardButton({ compact, safe, onDiscard }: { compact: boolean; safe: boolean; onDiscard: () => void }) {
  const { t } = useI18n();
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="absolute inset-x-1 bottom-1 z-20">
      <Button
        size="sm"
        variant="ghost"
        title={safe ? t("game.discardSafe") : t("game.punishmentRisk")}
        className={cn(
          "w-full h-auto rounded-md font-bold text-white shadow px-0.5 py-0.5",
          fit(compact, "text-[8px]", "text-[10px]"),
          safe ? "bg-emerald-700 hover:bg-emerald-800" : "bg-black/80 hover:bg-black",
        )}
        onClick={(e) => {
          e.stopPropagation();
          onDiscard();
        }}
      >
        {safe ? "✓" : "⚠"} {t("game.discard")}
      </Button>
    </motion.div>
  );
}

export function MyHandCard({
  c,
  layout,
  playerId,
  onClick,
  onHover,
  onDiscard,
  registerCardPosition,
}: {
  c: HandCardState;
  layout: HandLayout;
  playerId: string;
  onClick: () => void;
  onHover: (hovering: boolean) => void;
  onDiscard: () => void;
  registerCardPosition: (key: string, el: HTMLElement | null, card?: Card) => void;
}) {
  const compact = layout === "compact";
  return (
    <motion.div
      className={cn("relative flex flex-col items-center group", c.dealClass, c.heldInvisible && "invisible", wrapperClass(layout, c.index))}
      style={stackStyle(c, layout)}
      whileHover={c.canLift && !compact ? { y: -12 } : {}}
      onHoverStart={() => onHover(true)}
      onHoverEnd={() => onHover(false)}
    >
      <AnimatePresence>{c.canReplace && !c.sealed && c.hovered && <ReplaceArrow compact={compact} />}</AnimatePresence>

      <button
        type="button"
        onClick={onClick}
        className="relative block w-full border-0 bg-transparent p-0 text-left"
        ref={(el) => registerCardPosition(`${playerId}_${c.index}`, el, c.card)}
        data-card-target={`${playerId}:${c.index}`}
      >
        {c.sealed && <SealedBadge compact={compact} />}
        <SwapBadge highlight={c.swapHighlight} number={c.index + 1} />
        <div style={swapCardStyle(c.swapHighlight)}>
          <PlayingCard
            card={c.face}
            hidden={c.hidden}
            selected={c.selected}
            className={cn(
              "transition-all mx-auto",
              cardSizeClass(layout),
              c.canReplace && !c.sealed && "cursor-pointer hover:ring-4 ring-green-400 ring-4 ring-green-400/40",
              c.canMatch && "cursor-pointer hover:ring-4 ring-orange-400",
              c.canQuickDiscard && "cursor-pointer hover:ring-4 ring-blue-400",
            )}
          />
        </div>
      </button>

      {c.canMatch && <MatchLabel compact={compact} />}
      {c.showDiscardButton && <QuickDiscardButton compact={compact} safe={c.isSafeDiscard} onDiscard={onDiscard} />}
    </motion.div>
  );
}
