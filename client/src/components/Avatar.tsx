import { cn } from "@/lib/utils";
import {
  getProfileAccent,
  getProfileIcon,
  type ProfileAccent,
  type ProfileIconId,
} from "@/lib/playerProfile";

interface AvatarProps {
  name: string;
  isBot?: boolean;
  score?: number;
  isActive?: boolean;
  className?: string;
  position?: "top" | "bottom" | "left" | "right";
  /** Variante compacta para assentos de oponente em mesas lotadas */
  compact?: boolean;
  /** Ícone do perfil local (só jogador humano local) */
  iconId?: ProfileIconId;
  accent?: ProfileAccent;
}

export function Avatar({
  name,
  isBot,
  score = 0,
  isActive,
  className,
  position = "bottom",
  compact,
  iconId,
  accent,
}: AvatarProps) {
  const initials = name.slice(0, 2).toUpperCase();
  const accentStyle = accent ? getProfileAccent(accent) : null;
  const Icon = iconId ? getProfileIcon(iconId) : null;

  return (
    <div className={cn("flex flex-col items-center relative", compact ? "gap-1" : "gap-2", className)}>
      <div
        className={cn(
          "rounded-full border-4 flex items-center justify-center font-bold shadow-lg transition-all duration-300 relative",
          compact ? "w-10 h-10 text-sm" : "w-16 h-16 text-xl",
          isActive ? "border-yellow-400 scale-110 shadow-yellow-400/50" : accentStyle?.ring ?? "border-gray-200",
          isBot ? "bg-slate-100 text-slate-600" : accentStyle ? `${accentStyle.bg} ${accentStyle.text}` : "bg-white text-indigo-900"
        )}
      >
        {isBot ? (
          "🤖"
        ) : Icon ? (
          <Icon className={cn(compact ? "w-5 h-5" : "w-7 h-7")} strokeWidth={2.2} />
        ) : (
          initials
        )}

        {isActive && (
          <span
            className={cn(
              "absolute bg-yellow-400 text-yellow-900 font-bold rounded-full animate-bounce",
              compact ? "-bottom-1.5 px-1.5 py-0 text-[9px]" : "-bottom-2 px-2 py-0.5 text-xs"
            )}
          >
            TURN
          </span>
        )}
      </div>

      <div
        className={cn(
          "bg-black/60 backdrop-blur-sm rounded-full text-white font-medium border border-white/10 text-center",
          compact ? "px-2 py-0.5 text-[10px] max-w-[72px]" : "px-3 py-1 text-sm min-w-[80px]"
        )}
      >
        <div className={cn("truncate", compact ? "max-w-[64px]" : "max-w-[100px]")}>{name}</div>
        {!compact && <div className="text-xs text-yellow-400 font-mono">Score: {score}</div>}
        {compact && <div className="text-[9px] text-yellow-400 font-mono leading-tight">{score} pts</div>}
      </div>
    </div>
  );
}
