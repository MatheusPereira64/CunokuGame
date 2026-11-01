import { useState } from "react";
import { useLocation } from "wouter";
import { CalendarDays, Flame, Medal, Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/contexts/i18n-context";
import { formatTimeLeft, useDailyStatus, useStartDaily } from "@/hooks/use-competition";
import { useToast } from "@/hooks/use-toast";
import { selectMainServer } from "@/lib/gameServer";
import { cn } from "@/lib/utils";

interface DailyChallengeDialogProps {
  compact?: boolean;
  triggerClassName?: string;
  iconClassName?: string;
  name: string;
  onNameChange: (name: string) => void;
}

export function DailyChallengeDialog({
  compact = false,
  triggerClassName,
  iconClassName,
  name,
  onNameChange,
}: DailyChallengeDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const status = useDailyStatus(open);
  const start = useStartDaily();
  const data = status.data;

  const handlePlay = async () => {
    const playerName = name.trim();
    if (!playerName) {
      toast({ title: t("error.nameRequired"), description: t("error.nameRequiredDesc"), variant: "destructive" });
      return;
    }
    try {
      const result = await start.mutateAsync(playerName);
      if (result.alreadyPlayed || !result.code || !result.playerId) {
        await status.refetch();
        return;
      }
      sessionStorage.setItem(`player_${result.code}`, result.playerId);
      sessionStorage.setItem(`playerName_${result.code}`, playerName);
      setOpen(false);
      setLocation(`/game/${result.code}?player=${result.playerId}`);
    } catch {
      toast({ title: t("error.generic"), description: t("competition.offline"), variant: "destructive" });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) selectMainServer();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" size="lg" className={triggerClassName}>
          <CalendarDays className={iconClassName} /> {t("menu.daily")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "sm:max-w-md max-h-[90dvh] flex flex-col overflow-hidden",
          compact && "w-[min(96vw,34rem)] max-h-[94dvh] p-3 gap-2",
        )}
      >
        <DialogHeader className={cn(compact && "pr-6 space-y-0.5 text-left")}>
          <DialogTitle className={cn("font-display text-indigo-900", compact ? "text-lg" : "text-2xl")}>
            {t("daily.title")}
          </DialogTitle>
          <DialogDescription className={cn(compact && "text-xs leading-snug")}>
            {t("daily.description")}
          </DialogDescription>
        </DialogHeader>

        <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1", compact ? "space-y-2" : "space-y-4")}>
          {status.isLoading && <p className="py-6 text-center text-sm text-gray-500">{t("competition.loading")}</p>}
          {status.isError && <p className="py-6 text-center text-sm text-gray-600">{t("competition.offline")}</p>}

          {data && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-orange-50 border border-orange-100 p-2 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-orange-700 font-semibold">{t("daily.streak")}</div>
                  <div className="flex items-center justify-center gap-1 text-lg font-bold text-orange-900">
                    <Flame className="h-4 w-4" aria-hidden /> {data.streak.current}
                  </div>
                </div>
                <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-2 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-indigo-600 font-semibold">{t("daily.bestStreak")}</div>
                  <div className="text-lg font-bold text-indigo-900">{data.streak.best}</div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-slate-600 font-semibold">{t("daily.resetsIn")}</div>
                  <div className="text-lg font-bold text-slate-800">{formatTimeLeft(data.resetsAt)}</div>
                </div>
              </div>

              {data.result && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
                  <Medal className="h-6 w-6 shrink-0 text-emerald-700" aria-hidden />
                  <div className="text-sm">
                    <div className="font-bold">
                      {t("daily.yourResult", {
                        rank: String(data.result.rank),
                        total: String(data.total),
                      })}
                    </div>
                    <div>
                      {data.result.score} {t("game.points")} · +{data.result.points} {t("league.pointsShort")}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="mb-1.5 text-sm font-bold text-indigo-900">{t("daily.todayRanking")}</h3>
                {data.top.length === 0 ? (
                  <p className="rounded-lg bg-gray-50 p-3 text-center text-sm text-gray-600">{t("daily.emptyRanking")}</p>
                ) : (
                  <ol className="space-y-1">
                    {data.top.map((row) => (
                      <li
                        key={row.rank}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm",
                          row.isMe ? "bg-indigo-100 font-semibold text-indigo-950" : "bg-gray-50 text-gray-900",
                        )}
                      >
                        <span className="w-7 font-mono text-gray-600">#{row.rank}</span>
                        <span className="min-w-0 flex-1 truncate">{row.name}</span>
                        <span className="font-mono font-bold">{row.score}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <p className="mt-1.5 text-[11px] text-gray-500">{t("profile.bestScoreHint")}</p>
              </div>

              {!data.result && !data.inProgress && (
                <div className="space-y-1.5">
                  <Label htmlFor="dailyName">{t("bots.yourName")}</Label>
                  <Input
                    id="dailyName"
                    value={name}
                    maxLength={24}
                    placeholder={t("bots.namePlaceholder")}
                    onChange={(e) => onNameChange(e.target.value)}
                    className={compact ? "h-9 text-sm" : undefined}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {data && !data.result && (
          <Button className={cn("w-full", compact && "h-9 text-sm")} onClick={handlePlay} isLoading={start.isPending}>
            <Play className="mr-2 h-4 w-4" /> {data.inProgress ? t("daily.resume") : t("daily.play")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
