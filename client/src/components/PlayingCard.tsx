import { motion } from "framer-motion";
import { type Card, SUITS } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Club, Diamond, Heart, Spade, HelpCircle } from "lucide-react";

interface PlayingCardProps {
  card?: Card; // If null, it's a back-facing card or empty slot
  hidden?: boolean;
  onClick?: () => void;
  className?: string;
  selected?: boolean;
  animate?: boolean;
}

export function PlayingCard({ card, hidden, onClick, className, selected, animate = true }: PlayingCardProps) {
  const isRed = card?.suit === "hearts" || card?.suit === "diamonds";
  
  const getIcon = (suit?: string) => {
    switch(suit) {
      case "hearts": return <Heart className="w-full h-full fill-current" />;
      case "diamonds": return <Diamond className="w-full h-full fill-current" />;
      case "clubs": return <Club className="w-full h-full fill-current" />;
      case "spades": return <Spade className="w-full h-full fill-current" />;
      default: return null;
    }
  };

  const isBack = hidden || !card;

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.05, y: -5 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      initial={animate ? { scale: 0.8, opacity: 0 } : false}
      animate={animate ? { scale: 1, opacity: 1 } : false}
      onClick={onClick}
      className={cn(
        "relative w-24 h-36 rounded-xl border-2 cursor-pointer transition-all duration-300 select-none card-shadow overflow-hidden",
        isBack 
          ? "bg-gradient-to-br from-indigo-900 to-blue-950 border-white/10" 
          : "bg-white border-gray-200",
        selected && "ring-4 ring-yellow-400 ring-offset-2",
        className
      )}
    >
      {/* Card Back Design */}
      {isBack && (
        <div className="absolute inset-0 p-2 flex items-center justify-center opacity-40">
           <div className="w-full h-full border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center">
             <div className="text-4xl text-white font-serif">C</div>
           </div>
        </div>
      )}

      {/* Card Front Design */}
      {!isBack && card && (
        <div className={cn(
          "w-full h-full p-2 flex flex-col justify-between",
          isRed ? "text-red-600" : "text-gray-900"
        )}>
          {/* Top Corner */}
          <div className="flex flex-col items-center w-6">
            <span className="text-xl font-bold leading-none font-display">{card.rank}</span>
            <div className="w-4 h-4 mt-1">{getIcon(card.suit)}</div>
          </div>

          {/* Center Large Icon */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <div className="w-20 h-20">{getIcon(card.suit)}</div>
          </div>

          {/* Bottom Corner (Rotated) */}
          <div className="flex flex-col items-center w-6 self-end rotate-180">
            <span className="text-xl font-bold leading-none font-display">{card.rank}</span>
            <div className="w-4 h-4 mt-1">{getIcon(card.suit)}</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
