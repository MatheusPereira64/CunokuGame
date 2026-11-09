import { MatchReward, Player } from "@shared/schema";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";
import { useIsCompactGame } from "@/hooks/use-landscape";
import { useI18n } from "@/contexts/i18n-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loadProfile, type ProfileAccent, type ProfileIconId } from "@/lib/playerProfile";
import { countsForGlobalRank, isRankLoggedIn } from "@/lib/rankAuth";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_CLOUD_SERVER } from "@/lib/gameServer";
import { copyToClipboard } from "@/lib/clipboard";

interface GameOverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Player[];
  winnerId: string;
  localPlayerId?: string;
  isOffline?: boolean;
  /** Pontos de liga e posição no desafio diário, quando a partida vale ranking */
  reward?: MatchReward | null;
  onBackHome: () => void;
  /** Ausente no desafio diário, que tem uma tentativa por dia */
  onRematch?: () => void;
  /** Dia do desafio, para o texto compartilhado */
  dailyDay?: string;
}

export function GameOverModal({
  open,
  onOpenChange,
  players,
  winnerId,
  localPlayerId,
  isOffline = false,
  reward,
  onBackHome,
  onRematch,
  dailyDay,
}: GameOverModalProps) {
  const isCompact = useIsCompactGame();
  const { toast } = useToast();

  const shareDailyResult = async () => {
    if (!reward?.daily || !dailyDay) return;
    const myScore = players.find((p) => p.id === localPlayerId)?.score ?? 0;
    const text = t("daily.shareText", {
      day: dailyDay,
      score: String(myScore),
      rank: String(reward.daily.rank),
      total: String(reward.daily.total),
      streak: String(reward.daily.streak),
    });
    const url = DEFAULT_CLOUD_SERVER;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Cunoku", text, url });
        return;
      }
    } catch {
      return; // o jogador fechou a janela de compartilhar
    }
    const ok = await copyToClipboard(`${text}\n${url}`);
    toast({ title: ok ? t("daily.copied") : t("error.generic") });
  };
  const { t } = useI18n();
  const winnerName = players.find((p) => p.id === winnerId)?.name || "";
  const profile = loadProfile();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "bg-white text-center sm:max-w-md",
          isCompact &&
            "w-[min(96vw,28rem)] max-h-[min(94dvh,100%)] overflow-y-auto p-3 !top-[max(2dvh,env(safe-area-inset-top,0px))] !translate-y-0",
        )}
      >
        <DialogHeader>
          <DialogTitle
            className={cn(
              "font-display text-indigo-900 flex items-center justify-center gap-3",
              isCompact ? "text-xl mb-2" : "text-4xl mb-4"
            )}
          >
            <Trophy className={cn("text-yellow-500", isCompact ? "w-6 h-6" : "w-10 h-10")} />
            {t("game.gameOver")}
          </DialogTitle>
          <DialogDescription className={cn(isCompact ? "text-sm" : "text-lg")}>
            {t("game.winnerIs").replace("{player}", winnerName)}
          </DialogDescription>
        </DialogHeader>

        <div className={cn(isCompact ? "space-y-1 py-1" : "space-y-4 py-6")}>
          {[...players]
            .sort((a, b) => a.score - b.score)
            .map((p, i) => (
              <div key={p.id} className={cn("flex items-center justify-between rounded-lg bg-gray-50", isCompact ? "px-2 py-1" : "p-3")}>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-400 w-6">#{i + 1}</span>
                  <Avatar
                    name={p.name}
                    isBot={p.isBot}
                    compact
                    hideLabel
                    className="shrink-0"
                    iconId={(p.id === localPlayerId ? profile.iconId : p.iconId) as ProfileIconId | undefined}
                    accent={(p.id === localPlayerId ? profile.accent : p.accent) as ProfileAccent | undefined}
                  />
                  <span className="font-bold text-gray-900">{p.name}</span>
                </div>
                <span className={cn("font-mono font-bold", isCompact ? "text-base" : "text-xl")}>
                  {p.score} {t("game.points")}
                </span>
              </div>
            ))}
        </div>

        {!isRankLoggedIn() && !!localPlayerId && countsForGlobalRank(isOffline, players, localPlayerId) && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            {t("rank.saveScoreHint")}
          </p>
        )}

        {reward && (
          <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-950">
            <div className="font-bold">+{reward.points} {t("league.pointsShort")}</div>
            {reward.daily && (
              <div>
                {t("daily.rewardSummary", {
                  rank: String(reward.daily.rank),
                  total: String(reward.daily.total),
                  streak: String(reward.daily.streak),
                })}
              </div>
            )}
          </div>
        )}

        {/* No celular deitado os botões ficam lado a lado: assim cabem sem rolar */}
        <div className={cn("flex gap-2", isCompact ? "flex-row [&>*]:flex-1" : "flex-col")}>
          {onRematch && (
            <Button onClick={onRematch} className="w-full">
              {t("game.playAgain")}
            </Button>
          )}
          {reward?.daily && dailyDay && (
            <Button variant="secondary" onClick={() => void shareDailyResult()} className="w-full">
              {t("daily.share")}
            </Button>
          )}
          <Button variant={onRematch ? "outline" : "primary"} onClick={onBackHome} className="w-full">
            {t("game.backToHome")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
