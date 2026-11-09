import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { useI18n } from "@/contexts/i18n-context";
import {
  ArrowLeftRight,
  BookOpen,
  Crown,
  Eye,
  Glasses,
  Layers,
  Lock,
  Megaphone,
  Plus,
  Repeat,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { cn, fit } from "@/lib/utils";

type RulesTab = "play" | "powers" | "points";

/** Mesmos ícones do selo das cartas (PlayingCard). */
const POWERS: { ranks: string; id: string; Icon: LucideIcon }[] = [
  { ranks: "A · 2", id: "wind", Icon: Wind },
  { ranks: "3 · 4", id: "seal", Icon: Lock },
  { ranks: "5 · 6", id: "peekOpponent", Icon: Eye },
  { ranks: "7 · 8", id: "peekOwn", Icon: Glasses },
  { ranks: "9 · 10", id: "swap", Icon: ArrowLeftRight },
  { ranks: "J", id: "jack", Icon: Plus },
  { ranks: "Q", id: "queen", Icon: Users },
  { ranks: "K", id: "king", Icon: Crown },
  { ranks: "🃏", id: "joker", Icon: Sparkles },
];

const STEPS: { id: string; Icon: LucideIcon }[] = [
  { id: "goal", Icon: Target },
  { id: "turn", Icon: Layers },
  { id: "discard", Icon: Repeat },
  { id: "mistake", Icon: ShieldAlert },
  { id: "cunoku", Icon: Megaphone },
];

/** Valores em ordem crescente: o que importa é somar pouco. */
const VALUES: { rank: string; value: string; highlight?: "good" | "bad" }[] = [
  { rank: "🃏", value: "-1", highlight: "good" },
  { rank: "K", value: "0", highlight: "good" },
  { rank: "A", value: "1" },
  { rank: "2–10", value: "2–10" },
  { rank: "J", value: "11", highlight: "bad" },
  { rank: "Q", value: "12", highlight: "bad" },
];

function IconBadge({ Icon, compact, tone = "amber" }: { Icon: LucideIcon; compact: boolean; tone?: "amber" | "indigo" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full shadow-sm ring-2",
        tone === "amber" ? "bg-amber-100 ring-amber-500/60" : "bg-indigo-100 ring-indigo-400/60",
        fit(compact, "h-8 w-8", "h-10 w-10"),
      )}
      aria-hidden
    >
      <Icon
        className={cn(tone === "amber" ? "text-amber-700" : "text-indigo-700", fit(compact, "h-4 w-4", "h-5 w-5"))}
        strokeWidth={2.2}
      />
    </div>
  );
}

function PlayTab({ compact }: { compact: boolean }) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <ol className={cn("grid gap-2", compact && "grid-cols-2 [&>li:last-child]:col-span-2")}>
        {STEPS.map(({ id, Icon }, i) => (
          <li key={id} className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-2.5">
            <IconBadge Icon={Icon} compact={compact} tone="indigo" />
            <div className="min-w-0">
              <div className={cn("font-bold text-indigo-950", fit(compact, "text-sm", "text-base"))}>
                <span className="mr-1 text-indigo-400">{i + 1}.</span>
                {t(`rulesv2.step.${id}.title`)}
              </div>
              <p className={cn("leading-snug text-gray-700", fit(compact, "text-xs", "text-sm"))}>{t(`rulesv2.step.${id}.body`)}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-center text-xs text-gray-500">{t("rulesv2.players")}</p>
    </div>
  );
}

function PowersTab({ compact }: { compact: boolean }) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <p className={cn("text-gray-600", fit(compact, "text-xs", "text-sm"))}>{t("rulesv2.powersIntro")}</p>
      <ul className={cn("grid gap-2", fit(compact, "grid-cols-2", "sm:grid-cols-2"))}>
        {POWERS.map(({ ranks, id, Icon }) => (
          <li key={id} className="flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/70 p-2">
            <IconBadge Icon={Icon} compact={compact} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-900 ring-1 ring-amber-300">
                  {ranks}
                </span>
                <span className={cn("font-bold text-gray-900", fit(compact, "text-xs", "text-sm"))}>{t(`rulesv2.power.${id}.name`)}</span>
              </div>
              <p className={cn("mt-0.5 leading-snug text-gray-600", fit(compact, "text-[11px]", "text-xs"))}>
                {t(`rulesv2.power.${id}.body`)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PointsTab({ compact }: { compact: boolean }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <p className={cn("text-gray-600", fit(compact, "text-xs", "text-sm"))}>{t("rulesv2.pointsIntro")}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {VALUES.map(({ rank, value, highlight }) => (
          <div
            key={rank}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border-2 bg-white shadow-sm",
              fit(compact, "py-1.5", "py-3"),
              highlight === "good" && "border-emerald-400",
              highlight === "bad" && "border-red-300",
              !highlight && "border-gray-200",
            )}
          >
            <span className={cn("font-display font-bold text-gray-900", fit(compact, "text-lg", "text-2xl"))}>{rank}</span>
            <span
              className={cn(
                "text-xs font-bold",
                highlight === "good" ? "text-emerald-700" : highlight === "bad" ? "text-red-600" : "text-gray-500",
              )}
            >
              {t("rulesv2.points", { value })}
            </span>
          </div>
        ))}
      </div>
      <p className={cn("rounded-xl bg-emerald-50 p-2 text-emerald-900", fit(compact, "text-xs", "text-sm"))}>{t("rulesv2.pointsTip")}</p>
    </div>
  );
}

export function RulesDialog({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<RulesTab>("play");
  const tabs: { id: RulesTab; label: string }[] = [
    { id: "play", label: t("rulesv2.tab.play") },
    { id: "powers", label: t("rulesv2.tab.powers") },
    { id: "points", label: t("rulesv2.tab.points") },
  ];

  return (
    <Dialog onOpenChange={(open) => open && setTab("play")}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="lg"
          className={cn(
            "w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold border-yellow-600",
            fit(compact, "text-sm py-3 h-auto min-h-0", "text-lg py-6 h-auto sm:text-xl sm:py-8"),
          )}
        >
          <BookOpen className={cn(fit(compact, "mr-2 w-4 h-4", "mr-3 w-5 h-5 sm:w-6 sm:h-6"))} /> {t("menu.rules")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "sm:max-w-2xl overflow-hidden flex flex-col",
          fit(compact, "max-h-[min(94dvh,26rem)] w-[min(96vw,40rem)] p-3 gap-2", "max-h-[90vh] gap-3"),
        )}
      >
        <DialogHeader className={cn("space-y-0", compact && "pr-6")}>
          <DialogTitle className={cn("font-display text-indigo-900", fit(compact, "text-xl", "text-3xl"))}>{t("rules.title")}</DialogTitle>
          <DialogDescription className="sr-only">{t("rulesv2.step.goal.body")}</DialogDescription>
        </DialogHeader>

        <div role="tablist" aria-label={t("rules.title")} className="grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-indigo-50 p-1">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`rules-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`rules-panel-${id}`}
              onClick={() => setTab(id)}
              className={cn(
                "rounded-lg font-bold transition-colors",
                fit(compact, "py-1 text-xs", "py-2 text-sm"),
                tab === id ? "bg-white text-indigo-900 shadow" : "text-indigo-700/70 hover:text-indigo-900",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`rules-panel-${tab}`}
          aria-labelledby={`rules-tab-${tab}`}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
        >
          {tab === "play" && <PlayTab compact={compact} />}
          {tab === "powers" && <PowersTab compact={compact} />}
          {tab === "points" && <PointsTab compact={compact} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
