// Exporta tipos
export * from './types';

// Exporta componentes de animação
export { CardDrawAnimation } from './CardDrawAnimation';
export { CardDiscardAnimation } from './CardDiscardAnimation';
export { CardReplaceAnimation } from './CardReplaceAnimation';
export { CardSwapAnimation } from './CardSwapAnimation';
export { CardFlipAnimation } from './CardFlipAnimation';
export { CardPeekAnimation } from './CardPeekAnimation';
export { CardPenaltyAnimation } from './CardPenaltyAnimation';
export { CardDealAnimation } from './CardDealAnimation';

// Exporta orquestrador e hooks
export { AnimationOrchestrator } from './AnimationOrchestrator';
export { useAnimationQueue } from './useAnimationQueue';
export { useGameAnimations } from './useGameAnimations';

// Exporta renderizador de animações
export { AnimationRenderer } from './AnimationRenderer';

// Exporta notificações de ações de oponentes
export { OpponentActionNotification } from './OpponentActionNotification';
export type { OpponentActionType } from './OpponentActionNotification';
