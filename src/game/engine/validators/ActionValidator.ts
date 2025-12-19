import { GameStateData } from '../../types/GameState';
import { Card } from '../../models/Card';
import { ActionType } from '../../enums/ActionType';

/**
 * Validador de ações específicas
 */
export class ActionValidator {
  /**
   * Valida compra de carta
   */
  static validarCompra(gameState: GameStateData, jogadorId: string): string | null {
    if (gameState.estado !== 'PLAYING') {
      return 'Jogo não está em estado de jogo';
    }

    if (gameState.turnState.jogadorAtivo !== jogadorId) {
      return 'Não é seu turno';
    }

    if (gameState.turnState.cartaCompradaNesteTurno) {
      return 'Você já comprou carta neste turno';
    }

    return null;
  }

  /**
   * Valida substituição de carta
   */
  static validarSubstituicao(
    gameState: GameStateData,
    jogadorId: string,
    indiceMao: number
  ): string | null {
    if (gameState.estado !== 'PLAYING') {
      return 'Jogo não está em estado de jogo';
    }

    if (gameState.turnState.jogadorAtivo !== jogadorId) {
      return 'Não é seu turno';
    }

    if (!gameState.turnState.cartaComprada) {
      return 'Você precisa comprar uma carta primeiro';
    }

    const jogador = gameState.players.find(p => p.id === jogadorId);
    if (!jogador) {
      return 'Jogador não encontrado';
    }

    if (indiceMao < 0 || indiceMao >= jogador.getMaoSize()) {
      return 'Índice de carta inválido';
    }

    return null;
  }

  /**
   * Valida descarte de carta
   */
  static validarDescarte(
    gameState: GameStateData,
    jogadorId: string,
    indiceMao?: number,
    descartarComprada?: boolean
  ): string | null {
    if (gameState.estado !== 'PLAYING') {
      return 'Jogo não está em estado de jogo';
    }

    if (gameState.turnState.jogadorAtivo !== jogadorId) {
      return 'Não é seu turno';
    }

    const jogador = gameState.players.find(p => p.id === jogadorId);
    if (!jogador) {
      return 'Jogador não encontrado';
    }

    // Deve descartar carta comprada OU carta da mão
    if (descartarComprada) {
      if (!gameState.turnState.cartaComprada) {
        return 'Não há carta comprada para descartar';
      }
    } else {
      if (indiceMao === undefined) {
        return 'Índice da carta não especificado';
      }
      if (indiceMao < 0 || indiceMao >= jogador.getMaoSize()) {
        return 'Índice de carta inválido';
      }
    }

    return null;
  }

  /**
   * Valida descarte em reação
   */
  static validarDescarteReacao(
    gameState: GameStateData,
    jogadorId: string,
    indiceMao: number
  ): string | null {
    if (gameState.estado !== 'REACTION') {
      return 'Não há reação ativa no momento';
    }

    const jogador = gameState.players.find(p => p.id === jogadorId);
    if (!jogador) {
      return 'Jogador não encontrado';
    }

    if (indiceMao < 0 || indiceMao >= jogador.getMaoSize()) {
      return 'Índice de carta inválido';
    }

    // Jogador não pode reagir à própria carta
    if (gameState.turnState.jogadorAtivo === jogadorId) {
      return 'Você não pode reagir à sua própria carta';
    }

    return null;
  }

  /**
   * Valida declaração de fim
   */
  static validarDeclararFim(
    gameState: GameStateData,
    jogadorId: string
  ): string | null {
    if (gameState.estado !== 'PLAYING') {
      return 'Jogo não está em estado de jogo';
    }

    if (gameState.turnState.jogadorAtivo !== jogadorId) {
      return 'Não é seu turno';
    }

    if (gameState.turnState.turnoAtual < 5) {
      return 'É necessário pelo menos 5 turnos para declarar fim';
    }

    if (gameState.fimDeclarado) {
      return 'Fim do jogo já foi declarado';
    }

    return null;
  }
}

