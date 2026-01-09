import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { PlayingCard } from "./PlayingCard";
import { Card } from "@shared/schema";

interface CardSwapAnimationProps {
  swapInfo: {
    player1Id: string;
    player1Name: string;
    player1CardIndex: number;
    player2Id: string;
    player2Name: string;
    player2CardIndex: number;
  };
  player1Card?: Card;
  player2Card?: Card;
  player1Position: { x: number; y: number };
  player2Position: { x: number; y: number };
  onComplete: () => void;
}

export function CardSwapAnimation({
  swapInfo,
  player1Card,
  player2Card,
  player1Position,
  player2Position,
  onComplete
}: CardSwapAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  // Valores de movimento usando Framer Motion
  const progress = useMotionValue(0);
  const springProgress = useSpring(progress, {
    stiffness: 100,
    damping: 20,
    mass: 1
  });

  useEffect(() => {
    console.log("[CardSwapAnimation] 🎬 Animação iniciada:", {
      player1: swapInfo.player1Name,
      player2: swapInfo.player2Name,
      pos1: player1Position,
      pos2: player2Position,
      card1: player1Card?.rank,
      card2: player2Card?.rank
    });

    // Anima progress de 0 a 1 usando spring physics
    progress.set(1);

    // Remove após animação completa
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete, swapInfo, player1Position, player2Position, player1Card, player2Card, progress]);

  if (!isVisible || !player1Card || !player2Card) return null;

  // Calcula distância e altura do arco
  const distance = Math.sqrt(
    Math.pow(player2Position.x - player1Position.x, 2) + 
    Math.pow(player2Position.y - player1Position.y, 2)
  );
  const arcHeight = Math.min(distance * 0.5, 250);

  // Posições iniciais e finais
  const start1X = player1Position.x - 48;
  const start1Y = player1Position.y - 68;
  const end1X = player2Position.x - 48;
  const end1Y = player2Position.y - 68;

  const start2X = player2Position.x - 48;
  const start2Y = player2Position.y - 68;
  const end2X = player1Position.x - 48;
  const end2Y = player1Position.y - 68;

  // Transformações usando useTransform para criar arco parabólico
  const card1X = useTransform(springProgress, (p) => {
    return start1X + (end1X - start1X) * p;
  });

  const card1Y = useTransform(springProgress, (p) => {
    const arcProgress = 4 * p * (1 - p); // Parábola: máximo no meio
    return start1Y + (end1Y - start1Y) * p - arcProgress * arcHeight;
  });

  const card2X = useTransform(springProgress, (p) => {
    return start2X + (end2X - start2X) * p;
  });

  const card2Y = useTransform(springProgress, (p) => {
    const arcProgress = 4 * p * (1 - p);
    return start2Y + (end2Y - start2Y) * p - arcProgress * arcHeight;
  });

  const card1Scale = useTransform(springProgress, [0, 0.5, 1], [1, 1.6, 1]);
  const card2Scale = useTransform(springProgress, [0, 0.5, 1], [1, 1.6, 1]);
  
  const card1Rotate = useTransform(springProgress, (p) => p * 360);
  const card2Rotate = useTransform(springProgress, (p) => -p * 360);

  const midX = (player1Position.x + player2Position.x) / 2;
  const midY = (player1Position.y + player2Position.y) / 2;
  const glowY = useTransform(springProgress, (p) => {
    const arcProgress = 4 * p * (1 - p);
    return midY - arcProgress * arcHeight;
  });
  const glowOpacity = useTransform(springProgress, [0, 0.1, 0.9, 1], [0, 0.9, 0.9, 0]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 pointer-events-none z-[9999]" style={{ overflow: 'hidden' }}>
          {/* Overlay escuro */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black"
          />

          {/* Carta do Jogador 1 */}
          <motion.div
            layoutId={`swap-card-${swapInfo.player1Id}-${swapInfo.player1CardIndex}`}
            style={{
              position: 'absolute',
              x: card1X,
              y: card1Y,
              scale: card1Scale,
              rotate: card1Rotate,
              zIndex: 10000,
              filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.8))',
            }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 20,
              mass: 1
            }}
          >
            <PlayingCard card={player1Card} className="w-24 h-36" />
          </motion.div>

          {/* Carta do Jogador 2 */}
          <motion.div
            layoutId={`swap-card-${swapInfo.player2Id}-${swapInfo.player2CardIndex}`}
            style={{
              position: 'absolute',
              x: card2X,
              y: card2Y,
              scale: card2Scale,
              rotate: card2Rotate,
              zIndex: 10000,
              filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.8))',
            }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 20,
              mass: 1
            }}
          >
            <PlayingCard card={player2Card} className="w-24 h-36" />
          </motion.div>

          {/* Linha tracejada do caminho */}
          <svg 
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 9998 }}
          >
            <motion.path
              d={`M ${player1Position.x} ${player1Position.y} Q ${midX} ${midY - arcHeight} ${player2Position.x} ${player2Position.y}`}
              fill="none"
              stroke="rgba(255, 215, 0, 0.7)"
              strokeWidth="4"
              strokeDasharray="15,10"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.8 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          </svg>

          {/* Efeito de brilho no ponto médio */}
          <motion.div
            style={{
              position: 'absolute',
              left: midX,
              top: glowY,
              x: '-50%',
              y: '-50%',
              opacity: glowOpacity,
              zIndex: 9999
            }}
          >
            <div className="w-40 h-40 bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 rounded-full blur-3xl" />
          </motion.div>

          {/* Texto informativo */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ 
              type: "spring",
              stiffness: 200,
              damping: 20,
              delay: 0.2
            }}
            className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[10001]"
          >
            <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 backdrop-blur-md rounded-2xl px-10 py-5 shadow-2xl border-3 border-yellow-300">
              <div className="text-white font-bold text-2xl text-center flex items-center gap-4">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  🔄
                </motion.span>
                <span className="whitespace-nowrap">
                  {swapInfo.player1Name} ↔ {swapInfo.player2Name}
                </span>
                <motion.span
                  animate={{ rotate: -360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  🔄
                </motion.span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
