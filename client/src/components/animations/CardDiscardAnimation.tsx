import { motion, useAnimate } from "framer-motion";
import { useEffect, useState } from "react";
import { useLatest } from "./useLatest";
import { PlayingCard } from "../PlayingCard";
import { DiscardAnimationData, BaseAnimationProps, DEFAULT_DURATIONS } from "./types";
import { useI18n } from "@/contexts/i18n-context";
import { useIsCompactGame } from "@/hooks/use-landscape";
import { cn } from "@/lib/utils";
import { flyingCardSize, measureCenter, arcPeakY } from "./flyingCard";
import { landOnPile } from "./tableHold";

interface CardDiscardAnimationProps extends BaseAnimationProps {
  data: DiscardAnimationData;
  isOwnPlayer?: boolean;
}

/** Cor do anel de impacto e do aviso, por tipo de descarte. */
function discardTone(discardType: DiscardAnimationData["discardType"], isSuccess?: boolean) {
  if (discardType === "matched") return isSuccess ? "emerald" : "red";
  if (discardType === "from_hand") return "orange";
  return "violet";
}

const TONE = {
  emerald: { ring: "border-emerald-300", pill: "bg-emerald-600 border-emerald-300", glow: "rgba(16,185,129,0.75)", dust: "bg-emerald-300" },
  red: { ring: "border-red-300", pill: "bg-red-600 border-red-300", glow: "rgba(239,68,68,0.75)", dust: "bg-red-200" },
  orange: { ring: "border-orange-300", pill: "bg-orange-600 border-orange-300", glow: "rgba(249,115,22,0.6)", dust: "bg-amber-100" },
  violet: { ring: "border-violet-300", pill: "bg-violet-700 border-violet-300", glow: "rgba(167,139,250,0.6)", dust: "bg-amber-100" },
} as const;

/**
 * Descarte: a carta sai de onde estava (carta comprada ou mão), faz um arco,
 * vira de face no caminho quando estava escondida e cai na pilha com impacto.
 * A face aparece para todos: carta descartada fica aberta na pilha.
 */
export function CardDiscardAnimation({ data, onComplete, duration = DEFAULT_DURATIONS.discard, isOwnPlayer = false }: CardDiscardAnimationProps) {
  const { t } = useI18n();
  const isCompact = useIsCompactGame();
  const { card, discardType, sourcePosition, playerName, isSuccess } = data;
  const size = flyingCardSize(isCompact);
  const [scope, animate] = useAnimate();

  // A sua carta comprada já está aberta; carta de mão ou de oponente vira durante o voo
  const [faceUp, setFaceUp] = useState(isOwnPlayer && discardType === "drawn");
  const [target, setTarget] = useState(data.targetPosition);
  const [landed, setLanded] = useState(false);
  const tone = TONE[discardTone(discardType, isSuccess)];
  const spins = discardType === "matched" && isSuccess;

  const onCompleteRef = useLatest(onComplete);
  useEffect(() => {
    let cancelled = false;
    const seconds = duration / 1000;
    const start = { x: sourcePosition.x - size.halfW, y: sourcePosition.y - size.halfH };
    const run = async () => {
      // 1) Levanta e sobe em arco na direção da pilha
      const guess = data.targetPosition;
      const peak = {
        x: (sourcePosition.x + guess.x) / 2 - size.halfW,
        y: arcPeakY(Math.min(sourcePosition.y, guess.y) - (isCompact ? 50 : 90) - size.halfH),
      };
      await animate(scope.current, { x: [start.x, start.x, peak.x], y: [start.y, start.y - 14, peak.y], scale: [1, 1.1, 1.18], rotate: [0, -4, spins ? 200 : -14] }, { duration: seconds * 0.45, ease: "easeOut" });
      if (cancelled) return;
      setFaceUp(true);
      // 2) Mede a pilha agora (a mesa já se reorganizou) e desce até ela
      const pile = measureCenter("[data-discard-pile]") ?? guess;
      setTarget(pile);
      await animate(scope.current, { x: pile.x - size.halfW, y: pile.y - size.halfH, scale: 1, rotate: spins ? 360 : 0 }, { duration: seconds * 0.4, ease: [0.5, 0, 0.75, 0] });
      if (cancelled) return;
      setLanded(true);
      landOnPile(card.id);
      setTimeout(() => onCompleteRef.current(), 300);
    };
    void run();
    return () => {
      cancelled = true;
    };
    // A animação roda uma vez por evento de descarte
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label =
    discardType === "matched"
      ? isSuccess
        ? t("anim.matchOk")
        : t("anim.matchFail")
      : discardType === "from_hand"
        ? t("anim.discardHand")
        : t("anim.discardCard");

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <div
        ref={scope}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          zIndex: 10000,
          transform: `translate(${sourcePosition.x - size.halfW}px, ${sourcePosition.y - size.halfH}px)`,
          filter: `drop-shadow(0 14px 22px rgba(0,0,0,0.5)) drop-shadow(0 0 14px ${tone.glow})`,
        }}
      >
        <motion.div animate={landed ? { scaleY: [1, 0.88, 1], scaleX: [1, 1.07, 1] } : {}} transition={{ duration: 0.22, ease: "easeOut" }}>
          <PlayingCard card={card} hidden={!faceUp} className={size.className} animate={false} />
        </motion.div>
      </div>

      {/* Impacto na pilha: anel que se abre e poeirinha */}
      {landed && (
        <>
          <motion.div
            initial={{ scale: 0.7, opacity: 0.9 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className={cn("absolute rounded-2xl border-4", tone.ring)}
            style={{ left: target.x - size.halfW, top: target.y - size.halfH, width: size.halfW * 2, height: size.halfH * 2 }}
          />
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const distance = (isCompact ? 34 : 56) + (i % 2) * 14;
            const baseY = target.y + size.halfH * 0.6;
            return (
              <motion.span
                key={i}
                initial={{ x: target.x, y: baseY, scale: 1, opacity: 0.9 }}
                animate={{ x: target.x + Math.cos(angle) * distance, y: baseY + Math.sin(angle) * distance * 0.45, scale: 0, opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className={cn("absolute left-0 top-0 h-2 w-2 rounded-full", tone.dust)}
              />
            );
          })}
        </>
      )}

      {/* Aviso curto acima da pilha: quem descartou */}
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="absolute z-[10001]"
        style={{ left: target.x, top: target.y - size.halfH - (isCompact ? 30 : 44) }}
      >
        <div className={cn("-translate-x-1/2 whitespace-nowrap rounded-full border-2 font-bold text-white shadow-lg", tone.pill, isCompact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs")}>
          {label} · {playerName}
        </div>
      </motion.div>
    </div>
  );
}
