import { useEffect, useCallback, useMemo } from 'react';
import { GameState, Card } from '@shared/schema';
import { 
  AnimationEvent, 
  AnimationConfig,
  Position,
  DrawAnimationData,
  DiscardAnimationData,
  ReplaceAnimationData,
  SwapAnimationData,
  PeekAnimationData,
  PenaltyAnimationData,
  DealAnimationData,
} from './types';
import { useAnimationQueue } from './useAnimationQueue';
import { CardDrawAnimation } from './CardDrawAnimation';
import { CardDiscardAnimation } from './CardDiscardAnimation';
import { CardReplaceAnimation } from './CardReplaceAnimation';
import { CardSwapAnimation } from './CardSwapAnimation';
import { CardPeekAnimation } from './CardPeekAnimation';
import { CardPenaltyAnimation } from './CardPenaltyAnimation';
import { CardDealAnimation } from './CardDealAnimation';

interface CardRefs {
  get: (key: string) => Position | undefined;
  getWithCard: (key: string) => { position: Position; card?: Card } | undefined;
}

interface AnimationOrchestratorProps {
  gameState: GameState | null;
  cardRefs: React.MutableRefObject<Map<string, { x: number; y: number; card?: Card }>>;
  deckPosition?: Position;
  discardPosition?: Position;
  config?: Partial<AnimationConfig>;
  onAnimationComplete?: (event: AnimationEvent) => void;
  onAnimationStart?: (event: AnimationEvent) => void;
}

