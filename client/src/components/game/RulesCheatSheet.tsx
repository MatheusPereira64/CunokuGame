import { useState } from "react";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/Button";
import { getAbilityIcon } from "@/components/PlayingCard";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/contexts/i18n-context";
import { cn } from "@/lib/utils";
import { getAbilityDescription } from "./helpers";

/** Cartas com o mesmo poder ficam na mesma linha; `rank` escolhe o poder e o ícone. */
const CARD_ROWS = [
  { rank: "A", cards: "A · 2", values: "1 · 2" },
  { rank: "3", cards: "3 · 4", values: "3 · 4" },
  { rank: "5", cards: "5 · 6", values: "5 · 6" },
  { rank: "7", cards: "7 · 8", values: "7 · 8" },
  { rank: "9", cards: "9 · 10", values: "9 · 10" },
  { rank: "J", cards: "J", values: "11" },
  { rank: "Q", cards: "Q", values: "12" },
  { rank: "K", cards: "K", values: "0" },
  { rank: "Joker", cards: "🃏", values: "-1" },
];

/** Resumo das regras para consultar durante a partida, sem sair da mesa. */
export function RulesCheatSheet({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("game.cheatSheet")}
          title={t("game.cheatSheet")}
          className={cn(
            "bg-black/20 text-white border-white/20 backdrop-blur-sm hover:bg-black/30",
            compact ? "h-7 w-7 p-0" : "h-9 w-9 p-0",
          )}
        >
          <ScrollText className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={8}
        className="z-[100] w-[min(22rem,calc(100vw-1rem))] max-h-[min(80dvh,28rem)] overflow-y-auto overscroll-contain bg-white p-3 text-gray-900"
      >
        <h3 className="font-display text-base font-bold text-indigo-900">{t("game.cheatSheet")}</h3>
        <p className="mt-0.5 text-xs text-gray-700">{t("game.cheatSheetGoal")}</p>

        <table className="mt-2 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-left text-[10px] uppercase tracking-wide text-gray-600">
              <th className="py-1 pr-2 font-semibold">{t("game.cheatSheetCard")}</th>
              <th className="py-1 pr-2 font-semibold">{t("game.cheatSheetValue")}</th>
              <th className="py-1 font-semibold">{t("game.cheatSheetPower")}</th>
            </tr>
          </thead>
          <tbody>
            {CARD_ROWS.map(({ rank, cards, values }) => {
              const Icon = getAbilityIcon(rank);
              return (
                <tr key={rank} className="border-b border-gray-100 align-top">
                  <td className="whitespace-nowrap py-1 pr-2 font-bold text-indigo-900">{cards}</td>
                  <td className="whitespace-nowrap py-1 pr-2 font-mono">{values}</td>
                  <td className="py-1">
                    <span className="flex items-start gap-1.5">
                      {Icon && <Icon className="mt-0.5 h-3 w-3 shrink-0 text-amber-700" aria-hidden />}
                      <span>{getAbilityDescription(rank, t)}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-700">
          <li>{t("game.cheatSheetPowerRule")}</li>
          <li>{t("game.cheatSheetDiscard")}</li>
          <li>{t("game.cheatSheetEnd")}</li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}
