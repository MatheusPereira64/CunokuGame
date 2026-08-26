import { useRef } from "react";
import { motion } from "framer-motion";
import { Player, Card } from "@shared/schema";
import { PlayingCard } from "@/components/PlayingCard";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SeatSide } from "./seatPositions";

interface PlayerSeatProps {
  player: Player;
  isActive: boolean;
  /** Fim de jogo: revela todas as cartas */
  showAllCards: boolean;
  /** Chaves `${playerId}_${cardId}` de cartas reveladas temporariamente (habilidades 5/6) */
  revealedCardKeys: string[];
  registerCardPosition: (key: string, el: HTMLElement | null, card?: Card) => void;
  /** Quantidade total de oponentes — define densidade do leque */
  opponentCount?: number;
  /** Lado do arco (desktop); no mobile assume topo */
  side?: SeatSide;
  /** Força modo compacto (cartas/avatar menores) */
  compact?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function PlayerSeat({
  player,
  isActive,
  showAllCards,
  revealedCardKeys,
  registerCardPosition,
  opponentCount = 1,
  side = "top",
  compact: compactProp,
  style,
  className,
}: PlayerSeatProps) {
  const isMobile = useIsMobile();
  const previousRevealedState = useRef<Map<string, boolean>>(new Map());

  const compact = compactProp ?? (opponentCount >= 4 || isMobile);

  const cardSize = compact
    ? isMobile
      ? "w-7 h-10"
      : "w-10 h-14 md:w-12 md:h-[4.5rem]"
    : isMobile
      ? "w-8 h-12"
      : "w-12 h-16 md:w-14 md:h-20";

  // Overlap do leque: mais forte em mesas lotadas
  const overlapClass = compact
    ? isMobile
      ? "-ml-4"
      : "-ml-6 md:-ml-7"
    : isMobile
      ? "-ml-3"
      : "-ml-5 md:-ml-6";

  const hand = (
    <div
      className={cn(
        "flex justify-center items-end",
        // Limita o footprint mesmo com mãos grandes (punição)
        compact ? "max-w-[7.5rem] md:max-w-[9rem]" : "max-w-[10rem] md:max-w-[12rem]"
      )}
    >
      {player.hand.map((card, i) => {
        const cardKey = `${player.id}_${card.id}`;
        const isTemporarilyRevealed = revealedCardKeys.includes(cardKey);
        const shouldShowCard = showAllCards || isTemporarilyRevealed;

        const wasPreviouslyHidden = previousRevealedState.current.get(cardKey) === false;
        const wasJustRevealed = wasPreviouslyHidden && shouldShowCard;
        previousRevealedState.current.set(cardKey, shouldShowCard);

        const positionKey = `${player.id}_${i}`;

        return (
          <div
            key={card.id ?? i}
            className={cn("relative shrink-0", i > 0 && overlapClass)}
            style={{ zIndex: i + 1 }}
            ref={(el) => registerCardPosition(positionKey, el, card)}
          >
            {shouldShowCard ? (
              <motion.div
                initial={wasJustRevealed ? { rotateY: 180 } : false}
                animate={{ rotateY: 0 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <PlayingCard
                  card={card}
                  hidden={false}
                  className={cn(cardSize, isTemporarilyRevealed && "ring-2 ring-yellow-400 ring-offset-1")}
                  animate={false}
                />
              </motion.div>
            ) : (
              <PlayingCard card={card} hidden className={cardSize} animate={false} />
            )}

            {isTemporarilyRevealed && (
              <div
                className={cn(
                  "absolute bg-yellow-400 rounded-full shadow animate-pulse z-20",
                  isMobile ? "-top-1 -right-1 p-0.5" : "-top-1.5 -right-1.5 p-0.5"
                )}
              >
                <Eye className={cn("text-yellow-900", isMobile ? "w-2 h-2" : "w-2.5 h-2.5")} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const avatar = (
    <Avatar
      name={player.name}
      isBot={player.isBot}
      score={player.score}
      isActive={isActive}
      compact={compact || isMobile}
    />
  );

  // Avatar fica no lado de fora da mesa; leque aponta para o feltro
  const layoutClass =
    side === "left"
      ? "flex-row-reverse items-center gap-1.5"
      : side === "right"
        ? "flex-row items-center gap-1.5"
        : "flex-col items-center gap-1";

  return (
    <div
      style={style}
      className={cn(
        "flex rounded-xl transition-all pointer-events-none",
        layoutClass,
        isMobile ? "p-0.5" : "p-1",
        className
      )}
    >
      {/* No topo: avatar acima das cartas (fora da mesa) */}
      {side === "top" && avatar}
      {hand}
      {/* Nas laterais: avatar já está no lado de fora via flex-row / flex-row-reverse */}
      {(side === "left" || side === "right") && avatar}
    </div>
  );
}
