import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { PlayingCard } from "../PlayingCard";
import { ReplaceAnimationData, BaseAnimationProps, DEFAULT_DURATIONS } from "./types";

interface CardReplaceAnimationProps extends BaseAnimationProps {
  data: ReplaceAnimationData;
}

export function CardReplaceAnimation({
  data,
  onComplete,
  duration = DEFAULT_DURATIONS.replace,
  isOwnPlayer = false
}: CardReplaceAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [phase, setPhase] = useState<'highlight' | 'lift' | 'swap' | 'complete'>('highlight');

  const { 
    drawnCard, 
    handCard, 
    drawnCardPosition, 
    handCardPosition, 
    discardPosition,
    playerName 
  } = data;

  useEffect(() => {
    // Fase 1: Destacar cartas
    const liftTimer = setTimeout(() => {
      setPhase('lift');
    }, duration * 0.1);

    // Fase 2: Levantar cartas
    const swapTimer = setTimeout(() => {
      setPhase('swap');
    }, duration * 0.25);

    // Fase 3: Animação principal de troca
    const completeTimer = setTimeout(() => {
      setPhase('complete');
    }, duration * 0.85);

    // Fase 4: Finalização
    const endTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 100);
    }, duration);

    return () => {
      clearTimeout(liftTimer);
      clearTimeout(swapTimer);
      clearTimeout(completeTimer);
      clearTimeout(endTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  // Ponto central entre as duas cartas (mais alto para melhor visibilidade)
  const centerX = (drawnCardPosition.x + handCardPosition.x) / 2;
  const arcHeight = Math.max(100, Math.abs(handCardPosition.y - drawnCardPosition.y) * 0.5);
  const centerY = Math.min(drawnCardPosition.y, handCardPosition.y) - arcHeight;

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black"
          />

          {/* Carta da mão indo para o descarte */}
          <motion.div
            initial={{
              x: handCardPosition.x - 48,
              y: handCardPosition.y - 68,
              scale: 1,
              rotate: 0,
              opacity: 1,
            }}
            animate={phase === 'highlight' ? {
              x: handCardPosition.x - 48,
              y: handCardPosition.y - 68,
              scale: 1.1,
              rotate: 0,
              opacity: 1,
            } : phase === 'lift' ? {
              x: handCardPosition.x - 48,
              y: handCardPosition.y - 88,
              scale: 1.15,
              rotate: -5,
              opacity: 1,
            } : phase === 'swap' ? {
              x: centerX - 48,
              y: centerY - 68,
              scale: 1.2,
              rotate: -25,
              opacity: 1,
            } : {
              x: discardPosition.x - 48,
              y: discardPosition.y - 68,
              scale: 0.9,
              rotate: -5,
              opacity: 0.95,
            }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 25,
              mass: 0.7,
            }}
            style={{
              position: 'absolute',
              zIndex: 10001,
              filter: 'drop-shadow(0 20px 40px rgba(239, 68, 68, 0.6))',
            }}
          >
            <PlayingCard card={handCard} hidden={false} className="w-24 h-36" animate={false} />
            {/* Badge "Descarte" */}
            {phase === 'swap' && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap"
              >
                → Descarte
              </motion.div>
            )}
          </motion.div>

          {/* Carta comprada indo para a mão */}
          <motion.div
            initial={{
              x: drawnCardPosition.x - 48,
              y: drawnCardPosition.y - 68,
              scale: 1,
              rotate: 0,
              opacity: 1,
            }}
            animate={phase === 'highlight' ? {
              x: drawnCardPosition.x - 48,
              y: drawnCardPosition.y - 68,
              scale: 1.1,
              rotate: 0,
              opacity: 1,
            } : phase === 'lift' ? {
              x: drawnCardPosition.x - 48,
              y: drawnCardPosition.y - 88,
              scale: 1.15,
              rotate: 5,
              opacity: 1,
            } : phase === 'swap' ? {
              x: centerX - 48,
              y: centerY - 38,
              scale: 1.3,
              rotate: 25,
              opacity: 1,
            } : {
              x: handCardPosition.x - 48,
              y: handCardPosition.y - 68,
              scale: 1,
              rotate: 0,
              opacity: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 25,
              mass: 0.7,
            }}
            style={{
              position: 'absolute',
              zIndex: 10000,
              filter: 'drop-shadow(0 20px 40px rgba(34, 197, 94, 0.6))',
            }}
          >
            <PlayingCard card={isOwnPlayer ? drawnCard : undefined} hidden={!isOwnPlayer} className="w-24 h-36" animate={false} />
            {/* Badge "Mão" */}
            {phase === 'swap' && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap"
              >
                → Mão
              </motion.div>
            )}
          </motion.div>

          {/* Linhas de conexão animadas mais visíveis */}
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 9998 }}>
            {/* Linha da carta da mão para descarte (vermelha) */}
            <motion.path
              d={`M ${handCardPosition.x} ${handCardPosition.y} Q ${centerX} ${centerY - 40} ${discardPosition.x} ${discardPosition.y}`}
              fill="none"
              stroke="rgba(239, 68, 68, 0.9)"
              strokeWidth="5"
              strokeDasharray="12,6"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: phase !== 'highlight' ? 1 : 0, opacity: phase !== 'highlight' ? 1 : 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            
            {/* Linha da carta comprada para a mão (verde) */}
            <motion.path
              d={`M ${drawnCardPosition.x} ${drawnCardPosition.y} Q ${centerX} ${centerY + 40} ${handCardPosition.x} ${handCardPosition.y}`}
              fill="none"
              stroke="rgba(34, 197, 94, 0.9)"
              strokeWidth="5"
              strokeDasharray="12,6"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: phase !== 'highlight' ? 1 : 0, opacity: phase !== 'highlight' ? 1 : 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            />
          </svg>

          {/* Indicador de ação melhorado */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-8 left-1/2 transform -translate-x-1/2 z-[10002]"
          >
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 backdrop-blur-md rounded-xl px-6 py-3 shadow-xl border-2 border-cyan-400">
              <div className="text-white font-bold text-lg flex items-center gap-3">
                <motion.span
                  animate={{ rotate: [0, 180, 360] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="text-2xl"
                >
                  🔄
                </motion.span>
                <div className="flex flex-col">
                  <span>Substituindo Carta</span>
                  <span className="text-xs font-normal text-cyan-100">
                    {playerName} • Carta da mão → Descarte • Carta comprada → Mão
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Efeitos de brilho pulsante no centro */}
          {phase === 'swap' && (
            <>
              <motion.div
                animate={{ 
                  scale: [1, 1.4, 1],
                  opacity: [0.4, 0.8, 0.4]
                }}
                transition={{ 
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{
                  position: 'absolute',
                  left: centerX,
                  top: centerY,
                  x: '-50%',
                  y: '-50%',
                }}
              >
                <div className="w-48 h-48 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 rounded-full blur-3xl" />
              </motion.div>
              {/* Partículas de troca */}
              {[...Array(8)].map((_, i) => {
                const angle = (i * 45) * Math.PI / 180;
                return (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                      x: centerX + Math.cos(angle) * 60 - 4,
                      y: centerY + Math.sin(angle) * 60 - 4,
                    }}
                    transition={{
                      duration: 0.6,
                      delay: 0.2 + (i * 0.05),
                      ease: "easeOut"
                    }}
                    className="absolute w-2 h-2 bg-cyan-400 rounded-full"
                    style={{ zIndex: 10003 }}
                  />
                );
              })}
            </>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
