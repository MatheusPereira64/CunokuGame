import { useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { Card } from "@shared/schema";
import { PlayingCard } from "@/components/PlayingCard";
import { useI18n } from "@/contexts/i18n-context";
import { cn } from "@/lib/utils";
import type { SeatSide } from "./seatPositions";

/**
 * Última posição da carta segurada por jogador. Quando a jogada chega a carta já saiu
 * da tela, e o descarte (ou a troca) precisa sair de onde ela estava.
 */
const lastHeld = new Map<string, { x: number; y: number }>();

export function lastHeldPosition(playerId: string) {
  return lastHeld.get(playerId) ?? null;
}

/** Espera a carta voadora da compra chegar antes de mostrar a carta na mão do jogador. */
const APPEAR_DELAY_S = 0.55;

/**
 * Carta que o oponente acabou de comprar e ainda está decidindo o que fazer:
 * fica na mão dele, junto do avatar, balançando, com um balão de "pensando…".
 * Do baralho fica de costas; do descarte a face já é pública.
 * As animações de descarte e troca saem daqui (data-held-card).
 */
export function HeldCard({
  playerId,
  card,
  faceUp,
  side,
  compact,
}: {
  playerId: string;
  card: Card | null;
  faceUp: boolean;
  side: SeatSide;
  compact: boolean;
}) {
  const { t } = useI18n();
  // No lado direito da mesa a carta fica para dentro, à esquerda do avatar
  const toLeft = side === "right";
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    lastHeld.set(playerId, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  });

  if (!card) return null;
  // O posicionamento fica num div comum: o transform do Framer Motion apagaria o translate
  return (
    <div
      ref={ref}
      data-held-card={playerId}
      className={cn(
        // Meio da lateral do avatar: embaixo fica o aviso da jogada, em cima o selo do Cunoku
        "pointer-events-none absolute top-0 z-40 -translate-y-[35%]",
        toLeft ? "right-full translate-x-[35%]" : "left-full -translate-x-[35%]",
      )}
    >
        <motion.div
          key={card.id}
          initial={{ opacity: 0, scale: 0.6, rotate: toLeft ? -30 : 30 }}
          animate={{ opacity: 1, scale: 1, rotate: toLeft ? -14 : 14 }}
          transition={{ delay: APPEAR_DELAY_S, type: "spring", stiffness: 260, damping: 18 }}
          style={{ transformOrigin: "50% 100%" }}
        >
          {/* Balança devagar, como quem olha a carta e pensa */}
          <div className="held-card-sway" style={{ filter: "drop-shadow(0 0 8px rgba(252,211,77,0.7)) drop-shadow(0 6px 10px rgba(0,0,0,0.5))" }}>
            <PlayingCard
              card={card}
              hidden={!faceUp}
              animate={false}
              className={cn(
                "rounded-md border outline outline-2 outline-amber-300",
                compact ? "h-11 w-8" : "h-14 w-10",
              )}
            />
          </div>

          {/* Balão de pensamento com três pontinhos */}
          <div
            className={cn(
              "absolute -top-2 flex items-center gap-[3px] rounded-full bg-white px-1.5 py-1 shadow-lg",
              toLeft ? "-left-3" : "-right-3",
            )}
            role="status"
            aria-label={t("game.thinking")}
          >
            {[0, 1, 2].map((i) => (
              <span key={i} className="thinking-dot h-1.5 w-1.5 rounded-full bg-gray-600" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
            <span
              className={cn("absolute -bottom-1 h-2 w-2 rounded-full bg-white", toLeft ? "right-0.5" : "left-0.5")}
              aria-hidden="true"
            />
          </div>
        </motion.div>
    </div>
  );
}
