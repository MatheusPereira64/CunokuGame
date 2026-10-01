import { useState } from "react";
import { Card, Player } from "@shared/schema";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { cn, fit } from "@/lib/utils";
import { useIsCompactGame } from "@/hooks/use-landscape";
import { useI18n } from "@/contexts/i18n-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AbilityAction, getAbilityDescription, abilityConfirmDisabled } from "./helpers";

interface AbilityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drawnCard: Card | null;
  players: Player[];
  playerId: string;
  myHand: Card[];
  onConfirm: (action: AbilityAction) => void;
}

function abilityClasses(isCompact: boolean) {
  return {
    labelClass: cn("font-bold text-gray-700", fit(isCompact, "text-xs", "text-sm")),
    cardBtnClass: cn(fit(isCompact, "h-9 min-w-0 text-xs", "h-16")),
    myCardBtnClass: cn(fit(isCompact, "h-9 w-9 text-xs shrink-0", "h-20 w-16")),
    playerBtnClass: cn(
      "h-auto min-w-0 overflow-hidden",
      fit(isCompact, "py-1 px-1.5", "py-3"),
    ),
  };
}

function PlayerPickButton({
  player,
  selected,
  onSelect,
  playerBtnClass,
  isCompact,
}: {
  player: Player;
  selected: boolean;
  onSelect: () => void;
  playerBtnClass: string;
  isCompact: boolean;
}) {
  return (
    <Button
      variant={selected ? "primary" : "outline"}
      onClick={onSelect}
      className={playerBtnClass}
    >
      <div className={cn("flex flex-col items-center w-full min-w-0", fit(isCompact, "gap-0", "gap-1"))}>
        <Avatar name={player.name} isBot={player.isBot} compact score={player.score} className="!gap-0.5" />
      </div>
    </Button>
  );
}

