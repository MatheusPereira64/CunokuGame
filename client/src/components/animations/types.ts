import { Card } from "@shared/schema";

// Posição 2D para animações
export interface Position {
  x: number;
  y: number;
}

// Tipos de animação disponíveis
export type AnimationType = 
  | 'draw'
  | 'discard'
  | 'replace'
  | 'swap'
  | 'peek'
  | 'penalty'
  | 'deal';

// Fonte da compra de carta
export type DrawSource = 'deck' | 'discard';

// Tipo de descarte
export type DiscardType = 'drawn' | 'from_hand' | 'matched';

// Dados base para todas as animações
export interface BaseAnimationProps {
  onComplete: () => void;
  duration?: number;
}

// Dados para animação de compra
export interface DrawAnimationData {
  card: Card;
  source: DrawSource;
  sourcePosition: Position;
  targetPosition: Position;
  playerId: string;
  playerName: string;
}

// Dados para animação de descarte
export interface DiscardAnimationData {
  card: Card;
  discardType: DiscardType;
  sourcePosition: Position;
  targetPosition: Position; // Posição da pilha de descarte
  playerId: string;
  playerName: string;
  isSuccess?: boolean; // Para matched_discard bem sucedido
}

// Dados para animação de substituição
export interface ReplaceAnimationData {
  drawnCard: Card;
  handCard: Card;
  drawnCardPosition: Position; // Onde a carta comprada está
  handCardPosition: Position;   // Onde a carta da mão está
  discardPosition: Position;    // Pilha de descarte
  playerId: string;
  playerName: string;
  handIndex: number;
}

// Dados para animação de troca
export interface SwapAnimationData {
  player1Id: string;
  player1Name: string;
  player1CardIndex: number;
  player1Card?: Card;
  player1Position: Position;
  player2Id: string;
  player2Name: string;
  player2CardIndex: number;
  player2Card?: Card;
  player2Position: Position;
}

// Dados para animação de espiar
export interface PeekAnimationData {
  card: Card;
  cardPosition: Position;
  playerId: string;
  playerName: string;
  cardIndex: number;
  isOwnCard: boolean; // Se é carta própria ou de oponente
  abilityRank: string; // 5, 6, 7 ou 8
}

// Dados para animação de penalidade
export interface PenaltyAnimationData {
  cards: Card[];
  deckPosition: Position;
  targetPositions: Position[];
  playerId: string;
  playerName: string;
}

// Dados para animação de distribuição inicial
export interface DealAnimationData {
  players: {
    id: string;
    name: string;
    cards: Card[];
    positions: Position[];
  }[];
  deckPosition: Position;
}

// Evento de animação para o orquestrador
export interface AnimationEvent {
  id: string;
  type: AnimationType;
  data: 
    | DrawAnimationData 
    | DiscardAnimationData 
    | ReplaceAnimationData 
    | SwapAnimationData 
    | PeekAnimationData 
    | PenaltyAnimationData 
    | DealAnimationData;
  priority?: number; // Menor = maior prioridade
  onComplete?: () => void;
}

// Estado do orquestrador de animações
export interface AnimationOrchestratorState {
  currentAnimation: AnimationEvent | null;
  queue: AnimationEvent[];
  isPlaying: boolean;
}

// Configuração de animação (para ajustes de performance/preferências)
export interface AnimationConfig {
  enabled: boolean;
  reducedMotion: boolean;
  speed: 'slow' | 'normal' | 'fast';
  soundEnabled: boolean;
}

// Durações padrão para cada tipo de animação (em ms)
export const DEFAULT_DURATIONS: Record<AnimationType, number> = {
  draw: 500,
  discard: 400,
  replace: 600,
  swap: 2000,
  peek: 1500,
  penalty: 1000,
  deal: 300, // Por carta
};

// Multiplicadores de velocidade
export const SPEED_MULTIPLIERS: Record<AnimationConfig['speed'], number> = {
  slow: 1.5,
  normal: 1,
  fast: 0.6,
};

// Helper para calcular duração com base na config
export function getAnimationDuration(
  type: AnimationType, 
  config: AnimationConfig
): number {
  if (!config.enabled || config.reducedMotion) {
    return 0;
  }
  return DEFAULT_DURATIONS[type] * SPEED_MULTIPLIERS[config.speed];
}

// Helper para gerar ID único para animações
export function generateAnimationId(): string {
  return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
