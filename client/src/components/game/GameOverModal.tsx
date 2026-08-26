import { Player } from "@shared/schema";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/contexts/i18n-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loadProfile } from "@/lib/playerProfile";

interface GameOverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Player[];
  winnerId: string;
  localPlayerId?: string;
  onBackHome: () => void;
}

export function GameOverModal({
  open,
  onOpenChange,
  players,
  winnerId,
  localPlayerId,
  onBackHome,
}: GameOverModalProps) {
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const winnerName = players.find((p) => p.id === winnerId)?.name || "";
  const profile = loadProfile();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("bg-white text-center", isMobile ? "max-w-[95vw] max-h-[90vh] overflow-y-auto" : "sm:max-w-md")}
      >
        <DialogHeader>
          <DialogTitle
            className={cn(
              "font-display text-indigo-900 flex items-center justify-center gap-3",
              isMobile ? "text-2xl mb-2" : "text-4xl mb-4"
            )}
          >
            <Trophy className={cn("text-yellow-500", isMobile ? "w-6 h-6" : "w-10 h-10")} />
            {t("game.gameOver")}
          </DialogTitle>
          <DialogDescription className={cn(isMobile ? "text-sm" : "text-lg")}>
            {t("game.winnerIs").replace("{player}", winnerName)}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {[...players]
            .sort((a, b) => a.score - b.score)
            .map((p, i) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-400 w-6">#{i + 1}</span>
                  <Avatar
                    name={p.name}
                    className="scale-50 w-8 h-8"
                    iconId={p.id === localPlayerId ? profile.iconId : undefined}
                    accent={p.id === localPlayerId ? profile.accent : undefined}
                  />
                  <span className="font-bold text-gray-900">{p.name}</span>
                </div>
                <span className="font-mono font-bold text-xl">
                  {p.score} {t("game.points")}
                </span>
              </div>
            ))}
        </div>

        <Button onClick={onBackHome} className="w-full">
          {t("game.backToHome")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
