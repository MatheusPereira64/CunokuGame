/**
 * Barrel exports para managers do jogo
 * Facilita imports de múltiplos managers
 */

export { DeckManager } from './DeckManager';
export type { DeckManagerEvents } from './DeckManager';

export { TurnManager } from './TurnManager';
export type { TurnManagerEvents } from './TurnManagerEvents';
export type { TurnInfo, EndGameState, RankingEntry } from './TurnManagerTypes';

