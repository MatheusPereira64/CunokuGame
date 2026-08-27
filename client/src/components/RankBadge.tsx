import { cn } from "@/lib/utils";
import type { RankTier } from "@shared/rank";
import { useI18n } from "@/contexts/i18n-context";

const RANK_STYLES: Record<RankTier, string> = {
  bronze: "bg-amber-700/15 text-amber-800 border-amber-700/40",
  silver: "bg-slate-200 text-slate-700 border-slate-400",
  gold: "bg-yellow-100 text-yellow-800 border-yellow-500",
  platinum: "bg-cyan-50 text-cyan-800 border-cyan-400",
  diamond: "bg-sky-100 text-sky-800 border-sky-500",
  grandmaster: "bg-violet-100 text-violet-900 border-violet-500",
  celestial: "bg-indigo-100 text-indigo-900 border-indigo-500",
  godlike: "bg-rose-100 text-rose-900 border-rose-500",
  entity: "bg-gradient-to-r from-indigo-900 to-fuchsia-800 text-white border-amber-300 shadow-md",
};

export function RankBadge({
  rank,
  className,
  compact,
}: {
  rank: RankTier;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold uppercase tracking-wide",
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-0.5 text-[11px]",
        RANK_STYLES[rank],
        className,
      )}
    >
      {t(`rank.tier.${rank}`)}
    </span>
  );
}
