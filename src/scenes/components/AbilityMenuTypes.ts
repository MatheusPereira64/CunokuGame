import { Card } from '../../game/models/Card';
import { Ability } from '../../game/enums/Ability';
import { Player } from '../../game/models/Player';

/**
 * Estado do menu de habilidades
 */
export interface AbilityMenuState {
  /** Carta que possui a habilidade */
  card: Card;
  /** Tipo de habilidade */
  ability: Ability;
  /** Se o menu está visível */
  visible: boolean;
  /** Etapa atual do processo (para habilidades multi-etapa) */
  step: number;
  /** Dados coletados durante o processo */
  data: Record<string, any>;
}

/**
 * Callbacks para ações do menu
 */
export interface AbilityMenuCallbacks {
  /** Callback quando habilidade é usada com sucesso */
  onSuccess?: (ability: Ability, data: Record<string, any>) => void;
  /** Callback quando há erro */
  onError?: (error: string) => void;
  /** Callback quando menu é fechado */
  onClose?: () => void;
  /** Callback quando ação é cancelada */
  onCancel?: () => void;
}

/**
 * Configurações visuais do menu
 */
export interface AbilityMenuConfig {
  /** Cor de fundo do overlay */
  overlayColor: number;
  /** Opacidade do overlay (0-1) */
  overlayAlpha: number;
  /** Cor do painel */
  panelColor: number;
  /** Cor do texto */
  textColor: number;
  /** Cor de sucesso */
  successColor: number;
  /** Cor de erro */
  errorColor: number;
}

/**
 * Dados para habilidade "Ver Oponente"
 */
export interface SeeOpponentData {
  /** ID do oponente selecionado */
  opponentId: string;
  /** Índice da carta do oponente */
  cardIndex: number;
}

/**
 * Dados para habilidade "Ver Própria"
 */
export interface SeeOwnData {
  /** Índice da carta própria */
  cardIndex: number;
}

/**
 * Dados para habilidade "Trocar Cartas"
 */
export interface SwapCardsData {
  /** ID do primeiro jogador */
  player1Id: string;
  /** Índice da carta do primeiro jogador */
  card1Index: number;
  /** ID do segundo jogador */
  player2Id: string;
  /** Índice da carta do segundo jogador */
  card2Index: number;
}

