import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { useI18n } from "@/contexts/i18n-context";
import { useIsCompactGame, useIsPortrait } from "@/hooks/use-landscape";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";
import { fetchLeaderboard, fetchRankMe, type LeaderboardEntry, type PublicRankProfile } from "@/lib/rankAuth";
import { RankBadge } from "@/components/RankBadge";

interface LeaderboardDialogProps {
  compact?: boolean;
}

export function LeaderboardDialog({ compact = false }: LeaderboardDialogProps) {
  const { t } = useI18n();
  const isPortrait = useIsPortrait();
  const isCompactGame = useIsCompactGame();
  const isLandscapeMenu = compact || (isCompactGame && !isPortrait);

  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<PublicRankProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchLeaderboard(50), fetchRankMe().catch(() => null)])
      .then(([board, profile]) => {
        if (cancelled) return;
        setEntries(board);
        setMe(profile);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || t("rank.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, t]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "bg-white/90 text-indigo-900 border border-indigo-200 hover:bg-white shadow-md",
            isLandscapeMenu && "h-8 w-8",
          )}
          aria-label={t("rank.leaderboard")}
        >
          <Trophy className={cn(isLandscapeMenu ? "h-4 w-4" : "h-5 w-5")} />
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "sm:max-w-lg",
          isLandscapeMenu &&
            "w-[min(96vw,36rem)] max-h-[min(94dvh,28rem)] p-3 gap-2 overflow-hidden flex flex-col",
        )}
      >
        <DialogHeader className={cn(isLandscapeMenu && "pr-6 space-y-0.5")}>
          <DialogTitle className={cn("font-display text-indigo-900", isLandscapeMenu ? "text-lg" : "text-2xl")}>
            {t("rank.leaderboard")}
          </DialogTitle>
          <DialogDescription className={cn(isLandscapeMenu && "text-xs")}>
            {t("rank.leaderboardDesc")}
          </DialogDescription>
        </DialogHeader>

        {me && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs text-indigo-600 font-medium">{t("rank.yourRank")}</div>
              <div className="font-bold text-indigo-900 truncate">
                @{me.nickname}
                {me.position ? ` · #${me.position}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-mono text-indigo-800">{me.wins}W</span>
              <RankBadge rank={me.rank} compact={isLandscapeMenu} />
            </div>
          </div>
        )}

        <div
          className={cn(
            isLandscapeMenu
              ? "min-h-0 flex-1 overflow-y-auto overscroll-contain"
              : "max-h-[60vh] overflow-y-auto",
          )}
        >
          {loading && <p className="text-sm text-gray-500 py-6 text-center">{t("rank.loading")}</p>}
          {error && <p className="text-sm text-red-600 py-4 text-center">{error}</p>}
          {!loading && !error && entries.length === 0 && (
            <p className="text-sm text-gray-500 py-6 text-center">{t("rank.empty")}</p>
          )}
          <ul className="space-y-1.5">
            {entries.map((e) => (
              <li
                key={e.nickname}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-2",
                  e.position <= 10 ? "border-amber-300 bg-amber-50/60" : "border-gray-100 bg-white",
                  me?.nickname === e.nickname && "ring-2 ring-indigo-400",
                )}
              >
                <span className="w-8 text-center font-mono text-sm font-bold text-gray-400">#{e.position}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-indigo-900 truncate">{e.displayName}</div>
                  <div className="text-[11px] text-gray-500 truncate">@{e.nickname}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono font-bold text-indigo-900">{e.wins}W</div>
                  {e.bestScore !== null && (
                    <div className="text-[10px] text-gray-500">best {e.bestScore}</div>
                  )}
                </div>
                <RankBadge rank={e.rank} compact />
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
