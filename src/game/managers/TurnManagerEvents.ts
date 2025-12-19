import { Player } from '../models/Player';
import { GameResult } from '../types/GameState';

/**
 * Eventos emitidos pelo TurnManager
 */
export interface TurnManagerEvents {
  /** Turno iniciado para um jogador */
  'turno-iniciado': [playerId: string, turnNumber: number];
  /** Turno finalizado */
  'turno-finalizado': [playerId: string];
  /** Fim do jogo declarado */
  'fim-declarado': [playerId: string, turnsRemaining: number];
  /** Rodada final completada */
  'rodada-final-completa': [];
  /** Partida finalizada */
  'partida-finalizada': [result: GameResult];
}

