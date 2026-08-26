import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { useI18n } from "@/contexts/i18n-context";
import { BookOpen, Eye, Glasses, ArrowLeftRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Mesmos ícones usados no selo das cartas (PlayingCard) */
const ABILITY_RULES: {
  ranksKey: string;
  descKey: string;
  shortKey: string;
  Icon: LucideIcon;
}[] = [
  {
    ranksKey: "rules.fiveAndSix",
    descKey: "rules.fiveSix",
    shortKey: "game.abilityPeekOpponent",
    Icon: Eye,
  },
  {
    ranksKey: "rules.sevenAndEight",
    descKey: "rules.sevenEight",
    shortKey: "game.abilityPeekOwn",
    Icon: Glasses,
  },
  {
    ranksKey: "rules.nineAndTen",
    descKey: "rules.nineTen",
    shortKey: "game.abilitySwap",
    Icon: ArrowLeftRight,
  },
];

function AbilityIconBadge({ Icon }: { Icon: LucideIcon }) {
  return (
    <div
      className="shrink-0 w-11 h-11 rounded-full bg-amber-100 ring-2 ring-amber-500/60 flex items-center justify-center shadow-sm"
      aria-hidden
    >
      <Icon className="w-5 h-5 text-amber-700" strokeWidth={2.2} />
    </div>
  );
}

export function RulesDialog({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="lg"
          className={cn(
            "w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold border-yellow-600",
            compact ? "text-sm py-3 h-auto min-h-0" : "text-xl py-8"
          )}
        >
          <BookOpen className={cn(compact ? "mr-2 w-4 h-4" : "mr-3 w-6 h-6")} /> {t("menu.rules")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-3xl font-display text-indigo-900">{t("rules.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-4">
          <div className="space-y-6 py-4">
            <div>
              <h3 className="text-xl font-bold text-indigo-900 mb-3">{t("rules.objective")}</h3>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">{t("rules.cardValues")}</h4>
              <ul className="space-y-2 text-gray-700">
                <li>• {t("rules.queen")}</li>
                <li>• {t("rules.ace")}</li>
                <li>• {t("rules.jack")}</li>
                <li>• {t("rules.king")}</li>
                <li>• {t("rules.joker")}</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">{t("rules.cardAbilities")}</h4>
              <p className="text-sm text-gray-500 mb-4">{t("rules.abilityIconsLegend")}</p>

              {/* Legenda rápida dos ícones */}
              <div className="flex flex-wrap gap-3 mb-5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/60">
                {ABILITY_RULES.map(({ ranksKey, shortKey, Icon }) => (
                  <div
                    key={ranksKey}
                    className="flex items-center gap-2 bg-white/80 rounded-full pl-1.5 pr-3 py-1 border border-amber-200/80 shadow-sm"
                  >
                    <AbilityIconBadge Icon={Icon} />
                    <div className="leading-tight">
                      <div className="text-xs font-bold text-amber-900">{t(ranksKey)}</div>
                      <div className="text-[11px] text-gray-600">{t(shortKey)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <ul className="space-y-4 text-gray-700">
                {ABILITY_RULES.map(({ ranksKey, descKey, shortKey, Icon }) => (
                  <li key={descKey} className="flex gap-3 items-start">
                    <AbilityIconBadge Icon={Icon} />
                    <div className="min-w-0 pt-0.5">
                      <div className="font-semibold text-gray-900">
                        {t(ranksKey)}
                        <span className="font-normal text-amber-700"> — {t(shortKey)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{t(descKey)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">{t("rules.discard")}</h4>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">{t("rules.draw")}</h4>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">{t("rules.endGame")}</h4>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">{t("rules.punishment")}</h4>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">{t("rules.punishmentSix")}</h4>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">{t("rules.mainActions")}</h4>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">{t("rules.maxPlayers")}</p>
              <p className="text-sm text-gray-600 mt-2">{t("rules.theme")}</p>
              <p className="text-sm text-gray-600 mt-2">{t("rules.playersDisplay")}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
