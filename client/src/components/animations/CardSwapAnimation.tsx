import { motion } from "framer-motion";
import { useEffect, useId, useMemo } from "react";
import { useLatest } from "./useLatest";
import { PlayingCard } from "../PlayingCard";
import { useI18n } from "@/contexts/i18n-context";
import { SWAP_COLORS } from "@/components/game/swapHighlight";
import { SwapAnimationData, BaseAnimationProps, DEFAULT_DURATIONS, Position } from "./types";

interface CardSwapAnimationProps extends BaseAnimationProps {
  data: SwapAnimationData;
}

const CARD_WIDTH = 48;
const CARD_HEIGHT = 68;
const FLIGHT_SECONDS = 1.3;
const CURVE_STEPS = [0, 0.25, 0.5, 0.75, 1];

/** Curva de A até B; o sinal escolhe o lado, para as duas cartas não se cruzarem no mesmo traço. */
function curveBetween(from: Position, to: Position, side: 1 | -1) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const bend = Math.min(Math.hypot(dx, dy) * 0.28, 140) * side;
  const length = Math.hypot(dx, dy) || 1;
  const control = {
    x: (from.x + to.x) / 2 - (dy / length) * bend,
    y: (from.y + to.y) / 2 + (dx / length) * bend,
  };
  const pointAt = (t: number) => ({
    x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * control.x + t ** 2 * to.x,
    y: (1 - t) ** 2 * from.y + 2 * (1 - t) * t * control.y + t ** 2 * to.y,
  });
  return {
    path: `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`,
    xs: CURVE_STEPS.map((t) => pointAt(t).x - CARD_WIDTH / 2),
    ys: CURVE_STEPS.map((t) => pointAt(t).y - CARD_HEIGHT / 2),
  };
}

/**
 * Mostra para onde cada carta foi: cada uma voa pelo próprio traço colorido, sempre de costas,
 * e chega com a mesma cor do destaque que fica na mesa depois da animação.
 */
export function CardSwapAnimation({ data, onComplete, duration = DEFAULT_DURATIONS.swap }: CardSwapAnimationProps) {
  const { t } = useI18n();
  const markerId = useId().replaceAll(":", "");
  const { player1Position, player2Position } = data;
  const trails = useMemo(
    () => [
      { ...curveBetween(player1Position, player2Position, 1), color: SWAP_COLORS.toSecond },
      { ...curveBetween(player2Position, player1Position, 1), color: SWAP_COLORS.toFirst },
    ],
    [player1Position, player2Position],
  );

  const onCompleteRef = useLatest(onComplete);
  useEffect(() => {
    const timer = setTimeout(() => onCompleteRef.current(), duration);
    return () => clearTimeout(timer);
  }, [onCompleteRef, duration]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          {trails.map((trail, i) => (
            <marker key={i} id={`${markerId}-${i}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={trail.color} />
            </marker>
          ))}
        </defs>
        {trails.map((trail, i) => (
          <motion.path
            key={i}
            d={trail.path}
            fill="none"
            stroke={trail.color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray="10 8"
            markerEnd={`url(#${markerId}-${i})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: duration / 1000, times: [0, 0.1, 0.8, 1] }}
          />
        ))}
      </svg>

      {trails.map((trail, i) => (
        <motion.div
          key={i}
          className="absolute left-0 top-0 rounded-lg"
          style={{ width: CARD_WIDTH, height: CARD_HEIGHT, boxShadow: `0 0 0 3px ${trail.color}, 0 10px 24px rgba(0,0,0,0.6)` }}
          initial={{ x: trail.xs[0], y: trail.ys[0] }}
          animate={{ x: trail.xs, y: trail.ys }}
          transition={{ duration: FLIGHT_SECONDS, ease: "easeInOut" }}
        >
          <PlayingCard hidden animate={false} className="!h-full !w-full" />
        </motion.div>
      ))}

      {[
        { position: player1Position, number: data.player1CardIndex + 1, color: SWAP_COLORS.toFirst },
        { position: player2Position, number: data.player2CardIndex + 1, color: SWAP_COLORS.toSecond },
      ].map(({ position, number, color }) => (
        <div
          key={number + color}
          className="absolute flex h-6 min-w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-1 text-xs font-black text-black shadow-lg"
          style={{ left: position.x, top: position.y, backgroundColor: color }}
        >
          {number}
        </div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute left-1/2 top-3 max-w-[90vw] -translate-x-1/2 whitespace-nowrap rounded-full bg-black/80 px-4 py-1.5 text-center text-xs font-bold text-white shadow-lg sm:text-sm"
      >
        <span style={{ color: SWAP_COLORS.toSecond }}>
          {t("game.swapCardOf", { card: String(data.player1CardIndex + 1), player: data.player1Name })}
        </span>
        <span className="mx-2">⇄</span>
        <span style={{ color: SWAP_COLORS.toFirst }}>
          {t("game.swapCardOf", { card: String(data.player2CardIndex + 1), player: data.player2Name })}
        </span>
      </motion.div>
    </div>
  );
}