export function AnimationOrchestrator({
  gameState,
  cardRefs,
  deckPosition = { x: 0, y: 0 },
  discardPosition = { x: 0, y: 0 },
  config,
  onAnimationComplete,
  onAnimationStart,
}: AnimationOrchestratorProps) {
  const {
    currentAnimation,
    isPlaying,
    enqueue,
    completeCurrentAnimation,
    getDuration,
    config: fullConfig,
  } = useAnimationQueue({
    config,
    onAnimationStart,
    onAnimationComplete,
  });

  // Helper para obter posição de carta
  const getCardPosition = useCallback((playerId: string, cardIndex: number): Position => {
    const key = `${playerId}_${cardIndex}`;
    const ref = cardRefs.current.get(key);
    if (ref) {
      return { x: ref.x, y: ref.y };
    }
    // Fallback para posição central
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }, [cardRefs]);

  // Helper para obter carta de um jogador
  const getPlayerCard = useCallback((playerId: string, cardIndex: number): Card | undefined => {
    if (!gameState) return undefined;
    const player = gameState.players.find(p => p.id === playerId);
    return player?.hand[cardIndex];
  }, [gameState]);

  // Helper para obter nome de jogador
  const getPlayerName = useCallback((playerId: string): string => {
    if (!gameState) return 'Jogador';
    const player = gameState.players.find(p => p.id === playerId);
    return player?.name ?? 'Jogador';
  }, [gameState]);

  // Funções para enfileirar diferentes tipos de animação
  const queueDrawAnimation = useCallback((
    card: Card,
    source: 'deck' | 'discard',
    playerId: string,
    targetCardIndex: number
  ) => {
    const data: DrawAnimationData = {
      card,
      source,
      sourcePosition: source === 'deck' ? deckPosition : discardPosition,
      targetPosition: getCardPosition(playerId, targetCardIndex),
      playerId,
      playerName: getPlayerName(playerId),
    };

    enqueue({
      type: 'draw',
      data,
      priority: 1,
    });
  }, [deckPosition, discardPosition, getCardPosition, getPlayerName, enqueue]);

  const queueDiscardAnimation = useCallback((
    card: Card,
    discardType: 'drawn' | 'from_hand' | 'matched',
    playerId: string,
    sourceCardIndex: number,
    isSuccess?: boolean
  ) => {
    const data: DiscardAnimationData = {
      card,
      discardType,
      sourcePosition: getCardPosition(playerId, sourceCardIndex),
      targetPosition: discardPosition,
      playerId,
      playerName: getPlayerName(playerId),
      isSuccess,
    };

    enqueue({
      type: 'discard',
      data,
      priority: 2,
    });
  }, [discardPosition, getCardPosition, getPlayerName, enqueue]);

  const queueReplaceAnimation = useCallback((
    drawnCard: Card,
    handCard: Card,
    playerId: string,
    handIndex: number,
    drawnCardPosition: Position
  ) => {
    const data: ReplaceAnimationData = {
      drawnCard,
      handCard,
      drawnCardPosition,
      handCardPosition: getCardPosition(playerId, handIndex),
      discardPosition,
      playerId,
      playerName: getPlayerName(playerId),
      handIndex,
    };

    enqueue({
      type: 'replace',
      data,
      priority: 2,
    });
  }, [discardPosition, getCardPosition, getPlayerName, enqueue]);

  const queueSwapAnimation = useCallback((
    player1Id: string,
    player1CardIndex: number,
    player2Id: string,
    player2CardIndex: number
  ) => {
    const data: SwapAnimationData = {
      player1Id,
      player1Name: getPlayerName(player1Id),
      player1CardIndex,
      player1Card: getPlayerCard(player1Id, player1CardIndex),
      player1Position: getCardPosition(player1Id, player1CardIndex),
      player2Id,
      player2Name: getPlayerName(player2Id),
      player2CardIndex,
      player2Card: getPlayerCard(player2Id, player2CardIndex),
      player2Position: getCardPosition(player2Id, player2CardIndex),
    };

    enqueue({
      type: 'swap',
      data,
      priority: 1,
    });
  }, [getCardPosition, getPlayerName, getPlayerCard, enqueue]);

  const queuePeekAnimation = useCallback((
    card: Card,
    playerId: string,
    cardIndex: number,
    isOwnCard: boolean,
    abilityRank: string
  ) => {
    const data: PeekAnimationData = {
      card,
      cardPosition: getCardPosition(playerId, cardIndex),
      playerId,
      playerName: getPlayerName(playerId),
      cardIndex,
      isOwnCard,
      abilityRank,
    };

    enqueue({
      type: 'peek',
      data,
      priority: 3,
    });
  }, [getCardPosition, getPlayerName, enqueue]);

  const queuePenaltyAnimation = useCallback((
    cards: Card[],
    playerId: string,
    startingIndex: number
  ) => {
    const targetPositions = cards.map((_, i) => 
      getCardPosition(playerId, startingIndex + i)
    );

    const data: PenaltyAnimationData = {
      cards,
      deckPosition,
      targetPositions,
      playerId,
      playerName: getPlayerName(playerId),
    };

    enqueue({
      type: 'penalty',
      data,
      priority: 0, // Alta prioridade
    });
  }, [deckPosition, getCardPosition, getPlayerName, enqueue]);

  const queueDealAnimation = useCallback((
    players: { id: string; name: string; cards: Card[] }[]
  ) => {
    const playersWithPositions = players.map(player => ({
      ...player,
      positions: player.cards.map((_, i) => getCardPosition(player.id, i)),
    }));

    const data: DealAnimationData = {
      players: playersWithPositions,
      deckPosition,
    };

    enqueue({
      type: 'deal',
      data,
      priority: 0,
    });
  }, [deckPosition, getCardPosition, enqueue]);

  // Renderiza a animação atual
  const renderCurrentAnimation = useMemo(() => {
    if (!currentAnimation) return null;

    const duration = getDuration(currentAnimation.type);

    switch (currentAnimation.type) {
      case 'draw':
        return (
          <CardDrawAnimation
            data={currentAnimation.data as DrawAnimationData}
            onComplete={completeCurrentAnimation}
            duration={duration}
          />
        );
      
      case 'discard':
        return (
          <CardDiscardAnimation
            data={currentAnimation.data as DiscardAnimationData}
            onComplete={completeCurrentAnimation}
            duration={duration}
          />
        );
      
      case 'replace':
        return (
          <CardReplaceAnimation
            data={currentAnimation.data as ReplaceAnimationData}
            onComplete={completeCurrentAnimation}
            duration={duration}
          />
        );
      
      case 'swap':
        return (
          <CardSwapAnimation
            data={currentAnimation.data as SwapAnimationData}
            onComplete={completeCurrentAnimation}
            duration={duration}
          />
        );
      
      case 'peek':
        return (
          <CardPeekAnimation
            data={currentAnimation.data as PeekAnimationData}
            onComplete={completeCurrentAnimation}
            duration={duration}
          />
        );
      
      case 'penalty':
        return (
          <CardPenaltyAnimation
            data={currentAnimation.data as PenaltyAnimationData}
            onComplete={completeCurrentAnimation}
            duration={duration}
          />
        );
      
      case 'deal':
        return (
          <CardDealAnimation
            data={currentAnimation.data as DealAnimationData}
            onComplete={completeCurrentAnimation}
            duration={duration}
          />
        );
      
      default:
        return null;
    }
  }, [currentAnimation, completeCurrentAnimation, getDuration]);

  return (
    <>
      {renderCurrentAnimation}
    </>
  );
}

// Hook para usar o orquestrador externamente
export function useAnimationOrchestrator() {
  const queue = useAnimationQueue();
  
  return {
    ...queue,
  };
}
