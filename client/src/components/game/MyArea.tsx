import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameState, Player, Card } from "@shared/schema";
import { PlayingCard } from "@/components/PlayingCard";
import { Avatar } from "@/components/Avatar";
import { EmoteBubble } from "./EmotePicker";
import { swapCardStyle, useSwapHighlights } from "./swapHighlight";
import { SwapBadge } from "./SwapBadge";
import { seatDetail } from "./helpers";
import { Button } from "@/components/Button";
import { cn, fit } from "@/lib/utils";
import { useIsCompactGame } from "@/hooks/use-landscape";
import { useI18n } from "@/contexts/i18n-context";
import { ArrowUpDown, Lock } from "lucide-react";
import { loadProfile } from "@/lib/playerProfile";

interface MyAreaProps {
  gameState: GameState;
  me: Player;
  isMyTurn: boolean;
  phase: string | undefined;
  sendAction: (action: any) => void;
  registerCardPosition: (key: string, el: HTMLElement | null, card?: Card) => void;
  /** Faces reveladas por Rei ou Coringa, por `${playerId}_${cardId}` */
  revealedCards?: Record<string, Card>;
  /** Emote ativo do jogador local */
  emoteId?: string;
}

export function MyArea({ gameState, me, isMyTurn, phase, sendAction, registerCardPosition, revealedCards = {}, emoteId }: MyAreaProps) {
  const isCompact = useIsCompactGame();
  const { t } = useI18n();
  const swapHighlights = useSwapHighlights();
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);
  const profile = loadProfile();

  // Ação livre: fora da vez sempre; na própria vez, só antes de comprar
  const canFreeDiscard =
    !gameState.winnerId &&
    gameState.turnPhase !== "finished" &&
    gameState.discardPile.length > 0 &&
    (!isMyTurn || phase === "draw");

  // Cartas que sei serem iguais à do topo: descartá-las não tem risco
  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
  const safeDiscards = canFreeDiscard
    ? me.hand.flatMap((card, index) => (me.knownCards[index.toString()] && card.rank === topDiscard?.rank ? [index] : []))
    : [];
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Pode trocar a carta comprada por qualquer carta da mão
  const canReplace = isMyTurn && phase === "action" && !!gameState.drawnCard && !gameState.jokerRevealed;
  const isCardSealed = (cardId: string) => !!gameState.sealedCards?.some((s) => s.cardId === cardId);

  const handleCardClick = (cardIndex: number) => {
    // Carta selada não pode ser trocada nem descartada nesta rodada
    if (isCardSealed(me.hand[cardIndex]?.id)) return;

    // Substituição pela carta comprada
    if (isMyTurn && phase === "action" && gameState.drawnCard && !gameState.jokerRevealed) {
      sendAction({ type: "replace_card", handIndex: cardIndex });
      return;
    }

    setSelectedHandIndex(cardIndex === selectedHandIndex ? null : cardIndex);
  };

  // A seleção só vale para a etapa em que foi feita e para a mão daquele momento
  const selectionScope = isMyTurn ? phase : "off-turn";
  useEffect(() => {
    setSelectedHandIndex(null);
  }, [selectionScope, me.hand.length]);

  // Leque quando mão grande
  const useFanOverlap = !isCompact && me.hand.length > 5;

  return (
    <div
      className={cn(
        "absolute left-0 right-0 flex flex-col items-center z-30 player-hand-zone",
        fit(isCompact, "bottom-0.5", "bottom-3")
      )}
    >
      {/* Minha mão centralizada sob a pilha; ícone e botão Cunoku ficam colados nas pontas */}
      <div
        className={cn(
          "relative rounded-2xl ring-1 transition-all max-w-[78%]",
          fit(isCompact, "px-1 pt-1", "px-2 pt-1.5 pb-0.5"),
          isMyTurn
            ? "bg-yellow-400/10 ring-yellow-400/60 shadow-[0_0_24px_rgba(250,204,21,0.3)]"
            : "ring-transparent"
        )}
      >
      <div
        className={cn(
          "flex items-end justify-center",
          isCompact
            ? "gap-1 overflow-x-auto pb-0.5"
            : useFanOverlap
              ? "gap-0"
              : "gap-3"
        )}
      >
        {me.hand.map((card, i) => {
          const canMatchThisCard = !isMyTurn && safeDiscards.includes(i);
          const isKnownCard = me.knownCards[i.toString()] || me.knownCards[i];
          const sealed = isCardSealed(card.id);
          const canQuickDiscard = canFreeDiscard && !sealed;
          const revealedFace = revealedCards[`${me.id}_${card.id}`];
          const isSafeDiscard = canQuickDiscard && safeDiscards.includes(i);
          const showDiscardButton = canQuickDiscard && (isSafeDiscard || selectedHandIndex === i);

          return (
            <motion.div
              key={card.id || i}
              className={cn(
                "relative flex flex-col items-center group",
                isCompact
                  ? "min-w-[52px] flex-shrink-0"
                  : useFanOverlap
                    ? cn("shrink-0", i > 0 && "-ml-8 md:-ml-12")
                    : "min-w-[88px]"
              )}
              style={
                swapHighlights[card.id]
                  ? { zIndex: 40 }
                  : useFanOverlap
                    ? { zIndex: hoveredIndex === i ? 40 : i + 1 }
                    : undefined
              }
              whileHover={(isMyTurn || canMatchThisCard || canQuickDiscard) && !isCompact ? { y: -12 } : {}}
              onHoverStart={() => setHoveredIndex(i)}
              onHoverEnd={() => setHoveredIndex((prev) => (prev === i ? null : prev))}
            >
              {/* Seta de troca: hover na carta quando pode substituir a comprada */}
              <AnimatePresence>
                {canReplace && !sealed && hoveredIndex === i && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center",
                      fit(isCompact, "-top-6", "-top-9")
                    )}
                  >
                    <div className="rounded-full bg-green-500 text-white shadow-lg shadow-green-500/40 p-1 ring-2 ring-green-300/80">
                      <ArrowUpDown className={cn(fit(isCompact, "w-3 h-3", "w-5 h-5"))} strokeWidth={2.5} />
                    </div>
                    {!isCompact && (
                      <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-green-300 drop-shadow-md whitespace-nowrap">
                        {t("game.swapHint")}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="button"
                onClick={() => handleCardClick(i)}
                className="relative block w-full border-0 bg-transparent p-0 text-left"
                ref={(el) => registerCardPosition(`${me.id}_${i}`, el, card)}
                data-card-target={`${me.id}:${i}`}
              >
                {sealed && (
                  <div
                    className="absolute -top-1.5 -right-1.5 z-20 rounded-full bg-indigo-700 p-1 text-white shadow"
                    title={t("game.sealed")}
                    aria-label={t("game.sealed")}
                  >
                    <Lock className={fit(isCompact, "w-2.5 h-2.5", "w-3.5 h-3.5")} />
                  </div>
                )}
                <SwapBadge highlight={swapHighlights[card.id]} number={i + 1} />
                <div style={swapCardStyle(swapHighlights[card.id])}>
                <PlayingCard
                  card={revealedFace ?? card}
                  hidden={!gameState.winnerId && (sealed || (!isKnownCard && !revealedFace))}
                  selected={selectedHandIndex === i}
                  className={cn(
                    "transition-all mx-auto",
                    isCompact
                      ? "w-12 h-[4.25rem]"
                      : useFanOverlap
                        ? "w-16 h-24 md:w-20 md:h-28"
                        : "w-[4.5rem] h-[6.5rem] md:w-24 md:h-36",
                    canReplace && !sealed
                      ? "cursor-pointer hover:ring-4 ring-green-400 ring-4 ring-green-400/40"
                      : "",
                    canMatchThisCard ? "cursor-pointer hover:ring-4 ring-orange-400" : "",
                    canQuickDiscard ? "cursor-pointer hover:ring-4 ring-blue-400" : ""
                  )}
                />
                </div>
              </button>

              {canMatchThisCard && (
                <div
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2 z-20 whitespace-nowrap font-bold text-orange-400 uppercase tracking-wider animate-pulse",
                    fit(isCompact, "-top-3 text-[8px]", "-top-4 text-[10px]")
                  )}
                >
                  {t("game.match")}
                </div>
              )}

              {/* Dentro da carta: aparecer não pode empurrar a mão para cima */}
              {showDiscardButton && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute inset-x-1 bottom-1 z-20"
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    title={isSafeDiscard ? t("game.discardSafe") : t("game.punishmentRisk")}
                    className={cn(
                      "w-full h-auto rounded-md font-bold text-white shadow px-0.5 py-0.5",
                      fit(isCompact, "text-[8px]", "text-[10px]"),
                      isSafeDiscard ? "bg-emerald-700 hover:bg-emerald-800" : "bg-black/80 hover:bg-black"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedHandIndex(null);
                      sendAction({ type: "matched_discard", cardIndex: i });
                    }}
                  >
                    {isSafeDiscard ? "✓" : "⚠"} {t("game.discard")}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className={cn("absolute right-full bottom-0", fit(isCompact, "mr-1", "mr-3"))} data-player-target={me.id}>
        <Avatar name={me.name} detail={seatDetail(me, gameState.skipNextTurnIds, t)} isActive={isMyTurn} position="left" compact={isCompact} iconId={profile.iconId} accent={profile.accent} />
        <EmoteBubble emoteId={emoteId} className="right-full top-0 mr-1" />
      </div>

      {isMyTurn && phase === "draw" && gameState.round >= 5 && !gameState.isFinalRound && (
        <div className={cn("absolute left-full bottom-1", fit(isCompact, "ml-1", "ml-3"))}>
          <Button
            variant="destructive"
            className={cn(
              "rounded-full shadow-xl shadow-red-900/50 font-black border-4 border-red-400",
              fit(isCompact, "w-11 h-11 text-[10px] border-2", "w-20 h-20 text-lg")
            )}
            onClick={() => sendAction({ type: "declare_finish" })}
          >
            {isCompact ? t("game.cunokuShort") : t("game.cunoku")}
          </Button>
        </div>
      )}
      </div>

      {/* Indicador de descarte reativo */}
      {!isMyTurn && safeDiscards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 bg-orange-500/90 backdrop-blur rounded-full border-2 border-orange-400",
            fit(isCompact, "-top-8 px-2 py-0.5", "-top-12 px-4 py-2")
          )}
        >
          <span className={cn("text-white font-bold", fit(isCompact, "text-[9px]", "text-sm"))}>
            {isCompact ? t("game.canDiscardMatchShort") : t("game.canDiscardMatch")}
          </span>
        </motion.div>
      )}

    </div>
  );
}
