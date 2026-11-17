import { motion, useAnimate } from "framer-motion";
import { useEffect, useState } from "react";
import { useLatest } from "./useLatest";
import { PlayingCard } from "../PlayingCard";
import { ReplaceAnimationData, BaseAnimationProps, DEFAULT_DURATIONS, type Position } from "./types";
import { useI18n } from "@/contexts/i18n-context";
import { useIsCompactGame } from "@/hooks/use-landscape";
import { cn } from "@/lib/utils";
import { flyingCardSize, measureCenter, arcPeakY } from "./flyingCard";
import { landOnPile, releaseSlot, slotKey } from "./tableHold";

interface CardReplaceAnimationProps extends BaseAnimationProps {
  data: ReplaceAnimationData;
  isOwnPlayer?: boolean;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Lugar e tamanho da carta na mão: a animação começa e termina exatamente nele. */
function measureSlot(playerId: string, handIndex: number): { center: Position; width: number } | null {
  const el = document.querySelector(`[data-card-target="${CSS.escape(playerId)}:${handIndex}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0) return null;
  return { center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, width: rect.width };
}

/**
 * Troca da carta comprada por uma da mão, em três tempos:
 * 1. a carta escolhida da mão acende (anel e "carta N") e sobe do lugar;
 * 2. ela vira de face e voa em arco até a pilha de descarte, com impacto ao cair;
 * 3. a carta comprada voa até o lugar vazio e encaixa, com um brilho verde.
 * O lugar na mão e a pilha mostram o estado novo só quando cada carta pousa (tableHold).
 */
export function CardReplaceAnimation({ data, onComplete, duration = DEFAULT_DURATIONS.replace, isOwnPlayer = false }: CardReplaceAnimationProps) {
  const { t } = useI18n();
  const isCompact = useIsCompactGame();
  const size = flyingCardSize(isCompact);
  const { drawnCard, handCard, drawnCardPosition, playerId, playerName, handIndex } = data;
  const [handScope, animateHand] = useAnimate();
  const [drawnScope, animateDrawn] = useAnimate();

  const initialSlot = measureSlot(playerId, handIndex);
  const [slot] = useState(() => initialSlot ?? { center: data.handCardPosition, width: size.halfW * 2 });
  const slotScale = slot.width / (size.halfW * 2);

  const [handFaceUp, setHandFaceUp] = useState(isOwnPlayer);
  const [pileTarget, setPileTarget] = useState(data.discardPosition);
  const [handLanded, setHandLanded] = useState(false);
  const [drawnLanded, setDrawnLanded] = useState(false);

  const onCompleteRef = useLatest(onComplete);
  useEffect(() => {
    let cancelled = false;
    const ms = duration;
    // O Framer Motion mede em segundos; os tempos abaixo são frações da duração
    const sec = duration / 1000;
    const at = (p: Position) => ({ x: p.x - size.halfW, y: p.y - size.halfH });

    // Carta que sai da mão: acende no lugar, sobe, vira e vai para a pilha
    const handFlight = async () => {
      const start = at(slot.center);
      // Começa parada no lugar da mão (os valores iniciais do Framer partem de 0)
      await animateHand(handScope.current, { x: start.x, y: start.y, scale: slotScale, rotate: 0 }, { duration: 0 });
      await animateHand(handScope.current, { x: start.x, y: start.y - (isCompact ? 14 : 24), scale: slotScale * 1.15, rotate: -6 }, { delay: sec * 0.18, duration: sec * 0.18, ease: "easeOut" });
      if (cancelled) return;
      setHandFaceUp(true);
      const pile = measureCenter("[data-discard-pile]") ?? data.discardPosition;
      setPileTarget(pile);
      const end = at(pile);
      const peakY = arcPeakY(Math.min(slot.center.y, pile.y) - (isCompact ? 50 : 90) - size.halfH);
      await animateHand(
        handScope.current,
        { x: [start.x, (start.x + end.x) / 2, end.x], y: [start.y - (isCompact ? 14 : 24), peakY, end.y], scale: [slotScale * 1.15, 1.15, 1], rotate: [-6, -16, 0] },
        { duration: sec * 0.36, ease: [0.3, 0.05, 0.25, 1] },
      );
      if (cancelled) return;
      setHandLanded(true);
      landOnPile(handCard.id);
    };

    // Carta comprada: espera a da mão sair do lugar e voa até ele
    const drawnFlight = async () => {
      await wait(ms * 0.42);
      if (cancelled) return;
      const target = measureSlot(playerId, handIndex)?.center ?? slot.center;
      const start = at(drawnCardPosition);
      const end = at(target);
      const peakY = arcPeakY(Math.min(drawnCardPosition.y, target.y) - (isCompact ? 30 : 60) - size.halfH);
      await animateDrawn(drawnScope.current, { x: start.x, y: start.y, scale: 1, rotate: 0 }, { duration: 0 });
      await animateDrawn(drawnScope.current, { opacity: 1 }, { duration: 0.08 });
      await animateDrawn(
        drawnScope.current,
        { x: [start.x, (start.x + end.x) / 2, end.x], y: [start.y, peakY, end.y], scale: [1, 1.12, slotScale], rotate: [0, 10, 0] },
        { duration: sec * 0.38, ease: [0.3, 0.05, 0.25, 1] },
      );
      if (cancelled) return;
      setDrawnLanded(true);
      releaseSlot(slotKey(playerId, handIndex));
    };

    void Promise.all([handFlight(), drawnFlight()]).then(async () => {
      if (cancelled) return;
      await wait(320);
      if (!cancelled) onCompleteRef.current();
    });
    return () => {
      cancelled = true;
    };
    // A animação roda uma vez por troca
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slotBox = {
    left: slot.center.x - slot.width / 2 - 4,
    top: slot.center.y - (slot.width * 1.4) / 2 - 4,
    width: slot.width + 8,
    height: slot.width * 1.4 + 8,
  };
  const translate = (p: Position, scale = 1) => `translate(${p.x - size.halfW}px, ${p.y - size.halfH}px) scale(${scale})`;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {/* 1. O lugar escolhido acende enquanto a troca acontece; fica verde quando a nova chega */}
      <motion.div
        initial={{ opacity: 0, scale: 1.25 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "absolute rounded-xl border-[3px] transition-colors duration-200",
          drawnLanded ? "border-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.8)]" : "border-amber-300 shadow-[0_0_22px_rgba(252,211,77,0.8)] motion-safe:animate-pulse",
        )}
        style={slotBox}
      />
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute z-[10002]"
        style={{ left: slot.center.x, top: slotBox.top - (isCompact ? 22 : 28) }}
      >
        <div className={cn("-translate-x-1/2 whitespace-nowrap rounded-full border-2 border-amber-200 bg-amber-500 font-black text-amber-950 shadow-lg", isCompact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs")}>
          {t("anim.replacedSlot", { n: String(handIndex + 1), player: playerName })}
        </div>
      </motion.div>

      {/* 2. Carta que sai da mão para a pilha */}
      {!handLanded && (
        <div
          ref={handScope}
          className="absolute left-0 top-0"
          style={{ zIndex: 10001, transform: translate(slot.center, slotScale), filter: "drop-shadow(0 14px 22px rgba(0,0,0,0.5)) drop-shadow(0 0 12px rgba(249,115,22,0.6))" }}
        >
          <PlayingCard card={handCard} hidden={!handFaceUp} className={size.className} animate={false} />
        </div>
      )}
      {handLanded && (
        <motion.div
          initial={{ scale: 0.7, opacity: 0.9 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="absolute rounded-2xl border-4 border-orange-300"
          style={{ left: pileTarget.x - size.halfW, top: pileTarget.y - size.halfH, width: size.halfW * 2, height: size.halfH * 2 }}
        />
      )}

      {/* 3. Carta comprada indo para o lugar vazio */}
      {!drawnLanded && (
        <div
          ref={drawnScope}
          className="absolute left-0 top-0"
          style={{ zIndex: 10000, opacity: 0, transform: translate(drawnCardPosition), filter: "drop-shadow(0 14px 22px rgba(0,0,0,0.5)) drop-shadow(0 0 12px rgba(16,185,129,0.6))" }}
        >
          <PlayingCard card={isOwnPlayer ? drawnCard : undefined} hidden={!isOwnPlayer} className={size.className} animate={false} />
        </div>
      )}
    </div>
  );
}
