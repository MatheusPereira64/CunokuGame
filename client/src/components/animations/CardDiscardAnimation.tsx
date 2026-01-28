import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { PlayingCard } from "../PlayingCard";
import { DiscardAnimationData, BaseAnimationProps, DEFAULT_DURATIONS } from "./types";

interface CardDiscardAnimationProps extends BaseAnimationProps {
  data: DiscardAnimationData;
  isOwnPlayer?: boolean; // Se é o jogador atual (para mostrar a carta)
}

export function CardDiscardAnimation({
  data,
  onComplete,
  duration = DEFAULT_DURATIONS.discard,
  isOwnPlayer = false
}: CardDiscardAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);

  const { 
    card, 
    discardType, 
    sourcePosition, 
    targetPosition, 
    playerName,
    isSuccess 
  } = data;

  // Calcula o arco da animação
  const midX = (sourcePosition.x + targetPosition.x) / 2;
  const midY = Math.min(sourcePosition.y, targetPosition.y) - 60;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 100);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!isVisible) return null;

  // Determina cores e textos baseado no tipo de descarte
  const getDiscardStyle = () => {
    switch (discardType) {
      case 'matched':
        return {
          gradient: isSuccess 
            ? 'from-green-500 to-emerald-600' 
            : 'from-red-500 to-rose-600',
          icon: isSuccess ? '✓' : '✗',
          text: isSuccess ? 'Descarte Combinado!' : 'Erro no Descarte',
          glowColor: isSuccess ? 'bg-green-400' : 'bg-red-400',
        };
      case 'from_hand':
        return {
          gradient: 'from-orange-500 to-amber-600',
          icon: '📤',
          text: 'Descartando da Mão',
          glowColor: 'bg-orange-400',
        };
      case 'drawn':
      default:
        return {
          gradient: 'from-purple-500 to-violet-600',
          icon: '↓',
          text: 'Descartando Carta',
          glowColor: 'bg-purple-400',
        };
    }
  };

  const style = getDiscardStyle();

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          {/* Overlay sutil */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black"
          />

          {/* Carta animada com movimento mais claro */}
          <motion.div
            initial={{
              x: sourcePosition.x - 48,
              y: sourcePosition.y - 68,
              scale: 1,
              rotate: 0,
              opacity: 1,
            }}
            animate={{
              x: [
                sourcePosition.x - 48,
                midX - 48,
                targetPosition.x - 48,
              ],
              y: [
                sourcePosition.y - 68,
                midY - 68,
                targetPosition.y - 68,
              ],
              scale: [1, 1.2, 0.9],
              rotate: [0, discardType === 'matched' && isSuccess ? 360 : -20, 0],
              opacity: [1, 1, 0.95],
            }}
            transition={{
              duration: duration / 1000,
              ease: [0.25, 0.1, 0.25, 1],
              times: [0, 0.5, 1],
            }}
            style={{
              position: 'absolute',
              zIndex: 10000,
              filter: discardType === 'matched' && isSuccess
                ? 'drop-shadow(0 0 30px rgba(34, 197, 94, 0.8))'
                : 'drop-shadow(0 15px 30px rgba(0,0,0,0.5))',
            }}
          >
            <PlayingCard card={isOwnPlayer ? card : undefined} hidden={!isOwnPlayer} className="w-24 h-36" animate={false} />
          </motion.div>

          {/* Linha de trajetória */}
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 9998 }}>
            <motion.path
              d={`M ${sourcePosition.x} ${sourcePosition.y} Q ${midX} ${midY} ${targetPosition.x} ${targetPosition.y}`}
              fill="none"
              stroke={discardType === 'matched' && isSuccess 
                ? 'rgba(34, 197, 94, 0.5)' 
                : 'rgba(168, 85, 247, 0.4)'}
              strokeWidth="3"
              strokeDasharray="8,4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.7 }}
              transition={{ duration: duration / 1000 * 0.8, ease: "easeOut" }}
            />
          </svg>

          {/* Indicador de ação */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-8 left-1/2 transform -translate-x-1/2 z-[10001]"
          >
            <div className={`bg-gradient-to-r ${style.gradient} backdrop-blur-md rounded-xl px-6 py-3 shadow-xl`}>
              <div className="text-white font-semibold text-lg flex items-center gap-3">
                <span className="text-2xl">{style.icon}</span>
                <span>{style.text}</span>
                <span className="text-white/70">•</span>
                <span className="text-white/90">{playerName}</span>
              </div>
            </div>
          </motion.div>

          {/* Efeito de brilho no destino (pilha de descarte) */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.5, 1], opacity: [0, 0.8, 0] }}
            transition={{ duration: duration / 1000, times: [0, 0.7, 1] }}
            style={{
              position: 'absolute',
              left: targetPosition.x,
              top: targetPosition.y,
              x: '-50%',
              y: '-50%',
            }}
          >
            <div className={`w-32 h-32 rounded-full blur-xl ${style.glowColor}`} />
          </motion.div>

          {/* Partículas de sucesso melhoradas para matched_discard */}
          {discardType === 'matched' && isSuccess && (
            <>
              {[...Array(12)].map((_, i) => {
                const angle = (i * 30) * Math.PI / 180;
                const distance = 100 + (i % 3) * 20;
                return (
                  <motion.div
                    key={i}
                    initial={{
                      x: targetPosition.x,
                      y: targetPosition.y,
                      scale: 0,
                      opacity: 1,
                    }}
                    animate={{
                      x: targetPosition.x + Math.cos(angle) * distance,
                      y: targetPosition.y + Math.sin(angle) * distance,
                      scale: [0, 1.5, 0],
                      opacity: [1, 1, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      delay: 0.3 + (i * 0.05),
                      ease: "easeOut",
                    }}
                    className="absolute w-4 h-4 bg-green-400 rounded-full"
                    style={{ 
                      zIndex: 10001,
                      boxShadow: '0 0 10px rgba(34, 197, 94, 0.8)'
                    }}
                  />
                );
              })}
              {/* Estrelas de sucesso */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={`star-${i}`}
                  initial={{
                    x: targetPosition.x,
                    y: targetPosition.y,
                    scale: 0,
                    rotate: 0,
                  }}
                  animate={{
                    x: targetPosition.x + (Math.random() - 0.5) * 150,
                    y: targetPosition.y + (Math.random() - 0.5) * 150,
                    scale: [0, 1.2, 0],
                    rotate: 360,
                  }}
                  transition={{
                    duration: 1,
                    delay: 0.4 + i * 0.1,
                    ease: "easeOut",
                  }}
                  className="absolute text-2xl"
                  style={{ zIndex: 10001 }}
                >
                  ⭐
                </motion.div>
              ))}
            </>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
