/**
 * Tipos de ações que um jogador pode realizar no jogo
 */
export enum ActionType {
  /** Comprar carta do baralho (obrigatório no início do turno) */
  BUY_CARD = 'BUY_CARD',
  /** Usar habilidade de uma carta */
  USE_ABILITY = 'USE_ABILITY',
  /** Substituir carta da mão pela carta comprada */
  REPLACE_CARD = 'REPLACE_CARD',
  /** Descartar carta (comprada ou da mão) */
  DISCARD = 'DISCARD',
  /** Descartar carta em reação (descarte encadeado) */
  REACTION_DISCARD = 'REACTION_DISCARD',
  /** Declarar fim do jogo */
  DECLARE_END = 'DECLARE_END',
}

