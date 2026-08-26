import { Player } from "@shared/schema";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { VolumeControl } from "@/components/VolumeControl";
import { cn } from "@/lib/utils";
import { Copy } from "lucide-react";

interface WaitingRoomProps {
  roomCode: string;
  players: Player[];
  playerId: string;
  isHost: boolean;
  onCopyCode: () => void;
  onStart: () => void;
}

export function WaitingRoom({ roomCode, players, playerId, isHost, onCopyCode, onStart }: WaitingRoomProps) {
  const canStart = players.length >= 2;

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-8 relative">
      <div className="absolute top-4 right-4 z-20">
        <div className="[&_button]:bg-white/90 [&_button]:text-indigo-900 [&_button]:border-indigo-200 [&_button]:hover:bg-white [&_button]:shadow-md">
          <VolumeControl />
        </div>
      </div>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-display font-bold text-indigo-900">Waiting for Players</h2>
          <p className="text-gray-500 mt-2">Share this code with your friends</p>
        </div>

        <div
          className="flex items-center gap-2 bg-gray-100 p-4 rounded-xl mb-8 cursor-pointer hover:bg-gray-200 transition-colors"
          onClick={onCopyCode}
        >
          <div className="flex-1 font-mono text-3xl font-bold text-center tracking-widest text-indigo-900">
            {roomCode}
          </div>
          <Copy className="w-5 h-5 text-gray-500" />
        </div>

        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
            Current Players ({players.length}/{players.length >= 2 ? "Ready" : "2+"})
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
                        You
                      </span>
                    )}
                    {p.id === playerId && isHost && (
                      <span className="text-xs font-semibold text-purple-700 bg-purple-200 px-2 py-0.5 rounded-full">
                        Host
                      </span>
                    )}
                  </div>
                  {p.id === playerId && <div className="text-xs text-gray-500 mt-1">Score: {p.score}</div>}
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
            Start Game ({players.length} players)
          </Button>
        )}

        {canStart && !isHost && (
          <div className="w-full mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-200 text-center">
            <div className="text-indigo-700 font-semibold mb-1">Waiting for host to start...</div>
            <div className="text-sm text-indigo-500">The game will begin shortly</div>
          </div>
        )}

        {!canStart && (
          <div className="w-full mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200 text-center">
            <div className="text-amber-700 font-semibold">Need at least 2 players to start</div>
            <div className="text-sm text-amber-600 mt-1">Share the room code with a friend!</div>
          </div>
        )}
      </div>
    </div>
  );
}
