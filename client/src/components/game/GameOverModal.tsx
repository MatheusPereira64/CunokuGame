import { MatchReward, Player } from "@shared/schema";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { Award, Trophy } from "lucide-react";
import { FEAT_REWARDS, type FeatId } from "@shared/matchFeats";
import { getEmoteEmoji } from "@shared/emotes";
import { ScoreReveal } from "./ScoreReveal";
import { useIsCompactGame } from "@/hooks/use-landscape";
import { useI18n } from "@/contexts/i18n-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loadProfile } from "@/lib/playerProfile";
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
  /** Conquistas desbloqueadas nesta partida */
  newFeats?: readonly FeatId[];
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
  newFeats = [],
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

        <ScoreReveal players={players} winnerId={winnerId} localPlayerId={localPlayerId} localProfile={profile} compact={isCompact} />

        {newFeats.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {newFeats.map((feat) => (
              <div key={feat} className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-left text-sm text-amber-950">
                <Award className="h-5 w-5 shrink-0 text-amber-600" />
                <span>
                  <span className="block font-bold">{t("feats.unlocked", { feat: t(`feats.${feat}.title`) })}</span>
                  <span className="block text-xs">
                    {FEAT_REWARDS[feat]
                      .map((r) => (r.type === "emote" ? `${getEmoteEmoji(r.id) ?? ""} ${t(`emote.${r.id}`)}` : `${t(r.type === "back" ? "theme.back" : "theme.mat")} ${t(`theme.${r.id}`)}`))
                      .join(" · ")}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}

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
