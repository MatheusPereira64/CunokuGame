import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameState, Player, Card } from "@shared/schema";
import { PlayingCard } from "@/components/PlayingCard";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/contexts/i18n-context";
import { ArrowUpDown } from "lucide-react";

interface MyAreaProps {
  gameState: GameState;
  me: Player;
  isMyTurn: boolean;
  phase: string | undefined;
  sendAction: (action: any) => void;
  registerCardPosition: (key: string, el: HTMLElement | null, card?: Card) => void;
}

export function MyArea({ gameState, me, isMyTurn, phase, sendAction, registerCardPosition }: MyAreaProps) {
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);

  // Descarte reativo: cartas conhecidas iguais ao topo da pilha, fora do meu turno
  const getMatchInfo = (): { canMatch: boolean; matchingCards: number[] } => {
    if (gameState.discardPile.length === 0) return { canMatch: false, matchingCards: [] };
    const lastDiscarded = gameState.discardPile[gameState.discardPile.length - 1];
    const matchingCards: number[] = [];
    me.hand.forEach((card, index) => {
      if (card.rank === lastDiscarded.rank && me.knownCards[index.toString()]) {
        matchingCards.push(index);
      }
    });
    return { canMatch: matchingCards.length > 0, matchingCards };
  };

  // Descarte direto no meu turno: qualquer carta conhecida pode ser tentada (com risco de punição)
  const getDiscardInfo = (): { canDiscard: boolean; matchingCards: number[]; allKnownCards: number[] } => {
    if (!isMyTurn || phase !== "draw" || gameState.discardPile.length === 0) {
      return { canDiscard: false, matchingCards: [], allKnownCards: [] };
    }
    const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
    const matchingCards: number[] = [];
    const allKnownCards: number[] = [];
    me.hand.forEach((card, index) => {
      if (me.knownCards[index.toString()]) {
        allKnownCards.push(index);
        if (card.rank === topDiscard.rank) matchingCards.push(index);
      }
    });
    return { canDiscard: allKnownCards.length > 0, matchingCards, allKnownCards };
  };

  const matchInfo = getMatchInfo();
  const discardInfo = getDiscardInfo();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Pode trocar a carta comprada por qualquer carta da mão
  const canReplace = isMyTurn && phase === "action" && !!gameState.drawnCard;

  const handleCardClick = (cardIndex: number) => {
    // Descarte reativo fora do turno
    if (!isMyTurn) {
      if (matchInfo.canMatch && matchInfo.matchingCards.includes(cardIndex)) {
        sendAction({ type: "matched_discard", cardIndex });
      }
      return;
    }

    // Descarte direto da mão durante a fase de compra
    if (phase === "draw" && discardInfo.canDiscard && discardInfo.allKnownCards.includes(cardIndex)) {
      sendAction({ type: "discard_from_hand", cardIndex });
      return;
    }

    // Substituição pela carta comprada
    if (phase === "action" && gameState.drawnCard) {
      sendAction({ type: "replace_card", handIndex: cardIndex });
      return;
    }

    setSelectedHandIndex(cardIndex === selectedHandIndex ? null : cardIndex);
  };

  // Leque quando mão grande; botões de descarte sempre compactos para não subir a mão
  const useFanOverlap = !isMobile && me.hand.length > 5;
  const showDiscardButtons = isMyTurn && phase === "draw" && gameState.discardPile.length > 0;

  return (
    <div
      className={cn(
        "absolute left-0 right-0 flex flex-col items-center z-30 player-hand-zone",
        isMobile ? "bottom-1" : "bottom-3"
      )}
    >
      {/* Minha mão — faixa inferior reservada, sem invadir o centro */}
      <div
        className={cn(
          "flex items-end justify-center",
          isMobile
            ? "gap-1 overflow-x-auto pb-1 w-full px-2"
            : useFanOverlap
              ? "gap-0 max-w-[85%] "
              : "gap-3"
        )}
      >
        {me.hand.map((card, i) => {
          const canMatchThisCard = !isMyTurn && matchInfo.canMatch && matchInfo.matchingCards.includes(i);
          const isKnownCard = me.knownCards[i.toString()] || me.knownCards[i];
          const canQuickDiscard = showDiscardButtons;
          const isSafeDiscard = canQuickDiscard && discardInfo.matchingCards.includes(i);

          return (
            <motion.div
              key={card.id || i}
              className={cn(
                "relative flex flex-col items-center group",
                isMobile
                  ? "min-w-[64px] flex-shrink-0"
                  : useFanOverlap
                    ? cn("shrink-0", i > 0 && "-ml-8 md:-ml-12")
                    : "min-w-[88px]"
              )}
              style={useFanOverlap ? { zIndex: hoveredIndex === i ? 40 : i + 1 } : undefined}
              whileHover={(isMyTurn || canMatchThisCard || canQuickDiscard) && !isMobile ? { y: -12 } : {}}
              onHoverStart={() => setHoveredIndex(i)}
              onHoverEnd={() => setHoveredIndex((prev) => (prev === i ? null : prev))}
            >
              {/* Seta de troca: hover na carta quando pode substituir a comprada */}
              <AnimatePresence>
                {canReplace && hoveredIndex === i && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center",
                      isMobile ? "-top-7" : "-top-9"
                    )}
                  >
                    <div className="rounded-full bg-green-500 text-white shadow-lg shadow-green-500/40 p-1.5 ring-2 ring-green-300/80">
                      <ArrowUpDown className={cn(isMobile ? "w-3.5 h-3.5" : "w-5 h-5")} strokeWidth={2.5} />
                    </div>
                    {!isMobile && (
                      <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-green-300 drop-shadow-md whitespace-nowrap">
                        {t("game.swapHint")}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                onClick={() => handleCardClick(i)}
                className="w-full relative"
                ref={(el) => registerCardPosition(`${me.id}_${i}`, el, card)}
              >
                <PlayingCard
                  card={card}
                  hidden={!gameState.winnerId && !isKnownCard}
                  selected={selectedHandIndex === i}
                  className={cn(
                    "transition-all mx-auto",
                    isMobile
                      ? "w-14 h-20"
                      : useFanOverlap
                        ? "w-16 h-24 md:w-20 md:h-28"
                        : "w-[4.5rem] h-[6.5rem] md:w-24 md:h-36",
                    canReplace
                      ? "cursor-pointer hover:ring-4 ring-green-400 ring-4 ring-green-400/50"
                      : "",
                    canMatchThisCard ? "cursor-pointer hover:ring-4 ring-orange-400" : "",
                    canQuickDiscard ? "cursor-pointer hover:ring-4 ring-blue-400" : ""
                  )}
                />
              </div>

              {isKnownCard && !showDiscardButtons && (
                <div
                  className={cn(
                    "text-center mt-0.5 font-bold text-yellow-400 uppercase tracking-wider",
                    isMobile ? "text-[9px]" : "text-[10px]"
                  )}
                >
                  {t("game.known")}
                </div>
              )}
              {canMatchThisCard && (
                <div
                  className={cn(
                    "text-center mt-0.5 font-bold text-orange-400 uppercase tracking-wider animate-pulse",
                    isMobile ? "text-[9px]" : "text-[10px]"
                  )}
                >
                  {t("game.match")}
                </div>
              )}

              {/* Botão de descarte rápido — só ícone, baixo footprint */}
              {canQuickDiscard && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 w-full px-0.5"
                >
                  <Button
                    size="sm"
                    variant="primary"
                    title={isSafeDiscard ? t("game.discardSafe") : t("game.punishmentRisk")}
                    className={cn(
                      "w-full h-auto rounded-md font-bold bg-red-600 hover:bg-red-700 text-white border-red-800 shadow",
                      "text-[10px] px-1 py-0.5"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      sendAction({ type: "discard_from_hand", cardIndex: i });
                    }}
                  >
                    {isSafeDiscard ? "✓" : "⚠"}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Indicador de descarte reativo */}
      {!isMyTurn && matchInfo.canMatch && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 bg-orange-500/90 backdrop-blur rounded-full border-2 border-orange-400",
            isMobile ? "-top-10 px-2 py-1" : "-top-12 px-4 py-2"
          )}
        >
          <span className={cn("text-white font-bold", isMobile ? "text-[10px]" : "text-sm")}>
            {isMobile ? t("game.canDiscardMatchShort") : t("game.canDiscardMatch")}
          </span>
        </motion.div>
      )}

      {/* Meu avatar — canto, fora da mão */}
      {!isMobile && (
        <div className="absolute -bottom-1 right-4 hidden md:block scale-90 origin-bottom-right">
          <Avatar name={me.name} score={me.score} isActive={isMyTurn} position="left" />
        </div>
      )}

      {/* Botão Cunoku */}
      {isMyTurn && phase === "draw" && gameState.round >= 5 && (
        <div className={cn("absolute", isMobile ? "right-1 bottom-16" : "right-4 bottom-28")}>
          <Button
            variant="destructive"
            className={cn(
              "rounded-full shadow-xl shadow-red-900/50 font-black border-4 border-red-400",
              isMobile ? "w-14 h-14 text-xs" : "w-20 h-20 text-lg"
            )}
            onClick={() => sendAction({ type: "declare_finish" })}
          >
            {isMobile ? t("game.cunokuShort") : t("game.cunoku")}
          </Button>
        </div>
      )}
    </div>
  );
}
