import { useState } from "react";
import { ArrowDown, ArrowUp, Trophy } from "lucide-react";
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
import { formatTimeLeft, useLeagueStandings } from "@/hooks/use-competition";
import { selectMainServer } from "@/lib/gameServer";
import { isRankLoggedIn } from "@/lib/rankAuth";
import { cn } from "@/lib/utils";
import { RankBadge } from "@/components/RankBadge";
import { DIVISION_MOVE_SHARE, ONLINE_SCORED_MATCHES_PER_DAY, type Division } from "@shared/competition";

const DIVISION_STYLE: Record<Division, string> = {
  bronze: "bg-amber-700 text-amber-50",
  silver: "bg-slate-400 text-slate-950",
  gold: "bg-yellow-400 text-yellow-950",
};

function DivisionBadge({ division }: { division: Division }) {
  const { t } = useI18n();
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide", DIVISION_STYLE[division])}>
      {t(`league.division.${division}`)}
    </span>
  );
}

function ZoneIcon({ zone }: { zone?: "promote" | "demote" | null }) {
  const { t } = useI18n();
  if (zone === "promote") return <ArrowUp className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label={t("league.zonePromote")} />;
  if (zone === "demote") return <ArrowDown className="h-3.5 w-3.5 shrink-0 text-red-600" aria-label={t("league.zoneDemote")} />;
  return <span className="w-3.5 shrink-0" />;
}

interface LeagueDialogProps {
  compact?: boolean;
  triggerClassName?: string;
  iconClassName?: string;
}

export function LeagueDialog({ compact = false, triggerClassName, iconClassName }: LeagueDialogProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const league = useLeagueStandings(open);
  const data = league.data;
  const [tab, setTab] = useState<Division | null>(null);
  const shownDivision = tab ?? data?.myDivision ?? "bronze";
  const division = data?.divisions?.find((d) => d.id === shownDivision);
  const rows = division ? division.top : data?.top ?? [];

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
          <Trophy className={iconClassName} /> {t("menu.league")}
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
            {t("league.title")}
          </DialogTitle>
          <DialogDescription className={cn(compact && "text-xs leading-snug")}>
            {data
              ? t("league.resetsIn", { time: formatTimeLeft(data.resetsAt) })
              : t("league.description")}
          </DialogDescription>
        </DialogHeader>

        <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1", compact ? "space-y-2" : "space-y-4")}>
          {league.isLoading && <p className="py-6 text-center text-sm text-gray-500">{t("competition.loading")}</p>}
          {league.isError && <p className="py-6 text-center text-sm text-gray-600">{t("competition.offline")}</p>}

          {data && (
            <>
              {data.me ? (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-indigo-950">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">
                      {t("league.yourRank", {
                        rank: String(data.me.rank),
                        total: String(data.divisions?.find((d) => d.id === data.myDivision)?.totalPlayers ?? data.totalPlayers),
                      })}
                    </span>
                    {data.me.division ? <DivisionBadge division={data.me.division} /> : <RankBadge rank={data.me.tier} />}
                  </div>
                  <div className="mt-1 text-sm">
                    {data.me.points} {t("league.pointsShort")} · {data.me.wins} {t("profile.wins").toLowerCase()} ·{" "}
                    {data.me.games} {t("profile.gamesPlayed").toLowerCase()}
                  </div>
                  {data.me.zone && (
                    <div className={cn("mt-1 text-xs font-semibold", data.me.zone === "promote" ? "text-emerald-700" : "text-red-700")}>
                      {t(data.me.zone === "promote" ? "league.youPromote" : "league.youDemote")}
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  {isRankLoggedIn() ? t("league.notRanked") : t("competition.loginRequired")}
                </p>
              )}

              <div>
                <h3 className="mb-1.5 text-sm font-bold text-indigo-900">{t("league.thisWeek")}</h3>
                {data.divisions && (
                  <div className="mb-2 grid grid-cols-3 gap-1" role="tablist">
                    {data.divisions.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        role="tab"
                        aria-selected={d.id === shownDivision}
                        onClick={() => setTab(d.id)}
                        className={cn(
                          "rounded-lg border px-1 py-1 text-xs font-bold",
                          d.id === shownDivision ? "border-indigo-600 bg-indigo-50 text-indigo-900" : "border-gray-200 text-gray-600",
                        )}
                      >
                        {t(`league.division.${d.id}`)} · {d.totalPlayers}
                      </button>
                    ))}
                  </div>
                )}
                {rows.length === 0 ? (
                  <p className="rounded-lg bg-gray-50 p-3 text-center text-sm text-gray-600">{t("league.empty")}</p>
                ) : (
                  <ol className="space-y-1">
                    {rows.map((row) => (
                      <li
                        key={row.rank}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm",
                          row.isMe ? "bg-indigo-100 font-semibold text-indigo-950" : "bg-gray-50 text-gray-900",
                        )}
                      >
                        <ZoneIcon zone={row.zone} />
                        <span className="w-7 font-mono text-gray-600">#{row.rank}</span>
                        <span className="min-w-0 flex-1 truncate">{row.name}</span>
                        <RankBadge rank={row.tier} />
                        <span className="w-10 text-right font-mono font-bold">{row.points}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {data.lastWeek.podium.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-sm font-bold text-indigo-900">{t("league.lastWeek")}</h3>
                  <ol className="space-y-1">
                    {data.lastWeek.podium.map((row) => (
                      <li key={row.rank} className="flex items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-sm text-amber-950">
                        <span className="w-7 font-mono">#{row.rank}</span>
                        <span className="min-w-0 flex-1 truncate">{row.name}</span>
                        <span className="font-mono font-bold">{row.points}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <p className="text-[11px] leading-snug text-gray-600">
                {t("league.rules", { cap: String(ONLINE_SCORED_MATCHES_PER_DAY) })}{" "}
                {t("league.divisionRules", { share: String(Math.round(DIVISION_MOVE_SHARE * 100)) })}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
