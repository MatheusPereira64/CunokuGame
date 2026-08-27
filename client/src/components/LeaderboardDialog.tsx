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
import { effectiveRank } from "@shared/rank";

function buildDevMockLeaderboard(): { entries: LeaderboardEntry[]; me: PublicRankProfile } {
  const raw = [
    { nickname: "shadow_ace", displayName: "Shadow Ace", wins: 312, bestScore: -1, iconId: "crown", accent: "indigo" },
    { nickname: "yuki_zero", displayName: "Yuki", wins: 287, bestScore: 0, iconId: "moon", accent: "slate" },
    { nickname: "kunai_king", displayName: "Kunai King", wins: 251, bestScore: 1, iconId: "zap", accent: "amber" },
    { nickname: "sakura_hand", displayName: "Sakura", wins: 198, bestScore: 2, iconId: "heart", accent: "red" },
    { nickname: "void_deal", displayName: "Void Deal", wins: 176, bestScore: 0, iconId: "spade", accent: "slate" },
    { nickname: "lotus_bluff", displayName: "Lotus", wins: 154, bestScore: 3, iconId: "star", accent: "emerald" },
    { nickname: "voce_dev", displayName: "Você (dev)", wins: 141, bestScore: 1, iconId: "flame", accent: "indigo" },
    { nickname: "ronin_card", displayName: "Ronin", wins: 128, bestScore: 4, iconId: "club", accent: "amber" },
    { nickname: "fox_mask", displayName: "Fox Mask", wins: 119, bestScore: 2, iconId: "sun", accent: "red" },
    { nickname: "ink_joker", displayName: "Ink Joker", wins: 105, bestScore: -1, iconId: "diamond", accent: "emerald" },
    { nickname: "mid_table", displayName: "Mid Table", wins: 62, bestScore: 5, iconId: "spade", accent: "slate" },
    { nickname: "silver_fan", displayName: "Silver Fan", wins: 28, bestScore: 6, iconId: "star", accent: "indigo" },
    { nickname: "new_blade", displayName: "New Blade", wins: 9, bestScore: 8, iconId: "zap", accent: "amber" },
    { nickname: "rookie_pt", displayName: "Rookie", wins: 2, bestScore: 12, iconId: "heart", accent: "red" },
  ];

  const entries: LeaderboardEntry[] = raw.map((r, i) => {
    const position = i + 1;
    return {
      position,
      nickname: r.nickname,
      displayName: r.displayName,
      wins: r.wins,
      bestScore: r.bestScore,
      rank: effectiveRank(r.wins, position),
      iconId: r.iconId,
      accent: r.accent,
    };
  });

  const self = entries.find((e) => e.nickname === "voce_dev")!;
  const me: PublicRankProfile = {
    playerId: "dev-mock-player",
    nickname: self.nickname,
    displayName: self.displayName,
    iconId: self.iconId,
    accent: self.accent,
    wins: self.wins,
    gamesPlayed: self.wins + 20,
    bestScore: self.bestScore,
    rank: self.rank,
    position: self.position,
  };

  return { entries, me };
}

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

    // Em desenvolvimento: mock para visualizar o modal sem API/DB
    if (import.meta.env.DEV) {
      const mock = buildDevMockLeaderboard();
      window.setTimeout(() => {
        if (cancelled) return;
        setEntries(mock.entries);
        setMe(mock.me);
        setLoading(false);
      }, 250);
      return () => {
        cancelled = true;
      };
    }

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
