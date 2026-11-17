import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { type Card } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Club, Crown, Diamond, Heart, Spade, Eye, Glasses, ArrowLeftRight, Lock, Plus, Sparkles, Users, Wind } from "lucide-react";
import { loadTableTheme, subscribeTableTheme, type CardBackId } from "@/lib/tableTheme";

interface PlayingCardProps {
  card?: Card; // Se ausente, é um verso de carta ou slot vazio
  hidden?: boolean;
  onClick?: () => void;
  className?: string;
  selected?: boolean;
  animate?: boolean;
  /** Mostra este verso em vez do escolhido no tema (prévia no seletor). */
  backOverride?: CardBackId;
}

// Ícone da habilidade especial da carta (regras do Cunoku)
export function getAbilityIcon(rank?: string) {
  switch (rank) {
    case "A":
    case "2":
      return Wind; // Embaralhar a mão de um oponente
    case "3":
    case "4":
      return Lock; // Selar uma carta da mesa
    case "J":
      return Plus; // Comprar mais uma e substituir
    case "Q":
      return Users; // Oponente compra 2, você compra 1
    case "K":
      return Crown; // Ver todas as cartas de um jogador
    case "Joker":
      return Sparkles; // Ver todos e forçar uma troca
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

/** Versos novos: fundo, padrão repetido e selo central com um kanji. */
const EXTRA_BACKS: Partial<Record<CardBackId, { bg: string; seal: string; ink: string; glyph: string; size: number; pattern: (ink: string) => JSX.Element }>> = {
  // Claro: flores de sakura sobre papel creme
  sakura: {
    bg: "#f6efe4",
    seal: "#fbe3e8",
    ink: "#c2577a",
    glyph: "桜",
    size: 24,
    pattern: (ink) => (
      <g fill={ink} opacity="0.28">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="12" cy="7.5" rx="2.4" ry="4" transform={`rotate(${a} 12 12)`} />
        ))}
        <circle cx="12" cy="12" r="1.4" fill="#e6a23c" />
      </g>
    ),
  },
  // Ouro: conquista de vencer com zero pontos
  kin: {
    bg: "#3a2a08",
    seal: "#2a1e05",
    ink: "#f2c94c",
    glyph: "金",
    size: 16,
    pattern: (ink) => <path d="M8 0 L16 8 L8 16 L0 8 Z" fill="none" stroke={ink} strokeWidth="1" opacity="0.5" />,
  },
  // Púrpura real: conquista das três Rainhas
  murasaki: {
    bg: "#2d1645",
    seal: "#1d0d30",
    ink: "#d9b8ff",
    glyph: "王",
    size: 20,
    pattern: (ink) => <path d="M2 14 L6 6 L10 12 L14 6 L18 14 Z" fill="none" stroke={ink} strokeWidth="1" opacity="0.4" />,
  },
  // Natal: só em dezembro
  natal: {
    bg: "#7a1420",
    seal: "#0f4d2c",
    ink: "#f7f1e3",
    glyph: "雪",
    size: 22,
    pattern: (ink) => (
      <g stroke={ink} strokeWidth="1" opacity="0.45" strokeLinecap="round">
        <path d="M11 4 V18 M4 11 H18 M6 6 L16 16 M16 6 L6 16" />
      </g>
    ),
  },
};

