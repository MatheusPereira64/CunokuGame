import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CoachTip } from "@shared/coach";
import { useI18n } from "@/contexts/i18n-context";
import { useIsCompactGame } from "@/hooks/use-landscape";
import { cn } from "@/lib/utils";

const TIP_MS = 7000;

/** Nome da carta como o jogador lê: o Coringa ganha nome, o resto fica com o valor. */
function rankLabel(rank: string, t: (key: string) => string) {
  return rank === "Joker" ? t("coach.joker") : rank;
}

/** Balão do Professor com o comentário da última jogada; some sozinho ou com um toque. */
export function ProfessorTip({ tip, onDone }: { tip: (CoachTip & { id: number }) | null; onDone: () => void }) {
  const { t } = useI18n();
  const isCompact = useIsCompactGame();

  useEffect(() => {
    if (!tip) return;
    const timer = setTimeout(onDone, TIP_MS);
    return () => clearTimeout(timer);
  }, [tip, onDone]);

  const vars = tip
    ? Object.fromEntries(Object.entries(tip.vars).map(([k, v]) => [k, k === "rank" || k === "worst" || k === "old" ? rankLabel(v, t) : v]))
    : {};

  return (
    <AnimatePresence>
      {tip && (
        <motion.button
          key={tip.id}
          type="button"
          onClick={onDone}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          role="status"
          className={cn(
            "fixed left-2 z-[65] flex items-start gap-2 rounded-2xl border-2 text-left shadow-2xl",
            tip.tone === "praise" ? "border-emerald-300 bg-emerald-950/95 text-emerald-50" : "border-sky-300 bg-slate-900/95 text-sky-50",
            isCompact ? "bottom-16 max-w-[15rem] p-2 text-[11px]" : "bottom-28 max-w-xs p-3 text-sm",
          )}
          style={{ marginLeft: "env(safe-area-inset-left, 0px)" }}
        >
          <span className={isCompact ? "text-lg" : "text-2xl"} aria-hidden="true">🎓</span>
          <span>
            <span className="block font-bold">{t("coach.name")}</span>
            {t(tip.key, vars)}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
