import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export type OpponentActionType = 
  | 'draw_deck'
  | 'draw_discard'
  | 'discard'
  | 'replace'
  | 'use_ability';

interface OpponentActionNotificationProps {
  playerName: string;
  actionType: OpponentActionType;
  onComplete: () => void;
  duration?: number; // Duração mínima em ms (padrão 2000ms)
}

const ACTION_ICONS: Record<OpponentActionType, string> = {
  draw_deck: '🃏',
  draw_discard: '📤',
  discard: '🗑️',
  replace: '🔄',
  use_ability: '✨',
};

const ACTION_TEXTS: Record<OpponentActionType, string> = {
  draw_deck: 'comprou do baralho',
  draw_discard: 'comprou do descarte',
  discard: 'descartou uma carta',
  replace: 'substituiu uma carta',
  use_ability: 'usou uma habilidade',
};

const ACTION_COLORS: Record<OpponentActionType, string> = {
  draw_deck: 'from-blue-600 to-indigo-600',
  draw_discard: 'from-amber-600 to-orange-600',
  discard: 'from-purple-600 to-violet-600',
  replace: 'from-cyan-600 to-blue-600',
  use_ability: 'from-yellow-600 to-orange-600',
};

export function OpponentActionNotification({
  playerName,
  actionType,
  onComplete,
  duration = 2000
}: OpponentActionNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 25
          }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[10002] pointer-events-none"
        >
          <div className={`bg-gradient-to-r ${ACTION_COLORS[actionType]} backdrop-blur-md rounded-xl px-6 py-4 shadow-2xl border-2 ${
            actionType === 'draw_deck' ? 'border-blue-400' :
            actionType === 'draw_discard' ? 'border-amber-400' :
            actionType === 'discard' ? 'border-purple-400' :
            actionType === 'replace' ? 'border-cyan-400' :
            'border-yellow-400'
          }`}>
            <div className="text-white font-bold text-lg flex items-center gap-3">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ 
                  duration: 1,
                  repeat: Infinity,
                  repeatDelay: 0.5
                }}
                className="text-3xl"
              >
                {ACTION_ICONS[actionType]}
              </motion.div>
              <div className="flex flex-col">
                <span className="text-xl">
                  <span className="font-extrabold">{playerName}</span>
                  {' '}
                  <span className="font-semibold">{ACTION_TEXTS[actionType]}</span>
                </span>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: duration / 1000, ease: "linear" }}
                  className="h-1 bg-white/30 rounded-full mt-2 overflow-hidden"
                >
                  <div className="h-full bg-white/60 rounded-full" />
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
