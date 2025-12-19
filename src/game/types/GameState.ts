import { GameState } from '../enums/GameState';
import { Player } from '../models/Player';
import { Card } from '../models/Card';
import { Ability } from '../enums/Ability';

/**
 * Estado do turno atual
 */
export interface TurnState {
  /** ID do jogador do turno atual */
  jogadorAtivo: string | null;
  /** Número do turno atual (incrementa a cada rodada completa) */
  turnoAtual: number;
  /** Carta comprada no turno atual (se houver) */
  cartaComprada: Card | null;
  /** Se o jogador já comprou carta neste turno */
  cartaCompradaNesteTurno: boolean;
  /** Se o turno foi finalizado */
  turnoFinalizado: boolean;
}

/**
 * Estado de uma habilidade sendo executada
 */
export interface AbilityState {
  /** Tipo de habilidade ativa */
  tipo: Ability;
  /** Carta que está sendo usada */
  carta: Card | null;
  /** Jogador que está usando a habilidade */
  jogadorId: string | null;
  /** Dados específicos da habilidade (depende do tipo) */
  dados: Record<string, any>;
  /** Se a habilidade foi completada */
  completada: boolean;
}

/**
 * Estado completo do jogo
 */
export interface GameStateData {
  /** Estado atual do jogo */
  estado: GameState;
  /** Lista de jogadores */
  players: Player[];
  /** Estado do turno atual */
  turnState: TurnState;
  /** Estado de habilidade ativa (se houver) */
  abilityState: AbilityState | null;
  /** Se o fim do jogo foi declarado */
  fimDeclarado: boolean;
  /** ID do jogador que declarou fim */
  jogadorDeclarouFim: string | null;
  /** Número de turnos restantes após declaração de fim */
  turnosRestantesFim: number | null;
}

/**
 * Resultado final de uma partida
 */
export interface GameResult {
  /** Lista de jogadores ordenados por pontuação (menor primeiro) */
  classificacao: Array<{
    jogador: Player;
    pontuacao: number;
    posicao: number;
  }>;
  /** Jogador vencedor (menor pontuação) */
  vencedor: Player;
  /** Pontuação do vencedor */
  pontuacaoVencedor: number;
  /** Número total de turnos jogados */
  turnosTotais: number;
}

