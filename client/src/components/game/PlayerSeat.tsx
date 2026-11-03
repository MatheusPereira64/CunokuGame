import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Player, Card } from "@shared/schema";
import { PlayingCard } from "@/components/PlayingCard";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";
import { Eye, Lock } from "lucide-react";
import { useIsCompactGame } from "@/hooks/use-landscape";
import type { SeatSide } from "./seatPositions";
import { EmoteBubble } from "./EmotePicker";
import { swapCardStyle, useSwapHighlights } from "./swapHighlight";
import { SwapBadge } from "./SwapBadge";

/** initial sempre é um objeto: trocar para `false` muda a quantidade de hooks do Framer Motion. */
function FlippableCard({ flip, children }: { flip: boolean; children: ReactNode }) {
  const [spin] = useState(flip);
  return (
    <motion.div
      initial={{ rotateY: spin ? 180 : 0 }}
      animate={{ rotateY: 0 }}
      transition={{ duration: spin ? 0.6 : 0, ease: "easeInOut" }}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </motion.div>
  );
}

function seatCardSize(compact: boolean, isCompact: boolean) {
  if (compact && isCompact) return "w-7 h-10";
  if (compact) return "w-10 h-14 md:w-12 md:h-[4.5rem]";
  if (isCompact) return "w-8 h-12";
  return "w-12 h-16 md:w-14 md:h-20";
}

function seatOverlap(compact: boolean, isCompact: boolean) {
  if (compact && isCompact) return "-ml-4";
  if (compact) return "-ml-6 md:-ml-7";
  if (isCompact) return "-ml-3";
  return "-ml-5 md:-ml-6";
}

function seatHandWidth(isCompact: boolean, compact: boolean) {
  if (isCompact) return "max-w-[6.5rem]";
  if (compact) return "max-w-[7.5rem] md:max-w-[9rem]";
  return "max-w-[10rem] md:max-w-[12rem]";
}

/**
 * Tamanho real, não `scale`: nas cartas pequenas do assento o número não cabe e fica cortado,
 * e ampliar só aumentaria o corte. Uma revelada cresce por cima do leque; várias (Rei, Coringa)
 * ficam lado a lado.
 */
function revealedCardSize(revealedCount: number, isCompact: boolean) {
  if (revealedCount > 1) return isCompact ? "w-11 h-16" : "w-12 h-[4.5rem] md:w-14 md:h-20";
  return isCompact ? "w-16 h-24" : "w-20 h-28";
}

function seatLayout(side: SeatSide) {
  if (side === "left") return "flex-row-reverse items-center gap-1";
  if (side === "right") return "flex-row items-center gap-1";
  return "flex-col items-center gap-0.5";
}

interface PlayerSeatProps {
  player: Player;
  isActive: boolean;
  /** Fim de jogo: revela todas as cartas */
  showAllCards: boolean;
  /** Chaves `${playerId}_${cardId}` de cartas reveladas só para este cliente (habilidades 5/6) */
  revealedCardKeys: string[];
  /** Faces reais das cartas peekadas (mãos de oponentes vêm filtradas no estado online) */
  revealedCardsByKey?: Record<string, Card>;
  registerCardPosition: (key: string, el: HTMLElement | null, card?: Card) => void;
  /** Quantidade total de oponentes — define densidade do leque */
  opponentCount?: number;
  /** Lado do arco (desktop); no mobile assume topo */
  side?: SeatSide;
  /** Força modo compacto (cartas/avatar menores) */
  compact?: boolean;
  /** Cartas seladas pelos poderes de 3 e 4 */
  sealedCardIds?: string[];
  /** Emote ativo deste jogador */
  emoteId?: string;
  style?: React.CSSProperties;
  className?: string;
}

