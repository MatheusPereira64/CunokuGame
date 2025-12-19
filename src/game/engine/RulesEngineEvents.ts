import { Card } from '../models/Card';
import { Ability } from '../enums/Ability';
import { GameResult } from '../types/GameState';

/**
 * Eventos emitidos pelo RulesEngine
 */
export interface RulesEngineEvents {
  /** Turno iniciado para um jogador */
  'turno-iniciado': [jogadorId: string, turno: number];
  /** Carta comprada por um jogador */
  'carta-comprada': [jogadorId: string, carta: Card];
  /** Habilidade usada */
  'habilidade-usada': [jogadorId: string, habilidade: Ability, dados: Record<string, any>];
  /** Carta descartada */
  'carta-descartada': [jogadorId: string, carta: Card, foiReacao: boolean];
  /** Reação iniciada (descarte encadeado) */
  'reacao-iniciada': [carta: Card, jogadorId: string];
  /** Punição aplicada (descarte errado) */
  'punicao-aplicada': [jogadorId: string, quantidadeCartas: number];
  /** Fim do jogo declarado */
  'fim-declarado': [jogadorId: string, turnosRestantes: number];
  /** Partida finalizada */
  'partida-finalizada': [resultado: GameResult];
  /** Turno finalizado */
  'turno-finalizado': [jogadorId: string];
}