export function AbilityModal({
  open,
  onOpenChange,
  drawnCard,
  players,
  playerId,
  myHand,
  onConfirm,
}: AbilityModalProps) {
  const isCompact = useIsCompactGame();
  const { t } = useI18n();

  const { labelClass, cardBtnClass, myCardBtnClass, playerBtnClass } = abilityClasses(isCompact);

  const [myCardIndex, setMyCardIndex] = useState<number | null>(null);
  const [targetPlayer, setTargetPlayer] = useState<string | null>(null);
  const [targetCard, setTargetCard] = useState<number | null>(null);
  const [targetPlayer2, setTargetPlayer2] = useState<string | null>(null);
  const [targetCard2, setTargetCard2] = useState<number | null>(null);
  const [swapMode, setSwapMode] = useState<"me_and_other" | "two_others">("me_and_other");
  const [swapStep, setSwapStep] = useState<1 | 2>(1);
  const [firstPlayerSelection, setFirstPlayerSelection] = useState<{ playerId: string; cardIndex: number } | null>(null);

  const resetSelections = (nextMode: "me_and_other" | "two_others" = "me_and_other") => {
    setMyCardIndex(null);
    setTargetPlayer(null);
    setTargetCard(null);
    setTargetPlayer2(null);
    setTargetCard2(null);
    setSwapMode(nextMode);
    setSwapStep(1);
    setFirstPlayerSelection(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetSelections();
    onOpenChange(nextOpen);
  };

  if (!drawnCard) return null;
  const rank = drawnCard.rank;

  const isPeekOpponent = rank === "5" || rank === "6";
  const isPeekOwn = rank === "7" || rank === "8";
  const isSwap = rank === "9" || rank === "10";

  const otherPlayers = players.filter((p) => p.id !== playerId);

  const confirmDisabled = abilityConfirmDisabled({
    isPeekOpponent,
    isPeekOwn,
    isSwap,
    swapMode,
    swapStep,
    targetPlayer,
    targetCard,
    myCardIndex,
    firstPlayerSelection,
    targetPlayer2,
    targetCard2,
  });

  const advanceTwoOthersStep = () => {
    if (!targetPlayer || targetCard === null) return;
    setFirstPlayerSelection({ playerId: targetPlayer, cardIndex: targetCard });
    setSwapStep(2);
    setTargetPlayer(null);
    setTargetCard(null);
    setTargetPlayer2(null);
    setTargetCard2(null);
  };

  const handleConfirm = () => {
    if (isSwap && swapMode === "two_others" && swapStep === 1) {
      advanceTwoOthersStep();
      return;
    }

    let action: AbilityAction | null = null;

    if (isPeekOwn && myCardIndex !== null) {
      action = { kind: "peek_own", cardIndex: myCardIndex };
    } else if (isPeekOpponent && targetPlayer && targetCard !== null) {
      action = { kind: "peek_opponent", targetPlayerId: targetPlayer, targetCardIndex: targetCard };
    } else if (isSwap && swapMode === "me_and_other" && targetPlayer && myCardIndex !== null && targetCard !== null) {
      action = { kind: "swap_me", myCardIndex, targetPlayerId: targetPlayer, targetCardIndex: targetCard };
    } else if (isSwap && swapMode === "two_others" && firstPlayerSelection && targetPlayer2 && targetCard2 !== null) {
      action = {
        kind: "swap_others",
        player1Id: firstPlayerSelection.playerId,
        card1Index: firstPlayerSelection.cardIndex,
        player2Id: targetPlayer2,
        card2Index: targetCard2,
      };
    }

    if (!action) return;
    resetSelections();
    onOpenChange(false);
    onConfirm(action);
  };

  const confirmLabel =
    isSwap && swapMode === "two_others" && swapStep === 1
      ? t("game.confirmFirstPlayer")
      : t("game.confirm");

  const playerGridClass = cn(
    "grid gap-2",
    fit(isCompact, "grid-cols-3", "grid-cols-2"),
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "bg-white sm:max-w-md",
          isCompact &&
            "flex w-[min(96vw,28rem)] max-h-[min(92dvh,100%)] flex-col gap-2 overflow-hidden p-3 !top-[max(2dvh,env(safe-area-inset-top,0px))] !translate-y-0",
        )}
      >
        <DialogHeader className={cn(isCompact && "shrink-0 space-y-1 pr-8")}>
          <DialogTitle className={cn("font-display text-indigo-900", fit(isCompact, "text-base leading-tight", "text-2xl"))}>
            {t("game.abilityTitle")}
          </DialogTitle>
          <DialogDescription className={cn(isCompact && "text-xs leading-snug")}>
            {getAbilityDescription(rank, t)}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "space-y-3",
            fit(isCompact, "min-h-0 flex-1 overflow-y-auto overscroll-contain py-1 pr-0.5", "space-y-4 py-4"),
          )}
        >
          {/* Cartas 5 e 6: ver carta de oponente */}
          {isPeekOpponent && (
            <>
              <div className="space-y-2">
                <label className={labelClass}>{t("game.selectPlayer")}</label>
                <div className={playerGridClass}>
                  {otherPlayers.map((p) => (
                    <PlayerPickButton
                      key={p.id}
                      player={p}
                      selected={targetPlayer === p.id}
                      onSelect={() => {
                        setTargetPlayer(p.id);
                        setTargetCard(null);
                      }}
                      playerBtnClass={playerBtnClass}
                      isCompact={isCompact}
                    />
                  ))}
                </div>
              </div>

              {targetPlayer && (
                <div className="space-y-2">
                  <label className={labelClass}>{t("game.selectCardNumber")}</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((idx) => (
                      <Button
                        key={idx}
                        variant={targetCard === idx ? "primary" : "outline"}
                        onClick={() => setTargetCard(idx)}
                        className={cardBtnClass}
                      >
                        {idx + 1}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Cartas 7 e 8: ver a própria carta */}
          {isPeekOwn && (
            <div className="space-y-2">
              <label className={labelClass}>{t("game.selectYourCard")}</label>
              <div className="flex flex-wrap justify-center gap-2">
                {myHand.map((_, idx) => (
                  <Button
                    key={idx}
                    variant={myCardIndex === idx ? "primary" : "outline"}
                    onClick={() => setMyCardIndex(idx)}
                    className={myCardBtnClass}
                  >
                    {idx + 1}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Cartas 9 e 10: trocar cartas */}
          {isSwap && (
            <>
              <div className="space-y-2">
                <label className={labelClass}>{t("game.swapMode")}</label>
                <div className={cn("flex gap-2", fit(isCompact, "flex-col sm:flex-row", ""))}>
                  <Button
                    variant={swapMode === "me_and_other" ? "primary" : "outline"}
                    onClick={() => resetSelections("me_and_other")}
                    className={cn("flex-1", isCompact && "text-xs py-2 h-auto min-h-9 whitespace-normal leading-tight")}
                  >
                    {isCompact ? t("game.swapMeAndOtherShort") : t("game.swapMeAndOther")}
                  </Button>
                  <Button
                    variant={swapMode === "two_others" ? "primary" : "outline"}
                    onClick={() => resetSelections("two_others")}
                    className={cn("flex-1", isCompact && "text-xs py-2 h-auto min-h-9 whitespace-normal leading-tight")}
                  >
                    {isCompact ? t("game.swapTwoOthersShort") : t("game.swapTwoOthers")}
                  </Button>
                </div>
              </div>

              {swapMode === "me_and_other" && (
                <>
                  <div className="space-y-2">
                    <label className={labelClass}>{t("game.yourCard")}</label>
                    <div className="flex flex-wrap justify-center gap-2">
                      {myHand.map((_, idx) => (
                        <Button
                          key={idx}
                          variant={myCardIndex === idx ? "primary" : "outline"}
                          onClick={() => setMyCardIndex(idx)}
                          className={myCardBtnClass}
                        >
                          {idx + 1}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={labelClass}>{t("game.otherPlayer")}</label>
                    <div className={playerGridClass}>
                      {otherPlayers.map((p) => (
                        <PlayerPickButton
                          key={p.id}
                          player={p}
                          selected={targetPlayer === p.id}
                          onSelect={() => {
                            setTargetPlayer(p.id);
                            setTargetCard(null);
                          }}
                          playerBtnClass={playerBtnClass}
                          isCompact={isCompact}
                        />
                      ))}
                    </div>
                  </div>

                  {targetPlayer && targetPlayer !== playerId && (
                    <div className="space-y-2">
                      <label className={labelClass}>{t("game.otherPlayerCard")}</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[0, 1, 2, 3].map((idx) => (
                          <Button
                            key={idx}
                            variant={targetCard === idx ? "primary" : "outline"}
                            onClick={() => setTargetCard(idx)}
                            className={cardBtnClass}
                          >
                            {idx + 1}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {swapMode === "two_others" && (
                <>
                  {swapStep === 1 ? (
                    <>
                      <div className="space-y-2">
                        <label className={labelClass}>{t("game.firstPlayer")}</label>
                        <div className={playerGridClass}>
                          {otherPlayers.map((p) => (
                            <PlayerPickButton
                              key={p.id}
                              player={p}
                              selected={targetPlayer === p.id}
                              onSelect={() => {
                                setTargetPlayer(p.id);
                                setTargetCard(null);
                              }}
                              playerBtnClass={playerBtnClass}
                              isCompact={isCompact}
                            />
                          ))}
                        </div>
                      </div>

                      {targetPlayer && (
                        <div className="space-y-2">
                          <label className={labelClass}>{t("game.firstPlayerCard")}</label>
                          <div className="grid grid-cols-4 gap-2">
                            {[0, 1, 2, 3].map((idx) => (
                              <Button
                                key={idx}
                                variant={targetCard === idx ? "primary" : "outline"}
                                onClick={() => setTargetCard(idx)}
                                className={cardBtnClass}
                              >
                                {idx + 1}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {firstPlayerSelection && (
                        <div className="bg-gray-100 p-2 rounded mb-1">
                          <div className="text-xs text-gray-600">
                            {t("game.firstPlayerSelected")
                              .replace("{name}", players.find((p) => p.id === firstPlayerSelection.playerId)?.name || "")
                              .replace("{card}", (firstPlayerSelection.cardIndex + 1).toString())}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className={labelClass}>{t("game.secondPlayer")}</label>
                        <div className={playerGridClass}>
                          {otherPlayers
                            .filter((p) => p.id !== firstPlayerSelection?.playerId)
                            .map((p) => (
                              <PlayerPickButton
                                key={p.id}
                                player={p}
                                selected={targetPlayer2 === p.id}
                                onSelect={() => {
                                  setTargetPlayer2(p.id);
                                  setTargetCard2(null);
                                }}
                                playerBtnClass={playerBtnClass}
                                isCompact={isCompact}
                              />
                            ))}
                        </div>
                      </div>

                      {targetPlayer2 && (
                        <div className="space-y-2">
                          <label className={labelClass}>{t("game.secondPlayerCard")}</label>
                          <div className="grid grid-cols-4 gap-2">
                            {[0, 1, 2, 3].map((idx) => (
                              <Button
                                key={idx}
                                variant={targetCard2 === idx ? "primary" : "outline"}
                                onClick={() => setTargetCard2(idx)}
                                className={cardBtnClass}
                              >
                                {idx + 1}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => {
                          setSwapStep(1);
                          setFirstPlayerSelection(null);
                          setTargetPlayer(null);
                          setTargetCard(null);
                          setTargetPlayer2(null);
                          setTargetCard2(null);
                        }}
                        className={cn("w-full", isCompact && "text-xs py-2 h-9")}
                      >
                        {t("game.back")}
                      </Button>
                    </>
                  )}
                </>
              )}
            </>
          )}

        </div>

        <div
          className={cn(
            "flex shrink-0 gap-2",
            fit(isCompact, "border-t border-gray-100 bg-white pt-2", "pt-4"),
          )}
        >
          <Button
            variant="destructive"
            onClick={() => handleOpenChange(false)}
            className={cn("flex-1", isCompact && "text-xs py-2 h-9")}
          >
            {t("game.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            className={cn("flex-1", isCompact && "text-xs py-2 h-9 whitespace-normal leading-tight")}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
