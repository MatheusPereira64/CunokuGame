import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { PlayingCard } from "../PlayingCard";
import { PeekAnimationData, BaseAnimationProps, DEFAULT_DURATIONS } from "./types";

interface CardPeekAnimationProps extends BaseAnimationProps {
  data: PeekAnimationData;
}

export function CardPeekAnimation({
  data,
  onComplete,
  duration = DEFAULT_DURATIONS.peek
}: CardPeekAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [phase, setPhase] = useState<'lifting' | 'revealing' | 'showing' | 'hiding' | 'returning'>('lifting');

  const { 
    card, 
    cardPosition, 
    playerName, 
    isOwnCard,
    abilityRank 
  } = data;

  useEffect(() => {
    // Fase 1: Carta levanta
    const liftTimer = setTimeout(() => {
      setPhase('revealing');
    }, duration * 0.1);

    // Fase 2: Carta faz flip
    const revealTimer = setTimeout(() => {
      setPhase('showing');
    }, duration * 0.25);

    // Fase 3: Mostra carta
    const showTimer = setTimeout(() => {
      setPhase('hiding');
    }, duration * 0.7);

    // Fase 4: Carta esconde
    const hideTimer = setTimeout(() => {
      setPhase('returning');
    }, duration * 0.85);

    // Fase 5: Completa
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 100);
    }, duration);

    return () => {
      clearTimeout(liftTimer);
      clearTimeout(revealTimer);
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  // Determina se mostra a carta ou não
  const showFront = phase === 'showing' || phase === 'hiding';
  
  // Calcula rotação Y para o flip
  const getRotateY = () => {
    switch (phase) {
      case 'lifting': return 180;
      case 'revealing': return 90;
      case 'showing': return 0;
      case 'hiding': return 90;
      case 'returning': return 180;
      default: return 180;
    }
  };

  // Calcula posição Y
  const getYOffset = () => {
    switch (phase) {
      case 'lifting': return -30;
      case 'revealing': return -60;
      case 'showing': return -80;
      case 'hiding': return -60;
      case 'returning': return -30;
      default: return 0;
    }
  };

  // Calcula escala (maior para melhor visibilidade)
  const getScale = () => {
    switch (phase) {
      case 'showing': return 1.6; // Maior para destacar mais
      case 'revealing':
      case 'hiding': return 1.3;
      default: return 1.1;
    }
  };

  // Texto baseado na habilidade
  const getAbilityText = () => {
    if (isOwnCard) {
      return `Espiando própria carta (${abilityRank})`;
    }
    return `Espiando carta de ${playerName} (${abilityRank})`;
  };

  // Cor baseada no tipo
  const gradientColor = isOwnCard 
    ? 'from-indigo-500 to-purple-600' 
    : 'from-amber-500 to-orange-600';

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'showing' ? 0.4 : 0.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black"
          />

          {/* Container da carta com perspectiva */}
          <div 
            className="absolute"
            style={{ 
              left: cardPosition.x - 48,
              top: cardPosition.y - 68,
              perspective: '1000px',
            }}
          >
            <motion.div
              animate={{
                y: getYOffset(),
                scale: getScale(),
                rotateY: getRotateY(),
              }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 20,
              }}
              style={{
                transformStyle: 'preserve-3d',
                zIndex: 10000,
                filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.6))',
              }}
            >
              {/* Frente da carta */}
              <motion.div
                animate={{
                  opacity: showFront ? 1 : 0,
                }}
                transition={{ duration: 0.15 }}
                style={{
                  backfaceVisibility: 'hidden',
                  position: 'absolute',
                }}
              >
                <PlayingCard card={card} hidden={false} className="w-24 h-36" animate={false} />
              </motion.div>

              {/* Verso da carta */}
              <motion.div
                animate={{
                  opacity: showFront ? 0 : 1,
                  rotateY: 180,
                }}
                transition={{ duration: 0.15 }}
                style={{
                  backfaceVisibility: 'hidden',
                }}
              >
                <PlayingCard card={undefined} hidden={true} className="w-24 h-36" animate={false} />
              </motion.div>
            </motion.div>
          </div>

          {/* Indicador de ação melhorado */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-8 left-1/2 transform -translate-x-1/2 z-[10001]"
          >
            <div className={`bg-gradient-to-r ${gradientColor} backdrop-blur-md rounded-xl px-6 py-3 shadow-xl border-2 ${
              isOwnCard ? 'border-purple-400' : 'border-amber-400'
            }`}>
              <div className="text-white font-bold text-lg flex items-center gap-3">
                <motion.div
                  animate={{ 
                    scale: phase === 'showing' ? [1, 1.3, 1] : 1,
                    rotate: phase === 'showing' ? [0, 10, -10, 0] : 0,
                  }}
                  transition={{ 
                    duration: 0.6, 
                    repeat: phase === 'showing' ? Infinity : 0,
                    repeatDelay: 0.4
                  }}
                >
                  {phase === 'showing' ? (
                    <Eye className="w-7 h-7" />
                  ) : (
                    <EyeOff className="w-6 h-6" />
                  )}
                </motion.div>
                <div className="flex flex-col">
                  <span>{getAbilityText()}</span>
                  {phase === 'showing' && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs font-normal text-white/80"
                    >
                      Carta revelada!
                    </motion.span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Efeito de brilho pulsante ao redor da carta */}
          {phase === 'showing' && (
            <>
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 0.8, 0.4]
                }}
                transition={{ 
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{
                  position: 'absolute',
                  left: cardPosition.x,
                  top: cardPosition.y - 40,
                  x: '-50%',
                  y: '-50%',
                }}
              >
                <div className={`w-48 h-56 rounded-2xl blur-2xl ${
                  isOwnCard ? 'bg-purple-400' : 'bg-amber-400'
                }`} />
              </motion.div>
              {/* Anel de destaque */}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.6, 1, 0.6]
                }}
                transition={{ 
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{
                  position: 'absolute',
                  left: cardPosition.x,
                  top: cardPosition.y - 40,
                  x: '-50%',
                  y: '-50%',
                  border: `3px solid ${isOwnCard ? 'rgba(168, 85, 247, 0.8)' : 'rgba(251, 191, 36, 0.8)'}`,
                  borderRadius: '16px',
                  width: '120px',
                  height: '168px',
                }}
              />
            </>
          )}

          {/* Ícone de olho flutuante */}
          {phase === 'showing' && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                y: [0, -10, 0],
              }}
              transition={{
                y: { duration: 1, repeat: Infinity, ease: "easeInOut" }
              }}
              style={{
                position: 'absolute',
                left: cardPosition.x + 60,
                top: cardPosition.y - 100,
              }}
            >
              <div className="bg-white/90 rounded-full p-2 shadow-lg">
                <Eye className={`w-5 h-5 ${isOwnCard ? 'text-purple-600' : 'text-amber-600'}`} />
              </div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
