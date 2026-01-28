import { useRef, useCallback, useState, useEffect } from 'react';
import { GameState, Card } from '@shared/schema';
import { 
  Position, 
  AnimationEvent,
  DrawAnimationData,
  DiscardAnimationData,
  ReplaceAnimationData,
  SwapAnimationData,
  PeekAnimationData,
  PenaltyAnimationData,
  DealAnimationData,
  AnimationConfig,
  generateAnimationId,
} from './types';
import { useAnimationQueue } from './useAnimationQueue';

interface UseGameAnimationsOptions {
  gameState: GameState | null;
  playerId: string;
  config?: Partial<AnimationConfig>;
  onAnimationComplete?: (type: string) => void;
  cardRefs?: React.MutableRefObject<Map<string, { x: number; y: number; card?: Card }>>; // Permite passar cardRefs externo
}

interface CardRefData {
  x: number;
  y: number;
  card?: Card;
}

export function useGameAnimations({
  gameState,
  playerId,
  config,
  onAnimationComplete,
  cardRefs: externalCardRefs,
}: UseGameAnimationsOptions) {
  // Refs para posições de elementos
  const internalCardRefs = useRef<Map<string, CardRefData>>(new Map());
  const cardRefs = externalCardRefs || internalCardRefs; // Usa externo se fornecido
  const deckRef = useRef<HTMLDivElement>(null);
  const discardRef = useRef<HTMLDivElement>(null);
  
  // Estado anterior do jogo para detectar mudanças
  const previousGameState = useRef<GameState | null>(null);
  
  // Fila de animações
  const {
    currentAnimation,
    isPlaying,
    enqueue,
    completeCurrentAnimation,
    clearQueue,
    getDuration,
    config: fullConfig,
  } = useAnimationQueue({
    config,
    onAnimationComplete: (event) => onAnimationComplete?.(event.type),
  });

  // Atualiza referência para posição de uma carta
  const registerCardRef = useCallback((key: string, element: HTMLElement | null, card?: Card) => {
    if (element) {
      const rect = element.getBoundingClientRect();
      cardRefs.current.set(key, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        card,
      });
    } else {
      cardRefs.current.delete(key);
    }
  }, []);

  // Obtém posição do deck
  const getDeckPosition = useCallback((): Position => {
    if (deckRef.current) {
      const rect = deckRef.current.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }, []);

  // Obtém posição do descarte
  const getDiscardPosition = useCallback((): Position => {
    if (discardRef.current) {
      const rect = discardRef.current.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }, []);

  // Obtém posição de uma carta
  const getCardPosition = useCallback((playerIdArg: string, cardIndex: number): Position => {
    const key = `${playerIdArg}_${cardIndex}`;
    const ref = cardRefs.current.get(key);
    if (ref) {
      return { x: ref.x, y: ref.y };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }, []);

  // Obtém nome de jogador
  const getPlayerName = useCallback((playerIdArg: string): string => {
    if (!gameState) return 'Jogador';
    const player = gameState.players.find(p => p.id === playerIdArg);
    return player?.name ?? 'Jogador';
  }, [gameState]);

  // Obtém carta de um jogador
  const getPlayerCard = useCallback((playerIdArg: string, cardIndex: number): Card | undefined => {
    if (!gameState) return undefined;
    const player = gameState.players.find(p => p.id === playerIdArg);
    return player?.hand[cardIndex];
  }, [gameState]);

  // ============================================
  // FUNÇÕES PARA ENFILEIRAR ANIMAÇÕES
  // ============================================

  // Animação de compra de carta
  const animateDraw = useCallback((
    card: Card,
    source: 'deck' | 'discard',
    targetPlayerIdArg?: string,
    targetCardIndex?: number
  ) => {
    const targetPlayer = targetPlayerIdArg ?? playerId;
    const cardIndex = targetCardIndex ?? 0;
    
    const data: DrawAnimationData = {
      card,
      source,
      sourcePosition: source === 'deck' ? getDeckPosition() : getDiscardPosition(),
      targetPosition: getCardPosition(targetPlayer, cardIndex),
      playerId: targetPlayer,
      playerName: getPlayerName(targetPlayer),
    };

    enqueue({
      type: 'draw',
      data,
      priority: 1,
    });
  }, [playerId, getDeckPosition, getDiscardPosition, getCardPosition, getPlayerName, enqueue]);

  // Animação de descarte
  const animateDiscard = useCallback((
    card: Card,
    discardType: 'drawn' | 'from_hand' | 'matched',
    sourcePlayerIdArg?: string,
    sourceCardIndex?: number,
    isSuccess?: boolean
  ) => {
    const sourcePlayer = sourcePlayerIdArg ?? playerId;
    const cardIndex = sourceCardIndex ?? 0;
    
    const data: DiscardAnimationData = {
      card,
      discardType,
      sourcePosition: discardType === 'drawn' 
        ? getDeckPosition() // Carta comprada vem do centro
        : getCardPosition(sourcePlayer, cardIndex),
      targetPosition: getDiscardPosition(),
      playerId: sourcePlayer,
      playerName: getPlayerName(sourcePlayer),
      isSuccess,
    };

    enqueue({
      type: 'discard',
      data,
      priority: 2,
    });
  }, [playerId, getDeckPosition, getDiscardPosition, getCardPosition, getPlayerName, enqueue]);

  // Animação de substituição
  const animateReplace = useCallback((
    drawnCard: Card,
    handCard: Card,
    handIndex: number,
    targetPlayerIdArg?: string
  ) => {
    const targetPlayer = targetPlayerIdArg ?? playerId;
    
    const data: ReplaceAnimationData = {
      drawnCard,
      handCard,
      drawnCardPosition: getDeckPosition(), // Posição central onde a carta comprada está
      handCardPosition: getCardPosition(targetPlayer, handIndex),
      discardPosition: getDiscardPosition(),
      playerId: targetPlayer,
      playerName: getPlayerName(targetPlayer),
      handIndex,
    };

    enqueue({
      type: 'replace',
      data,
      priority: 2,
    });
  }, [playerId, getDeckPosition, getDiscardPosition, getCardPosition, getPlayerName, enqueue]);

  // Animação de troca
  const animateSwap = useCallback((
    player1IdArg: string,
    player1CardIndex: number,
    player2IdArg: string,
    player2CardIndex: number,
    player1Card?: Card,
    player2Card?: Card
  ) => {
    const data: SwapAnimationData = {
      player1Id: player1IdArg,
      player1Name: getPlayerName(player1IdArg),
      player1CardIndex,
      player1Card: player1Card ?? getPlayerCard(player1IdArg, player1CardIndex),
      player1Position: getCardPosition(player1IdArg, player1CardIndex),
      player2Id: player2IdArg,
      player2Name: getPlayerName(player2IdArg),
      player2CardIndex,
      player2Card: player2Card ?? getPlayerCard(player2IdArg, player2CardIndex),
      player2Position: getCardPosition(player2IdArg, player2CardIndex),
    };

    enqueue({
      type: 'swap',
      data,
      priority: 1,
    });
  }, [getCardPosition, getPlayerName, getPlayerCard, enqueue]);

  // Animação de espiar
  const animatePeek = useCallback((
    card: Card,
    targetPlayerIdArg: string,
    cardIndex: number,
    abilityRank: string
  ) => {
    const isOwnCard = targetPlayerIdArg === playerId;
    
    const data: PeekAnimationData = {
      card,
      cardPosition: getCardPosition(targetPlayerIdArg, cardIndex),
      playerId: targetPlayerIdArg,
      playerName: getPlayerName(targetPlayerIdArg),
      cardIndex,
      isOwnCard,
      abilityRank,
    };

    enqueue({
      type: 'peek',
      data,
      priority: 3,
    });
  }, [playerId, getCardPosition, getPlayerName, enqueue]);

  // Animação de penalidade
  const animatePenalty = useCallback((
    cards: Card[],
    targetPlayerIdArg?: string,
    startingIndex?: number
  ) => {
    const targetPlayer = targetPlayerIdArg ?? playerId;
    const startIdx = startingIndex ?? 0;
    
    const targetPositions = cards.map((_, i) => 
      getCardPosition(targetPlayer, startIdx + i)
    );

    const data: PenaltyAnimationData = {
      cards,
      deckPosition: getDeckPosition(),
      targetPositions,
      playerId: targetPlayer,
      playerName: getPlayerName(targetPlayer),
    };

    enqueue({
      type: 'penalty',
      data,
      priority: 0,
    });
  }, [playerId, getDeckPosition, getCardPosition, getPlayerName, enqueue]);

  // Animação de distribuição inicial
  const animateDeal = useCallback(() => {
    if (!gameState) return;
    
    const players = gameState.players.map(player => ({
      id: player.id,
      name: player.name,
      cards: player.hand,
      positions: player.hand.map((_, i) => getCardPosition(player.id, i)),
    }));

    const data: DealAnimationData = {
      players,
      deckPosition: getDeckPosition(),
    };

    enqueue({
      type: 'deal',
      data,
      priority: 0,
    });
  }, [gameState, getDeckPosition, getCardPosition, enqueue]);

  // Atualiza estado anterior
  useEffect(() => {
    if (gameState) {
      previousGameState.current = JSON.parse(JSON.stringify(gameState));
    }
  }, [gameState]);

  return {
    // Refs para elementos
    cardRefs,
    deckRef,
    discardRef,
    registerCardRef,
    
    // Estado da animação
    currentAnimation,
    isPlaying,
    
    // Funções de animação
    animateDraw,
    animateDiscard,
    animateReplace,
    animateSwap,
    animatePeek,
    animatePenalty,
    animateDeal,
    
    // Controles
    completeCurrentAnimation,
    clearQueue,
    getDuration,
    
    // Config
    config: fullConfig,
    
    // Estado anterior (útil para comparações)
    previousGameState,
  };
}
