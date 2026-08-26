import { Player } from "@shared/schema";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { VolumeControl } from "@/components/VolumeControl";
import { cn } from "@/lib/utils";
import { Copy, Wifi } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";

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

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-8 relative">
      <div className="absolute top-4 right-4 z-20">
        <div className="[&_button]:bg-white/90 [&_button]:text-indigo-900 [&_button]:border-indigo-200 [&_button]:hover:bg-white [&_button]:shadow-md">
          <VolumeControl />
        </div>
      </div>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-display font-bold text-indigo-900">{t("waiting.title")}</h2>
          <p className="text-gray-500 mt-2">
            {isLan ? t("waiting.shareLan") : t("waiting.shareCode")}
          </p>
        </div>

        <div
          className="flex items-center gap-2 bg-gray-100 p-4 rounded-xl mb-4 cursor-pointer hover:bg-gray-200 transition-colors"
          onClick={onCopyCode}
        >
          <div className="flex-1 font-mono text-3xl font-bold text-center tracking-widest text-indigo-900">
            {roomCode}
          </div>
          <Copy className="w-5 h-5 text-gray-500" />
        </div>

        {isLan && lanJoinUrl && (
          <div className="mb-8 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
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
            <p className="text-xs text-indigo-600 mt-2">{t("waiting.lanHint")}</p>
          </div>
        )}

        <div className={cn("space-y-4 mb-6", !isLan && "mt-4")}>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
            {t("waiting.players")} ({players.length}
            {players.length >= 2 ? ` — ${t("waiting.ready")}` : " / 2+"})
          </h3>
          <div className="space-y-2">
            {players.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl transition-all",
                  p.id === playerId
                    ? "bg-gradient-to-r from-indigo-100 to-purple-100 border-2 border-indigo-300 shadow-md"
                    : "bg-gray-50 border border-gray-200"
                )}
              >
                <Avatar name={p.name} className={cn("scale-90", p.id === playerId && "ring-2 ring-indigo-400")} />
                <div className="flex-1">
                  <div className="font-bold text-indigo-900 flex items-center gap-2">
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
                  {p.id === playerId && (
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
            className="w-full mt-6 text-lg py-6 font-bold shadow-lg hover:shadow-xl transition-all"
            onClick={onStart}
          >
            {t("waiting.startGame")} ({players.length})
          </Button>
        )}

        {canStart && !isHost && (
          <div className="w-full mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-200 text-center">
            <div className="text-indigo-700 font-semibold mb-1">{t("waiting.waitHost")}</div>
            <div className="text-sm text-indigo-500">{t("waiting.waitHostDesc")}</div>
          </div>
        )}

        {!canStart && (
          <div className="w-full mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200 text-center">
            <div className="text-amber-700 font-semibold">{t("waiting.needPlayers")}</div>
            <div className="text-sm text-amber-600 mt-1">{t("waiting.needPlayersDesc")}</div>
          </div>
        )}
      </div>
    </div>
  );
}
