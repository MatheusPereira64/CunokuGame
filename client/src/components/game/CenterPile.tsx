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
    <div className={cn("flex items-center z-10", isMobile ? "gap-3" : "gap-12")}>
      {/* Baralho */}
      <div className="relative group" ref={deckRef}>
        {gameState.deck.length > 0 ? (
          <div
            onClick={() => isMyTurn && phase === "draw" && onDrawDeck()}
            className={isMyTurn && phase === "draw" ? "cursor-pointer" : ""}
          >
            <PlayingCard
              hidden
              className={cn(
                "transition-all",
                isMobile ? "w-16 h-24" : "",
                isMyTurn && phase === "draw"
                  ? "cursor-pointer hover:ring-4 ring-white/50 hover:scale-105"
                  : "opacity-80"
              )}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                className={cn(
                  "font-bold transition-all drop-shadow-md",
                  isMobile ? "text-xs" : "",
                  isMyTurn && phase === "draw" ? "text-white text-lg" : "text-white/80"
                )}
              >
                {t("game.deck")}
              </span>
            </div>
            {isMyTurn && phase === "draw" && !isMobile && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center">
                <div className="text-xs text-yellow-400 font-bold animate-pulse whitespace-nowrap">
                  {t("game.clickToDraw")}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "border-2 border-white/10 rounded-xl flex items-center justify-center opacity-50",
              isMobile ? "w-16 h-24" : "w-24 h-36"
            )}
          >
            <span className={cn("text-white/20", isMobile ? "text-[10px]" : "text-xs")}>EMPTY</span>
          </div>
        )}
      </div>

      {/* Carta comprada (flutuante) - só aparece no turno do jogador */}
      <AnimatePresence>
        {gameState.drawnCard && isMyTurn && (
          <motion.div
            initial={{ scale: 0, y: -50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            className="relative z-20"
          >
            {!isMobile && (
              <div className="absolute -top-12 left-0 right-0 text-center font-bold text-yellow-400 drop-shadow-md whitespace-nowrap text-sm">
                {t("game.drawnCard")}
              </div>
            )}
            <PlayingCard card={gameState.drawnCard} className={cn(isMobile && "w-16 h-24")} />

            {phase === "action" && (
              <div
                className={cn(
                  "absolute flex flex-col gap-2 items-center",
                  isMobile ? "-bottom-16 left-1/2 -translate-x-1/2 w-full" : "-bottom-20 left-1/2 -translate-x-1/2"
                )}
              >
                <div className={cn("flex flex-wrap justify-center", isMobile ? "gap-1" : "gap-2")}>
                  {hasSpecialAbility(gameState.drawnCard) && !gameState.drawnFromDiscard && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={onUseAbility}
                      className={cn(
                        "bg-yellow-500 hover:bg-yellow-600 text-black font-bold",
                        isMobile && "text-xs px-2 py-1"
                      )}
                    >
                      {isMobile ? t("game.ability") : t("game.useAbility")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onDiscardDrawn}
                    className={isMobile ? "text-xs px-2 py-1" : ""}
                  >
                    {t("game.discard")}
                  </Button>
                </div>
                {gameState.drawnFromDiscard && (
                  <div
                    className={cn(
                      "text-orange-400 text-center",
                      isMobile ? "text-[10px] max-w-[150px]" : "text-xs max-w-[200px]"
                    )}
                  >
                    {isMobile ? t("game.fromDiscardNoAbilityShort") : t("game.fromDiscardNoAbility")}
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
          <div>
            <PlayingCard
              card={gameState.discardPile[gameState.discardPile.length - 1]}
              className={cn("brightness-90", isMobile && "w-16 h-24")}
            />
            {!isMobile && (
              <div className="absolute -bottom-8 w-full text-center text-xs font-bold text-white/50 uppercase tracking-widest">
                {t("game.discardPile")}
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "border-2 border-white/10 rounded-xl flex items-center justify-center",
              isMobile ? "w-16 h-24" : "w-24 h-36"
            )}
          >
            <span className={cn("text-white/20", isMobile ? "text-[10px]" : "text-xs")}>EMPTY</span>
          </div>
        )}
      </div>
    </div>
  );
}
