import { motion, useAnimate } from "framer-motion";
import { useEffect, useState } from "react";
import { useLatest } from "./useLatest";
import { PlayingCard } from "../PlayingCard";
import { DrawAnimationData, BaseAnimationProps, DEFAULT_DURATIONS } from "./types";
import { useI18n } from "@/contexts/i18n-context";
import { useIsCompactGame } from "@/hooks/use-landscape";
import { cn } from "@/lib/utils";
import { flyingCardSize, measureCenter } from "./flyingCard";

interface CardDrawAnimationProps extends BaseAnimationProps {
  data: DrawAnimationData;
  isOwnPlayer?: boolean;
}

/**
 * Compra: a carta desliza do topo da pilha, sobe em arco e pousa onde quem comprou vai usá-la
 * (o espaço da carta comprada, para você; a mão, para o oponente).
 * A face só aparece para quem comprou do baralho; do descarte ela já era pública.
 */
export function CardDrawAnimation({ data, onComplete, duration = DEFAULT_DURATIONS.draw, isOwnPlayer = false }: CardDrawAnimationProps) {
  const { t } = useI18n();
  const isCompact = useIsCompactGame();
  const { card, source, sourcePosition, playerName } = data;
  const size = flyingCardSize(isCompact);
  const fromDeck = source === "deck";
  const [scope, animate] = useAnimate();
  const [faceUp, setFaceUp] = useState(!fromDeck);

  const onCompleteRef = useLatest(onComplete);
  useEffect(() => {
    let cancelled = false;
    const seconds = duration / 1000;
    const start = { x: sourcePosition.x - size.halfW, y: sourcePosition.y - size.halfH };
    const run = async () => {
      const guess = data.targetPosition;
      const peak = {
        x: (sourcePosition.x + guess.x) / 2 - size.halfW,
        y: Math.min(sourcePosition.y, guess.y) - (isCompact ? 45 : 80) - size.halfH,
      };
      // 1) Desliza do topo da pilha e sobe
      await animate(
        scope.current,
        { x: [start.x, start.x + (fromDeck ? 10 : -10), peak.x], y: [start.y, start.y - 10, peak.y], scale: [1, 1.06, 1.15], rotate: [0, fromDeck ? 6 : -6, fromDeck ? 12 : -12] },
        { duration: seconds * 0.5, ease: "easeOut" },
      );
      if (cancelled) return;
      if (isOwnPlayer) setFaceUp(true);
      // 2) Mede o destino agora: o espaço da carta comprada aparece durante o voo
      const landing = (isOwnPlayer ? measureCenter("[data-drawn-card]") : null) ?? guess;
      await animate(scope.current, { x: landing.x - size.halfW, y: landing.y - size.halfH, scale: 1, rotate: 0 }, { duration: seconds * 0.45, ease: [0.4, 0, 0.2, 1] });
      if (cancelled) return;
      onCompleteRef.current();
    };
    void run();
    return () => {
      cancelled = true;
    };
    // A animação roda uma vez por evento de compra
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {/* Brilho curto no topo da pilha de onde a carta saiu */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0.7 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn("absolute rounded-2xl border-4", fromDeck ? "border-sky-300" : "border-amber-300")}
        style={{ left: sourcePosition.x - size.halfW, top: sourcePosition.y - size.halfH, width: size.halfW * 2, height: size.halfH * 2 }}
      />

      <div
        ref={scope}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          zIndex: 10000,
          transform: `translate(${sourcePosition.x - size.halfW}px, ${sourcePosition.y - size.halfH}px)`,
          filter: "drop-shadow(0 16px 24px rgba(0,0,0,0.55))",
        }}
      >
        <PlayingCard card={card} hidden={!faceUp} className={size.className} animate={false} />
      </div>

      {/* Aviso curto junto da pilha de origem */}
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="absolute z-[10001]"
        style={{ left: sourcePosition.x, top: sourcePosition.y - size.halfH - (isCompact ? 30 : 44) }}
      >
        <div
          className={cn(
            "-translate-x-1/2 whitespace-nowrap rounded-full border-2 font-bold text-white shadow-lg",
            fromDeck ? "bg-sky-700 border-sky-300" : "bg-amber-600 border-amber-300",
            isCompact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
          )}
        >
          {fromDeck ? t("anim.fromDeck") : t("anim.fromDiscard")} · {playerName}
        </div>
      </motion.div>
    </div>
  );
}
