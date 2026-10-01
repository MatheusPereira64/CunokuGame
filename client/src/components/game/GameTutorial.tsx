import { useState } from "react";
import { Button } from "@/components/Button";
import { useI18n } from "@/contexts/i18n-context";

const DONE_KEY = "cunoku_tutorial_done";

const STEPS = ["welcome", "hand", "center", "turn", "ability", "cunoku"] as const;

export function isTutorialDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markTutorialDone(): void {
  localStorage.setItem(DONE_KEY, "1");
}

/** Coach da primeira partida: o tabuleiro continua jogável por baixo. */
export function GameTutorial() {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(() => !isTutorialDone());

  if (!open) return null;

  const id = STEPS[step] ?? STEPS[0];
  const last = step >= STEPS.length - 1;

  const finish = () => {
    markTutorialDone();
    setOpen(false);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[60] flex justify-center p-2 md:p-4">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-amber-200/40 bg-[#1a120c]/95 text-amber-50 shadow-2xl p-4">
        <div className="text-[11px] uppercase tracking-widest text-amber-200/70 mb-1">
          {t("tutorial.step", { current: String(step + 1), total: String(STEPS.length) })}
        </div>
        <h3 className="font-display text-lg text-amber-100">{t(`tutorial.${id}.title`)}</h3>
        <p className="mt-1 text-sm leading-snug text-amber-50/90">{t(`tutorial.${id}.body`)}</p>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" className="border-amber-200/40 text-amber-50" onClick={finish}>
            {t("tutorial.skip")}
          </Button>
          <Button size="sm" className="flex-1" onClick={() => (last ? finish() : setStep((n) => n + 1))}>
            {last ? t("tutorial.done") : t("tutorial.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
