import { useState } from "react";
import { Card, Player } from "@shared/schema";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/contexts/i18n-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AbilityAction, getAbilityDescription } from "./helpers";

interface AbilityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drawnCard: Card | null;
  players: Player[];
  playerId: string;
  myHand: Card[];
  onConfirm: (action: AbilityAction) => void;
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
  const isMobile = useIsMobile();
  const { t } = useI18n();

  const [myCardIndex, setMyCardIndex] = useState<number | null>(null);
  const [targetPlayer, setTargetPlayer] = useState<string | null>(null);
  const [targetCard, setTargetCard] = useState<number | null>(null);
  const [targetPlayer2, setTargetPlayer2] = useState<string | null>(null);
  const [targetCard2, setTargetCard2] = useState<number | null>(null);
  const [swapMode, setSwapMode] = useState<"me_and_other" | "two_others">("me_and_other");
  const [swapStep, setSwapStep] = useState<1 | 2>(1);
  const [firstPlayerSelection, setFirstPlayerSelection] = useState<{ playerId: string; cardIndex: number } | null>(null);

  const resetSelections = () => {
    setMyCardIndex(null);
    setTargetPlayer(null);
    setTargetCard(null);
    setTargetPlayer2(null);
    setTargetCard2(null);
    setSwapMode("me_and_other");
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

  const confirmDisabled =
    (isPeekOpponent && (!targetPlayer || targetCard === null)) ||
    (isPeekOwn && myCardIndex === null) ||
    (isSwap && swapMode === "me_and_other" && (!targetPlayer || myCardIndex === null || targetCard === null)) ||
    (isSwap && swapMode === "two_others" && (!firstPlayerSelection || !targetPlayer2 || targetCard2 === null));

  const handleConfirm = () => {
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn("bg-white", isMobile ? "max-w-[95vw] max-h-[90vh] overflow-y-auto" : "sm:max-w-md")}
      >
        <DialogHeader>
          <DialogTitle className={cn("font-display text-indigo-900", isMobile ? "text-lg" : "text-2xl")}>
            {t("game.abilityTitle")}
          </DialogTitle>
          <DialogDescription className={isMobile ? "text-sm" : ""}>
            {getAbilityDescription(rank, t)}
          </DialogDescription>
        </DialogHeader>

        <div className={cn("space-y-4", isMobile ? "py-2" : "py-4")}>
          {/* Cartas 5 e 6: ver carta de oponente */}
          {isPeekOpponent && (
            <>
              <div className="space-y-2">
                <label className={cn("font-bold text-gray-700", isMobile ? "text-xs" : "text-sm")}>
                  {t("game.selectPlayer")}
                </label>
                <div className={cn("grid gap-2", isMobile ? "grid-cols-1" : "grid-cols-2")}>
                  {players
                    .filter((p) => p.id !== playerId)
                    .map((p) => (
                      <Button
                        key={p.id}
                        variant={targetPlayer === p.id ? "primary" : "outline"}
                        onClick={() => {
                          setTargetPlayer(p.id);
                          setTargetCard(null);
                        }}
                        className={cn("h-auto", isMobile ? "py-2" : "py-3")}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Avatar name={p.name} className={isMobile ? "scale-50" : "scale-75"} />
                          <span className={cn(isMobile ? "text-[10px]" : "text-xs")}>{p.name}</span>
                        </div>
                      </Button>
                    ))}
                </div>
              </div>

              {targetPlayer && (
                <div className="space-y-2">
                  <label className={cn("font-bold text-gray-700", isMobile ? "text-xs" : "text-sm")}>
                    {t("game.selectCardNumber")}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((idx) => (
                      <Button
                        key={idx}
                        variant={targetCard === idx ? "primary" : "outline"}
                        onClick={() => setTargetCard(idx)}
                        className={cn(isMobile ? "h-12 text-xs" : "h-16")}
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
              <label className={cn("font-bold text-gray-700", isMobile ? "text-xs" : "text-sm")}>
                {t("game.selectYourCard")}
              </label>
              <div className={cn("flex gap-2 justify-center", isMobile ? "flex-wrap" : "")}>
                {myHand.map((_, idx) => (
                  <Button
                    key={idx}
                    variant={myCardIndex === idx ? "primary" : "outline"}
                    onClick={() => setMyCardIndex(idx)}
                    className={cn(isMobile ? "h-12 w-12 text-xs" : "h-20 w-16")}
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
                <label className={cn("font-bold text-gray-700", isMobile ? "text-xs" : "text-sm")}>
                  {t("game.swapMode")}
                </label>
                <div className={cn("flex gap-2", isMobile ? "flex-col" : "")}>
                  <Button
                    variant={swapMode === "me_and_other" ? "primary" : "outline"}
                    onClick={() => {
                      resetSelections();
                      setSwapMode("me_and_other");
                    }}
                    className={cn("flex-1", isMobile && "text-xs py-2")}
                  >
                    {isMobile ? t("game.swapMeAndOtherShort") : t("game.swapMeAndOther")}
                  </Button>
                  <Button
                    variant={swapMode === "two_others" ? "primary" : "outline"}
                    onClick={() => {
                      resetSelections();
                      setSwapMode("two_others");
                    }}
                    className={cn("flex-1", isMobile && "text-xs py-2")}
                  >
                    {isMobile ? t("game.swapTwoOthersShort") : t("game.swapTwoOthers")}
                  </Button>
                </div>
              </div>

              {swapMode === "me_and_other" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">{t("game.yourCard")}</label>
                    <div className="flex gap-2 justify-center">
                      {myHand.map((_, idx) => (
                        <Button
                          key={idx}
                          variant={myCardIndex === idx ? "primary" : "outline"}
                          onClick={() => setMyCardIndex(idx)}
                          className="h-20 w-16"
                        >
                          {idx + 1}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">{t("game.otherPlayer")}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {players
                        .filter((p) => p.id !== playerId)
                        .map((p) => (
                          <Button
                            key={p.id}
                            variant={targetPlayer === p.id ? "primary" : "outline"}
                            onClick={() => {
                              setTargetPlayer(p.id);
                              setTargetCard(null);
                            }}
                            className="h-auto py-3"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Avatar name={p.name} className="scale-75" />
                              <span className="text-xs">{p.name}</span>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </div>

                  {targetPlayer && targetPlayer !== playerId && (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">{t("game.otherPlayerCard")}</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[0, 1, 2, 3].map((idx) => (
                          <Button
                            key={idx}
                            variant={targetCard === idx ? "primary" : "outline"}
                            onClick={() => setTargetCard(idx)}
                            className="h-16"
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
                        <label className="text-sm font-bold text-gray-700">{t("game.firstPlayer")}</label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                          {players.map((p) => (
                            <Button
                              key={p.id}
                              variant={targetPlayer === p.id ? "primary" : "outline"}
                              onClick={() => {
                                setTargetPlayer(p.id);
                                setTargetCard(null);
                              }}
                              className="h-auto py-2"
                            >
                              <div className="flex flex-col items-center gap-1">
                                <Avatar name={p.name} className="scale-75" />
                                <span className="text-xs">{p.name}</span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>

                      {targetPlayer && (
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">{t("game.firstPlayerCard")}</label>
                          <div className="grid grid-cols-4 gap-2">
                            {[0, 1, 2, 3].map((idx) => (
                              <Button
                                key={idx}
                                variant={targetCard === idx ? "primary" : "outline"}
                                onClick={() => setTargetCard(idx)}
                                className="h-12"
                              >
                                {idx + 1}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {targetPlayer && targetCard !== null && (
                        <Button
                          variant="primary"
                          onClick={() => {
                            setFirstPlayerSelection({ playerId: targetPlayer, cardIndex: targetCard });
                            setSwapStep(2);
                            setTargetPlayer(null);
                            setTargetCard(null);
                            setTargetPlayer2(null);
                            setTargetCard2(null);
                          }}
                          className="w-full"
                        >
                          {t("game.confirmFirstPlayer")}
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      {firstPlayerSelection && (
                        <div className="bg-gray-100 p-2 rounded mb-2">
                          <div className="text-xs text-gray-600">
                            {t("game.firstPlayerSelected")
                              .replace("{name}", players.find((p) => p.id === firstPlayerSelection.playerId)?.name || "")
                              .replace("{card}", (firstPlayerSelection.cardIndex + 1).toString())}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">{t("game.secondPlayer")}</label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                          {players
                            .filter((p) => p.id !== firstPlayerSelection?.playerId)
                            .map((p) => (
                              <Button
                                key={p.id}
                                variant={targetPlayer2 === p.id ? "primary" : "outline"}
                                onClick={() => {
                                  setTargetPlayer2(p.id);
                                  setTargetCard2(null);
                                }}
                                className="h-auto py-2"
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <Avatar name={p.name} className="scale-75" />
                                  <span className="text-xs">{p.name}</span>
                                </div>
                              </Button>
                            ))}
                        </div>
                      </div>

                      {targetPlayer2 && (
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">{t("game.secondPlayerCard")}</label>
                          <div className="grid grid-cols-4 gap-2">
                            {[0, 1, 2, 3].map((idx) => (
                              <Button
                                key={idx}
                                variant={targetCard2 === idx ? "primary" : "outline"}
                                onClick={() => setTargetCard2(idx)}
                                className="h-12"
                              >
                                {idx + 1}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSwapStep(1);
                            setFirstPlayerSelection(null);
                            setTargetPlayer2(null);
                            setTargetCard2(null);
                          }}
                          className="flex-1"
                        >
                          {t("game.back")}
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          <div className={cn("flex gap-2", isMobile ? "pt-2" : "pt-4")}>
            <Button
              variant="destructive"
              onClick={() => handleOpenChange(false)}
              className={cn("flex-1", isMobile && "text-xs py-2")}
            >
              {t("game.cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              className={cn("flex-1", isMobile && "text-xs py-2")}
              disabled={confirmDisabled}
            >
              {t("game.confirm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
