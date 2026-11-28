import { useState } from "react";
import { History, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { useI18n } from "@/contexts/i18n-context";
import { cn } from "@/lib/utils";
import { HISTORY_LIMIT, useMatchHistory, type MatchHistoryEntry } from "@/lib/matchHistory";

function formatWhen(at: number, language: string) {
  const locale = language === "en" ? "en-US" : language === "es" ? "es-ES" : "pt-BR";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(at);
}

function MatchRow({ entry }: { entry: MatchHistoryEntry }) {
  const { t, language } = useI18n();
  return (
    <li className={cn("rounded-xl border p-2.5", entry.won ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-gray-50")}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className={cn("font-bold", entry.won ? "text-amber-800" : "text-gray-700")}>
          {entry.won ? t("history.won") : t("history.place", { place: String(entry.place) })}
        </span>
        <span className="text-xs text-gray-500">
          {t(`history.mode.${entry.mode}`)} · {formatWhen(entry.at, language)}
        </span>
      </div>
      <ol className="mt-1.5 space-y-0.5">
        {entry.players.map((p, i) => (
          <li key={`${p.name}-${i}`} className={cn("flex items-center gap-1.5 text-xs", p.isMe ? "font-bold text-indigo-900" : "text-gray-700")}>
            <span className="w-4 text-gray-400">{i + 1}.</span>
            <span className="min-w-0 flex-1 truncate">
              {p.name}
              {p.isMe ? ` (${t("history.you")})` : ""}
            </span>
            {p.declared && (
              <span className="rounded-full bg-red-600 px-1.5 text-[9px] font-black uppercase text-white" title={t("history.declared")}>
                CUN
              </span>
            )}
            {p.won && <Trophy className="h-3 w-3 text-amber-500" aria-label={t("history.winner")} />}
            <span className="w-12 text-right font-mono">{p.score} {t("game.points")}</span>
          </li>
        ))}
      </ol>
    </li>
  );
}

/** Últimas partidas jogadas neste aparelho: resultado, adversários e quem declarou Cunoku. */
export function HistoryDialog({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const history = useMatchHistory();
  const wins = history.filter((e) => e.won).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("bg-white/90 text-indigo-900 border border-indigo-200 hover:bg-white shadow-md", compact && "h-8 w-8")}
          aria-label={t("history.title")}
        >
          <History className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
        </Button>
      </DialogTrigger>
      <DialogContent className={cn("flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-md", compact && "max-h-[94dvh] w-[min(96vw,30rem)] gap-2 p-3")}>
        <DialogHeader className={cn(compact && "space-y-0.5 pr-6 text-left")}>
          <DialogTitle className={cn("font-display text-indigo-900", compact ? "text-lg" : "text-2xl")}>{t("history.title")}</DialogTitle>
          <DialogDescription className={cn(compact && "text-xs")}>
            {history.length > 0
              ? t("history.summary", { games: String(history.length), wins: String(wins), limit: String(HISTORY_LIMIT) })
              : t("history.empty")}
          </DialogDescription>
        </DialogHeader>
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
          {history.map((entry) => (
            <MatchRow key={entry.id} entry={entry} />
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
