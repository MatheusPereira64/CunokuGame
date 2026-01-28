import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { PlayingCard } from "../PlayingCard";
import { PenaltyAnimationData, BaseAnimationProps, DEFAULT_DURATIONS } from "./types";

interface CardPenaltyAnimationProps extends BaseAnimationProps {
  data: PenaltyAnimationData;
}

export function CardPenaltyAnimation({
  data,
  onComplete,
  duration = DEFAULT_DURATIONS.penalty
}: CardPenaltyAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [phase, setPhase] = useState<'shake' | 'dealing' | 'complete'>('shake');

  const { 
    cards, 
    deckPosition, 
    targetPositions, 
    playerName 
  } = data;

  const cardDelay = duration * 0.3 / cards.length; // Tempo entre cada carta

  useEffect(() => {
    // Fase 1: Shake/aviso de erro
    const shakeTimer = setTimeout(() => {
      setPhase('dealing');
    }, duration * 0.25);

    // Anima cada carta em sequência
    const cardTimers = cards.map((_, index) => {
      return setTimeout(() => {
        setActiveCardIndex(index + 1);
      }, duration * 0.25 + (cardDelay * (index + 1)));
    });

    // Fase final
    const completeTimer = setTimeout(() => {
      setPhase('complete');
      setIsVisible(false);
      setTimeout(onComplete, 100);
    }, duration);

    return () => {
      clearTimeout(shakeTimer);
      cardTimers.forEach(t => clearTimeout(t));
      clearTimeout(completeTimer);
    };
  }, [duration, cards.length, cardDelay, onComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          {/* Overlay vermelho pulsante */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: phase === 'shake' ? [0.1, 0.3, 0.1] : 0.2,
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: phase === 'shake' ? 0.3 : 0.2,
              repeat: phase === 'shake' ? 2 : 0,
            }}
            className="absolute inset-0 bg-red-900"
          />

          {/* Borda vermelha pulsante */}
          {phase === 'shake' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
              className="absolute inset-0 border-8 border-red-500 pointer-events-none"
            />
          )}

          {/* Cartas sendo distribuídas */}
          {cards.map((card, index) => {
            const targetPos = targetPositions[index] || targetPositions[0];
            const isActive = index < activeCardIndex;
            const isCurrentCard = index === activeCardIndex - 1;

            // Calcula posição intermediária para arco
            const midX = (deckPosition.x + targetPos.x) / 2;
            const midY = Math.min(deckPosition.y, targetPos.y) - 50 - (index * 20);

            return (
              <motion.div
                key={index}
                initial={{
                  x: deckPosition.x - 48,
                  y: deckPosition.y - 68,
                  scale: 0.9,
                  opacity: 0,
                  rotate: 0,
                }}
                animate={isActive ? {
                  x: [deckPosition.x - 48, midX - 48, targetPos.x - 48],
                  y: [deckPosition.y - 68, midY - 68, targetPos.y - 68],
                  scale: [0.9, 1.2, 1],
                  opacity: 1,
                  rotate: [0, -10, 0],
                } : {
                  x: deckPosition.x - 48,
                  y: deckPosition.y - 68,
                  scale: 0.9,
                  opacity: 0,
                }}
                transition={{
                  duration: cardDelay / 1000,
                  ease: "easeOut",
                  times: [0, 0.4, 1],
                }}
                style={{
                  position: 'absolute',
                  zIndex: 10000 + index,
                  filter: isCurrentCard 
                    ? 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.8))' 
                    : 'drop-shadow(0 15px 30px rgba(0,0,0,0.5))',
                }}
              >
                <PlayingCard card={undefined} hidden={true} className="w-24 h-36" animate={false} />
              </motion.div>
            );
          })}

          {/* Indicador de penalidade melhorado */}
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              x: phase === 'shake' ? [-8, 8, -8, 8, 0] : 0,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 20,
              x: { duration: 0.5, ease: "easeInOut" }
            }}
            className="absolute top-8 left-1/2 transform -translate-x-1/2 z-[10001]"
          >
            <div className="bg-gradient-to-r from-red-600 to-rose-700 backdrop-blur-md rounded-xl px-8 py-5 shadow-2xl border-4 border-red-400">
              <div className="text-white font-bold text-xl flex items-center gap-4">
                <motion.div
                  animate={{ 
                    rotate: phase === 'shake' ? [0, -20, 20, -20, 20, 0] : 0,
                    scale: phase === 'shake' ? [1, 1.3, 1, 1.3, 1] : [1, 1.1, 1],
                  }}
                  transition={{ 
                    duration: 0.6,
                    repeat: phase === 'shake' ? 0 : Infinity,
                    repeatDelay: 0.3
                  }}
                >
                  <AlertTriangle className="w-8 h-8 text-yellow-300" />
                </motion.div>
                <div className="flex flex-col">
                  <motion.span 
                    animate={phase === 'shake' ? {
                      scale: [1, 1.1, 1]
                    } : {}}
                    transition={{ duration: 0.3, repeat: phase === 'shake' ? 2 : 0 }}
                    className="text-xl"
                  >
                    ⚠️ Penalidade!
                  </motion.span>
                  <span className="text-sm font-normal text-red-100 mt-1">
                    {playerName} compra {cards.length} carta{cards.length > 1 ? 's' : ''} como punição
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contador de cartas melhorado */}
          {phase === 'dealing' && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: 0
              }}
              transition={{
                scale: {
                  duration: 0.3,
                  repeat: Infinity,
                  repeatDelay: cardDelay / 1000
                }
              }}
              className="absolute top-32 left-1/2 transform -translate-x-1/2 z-[10001]"
            >
              <div className="bg-red-600 text-white font-bold text-4xl w-16 h-16 rounded-full flex items-center justify-center shadow-2xl border-4 border-red-400">
                <motion.span
                  key={activeCardIndex}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  +{activeCardIndex}
                </motion.span>
              </div>
            </motion.div>
          )}

          {/* Efeito de brilho vermelho no deck */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ 
              scale: [0.5, 1.5, 1],
              opacity: [0, 0.6, 0],
            }}
            transition={{ 
              duration: 0.6,
              repeat: phase === 'dealing' ? cards.length : 0,
              repeatDelay: cardDelay / 1000 - 0.6,
            }}
            style={{
              position: 'absolute',
              left: deckPosition.x,
              top: deckPosition.y,
              x: '-50%',
              y: '-50%',
            }}
          >
            <div className="w-32 h-32 bg-red-500 rounded-full blur-xl" />
          </motion.div>

          {/* X vermelho animado */}
          {phase === 'shake' && (
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: -180 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[10002]"
            >
              <div className="text-red-500 text-9xl font-bold opacity-30">✕</div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