export function PlayerSeat({
  player,
  isActive,
  showAllCards,
  revealedCardKeys,
  revealedCardsByKey,
  registerCardPosition,
  opponentCount = 1,
  side = "top",
  compact: compactProp,
  emoteId,
  sealedCardIds = [],
  style,
  className,
}: PlayerSeatProps) {
  const isCompact = useIsCompactGame();
  const swapHighlights = useSwapHighlights();
  const previousRevealedState = useRef<Map<string, boolean>>(new Map());

  const compact = compactProp ?? (opponentCount >= 4 || isCompact);
  const cardSize = seatCardSize(compact, isCompact);
  const overlapClass = seatOverlap(compact, isCompact);

  const revealedCount = player.hand.filter((card) => revealedCardKeys.includes(`${player.id}_${card.id}`)).length;
  const spreadHand = revealedCount > 1;

  const hand = (
    <div
      className={cn(
        "flex justify-center items-end",
        // Limita o footprint mesmo com mãos grandes (punição)
        spreadHand ? "gap-0.5" : seatHandWidth(isCompact, compact)
      )}
    >
      {player.hand.map((card, i) => {
        const cardKey = `${player.id}_${card.id}`;
        const isTemporarilyRevealed = revealedCardKeys.includes(cardKey);
        const shouldShowCard = showAllCards || isTemporarilyRevealed;
        const displayCard = (isTemporarilyRevealed && revealedCardsByKey?.[cardKey]) || card;

        const wasPreviouslyHidden = previousRevealedState.current.get(cardKey) === false;
        const wasJustRevealed = wasPreviouslyHidden && shouldShowCard;
        previousRevealedState.current.set(cardKey, shouldShowCard);

        const positionKey = `${player.id}_${i}`;
        const liftedOverFan = isTemporarilyRevealed && revealedCount === 1;

        return (
          <div
            key={card.id ?? i}
            className={cn("relative shrink-0", liftedOverFan && cardSize, i > 0 && !spreadHand && overlapClass)}
            style={{
              ...swapCardStyle(swapHighlights[card.id], i + 1),
              ...(isTemporarilyRevealed ? { zIndex: 30 } : undefined),
            }}
            ref={(el) => registerCardPosition(positionKey, el, card)}
          >
            <SwapBadge highlight={swapHighlights[card.id]} number={i + 1} />
            {shouldShowCard ? (
              <div className={liftedOverFan ? "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" : undefined}>
                <FlippableCard flip={wasJustRevealed}>
                  <PlayingCard
                    card={displayCard}
                    hidden={false}
                    className={
                      isTemporarilyRevealed
                        ? cn(revealedCardSize(revealedCount, isCompact), "ring-2 ring-yellow-400 ring-offset-1")
                        : cardSize
                    }
                    animate={false}
                  />
                </FlippableCard>
                {isTemporarilyRevealed && (
                  <div
                    className={cn(
                      "absolute bg-yellow-400 rounded-full shadow animate-pulse z-20",
                      isCompact ? "-top-1 -right-1 p-0.5" : "-top-1.5 -right-1.5 p-0.5"
                    )}
                  >
                    <Eye className={cn("text-yellow-900", isCompact ? "w-2 h-2" : "w-2.5 h-2.5")} />
                  </div>
                )}
              </div>
            ) : (
              <PlayingCard card={card} hidden className={cardSize} animate={false} />
            )}

            {sealedCardIds.includes(card.id) && (
              <div className={cn("absolute z-20 rounded-full bg-indigo-700 text-white shadow", isCompact ? "-top-1 -left-1 p-0.5" : "-top-1.5 -left-1.5 p-0.5")}>
                <Lock className={isCompact ? "w-2 h-2" : "w-2.5 h-2.5"} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const avatar = (
    <div className="relative">
      <Avatar
        name={player.name}
        isBot={player.isBot}
        score={player.score}
        isActive={isActive}
        compact={compact || isCompact}
        className={isCompact ? "scale-[0.85] origin-center" : undefined}
      />
      {/* Sempre ao lado do ícone; no lado direito da mesa abre para dentro, sem sair da tela */}
      <EmoteBubble emoteId={emoteId} className={side === "right" ? "right-full top-0 mr-1" : "left-full top-0 ml-1"} />
    </div>
  );

  // Avatar fica no lado de fora da mesa; leque aponta para o feltro
  const layoutClass = seatLayout(side);

  return (
    <div
      style={style}
      className={cn(
        "flex rounded-xl transition-all pointer-events-none",
        !player.isConnected && !player.isBot && "opacity-50",
        layoutClass,
        isCompact ? "p-0" : "p-1",
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
