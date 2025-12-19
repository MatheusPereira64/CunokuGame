/**
 * Barrel exports para o engine do jogo
 * Facilita imports de múltiplos componentes do engine
 */

export { RulesEngine } from './RulesEngine';
export type { RulesEngineEvents } from './RulesEngineEvents';

// Validators
export { TurnValidator } from './validators/TurnValidator';
export { ActionValidator } from './validators/ActionValidator';
export { AbilityValidator } from './validators/AbilityValidator';

