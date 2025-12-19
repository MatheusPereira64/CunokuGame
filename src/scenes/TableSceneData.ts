import { Player } from '../game/models/Player';
import { Card } from '../game/models/Card';

/**
 * Dados passados para a TableScene
 */
export interface TableSceneData {
  /** Lista de jogadores na partida */
  players: Player[];
  /** ID do jogador atual (ativo) */
  currentPlayerId: string | null;
  /** Número do turno atual */
  turnNumber: number;
  /** Número de cartas no baralho de compra */
  deckCount: number;
  /** Carta do topo da pilha de descarte (null se vazia) */
  discardTopCard: Card | null;
  /** Se está na fase de rodada final */
  isFinalRound: boolean;
}

