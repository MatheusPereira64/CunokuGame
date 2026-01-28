import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { PlayingCard } from "../PlayingCard";
import { DealAnimationData, BaseAnimationProps, DEFAULT_DURATIONS } from "./types";

interface CardDealAnimationProps extends BaseAnimationProps {
  data: DealAnimationData;
}

interface DealingCard {
  playerId: string;
  playerName: string;
  cardIndex: number;
  targetPosition: { x: number; y: number };
  delay: number;
}

export function CardDealAnimation({
  data,
  onComplete,
  duration = DEFAULT_DURATIONS.deal // Por carta
}: CardDealAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [dealtCards, setDealtCards] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<'dealing' | 'complete'>('dealing');

  const { players, deckPosition } = data;

  // Cria a sequência de cartas a serem distribuídas
  // Distribui uma carta para cada jogador por vez (round-robin)
  const dealingSequence = useMemo(() => {
    const sequence: DealingCard[] = [];
    const maxCards = Math.max(...players.map(p => p.cards.length));
    
    let cardNumber = 0;
    for (let cardIndex = 0; cardIndex < maxCards; cardIndex++) {
      for (const player of players) {
        if (cardIndex < player.cards.length && cardIndex < player.positions.length) {
          sequence.push({
            playerId: player.id,
            playerName: player.name,
            cardIndex,
            targetPosition: player.positions[cardIndex],
            delay: cardNumber * duration,
          });
          cardNumber++;
        }
      }
    }
    
    return sequence;
  }, [players, duration]);

  const totalDuration = dealingSequence.length * duration + 500; // +500ms buffer

  useEffect(() => {
    // Distribui cada carta em sequência
    const timers = dealingSequence.map((card, index) => {
      return setTimeout(() => {
        setDealtCards(prev => new Set([...prev, `${card.playerId}_${card.cardIndex}`]));
      }, card.delay);
    });

    // Completa a animação
    const completeTimer = setTimeout(() => {
      setPhase('complete');
      setIsVisible(false);
      setTimeout(onComplete, 100);
    }, totalDuration);

    return () => {
      timers.forEach(t => clearTimeout(t));
      clearTimeout(completeTimer);
    };
  }, [dealingSequence, totalDuration, onComplete]);

  if (!isVisible) return null;

  // Agrupa jogadores para mostrar progresso
  const dealtCardsArray = Array.from(dealtCards);
  const playerProgress = players.map(player => ({
    name: player.name,
    total: player.cards.length,
    dealt: dealtCardsArray.filter(key => key.startsWith(player.id)).length,
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          {/* Overlay suave */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black"
          />

          {/* Cartas sendo distribuídas */}
          {dealingSequence.map((dealCard, index) => {
            const cardKey = `${dealCard.playerId}_${dealCard.cardIndex}`;
            const isDealt = dealtCards.has(cardKey);
            
            // Calcula arco para a animação
            const midX = (deckPosition.x + dealCard.targetPosition.x) / 2;
            const midY = Math.min(deckPosition.y, dealCard.targetPosition.y) - 80;

            return (
              <motion.div
                key={cardKey}
                initial={{
                  x: deckPosition.x - 48,
                  y: deckPosition.y - 68,
                  scale: 0.8,
                  opacity: 0,
                  rotate: 0,
                }}
                animate={isDealt ? {
                  x: [deckPosition.x - 48, midX - 48, dealCard.targetPosition.x - 48],
                  y: [deckPosition.y - 68, midY - 68, dealCard.targetPosition.y - 68],
                  scale: [0.8, 1.1, 1],
                  opacity: [0, 1, 1],
                  rotate: [0, 15, 0],
                } : {}}
                transition={{
                  duration: duration / 1000 * 0.8,
                  ease: "easeOut",
                  times: [0, 0.4, 1],
                }}
                style={{
                  position: 'absolute',
                  zIndex: 10000 + index,
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.4))',
                }}
              >
                <PlayingCard card={undefined} hidden={true} className="w-24 h-36" animate={false} />
              </motion.div>
            );
          })}

          {/* Indicador de distribuição */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[10001]"
          >
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 backdrop-blur-md rounded-xl px-8 py-4 shadow-xl">
              <div className="text-white font-bold text-xl text-center mb-2">
                🃏 Distribuindo Cartas
              </div>
              
              {/* Progresso por jogador */}
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {playerProgress.map((player, index) => (
                  <div key={index} className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
                    <span className="text-white/90 text-sm">{player.name}</span>
                    <span className="text-emerald-200 font-mono text-sm">
                      {player.dealt}/{player.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Efeito de brilho no deck */}
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ 
              duration: 0.3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              position: 'absolute',
              left: deckPosition.x,
              top: deckPosition.y,
              x: '-50%',
              y: '-50%',
            }}
          >
            <div className="w-28 h-28 bg-emerald-400 rounded-full blur-xl" />
          </motion.div>

          {/* Contador total de cartas distribuídas */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[10001]"
          >
            <div className="bg-white/90 text-emerald-700 font-bold text-2xl px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
              <span>{dealtCards.size}</span>
              <span className="text-emerald-500">/</span>
              <span className="text-emerald-600">{dealingSequence.length}</span>
              <span className="text-sm font-normal text-emerald-600 ml-1">cartas</span>
            </div>
          </motion.div>

          {/* Linhas de conexão para cada jogador */}
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 9998 }}>
            {players.map((player, playerIndex) => {
              // Calcula posição média das cartas do jogador
              const avgX = player.positions.reduce((sum, p) => sum + p.x, 0) / player.positions.length;
              const avgY = player.positions.reduce((sum, p) => sum + p.y, 0) / player.positions.length;
              const midX = (deckPosition.x + avgX) / 2;
              const midY = Math.min(deckPosition.y, avgY) - 60;

              return (
                <motion.path
                  key={playerIndex}
                  d={`M ${deckPosition.x} ${deckPosition.y} Q ${midX} ${midY} ${avgX} ${avgY}`}
                  fill="none"
                  stroke={`rgba(52, 211, 153, ${0.3 + (playerIndex * 0.1)})`}
                  strokeWidth="2"
                  strokeDasharray="8,4"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.5 }}
                  transition={{ duration: 0.5, delay: playerIndex * 0.1 }}
                />
              );
            })}
          </svg>
        </div>
      )}
    </AnimatePresence>
  );
}
