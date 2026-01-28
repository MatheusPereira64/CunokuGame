import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { PlayingCard } from "../PlayingCard";
import { DrawAnimationData, BaseAnimationProps, DEFAULT_DURATIONS } from "./types";

interface CardDrawAnimationProps extends BaseAnimationProps {
  data: DrawAnimationData;
  isOwnPlayer?: boolean; // Se é o jogador atual (para mostrar a carta)
}

export function CardDrawAnimation({
  data,
  onComplete,
  duration = DEFAULT_DURATIONS.draw,
  isOwnPlayer = false
}: CardDrawAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showCardFace, setShowCardFace] = useState(false);

  const { card, source, sourcePosition, targetPosition, playerName } = data;

  // Calcula o ponto médio para o arco (mais alto para melhor visibilidade)
  const midX = (sourcePosition.x + targetPosition.x) / 2;
  const arcHeight = Math.max(120, Math.abs(targetPosition.y - sourcePosition.y) * 0.6);
  const midY = Math.min(sourcePosition.y, targetPosition.y) - arcHeight;

  useEffect(() => {
    // Mostra a face da carta quando está no meio do caminho
    const showFaceTimer = setTimeout(() => {
      setShowCardFace(true);
    }, duration * 0.3);

    // Completa a animação
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 100);
    }, duration);

    return () => {
      clearTimeout(showFaceTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  const sourceLabel = source === 'deck' ? '🃏 Baralho' : '📤 Descarte';
  const sourceColor = source === 'deck' ? 'blue' : 'amber';

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          {/* Overlay sutil */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black"
          />

          {/* Carta animada com movimento suave em arco */}
          <motion.div
            initial={{
              x: sourcePosition.x - 48,
              y: sourcePosition.y - 68,
              scale: 0.8,
              rotate: 0,
              opacity: 0,
            }}
            animate={{
              x: [sourcePosition.x - 48, midX - 48, targetPosition.x - 48],
              y: [sourcePosition.y - 68, midY - 68, targetPosition.y - 68],
              scale: [0.8, 1.3, 1],
              rotate: [0, source === 'deck' ? 15 : -15, 0],
              opacity: [0, 1, 1],
            }}
            transition={{
              duration: duration / 1000,
              ease: [0.25, 0.1, 0.25, 1], // easeInOut mais suave
              times: [0, 0.5, 1],
            }}
            style={{
              position: 'absolute',
              zIndex: 10000,
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.6))',
            }}
          >
            <PlayingCard 
              card={showCardFace && isOwnPlayer ? card : undefined} 
              hidden={!showCardFace || !isOwnPlayer} 
              className="w-24 h-36" 
              animate={false}
            />
          </motion.div>

          {/* Linha de trajetória para melhor clareza */}
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 9998 }}>
            <motion.path
              d={`M ${sourcePosition.x} ${sourcePosition.y} Q ${midX} ${midY} ${targetPosition.x} ${targetPosition.y}`}
              fill="none"
              stroke={`rgba(59, 130, 246, 0.4)`}
              strokeWidth="3"
              strokeDasharray="10,5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: duration / 1000 * 0.8, ease: "easeOut" }}
            />
          </svg>

          {/* Indicador de origem melhorado */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-8 left-1/2 transform -translate-x-1/2 z-[10001]"
          >
            <div className={`bg-gradient-to-r ${
              source === 'deck' 
                ? 'from-blue-600 to-indigo-600' 
                : 'from-amber-600 to-orange-600'
            } backdrop-blur-md rounded-xl px-6 py-3 shadow-xl border-2 ${
              source === 'deck' 
                ? 'border-blue-400' 
                : 'border-amber-400'
            }`}>
              <div className="text-white font-bold text-lg flex items-center gap-3">
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.5 }}
                  className="text-2xl"
                >
                  {sourceLabel}
                </motion.span>
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="text-xl"
                >
                  →
                </motion.span>
                <span className="font-semibold">{playerName}</span>
              </div>
            </div>
          </motion.div>

          {/* Efeito de brilho pulsante na origem */}
          <motion.div
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.7, 0.4]
            }}
            transition={{ 
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              position: 'absolute',
              left: sourcePosition.x,
              top: sourcePosition.y,
              x: '-50%',
              y: '-50%',
            }}
          >
            <div className={`w-32 h-32 rounded-full blur-2xl ${
              source === 'deck' 
                ? 'bg-blue-400' 
                : 'bg-amber-400'
            }`} />
          </motion.div>

          {/* Efeito de brilho no destino */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.2, 1],
              opacity: [0, 0.6, 0]
            }}
            transition={{ 
              duration: duration / 1000,
              times: [0, 0.7, 1]
            }}
            style={{
              position: 'absolute',
              left: targetPosition.x,
              top: targetPosition.y,
              x: '-50%',
              y: '-50%',
            }}
          >
            <div className={`w-28 h-28 rounded-full blur-xl ${
              source === 'deck' 
                ? 'bg-blue-400' 
                : 'bg-amber-400'
            }`} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
