import { Player } from "@shared/schema";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { VolumeControl } from "@/components/VolumeControl";
import { cn } from "@/lib/utils";
import { Copy, Wifi } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";
import { useIsCompactGame, useIsPortrait } from "@/hooks/use-landscape";
import { loadProfile } from "@/lib/playerProfile";

interface WaitingRoomProps {
  roomCode: string;
  players: Player[];
  playerId: string;
  isHost: boolean;
  onCopyCode: () => void;
  onCopyLanUrl?: () => void;
  onStart: () => void;
  networkMode?: "lan" | "server";
  lanJoinUrl?: string | null;
}

export function WaitingRoom({
  roomCode,
  players,
  playerId,
  isHost,
  onCopyCode,
  onCopyLanUrl,
  onStart,
  networkMode = "server",
  lanJoinUrl,
}: WaitingRoomProps) {
  const { t } = useI18n();
  const canStart = players.length >= 2;
  const isLan = networkMode === "lan";
  const isPortrait = useIsPortrait();
  const isCompactGame = useIsCompactGame();
  const isLandscape = isCompactGame && !isPortrait;
  const profile = loadProfile();

  return (
    <div
      className={cn(
        "bg-[#FDFBF7] flex items-center justify-center relative",
        isLandscape ? "h-[100dvh] min-h-0 p-2 overflow-hidden" : "min-h-screen p-8"
      )}
    >
      <div className={cn("absolute z-20", isLandscape ? "top-2 right-2" : "top-4 right-4")}>
        <div
          className={cn(
            "[&_button]:bg-white/90 [&_button]:text-indigo-900 [&_button]:border-indigo-200 [&_button]:hover:bg-white [&_button]:shadow-md",
            isLandscape && "[&_button]:h-8 [&_button]:w-8 [&_button]:p-0"
          )}
        >
          <VolumeControl />
        </div>
      </div>

      <div
        className={cn(
          "w-full bg-white rounded-3xl shadow-2xl border border-gray-200",
          isLandscape
            ? "max-w-3xl max-h-[min(94dvh,28rem)] overflow-y-auto p-4 grid grid-cols-2 gap-4"
            : "max-w-md p-8"
        )}
      >
        <div className={cn(isLandscape ? "min-w-0" : "")}>
          <div className={cn("text-center", isLandscape ? "mb-3" : "mb-8")}>
            <h2
              className={cn(
                "font-display font-bold text-indigo-900",
                isLandscape ? "text-xl" : "text-3xl"
              )}
            >
              {t("waiting.title")}
            </h2>
            <p className={cn("text-gray-500", isLandscape ? "mt-1 text-xs" : "mt-2")}>
              {isLan ? t("waiting.shareLan") : t("waiting.shareCode")}
            </p>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 bg-gray-100 rounded-xl cursor-pointer hover:bg-gray-200 transition-colors",
              isLandscape ? "p-2 mb-2" : "p-4 mb-4"
            )}
            onClick={onCopyCode}
          >
            <div
              className={cn(
                "flex-1 font-mono font-bold text-center tracking-widest text-indigo-900",
                isLandscape ? "text-2xl" : "text-3xl"
              )}
            >
              {roomCode}
            </div>
            <Copy className="w-5 h-5 text-gray-500" />
          </div>

          {isLan && lanJoinUrl && (
            <div
              className={cn(
                "rounded-xl border border-indigo-200 bg-indigo-50",
                isLandscape ? "mb-0 p-2" : "mb-8 p-3"
              )}
            >
              <div className="flex items-center gap-2 text-indigo-800 font-semibold text-sm mb-2">
                <Wifi className="w-4 h-4" />
                {t("waiting.lanUrl")}
              </div>
              <button
                type="button"
                className="w-full text-left font-mono text-xs text-indigo-900 break-all hover:underline"
                onClick={onCopyLanUrl}
              >
                {lanJoinUrl}
              </button>
              {!isLandscape && (
                <p className="text-xs text-indigo-600 mt-2">{t("waiting.lanHint")}</p>
              )}
            </div>
          )}
        </div>

        <div className={cn("min-w-0", !isLandscape && "mt-0")}>
          <div className={cn(isLandscape ? "space-y-2 mb-3" : "space-y-4 mb-6", !isLan && !isLandscape && "mt-4")}>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">
              {t("waiting.players")} ({players.length}
              {players.length >= 2 ? ` — ${t("waiting.ready")}` : " / 2+"})
            </h3>
            <div className={cn(isLandscape ? "space-y-1.5 max-h-[10rem] overflow-y-auto" : "space-y-2")}>
              {players.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl transition-all",
                    isLandscape ? "p-2" : "p-4",
                    p.id === playerId
                      ? "bg-gradient-to-r from-indigo-100 to-purple-100 border-2 border-indigo-300 shadow-md"
                      : "bg-gray-50 border border-gray-200"
                  )}
                >
                  <Avatar
                    name={p.name}
                    className={cn("scale-90", p.id === playerId && "ring-2 ring-indigo-400")}
                    iconId={p.id === playerId ? profile.iconId : undefined}
                    accent={p.id === playerId ? profile.accent : undefined}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-indigo-900 flex items-center gap-2 flex-wrap">
                      {p.name}
                      {p.id === playerId && (
                        <span className="text-xs font-normal text-indigo-600 bg-indigo-200 px-2 py-0.5 rounded-full">
                          {t("waiting.you")}
                        </span>
                      )}
                      {p.id === playerId && isHost && (
                        <span className="text-xs font-semibold text-purple-700 bg-purple-200 px-2 py-0.5 rounded-full">
                          {t("waiting.host")}
                        </span>
                      )}
                    </div>
                    {p.id === playerId && !isLandscape && (
                      <div className="text-xs text-gray-500 mt-1">
                        {t("waiting.score")}: {p.score}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {canStart && isHost && (
            <Button
              variant="primary"
              size="lg"
              className={cn(
                "w-full font-bold shadow-lg hover:shadow-xl transition-all",
                isLandscape ? "mt-1 text-sm py-3 h-auto" : "mt-6 text-lg py-6"
              )}
              onClick={onStart}
            >
              {t("waiting.startGame")} ({players.length})
            </Button>
          )}

          {canStart && !isHost && (
            <div
              className={cn(
                "w-full bg-indigo-50 rounded-xl border border-indigo-200 text-center",
                isLandscape ? "mt-1 p-2" : "mt-6 p-4"
              )}
            >
              <div className="text-indigo-700 font-semibold mb-1">{t("waiting.waitHost")}</div>
              <div className="text-sm text-indigo-500">{t("waiting.waitHostDesc")}</div>
            </div>
          )}

          {!canStart && (
            <div
              className={cn(
                "w-full bg-amber-50 rounded-xl border border-amber-200 text-center",
                isLandscape ? "mt-1 p-2" : "mt-6 p-4"
              )}
            >
              <div className="text-amber-700 font-semibold">{t("waiting.needPlayers")}</div>
              <div className="text-sm text-amber-600 mt-1">{t("waiting.needPlayersDesc")}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
