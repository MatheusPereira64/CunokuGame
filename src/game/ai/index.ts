/**
 * Barrel exports para sistema de IA
 * Facilita imports de componentes de IA
 */

export { BotPlayer } from './BotPlayer';
export { BotDifficulty } from './BotPlayer';
export type { IAgent, AIDecision } from './IAgent';
export { ImperfectMemory } from './memory';
export type { CardMemory } from './memory';

// Heurísticas
export {
  avaliarCarta,
  escolherCartaParaDescartar,
  deveSubstituirCarta,
  escolherCartaParaSubstituir,
  deveUsarHabilidade,
  escolherOponente,
  escolherCartaOponente,
  escolherCartaPropria,
  escolherTrocaCartas,
  deveDeclararFim,
} from './heuristics';