function CardBack({ variant }: { variant: CardBackId }) {
  const rawId = useId().replaceAll(":", "");
  const patternId = `back-${variant}-${rawId}`;

  const extra = EXTRA_BACKS[variant];
  if (extra) {
    return (
      <svg viewBox="0 0 96 144" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <pattern id={patternId} x="0" y="0" width={extra.size} height={extra.size} patternUnits="userSpaceOnUse">
            {extra.pattern(extra.ink)}
          </pattern>
        </defs>
        <rect width="96" height="144" fill={extra.bg} />
        <rect width="96" height="144" fill={`url(#${patternId})`} />
        <circle cx="48" cy="72" r="24" fill={extra.seal} stroke={extra.ink} strokeWidth="1.5" />
        <text x="48" y="73" textAnchor="middle" dominantBaseline="central" fontSize="24" fill={extra.ink} fontFamily="'Noto Serif JP', serif" fontWeight="600">{extra.glyph}</text>
      </svg>
    );
  }

  if (variant === "asanoha") {
    return (
      <svg viewBox="0 0 96 144" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <pattern id={patternId} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M10 0 L20 10 L10 20 L0 10 Z" fill="none" stroke="#c45c26" strokeWidth="0.8" />
            <path d="M10 4 L16 10 L10 16 L4 10 Z" fill="none" stroke="#e8c9a0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="96" height="144" fill="#6b1d1d" />
        <rect width="96" height="144" fill={`url(#${patternId})`} />
        <circle cx="48" cy="72" r="22" fill="#4a1010" stroke="#e8c9a0" strokeWidth="1.5" />
        <text x="48" y="73" textAnchor="middle" dominantBaseline="central" fontSize="22" fill="#e8c9a0" fontFamily="'Noto Serif JP', serif">麻</text>
      </svg>
    );
  }

  if (variant === "shippo") {
    return (
      <svg viewBox="0 0 96 144" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <pattern id={patternId} x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="8" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.55" />
            <circle cx="0" cy="0" r="8" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.55" />
            <circle cx="24" cy="0" r="8" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.55" />
            <circle cx="0" cy="24" r="8" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.55" />
            <circle cx="24" cy="24" r="8" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.55" />
          </pattern>
        </defs>
        <rect width="96" height="144" fill="#141428" />
        <rect width="96" height="144" fill={`url(#${patternId})`} />
        <circle cx="48" cy="72" r="22" fill="#0d0d1c" stroke="#d4af37" strokeWidth="1.5" />
        <text x="48" y="73" textAnchor="middle" dominantBaseline="central" fontSize="22" fill="#d4af37" fontFamily="'Noto Serif JP', serif">七</text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 96 144" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id={patternId} x="0" y="0" width="24" height="12" patternUnits="userSpaceOnUse">
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
      <rect width="96" height="144" fill={`url(#${patternId})`} opacity="0.55" />
      <circle cx="48" cy="72" r="27" fill="#141a30" stroke="#d4af37" strokeWidth="1.5" opacity="0.95" />
      <circle cx="48" cy="72" r="22.5" fill="none" stroke="#d4af37" strokeWidth="0.5" opacity="0.5" />
      <text x="48" y="73" textAnchor="middle" dominantBaseline="central" fontSize="28" fill="#d4af37" fontFamily="'Noto Serif JP', serif" fontWeight="600">九</text>
    </svg>
  );
}

export function PlayingCard({ card, hidden, onClick, className, selected, animate = true, backOverride }: PlayingCardProps) {
  const theme = useSyncExternalStore(subscribeTableTheme, loadTableTheme, loadTableTheme);
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

  const isBack = hidden || !card || card.isHidden;
  const AbilityIcon = !isBack ? getAbilityIcon(card?.rank) : null;

  // Virou de lado (espiada, revelação, fim da partida): gira em 3D em vez de só trocar a face
  const wasBack = useRef(isBack);
  const [flip, setFlip] = useState<"reveal" | "hide" | null>(null);
  useEffect(() => {
    if (wasBack.current !== isBack) setFlip(isBack ? "hide" : "reveal");
    wasBack.current = isBack;
  }, [isBack]);

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.05, y: -5 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      initial={animate ? { scale: 0.8, opacity: 0 } : { scale: 1, opacity: 1 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={onClick}
      onAnimationEnd={() => setFlip(null)}
      className={cn(
        "relative w-24 h-36 rounded-xl border-2 cursor-pointer transition-all duration-300 select-none card-shadow overflow-hidden",
        flip === "reveal" && "card-flip-reveal",
        flip === "hide" && "card-flip-hide",
        isBack ? "bg-[#1c2340] border-[#d4af37]/40" : "bg-[#faf7f0] border-gray-200",
        selected && "ring-4 ring-yellow-400 ring-offset-2",
        className
      )}
    >
      {/* Verso da carta: padrão seigaiha + selo dourado */}
      {isBack && <CardBack variant={backOverride ?? theme.back} />}

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
            <span className="text-xl font-bold leading-none font-display">{card.rank === "Joker" ? "★" : card.rank}</span>
            <div className="w-4 h-4 mt-1">{getIcon(card.suit)}</div>
          </div>

          {/* Naipe grande ao centro */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.16] pointer-events-none">
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
            <span className="text-xl font-bold leading-none font-display">{card.rank === "Joker" ? "★" : card.rank}</span>
            <div className="w-4 h-4 mt-1">{getIcon(card.suit)}</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
