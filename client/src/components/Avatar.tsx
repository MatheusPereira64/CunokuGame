import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  isBot?: boolean;
  score?: number;
  isActive?: boolean;
  className?: string;
  position?: "top" | "bottom" | "left" | "right";
}

export function Avatar({ name, isBot, score = 0, isActive, className, position = "bottom" }: AvatarProps) {
  const initials = name.slice(0, 2).toUpperCase();
  
  return (
    <div className={cn("flex flex-col items-center gap-2 relative", className)}>
      <div className={cn(
        "w-16 h-16 rounded-full border-4 flex items-center justify-center text-xl font-bold shadow-lg transition-all duration-300 relative bg-white",
        isActive ? "border-yellow-400 scale-110 shadow-yellow-400/50" : "border-gray-200",
        isBot ? "bg-slate-100 text-slate-600" : "bg-white text-indigo-900"
      )}>
        {isBot ? "🤖" : initials}
        
        {isActive && (
          <span className="absolute -bottom-2 px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full animate-bounce">
            TURN
          </span>
        )}
      </div>

      <div className="bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm font-medium border border-white/10 text-center min-w-[80px]">
        <div className="truncate max-w-[100px]">{name}</div>
        <div className="text-xs text-yellow-400 font-mono">Score: {score}</div>
      </div>
    </div>
  );
}
