import { Card } from '../models/Card';
import { Player } from '../models/Player';
import { Ability } from '../enums/Ability';

/**
 * Interface para agentes de IA
 * Define métodos que bots devem implementar para tomar decisões
 */
export interface IAgent {
  /**
   * Decide qual ação tomar no turno atual
   */
  decidirAcao(
    cartaComprada: Card | null,
    mao: Card[],
    outrosJogadores: Player[],
    turnoAtual: number
  ): AIDecision;

  /**
   * Escolhe índice de carta para descartar
   */
  escolherCartaParaDescartar(mao: Card[]): number;

  /**
   * Decide se deve substituir carta
   */
  deveSubstituirCarta(cartaComprada: Card, mao: Card[]): boolean;

  /**
   * Escolhe índice da carta a ser substituída
   */
  escolherCartaParaSubstituir(cartaComprada: Card, mao: Card[]): number;

  /**
   * Decide se deve usar habilidade
   */
  deveUsarHabilidade(carta: Card, mao: Card[], turnoAtual?: number): boolean;

  /**
   * Escolhe oponente para habilidade "Ver Oponente"
   */
  escolherOponente(outrosJogadores: Player[]): string | null;

  /**
   * Escolhe índice de carta do oponente para ver
   */
  escolherCartaOponente(opponent: Player): number;

  /**
   * Escolhe índice de carta própria para ver
   */
  escolherCartaPropria(mao: Card[]): number;

  /**
   * Escolhe jogadores e cartas para trocar
   */
  escolherTrocaCartas(
    outrosJogadores: Player[],
    mao: Card[]
  ): { player1Id: string; card1Index: number; player2Id: string; card2Index: number } | null;

  /**
   * Decide se deve declarar fim do jogo
   */
  deveDeclararFim(mao: Card[], turnoAtual: number, pontuacaoAtual: number): boolean;
}

/**
 * Decisão da IA
 */
export interface AIDecision {
  /** Tipo de ação a ser executada */
  action: 'use_ability' | 'replace_card' | 'discard' | 'discard_bought';
  /** Dados adicionais da decisão */
  data?: Record<string, any>;
}

