import { motion } from "framer-motion";
import { type Card } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Club, Diamond, Heart, Spade, Eye, Glasses, ArrowLeftRight } from "lucide-react";

interface PlayingCardProps {
  card?: Card; // Se ausente, é um verso de carta ou slot vazio
  hidden?: boolean;
  onClick?: () => void;
  className?: string;
  selected?: boolean;
  animate?: boolean;
}

// Ícone da habilidade especial da carta (regras do Cunoku)
function getAbilityIcon(rank?: string) {
  switch (rank) {
    case "5":
    case "6":
      return Eye; // Ver carta de oponente
    case "7":
    case "8":
      return Glasses; // Ver a própria carta
    case "9":
    case "10":
      return ArrowLeftRight; // Trocar cartas
    default:
      return null;
  }
}

export function PlayingCard({ card, hidden, onClick, className, selected, animate = true }: PlayingCardProps) {
  const isRed = card?.suit === "hearts" || card?.suit === "diamonds";

  const getIcon = (suit?: string) => {
    switch (suit) {
      case "hearts":
        return <Heart className="w-full h-full fill-current" />;
      case "diamonds":
        return <Diamond className="w-full h-full fill-current" />;
      case "clubs":
        return <Club className="w-full h-full fill-current" />;
      case "spades":
        return <Spade className="w-full h-full fill-current" />;
      default:
        return null;
    }
  };

  const isBack = hidden || !card;
  const AbilityIcon = !isBack ? getAbilityIcon(card?.rank) : null;

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.05, y: -5 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      initial={animate ? { scale: 0.8, opacity: 0 } : false}
      animate={animate ? { scale: 1, opacity: 1 } : false}
      onClick={onClick}
      className={cn(
        "relative w-24 h-36 rounded-xl border-2 cursor-pointer transition-all duration-300 select-none card-shadow overflow-hidden",
        isBack ? "bg-[#1c2340] border-[#d4af37]/40" : "bg-[#faf7f0] border-gray-200",
        selected && "ring-4 ring-yellow-400 ring-offset-2",
        className
      )}
    >
      {/* Verso da carta: padrão seigaiha + selo dourado */}
      {isBack && (
        <svg
          viewBox="0 0 96 144"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <pattern id="seigaiha-back" x="0" y="0" width="24" height="12" patternUnits="userSpaceOnUse">
              <g fill="none" stroke="#3d4d7a" strokeWidth="1">
                <circle cx="12" cy="12" r="11" />
                <circle cx="12" cy="12" r="7.5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="0" cy="18" r="11" />
                <circle cx="24" cy="18" r="11" />
              </g>
            </pattern>
          </defs>
          <rect width="96" height="144" fill="#1c2340" />
          <rect width="96" height="144" fill="url(#seigaiha-back)" opacity="0.55" />
          <circle cx="48" cy="72" r="27" fill="#141a30" stroke="#d4af37" strokeWidth="1.5" opacity="0.95" />
          <circle cx="48" cy="72" r="22.5" fill="none" stroke="#d4af37" strokeWidth="0.5" opacity="0.5" />
          <text
            x="48"
            y="73"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="28"
            fill="#d4af37"
            fontFamily="'Noto Serif JP', serif"
            fontWeight="600"
          >
            九
          </text>
        </svg>
      )}

      {/* Frente da carta */}
      {!isBack && card && (
        <div
          className={cn(
            "w-full h-full p-2 flex flex-col justify-between",
            isRed ? "text-red-600" : "text-gray-900"
          )}
        >
          {/* Canto superior */}
          <div className="flex flex-col items-center w-6">
            <span className="text-xl font-bold leading-none font-display">{card.rank}</span>
            <div className="w-4 h-4 mt-1">{getIcon(card.suit)}</div>
          </div>

          {/* Naipe grande ao centro */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <div className="w-20 h-20">{getIcon(card.suit)}</div>
          </div>

          {/* Selo de habilidade (cartas 5-10) */}
          {AbilityIcon && (
            <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-[26%] aspect-square rounded-full bg-amber-100/90 ring-1 ring-amber-500/50 flex items-center justify-center p-[4%] pointer-events-none">
              <AbilityIcon className="w-full h-full text-amber-700/90" strokeWidth={2.2} />
            </div>
          )}

          {/* Canto inferior (rotacionado) */}
          <div className="flex flex-col items-center w-6 self-end rotate-180">
            <span className="text-xl font-bold leading-none font-display">{card.rank}</span>
            <div className="w-4 h-4 mt-1">{getIcon(card.suit)}</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
