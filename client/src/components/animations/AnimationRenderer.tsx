import { useMemo } from 'react';
import { 
  AnimationEvent,
  DrawAnimationData,
  DiscardAnimationData,
  ReplaceAnimationData,
  SwapAnimationData,
  PeekAnimationData,
  PenaltyAnimationData,
  DealAnimationData,
  getAnimationDuration,
  AnimationConfig,
} from './types';
import { CardDrawAnimation } from './CardDrawAnimation';
import { CardDiscardAnimation } from './CardDiscardAnimation';
import { CardReplaceAnimation } from './CardReplaceAnimation';
import { CardSwapAnimation } from './CardSwapAnimation';
import { CardPeekAnimation } from './CardPeekAnimation';
import { CardPenaltyAnimation } from './CardPenaltyAnimation';
import { CardDealAnimation } from './CardDealAnimation';

interface AnimationRendererProps {
  currentAnimation: AnimationEvent | null;
  onComplete: () => void;
  config?: AnimationConfig;
  playerId?: string; // ID do jogador atual para verificar se é dono da ação
}

const DEFAULT_CONFIG: AnimationConfig = {
  enabled: true,
  reducedMotion: false,
  speed: 'normal',
  soundEnabled: true,
};

/**
 * Componente que renderiza a animação atual baseada no tipo.
 * Use este componente em conjunto com useGameAnimations.
 * 
 * @example
 * ```tsx
 * const { currentAnimation, completeCurrentAnimation } = useGameAnimations({
 *   gameState,
 *   playerId,
 * });
 * 
 * return (
 *   <>
 *     <AnimationRenderer
 *       currentAnimation={currentAnimation}
 *       onComplete={completeCurrentAnimation}
 *     />
 *     {/ * resto do jogo * /}
 *   </>
 * );
 * ```
 */
export function AnimationRenderer({
  currentAnimation,
  onComplete,
  config = DEFAULT_CONFIG,
  playerId,
}: AnimationRendererProps) {
  const renderedAnimation = useMemo(() => {
    if (!currentAnimation || !config.enabled) return null;

    const duration = getAnimationDuration(currentAnimation.type, config);
    
    // Se reduced motion ou duração 0, completa imediatamente
    if (config.reducedMotion || duration === 0) {
      // Usa setTimeout para evitar chamada síncrona no render
      setTimeout(onComplete, 0);
      return null;
    }

    // Determina se é o jogador atual baseado no playerId da animação
    const isOwnPlayer = playerId ? 
      (currentAnimation.data as any).playerId === playerId : 
      false;

    switch (currentAnimation.type) {
      case 'draw':
        return (
          <CardDrawAnimation
            data={currentAnimation.data as DrawAnimationData}
            onComplete={onComplete}
            duration={duration}
            isOwnPlayer={isOwnPlayer}
          />
        );
      
      case 'discard':
        const discardData = currentAnimation.data as DiscardAnimationData;
        const isOwnPlayerDiscard = playerId ? discardData.playerId === playerId : false;
        return (
          <CardDiscardAnimation
            data={discardData}
            onComplete={onComplete}
            duration={duration}
            isOwnPlayer={isOwnPlayerDiscard}
          />
        );
      
      case 'replace':
        return (
          <CardReplaceAnimation
            data={currentAnimation.data as ReplaceAnimationData}
            onComplete={onComplete}
            duration={duration}
            isOwnPlayer={isOwnPlayer}
          />
        );
      
      case 'swap':
        return (
          <CardSwapAnimation
            data={currentAnimation.data as SwapAnimationData}
            onComplete={onComplete}
            duration={duration}
          />
        );
      
      case 'peek':
        return (
          <CardPeekAnimation
            data={currentAnimation.data as PeekAnimationData}
            onComplete={onComplete}
            duration={duration}
          />
        );
      
      case 'penalty':
        return (
          <CardPenaltyAnimation
            data={currentAnimation.data as PenaltyAnimationData}
            onComplete={onComplete}
            duration={duration}
          />
        );
      
      case 'deal':
        return (
          <CardDealAnimation
            data={currentAnimation.data as DealAnimationData}
            onComplete={onComplete}
            duration={duration}
          />
        );
      
      default:
        return null;
    }
  }, [currentAnimation, onComplete, config, playerId]);

  return <>{renderedAnimation}</>;
}
