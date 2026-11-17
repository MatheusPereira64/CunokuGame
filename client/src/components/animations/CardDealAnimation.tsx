import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useLatest } from "./useLatest";
import { PlayingCard } from "../PlayingCard";
import { DealAnimationData, BaseAnimationProps, DEFAULT_DURATIONS } from "./types";
import { useI18n } from "@/contexts/i18n-context";
import { useIsCompactGame } from "@/hooks/use-landscape";
import { audioManager } from "@/utils/audioManager";
import { flyingCardSize } from "./flyingCard";
import { dealKey, endDeal, markDealt } from "./dealStore";

interface CardDealAnimationProps extends BaseAnimationProps {
  data: DealAnimationData;
}

interface DealingCard {
  key: string;
  playerId: string;
  target: { x: number; y: number };
  /** Quando a carta sai do baralho (ms desde o início) */
  delay: number;
}

/** Quanto tempo cada carta leva do baralho até a mão, em proporção ao intervalo entre cartas. */
const FLIGHT_SHARE = 1.4;

/**
 * Distribuição inicial: uma carta por jogador de cada vez, como na mesa de verdade.
 * Cada carta da mesa só aparece quando a carta voadora pousa nela (dealStore).
 */
export function CardDealAnimation({ data, onComplete, duration = DEFAULT_DURATIONS.deal }: CardDealAnimationProps) {
  const { t } = useI18n();
  const isCompact = useIsCompactGame();
  const size = flyingCardSize(isCompact);
  const { players, deckPosition } = data;
  const [launched, setLaunched] = useState<ReadonlySet<string>>(new Set());
  const [landed, setLanded] = useState<ReadonlySet<string>>(new Set());
  const flightMs = duration * FLIGHT_SHARE;

  const sequence = useMemo(() => {
    const cards: DealingCard[] = [];
    const maxCards = Math.max(0, ...players.map((p) => p.cards.length));
    for (let cardIndex = 0; cardIndex < maxCards; cardIndex++) {
      for (const player of players) {
        const target = player.positions[cardIndex];
        if (cardIndex >= player.cards.length || !target) continue;
        cards.push({ key: dealKey(player.id, cardIndex), playerId: player.id, target, delay: cards.length * duration });
      }
    }
    return cards;
  }, [players, duration]);

  const onCompleteRef = useLatest(onComplete);
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const card of sequence) {
      timers.push(
        setTimeout(() => {
          setLaunched((prev) => new Set(prev).add(card.key));
          audioManager.playCardSlide();
        }, card.delay),
        setTimeout(() => {
          setLanded((prev) => new Set(prev).add(card.key));
          markDealt(card.key);
        }, card.delay + flightMs),
      );
    }
    const total = (sequence.at(-1)?.delay ?? 0) + flightMs + 150;
    timers.push(
      setTimeout(() => {
        endDeal();
        onCompleteRef.current();
      }, total),
    );
    // Sair da partida no meio da distribuição é tratado pela página do jogo (endDeal ao desmontar)
    return () => timers.forEach(clearTimeout);
  }, [sequence, flightMs, onCompleteRef]);

  const progress = players.map((player) => ({
    id: player.id,
    name: player.name,
    total: player.cards.length,
    dealt: sequence.filter((c) => c.playerId === player.id && landed.has(c.key)).length,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {/* Cartas em voo: saem do baralho e somem ao pousar (a carta da mesa aparece no lugar) */}
      {sequence.map((card, index) => {
        if (!launched.has(card.key) || landed.has(card.key)) return null;
        const start = { x: deckPosition.x - size.halfW, y: deckPosition.y - size.halfH };
        const end = { x: card.target.x - size.halfW, y: card.target.y - size.halfH };
        const peakY = Math.min(deckPosition.y, card.target.y) - (isCompact ? 30 : 60) - size.halfH;
        return (
          <motion.div
            key={card.key}
            initial={{ ...start, scale: 0.9, rotate: 0 }}
            animate={{
              x: [start.x, (start.x + end.x) / 2, end.x],
              y: [start.y, peakY, end.y],
              scale: [0.9, 1.05, 0.85],
              rotate: [0, index % 2 ? 14 : -14, 0],
            }}
            transition={{ duration: flightMs / 1000, ease: [0.3, 0.1, 0.3, 1], times: [0, 0.45, 1] }}
            style={{ position: "absolute", left: 0, top: 0, zIndex: 10000 + index, filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.45))" }}
          >
            <PlayingCard hidden className={size.className} animate={false} />
          </motion.div>
        );
      })}

      {/* Progresso discreto no topo */}
      <div className="absolute left-0 right-0 top-12 z-[10001] flex justify-center px-4 md:top-16">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-white shadow-lg backdrop-blur-sm"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] md:text-sm">
            <span className="font-bold text-emerald-300">{t("anim.dealing")}</span>
            {progress.map((p) => (
              <span key={p.id} className="tabular-nums text-white/85">
                {p.name} {p.dealt}/{p.total}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
