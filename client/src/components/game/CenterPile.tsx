import { RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameState } from "@shared/schema";
import { PlayingCard } from "@/components/PlayingCard";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();
  const { t } = useI18n();

  return (
    <div className={cn("flex items-center", isMobile ? "gap-4" : "gap-10")}>
      {/* Baralho */}
      <div className="relative group" ref={deckRef}>
        {gameState.deck.length > 0 ? (
          <div
            onClick={() => isMyTurn && phase === "draw" && onDrawDeck()}
            className={isMyTurn && phase === "draw" ? "cursor-pointer" : ""}
          >
            {isMyTurn && phase === "draw" && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-center whitespace-nowrap z-10">
                <div className="text-[10px] md:text-xs text-yellow-400 font-bold animate-pulse">
                  {t("game.clickToDraw")}
                </div>
              </div>
            )}
            <PlayingCard
              hidden
              className={cn(
                "transition-all",
                isMobile ? "w-14 h-20" : "w-20 h-28 md:w-24 md:h-36",
                isMyTurn && phase === "draw"
                  ? "cursor-pointer hover:ring-4 ring-white/50 hover:scale-105"
                  : "opacity-80"
              )}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                className={cn(
                  "font-bold transition-all drop-shadow-md",
                  isMobile ? "text-[10px]" : "text-sm",
                  isMyTurn && phase === "draw" ? "text-white" : "text-white/80"
                )}
              >
                {t("game.deck")}
              </span>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "border-2 border-white/10 rounded-xl flex items-center justify-center opacity-50",
              isMobile ? "w-14 h-20" : "w-20 h-28 md:w-24 md:h-36"
            )}
          >
            <span className={cn("text-white/20", isMobile ? "text-[10px]" : "text-xs")}>EMPTY</span>
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
            className="relative z-20 flex items-center gap-2"
          >
            <div className="relative">
              {!isMobile && (
                <div className="absolute -top-7 left-0 right-0 text-center font-bold text-yellow-400 drop-shadow-md whitespace-nowrap text-xs">
                  {t("game.drawnCard")}
                </div>
              )}
              <PlayingCard
                card={gameState.drawnCard}
                className={cn(isMobile ? "w-14 h-20" : "w-20 h-28 md:w-24 md:h-36")}
              />
            </div>

            {phase === "action" && (
              <div className="flex flex-col gap-1.5 items-stretch min-w-[5.5rem]">
                {hasSpecialAbility(gameState.drawnCard) && !gameState.drawnFromDiscard && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={onUseAbility}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-xs px-2 py-1 h-auto"
                  >
                    {isMobile ? t("game.ability") : t("game.useAbility")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onDiscardDrawn}
                  className="text-xs px-2 py-1 h-auto"
                >
                  {t("game.discard")}
                </Button>
                {gameState.drawnFromDiscard && (
                  <div className="text-orange-400 text-[10px] text-center max-w-[7rem] leading-tight">
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
            {!isMobile && (
              <div className="absolute -top-7 left-0 right-0 text-center text-[10px] md:text-xs font-bold text-white/50 uppercase tracking-widest whitespace-nowrap">
                {t("game.discardPile")}
              </div>
            )}
            <PlayingCard
              card={gameState.discardPile[gameState.discardPile.length - 1]}
              className={cn(
                "brightness-90",
                isMobile ? "w-14 h-20" : "w-20 h-28 md:w-24 md:h-36"
              )}
            />
          </div>
        ) : (
          <div
            className={cn(
              "border-2 border-white/10 rounded-xl flex items-center justify-center",
              isMobile ? "w-14 h-20" : "w-20 h-28 md:w-24 md:h-36"
            )}
          >
            <span className={cn("text-white/20", isMobile ? "text-[10px]" : "text-xs")}>EMPTY</span>
          </div>
        )}
      </div>
    </div>
  );
}
