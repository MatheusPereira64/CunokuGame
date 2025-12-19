import { Player } from '../../game/models/Player';
import { BotDifficulty } from '../../game/ai/BotPlayer';

/**
 * Dados para transição entre cenas
 */
export interface SceneTransitionData {
  /** Tipo de transição */
  type: 'fade' | 'slide' | 'instant';
  /** Duração da transição em ms */
  duration?: number;
}

/**
 * Dados para BotSetupScene
 */
export interface BotSetupData {
  /** Nome do jogador humano */
  playerName?: string;
  /** Número de bots (1-5) */
  numBots?: number;
  /** Dificuldade dos bots */
  botDifficulty?: BotDifficulty;
}

/**
 * Dados para TableScene
 */
export interface GameStartData {
  /** Lista de jogadores */
  players: Player[];
  /** ID do jogador humano */
  humanPlayerId: string;
  /** Configurações da partida */
  gameConfig?: {
    numBots: number;
    botDifficulty: BotDifficulty;
  };
}

