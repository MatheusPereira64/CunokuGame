import { Player } from '../models/Player';

/**
 * Informações sobre o turno atual
 */
export interface TurnInfo {
  /** Número do turno atual */
  turnNumber: number;
  /** ID do jogador do turno atual */
  currentPlayerId: string | null;
  /** Jogador do turno atual */
  currentPlayer: Player | null;
  /** Índice do jogador atual na ordem */
  currentPlayerIndex: number;
  /** Número total de jogadores */
  totalPlayers: number;
}

/**
 * Estado de fim de jogo
 */
export interface EndGameState {
  /** Se o fim do jogo foi declarado */
  endGameDeclared: boolean;
  /** ID do jogador que declarou fim */
  declaredBy: string | null;
  /** Número de turnos restantes após declaração */
  turnsRemaining: number | null;
  /** Se está na fase de rodada final */
  isFinalRound: boolean;
}

/**
 * Entrada no ranking
 */
export interface RankingEntry {
  /** Jogador */
  player: Player;
  /** Pontuação do jogador */
  score: number;
  /** Posição no ranking (1 = primeiro lugar) */
  position: number;
}

