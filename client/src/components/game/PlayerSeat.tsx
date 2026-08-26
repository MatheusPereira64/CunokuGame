import { useRef } from "react";
import { motion } from "framer-motion";
import { Player, Card } from "@shared/schema";
import { PlayingCard } from "@/components/PlayingCard";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface PlayerSeatProps {
  player: Player;
  isActive: boolean;
  /** Fim de jogo: revela todas as cartas */
  showAllCards: boolean;
  /** Chaves `${playerId}_${cardId}` de cartas reveladas temporariamente (habilidades 5/6) */
  revealedCardKeys: string[];
  registerCardPosition: (key: string, el: HTMLElement | null, card?: Card) => void;
  style?: React.CSSProperties;
  className?: string;
}

export function PlayerSeat({
  player,
  isActive,
  showAllCards,
  revealedCardKeys,
  registerCardPosition,
  style,
  className,
}: PlayerSeatProps) {
  const isMobile = useIsMobile();
  // Rastreia visibilidade anterior de cada carta para animar o flip 3D ao revelar
  const previousRevealedState = useRef<Map<string, boolean>>(new Map());

  const cardSize = isMobile ? "w-8 h-12" : "w-12 h-16 md:w-16 md:h-24";

  return (
    <div
      style={style}
      className={cn(
        "flex flex-col items-center rounded-xl transition-all",
        isMobile ? "gap-1 p-1" : "gap-2 p-2",
        className
      )}
    >
      <div className={cn("flex justify-center", isMobile ? "gap-0.5 mb-1" : "gap-1 mb-2")}>
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
              className="relative"
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
                    className={cn(cardSize, isTemporarilyRevealed && "ring-2 ring-yellow-400 ring-offset-2")}
                    animate={false}
                  />
                </motion.div>
              ) : (
                <PlayingCard card={card} hidden className={cardSize} animate={false} />
              )}

              {isTemporarilyRevealed && (
                <div
                  className={cn(
                    "absolute bg-yellow-400 rounded-full shadow animate-pulse",
                    isMobile ? "-top-1 -right-1 p-0.5" : "-top-2 -right-2 p-1"
                  )}
                >
                  <Eye className={cn("text-yellow-900", isMobile ? "w-2 h-2" : "w-3 h-3")} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Avatar
        name={player.name}
        isBot={player.isBot}
        score={player.score}
        isActive={isActive}
        className={isMobile ? "scale-75" : ""}
      />
    </div>
  );
}
