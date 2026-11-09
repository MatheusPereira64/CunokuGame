import { RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameState } from "@shared/schema";
import { PlayingCard } from "@/components/PlayingCard";
import { Button } from "@/components/Button";
import { cn, fit } from "@/lib/utils";
import { useIsCompactGame } from "@/hooks/use-landscape";
import { useI18n } from "@/contexts/i18n-context";
import { hasSpecialAbility } from "./helpers";

interface CenterPileProps {
  gameState: GameState;
  isMyTurn: boolean;
  phase: string | undefined;
  deckRef: RefObject<HTMLDivElement>;
  discardRef: RefObject<HTMLDivElement>;
  onDrawDeck: () => void;
  onDiscardDrawn: () => void;
  onUseAbility: () => void;
}

export function CenterPile({
  gameState,
  isMyTurn,
  phase,
  deckRef,
  discardRef,
  onDrawDeck,
  onDiscardDrawn,
  onUseAbility,
}: CenterPileProps) {
  const isCompact = useIsCompactGame();
  const { t } = useI18n();

  const cardClass = fit(isCompact, "w-12 h-[4.25rem]", "w-20 h-28 md:w-24 md:h-36");
  const canDraw = isMyTurn && phase === "draw";
  const labelClass = cn(
    "absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-bold uppercase",
    fit(isCompact, "-top-3.5 text-[8px] tracking-wide", "-top-6 text-[10px] tracking-widest md:text-xs")
  );

  return (
    <div className={cn("flex items-center", fit(isCompact, "gap-2.5", "gap-10"))}>
      {/* Baralho */}
      <div className="relative group" ref={deckRef}>
        {/* Baralho vazio continua clicável na sua vez: a compra embaralha o descarte ou encerra a partida */}
        {gameState.deck.length > 0 || canDraw ? (
          <button
            type="button"
            disabled={!canDraw}
            onClick={onDrawDeck}
            className={cn(
              "relative block border-0 bg-transparent p-0 text-left disabled:opacity-100",
              fit(canDraw, "cursor-pointer", "cursor-default")
            )}
          >
            <div className={cn(labelClass, "z-10", fit(canDraw, "text-yellow-400 animate-pulse", "text-white/50"))}>
              {t("game.deck")}
            </div>
            <PlayingCard
              hidden
              className={cn(
                "transition-all",
                cardClass,
                fit(canDraw, "cursor-pointer ring-2 ring-yellow-400/80 hover:ring-4 hover:scale-105", "opacity-80")
              )}
            />
          </button>
        ) : (
          <div
            className={cn(
              "border-2 border-white/10 rounded-xl flex items-center justify-center opacity-50",
              cardClass
            )}
          >
            <span className={cn("text-white/20", fit(isCompact, "text-[8px]", "text-xs"))}>{t("game.emptyPile")}</span>
          </div>
        )}
      </div>

      {/* Carta comprada — ações ao lado para não invadir a mão */}
      <AnimatePresence>
        {gameState.drawnCard && isMyTurn && (
          <motion.div
            initial={{ scale: 0, y: -30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            className={cn("relative z-20 flex items-center", fit(isCompact, "gap-1", "gap-2"))}
          >
            <div className="relative">
              {!isCompact && (
                <div className="absolute -top-7 left-0 right-0 text-center font-bold text-yellow-400 drop-shadow-md whitespace-nowrap text-xs">
                  {t("game.drawnCard")}
                </div>
              )}
              <PlayingCard card={gameState.drawnCard} className={cardClass} />
            </div>

            {phase === "action" && (
              <div
                className={cn(
                  "flex flex-col items-stretch",
                  fit(isCompact, "gap-1 min-w-[4.5rem]", "gap-1.5 min-w-[5.5rem]")
                )}
              >
                {gameState.forcedReplace && (
                  <div
                    className={cn(
                      "text-yellow-300 text-center font-bold leading-tight",
                      fit(isCompact, "text-[9px] max-w-[5rem]", "text-xs max-w-[7rem]")
                    )}
                  >
                    {t("game.mustReplace")}
                  </div>
                )}
                {!gameState.forcedReplace && hasSpecialAbility(gameState.drawnCard) && !gameState.drawnFromDiscard && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={onUseAbility}
                    className={cn(
                      "bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-auto",
                      fit(isCompact, "text-[9px] px-1.5 py-0.5", "text-xs px-2 py-1")
                    )}
                  >
                    {gameState.jokerRevealed ? t("game.jokerForce") : isCompact ? t("game.ability") : t("game.useAbility")}
                  </Button>
                )}
                {!gameState.forcedReplace && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onDiscardDrawn}
                    className={cn("h-auto", fit(isCompact, "text-[9px] px-1.5 py-0.5", "text-xs px-2 py-1"))}
                  >
                    {gameState.jokerRevealed ? t("game.jokerSkip") : t("game.discard")}
                  </Button>
                )}
                {gameState.drawnFromDiscard && (
                  <div
                    className={cn(
                      "text-orange-400 text-center leading-tight",
                      fit(isCompact, "text-[8px] max-w-[5rem]", "text-[10px] max-w-[7rem]")
                    )}
                  >
                    {t("game.fromDiscardNoAbilityShort")}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pilha de descarte */}
      <div className="relative" ref={discardRef}>
        {gameState.discardPile.length > 0 ? (
          <div className="relative">
            <div className={cn(labelClass, "text-white/50")}>{isCompact ? t("game.discardPileShort") : t("game.discardPile")}</div>
            <PlayingCard
              card={gameState.discardPile[gameState.discardPile.length - 1]}
              className={cardClass}
            />
          </div>
        ) : (
          <div
            className={cn(
              "border-2 border-white/10 rounded-xl flex items-center justify-center",
              cardClass
            )}
          >
            <span className={cn("text-white/20", fit(isCompact, "text-[8px]", "text-xs"))}>{t("game.emptyPile")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
