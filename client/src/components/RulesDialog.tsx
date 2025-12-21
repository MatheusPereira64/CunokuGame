import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { useI18n } from "@/contexts/i18n-context";
import { BookOpen } from "lucide-react";

export function RulesDialog() {
  const { t } = useI18n();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="lg" className="w-full text-xl py-8 bg-yellow-500 hover:bg-yellow-600 text-black font-bold border-yellow-600">
          <BookOpen className="mr-3 w-6 h-6" /> {t("menu.rules")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-3xl font-display text-indigo-900">
            {t("rules.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-4">
          <div className="space-y-6 py-4">
            <div>
              <h3 className="text-xl font-bold text-indigo-900 mb-3">
                {t("rules.objective")}
              </h3>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Valores das Cartas:</h4>
              <ul className="space-y-2 text-gray-700">
                <li>• {t("rules.queen")}</li>
                <li>• {t("rules.ace")}</li>
                <li>• {t("rules.jack")}</li>
                <li>• {t("rules.king")}</li>
                <li>• {t("rules.joker")}</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Habilidades das Cartas:</h4>
              <ul className="space-y-2 text-gray-700">
                <li>• <strong>9 e 10:</strong> {t("rules.nineTen")}</li>
                <li>• <strong>7 e 8:</strong> {t("rules.sevenEight")}</li>
                <li>• <strong>5 e 6:</strong> {t("rules.fiveSix")}</li>
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

