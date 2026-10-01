import { useEffect, useState } from "react";
import { Paintbrush } from "lucide-react";
import { Button } from "@/components/Button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/contexts/i18n-context";
import {
  CARD_BACKS,
  TABLE_MATS,
  loadTableTheme,
  saveTableTheme,
  subscribeTableTheme,
  type CardBackId,
  type TableMatId,
} from "@/lib/tableTheme";
import { cn } from "@/lib/utils";

export function TableThemePicker() {
  const { t } = useI18n();
  const [theme, setTheme] = useState(loadTableTheme);

  useEffect(() => subscribeTableTheme(() => setTheme(loadTableTheme())), []);

  const pick = (patch: Partial<{ back: CardBackId; mat: TableMatId }>) => {
    const next = { ...loadTableTheme(), ...patch };
    setTheme(next);
    saveTableTheme(next);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>{t("theme.back")}</Label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {CARD_BACKS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => pick({ back: id })}
              className={cn(
                "rounded-xl border px-2 py-3 text-sm",
                theme.back === id ? "border-indigo-600 bg-indigo-50 text-indigo-900" : "border-gray-200"
              )}
            >
              {t(`theme.${id}`)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>{t("theme.mat")}</Label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {TABLE_MATS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => pick({ mat: id })}
              className={cn(
                "rounded-xl border px-2 py-3 text-sm",
                theme.mat === id ? "border-indigo-600 bg-indigo-50 text-indigo-900" : "border-gray-200"
              )}
            >
              {t(`theme.${id}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Atalho de pincel para trocar verso e tapete sem sair da mesa. */
export function TableThemeButton() {
  const { t } = useI18n();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("theme.title")}>
          <Paintbrush className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-indigo-900">{t("theme.title")}</DialogTitle>
          <DialogDescription>{t("theme.description")}</DialogDescription>
        </DialogHeader>
        <TableThemePicker />
      </DialogContent>
    </Dialog>
  );
}
