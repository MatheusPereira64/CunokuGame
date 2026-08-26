import { useState } from "react";
import { motion } from "framer-motion";
import { GameState, Player, Card } from "@shared/schema";
import { PlayingCard } from "@/components/PlayingCard";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/contexts/i18n-context";

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

  return (
    <div
      className={cn(
        "absolute left-0 right-0 flex flex-col items-center",
        isMobile ? "bottom-2" : "bottom-8"
      )}
    >
      {/* Minha mão */}
      <div className={cn("flex items-start", isMobile ? "gap-1 overflow-x-auto pb-2 w-full px-2" : "gap-4")}>
        {me.hand.map((card, i) => {
          const canMatchThisCard = !isMyTurn && matchInfo.canMatch && matchInfo.matchingCards.includes(i);
          const isKnownCard = me.knownCards[i.toString()] || me.knownCards[i];
          const canQuickDiscard = isMyTurn && phase === "draw" && gameState.discardPile.length > 0;
          const isSafeDiscard = canQuickDiscard && discardInfo.matchingCards.includes(i);

          return (
            <motion.div
              key={card.id || i}
              className={cn(
                "flex flex-col items-center",
                isMobile ? "min-w-[80px] flex-shrink-0" : "min-w-[120px]"
              )}
              whileHover={(isMyTurn || canMatchThisCard || canQuickDiscard) && !isMobile ? { y: -20 } : {}}
            >
              <div
                onClick={() => handleCardClick(i)}
                className="w-full"
                ref={(el) => registerCardPosition(`${me.id}_${i}`, el, card)}
              >
                <PlayingCard
                  card={card}
                  hidden={!gameState.winnerId && !isKnownCard}
                  selected={selectedHandIndex === i}
                  className={cn(
                    "transition-all mx-auto",
                    isMobile ? "w-16 h-24" : "w-24 h-36 md:w-32 md:h-48",
                    isMyTurn && phase === "action" && gameState.drawnCard
                      ? "cursor-pointer hover:ring-4 ring-green-400 ring-4 ring-green-400/50"
                      : "",
                    canMatchThisCard ? "cursor-pointer hover:ring-4 ring-orange-400" : "",
                    canQuickDiscard ? "cursor-pointer hover:ring-4 ring-blue-400" : ""
                  )}
                />
              </div>

              {isKnownCard && (
                <div
                  className={cn(
                    "text-center mt-1 font-bold text-yellow-400 uppercase tracking-wider",
                    isMobile ? "text-[10px]" : "text-xs mt-2"
                  )}
                >
                  {t("game.known")}
                </div>
              )}
              {canMatchThisCard && (
                <div
                  className={cn(
                    "text-center mt-1 font-bold text-orange-400 uppercase tracking-wider animate-pulse",
                    isMobile ? "text-[10px]" : "text-xs"
                  )}
                >
                  {t("game.match")}
                </div>
              )}

              {/* Botão de descarte rápido */}
              {canQuickDiscard && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("mt-2 w-full", isMobile ? "px-1" : "mt-3 px-2")}
                >
                  <Button
                    size="sm"
                    variant="primary"
                    className={cn(
                      "w-full h-auto rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white border-red-800 shadow-lg",
                      isMobile ? "text-[10px] px-1 py-1" : "text-xs px-2 py-2"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      sendAction({ type: "discard_from_hand", cardIndex: i });
                    }}
                  >
                    {isMobile
                      ? isSafeDiscard ? "✓" : "⚠"
                      : isSafeDiscard ? t("game.discardSafe") : t("game.discardRisk")}
                  </Button>
                  {!isSafeDiscard && !isMobile && (
                    <div className="text-center mt-1 text-xs text-red-400 font-semibold">
                      {t("game.punishmentRisk")}
                    </div>
                  )}
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

      {/* Meu avatar */}
      {!isMobile && (
        <div className="absolute bottom-4 right-12 hidden md:block">
          <Avatar name={me.name} score={me.score} isActive={isMyTurn} position="left" />
        </div>
      )}

      {/* Botão Cunoku */}
      {isMyTurn && phase === "draw" && gameState.round >= 5 && (
        <div className={cn("absolute", isMobile ? "right-2 bottom-20" : "right-12 bottom-32")}>
          <Button
            variant="destructive"
            className={cn(
              "rounded-full shadow-xl shadow-red-900/50 font-black border-4 border-red-400",
              isMobile ? "w-16 h-16 text-sm" : "w-24 h-24 text-xl"
            )}
            onClick={() => sendAction({ type: "declare_finish" })}
          >
            {isMobile ? t("game.cunokuShort") : t("game.cunoku")}
          </Button>
          {!isMobile && (
            <div className="text-center mt-2 text-xs text-white/60">
              {t("game.round")} {gameState.round}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
