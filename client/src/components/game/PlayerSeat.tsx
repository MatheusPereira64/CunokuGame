import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Player, Card } from "@shared/schema";
import { PlayingCard } from "@/components/PlayingCard";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";
import { Eye, Lock } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";
import type { ProfileAccent, ProfileIconId } from "@/lib/playerProfile";
import { useIsCompactGame } from "@/hooks/use-landscape";
import type { SeatSide } from "./seatPositions";
import { EmoteBubble } from "./EmotePicker";
import { SeatNoticeChip, useSeatNotice } from "./seatNotice";
import { swapCardStyle, useSwapHighlights } from "./swapHighlight";
import { SwapBadge } from "./SwapBadge";
import { seatDetail } from "./helpers";
import { useTargetingSpread } from "./targetingRules";

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

function seatOverlap(compact: boolean, isCompact: boolean, handSize: number) {
  if (compact && isCompact) return handSize > 4 ? "-ml-5" : "-ml-4";
  if (compact) return "-ml-6 md:-ml-7";
  if (isCompact) return "-ml-3";
  return "-ml-5 md:-ml-6";
}

function seatHandWidth(isCompact: boolean, compact: boolean) {
  if (isCompact) return "max-w-[6.5rem]";
  if (compact) return "max-w-[7.5rem] md:max-w-[9rem]";
  return "max-w-[10rem] md:max-w-[12rem]";
}

/** No tamanho compacto (w-7) o número da carta não cabe e fica cortado. */
function revealedCardSize(cardSize: string, isCompact: boolean) {
  return isCompact ? "w-11 h-16" : cardSize;
}

function noticePlacement(side: SeatSide) {
  if (side === "right") return "right-full bottom-0 mr-1";
  if (side === "left") return "left-full bottom-0 ml-1";
  return "top-full left-1/2 -translate-x-1/2 mt-0.5";
}

/** Avatar ao lado das cartas também no topo: em pé, o assento ocuparia o centro da mesa. */
function seatLayout(side: SeatSide) {
  if (side === "left") return "flex-row-reverse items-center gap-1";
  return "flex-row items-center gap-1";
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
  /** Quem perde a próxima vez por errar o descarte */
  skipNextTurnIds?: string[];
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
  skipNextTurnIds,
  style,
  className,
}: PlayerSeatProps) {
  const isCompact = useIsCompactGame();
  const { t } = useI18n();
  const swapHighlights = useSwapHighlights();
  const targetingSpread = useTargetingSpread();
  const notice = useSeatNotice(player.id);
  const previousRevealedState = useRef<Map<string, boolean>>(new Map());

  const compact = compactProp ?? (opponentCount >= 4 || isCompact);
  const cardSize = seatCardSize(compact, isCompact);
  const overlapClass = seatOverlap(compact, isCompact, player.hand.length);

  // Abre o leque enquanto há carta revelada: ela não fica coberta e continua na sua posição na mão
  const spreadHand =
    targetingSpread.has(player.id) || player.hand.some((card) => revealedCardKeys.includes(`${player.id}_${card.id}`));

  const hand = (
    <div
      className={cn(
        "flex justify-center items-end",
        // Limita o footprint mesmo com mãos grandes (punição)
        spreadHand ? "gap-1" : seatHandWidth(isCompact, compact)
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

        return (
          <div
            key={card.id ?? i}
            className={cn("relative shrink-0", i > 0 && !spreadHand && overlapClass)}
            style={swapCardStyle(swapHighlights[card.id], i + 1)}
            ref={(el) => registerCardPosition(positionKey, el, card)}
            data-card-target={`${player.id}:${i}`}
          >
            <SwapBadge highlight={swapHighlights[card.id]} number={i + 1} />
            {shouldShowCard ? (
              <FlippableCard flip={wasJustRevealed}>
                <PlayingCard
                  card={displayCard}
                  hidden={false}
                  className={
                    isTemporarilyRevealed
                      ? cn(revealedCardSize(cardSize, isCompact), "ring-2 ring-yellow-400 ring-offset-1")
                      : cardSize
                  }
                  animate={false}
                />
              </FlippableCard>
            ) : (
              <PlayingCard card={card} hidden className={cardSize} animate={false} />
            )}

            {sealedCardIds.includes(card.id) && (
              <div className={cn("absolute z-20 rounded-full bg-indigo-700 text-white shadow", isCompact ? "-top-1 -left-1 p-0.5" : "-top-1.5 -left-1.5 p-0.5")}>
                <Lock className={isCompact ? "w-2 h-2" : "w-2.5 h-2.5"} />
              </div>
            )}

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
        );
      })}
    </div>
  );

  const avatar = (
    <div className="relative" data-player-target={player.id}>
      <Avatar
        name={player.name}
        isBot={player.isBot}
        detail={seatDetail(player, skipNextTurnIds, t)}
        isActive={isActive}
        compact={compact || isCompact}
        iconId={player.iconId as ProfileIconId | undefined}
        accent={player.accent as ProfileAccent | undefined}
        className={isCompact ? "scale-[0.85] origin-center" : undefined}
      />
      {/* Sempre ao lado do ícone; no lado direito da mesa abre para dentro, sem sair da tela */}
      <EmoteBubble emoteId={emoteId} className={side === "right" ? "right-full top-0 mr-1" : "left-full top-0 ml-1"} />
      {/* Última jogada: logo abaixo do avatar no topo; nas laterais abre para dentro da mesa */}
      <SeatNoticeChip notice={notice} className={noticePlacement(side)} />
    </div>
  );

  // Avatar fica no lado de fora da mesa; leque aponta para o feltro
  const layoutClass = seatLayout(side);

  return (
    <div
      style={style}
      className={cn(
        "flex rounded-2xl transition-all pointer-events-none",
        !player.isConnected && !player.isBot && "opacity-50",
        isActive && "bg-yellow-400/10 ring-2 ring-yellow-400/70 shadow-[0_0_24px_rgba(250,204,21,0.35)]",
        layoutClass,
        isCompact ? "p-0.5" : "p-1",
        className,
        // Aberta para mostrar carta, a mão pode encostar no vizinho: fica por cima dele
        spreadHand && "z-30"
      )}
    >
      {side === "top" && avatar}
      {hand}
      {/* Nas laterais: avatar já está no lado de fora via flex-row / flex-row-reverse */}
      {side !== "top" && avatar}
    </div>
  );
}
