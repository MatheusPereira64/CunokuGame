import { GameStateData } from '../../types/GameState';
import { ActionType } from '../../enums/ActionType';

/**
 * Validador de turnos e ações permitidas
 */
export class TurnValidator {
  /**
   * Verifica se um jogador pode realizar uma ação no momento atual
   */
  static podeRealizarAcao(
    gameState: GameStateData,
    jogadorId: string,
    acao: ActionType
  ): boolean {
    // Jogador deve existir
    const jogador = gameState.players.find(p => p.id === jogadorId);
    if (!jogador) {
      return false;
    }

    // Verifica ações baseadas no estado do jogo
    switch (gameState.estado) {
      case 'WAITING':
        return false;
      case 'GAME_OVER':
        return false;
      case 'REACTION':
        return acao === ActionType.REACTION_DISCARD;
      case 'ABILITY_ACTIVE':
        return false; // Aguarda habilidade ser completada
      case 'PLAYING':
        return this.podeRealizarAcaoNoTurno(gameState, jogadorId, acao);
      default:
        return false;
    }
  }

  /**
   * Verifica se jogador pode realizar ação durante turno normal
   */
  private static podeRealizarAcaoNoTurno(
    gameState: GameStateData,
    jogadorId: string,
    acao: ActionType
  ): boolean {
    const { turnState } = gameState;

    // Jogador deve ser o ativo
    if (turnState.jogadorAtivo !== jogadorId) {
      return false;
    }

    // Turno não deve estar finalizado
    if (turnState.turnoFinalizado) {
      return false;
    }

    // Compra de carta: só se ainda não comprou neste turno
    if (acao === ActionType.BUY_CARD) {
      return !turnState.cartaCompradaNesteTurno;
    }

    // Outras ações: só se já comprou carta
    if (!turnState.cartaCompradaNesteTurno) {
      return false;
    }

    // Declarar fim: só se tiver pelo menos 5 turnos
    if (acao === ActionType.DECLARE_END) {
      return turnState.turnoAtual >= 5;
    }

    // Outras ações permitidas após compra
    return [
      ActionType.USE_ABILITY,
      ActionType.REPLACE_CARD,
      ActionType.DISCARD,
    ].includes(acao);
  }

  /**
   * Retorna lista de ações permitidas para um jogador
   */
  static getAcoesPermitidas(
    gameState: GameStateData,
    jogadorId: string
  ): ActionType[] {
    const acoes: ActionType[] = [];

    if (this.podeRealizarAcao(gameState, jogadorId, ActionType.BUY_CARD)) {
      acoes.push(ActionType.BUY_CARD);
    }
    if (this.podeRealizarAcao(gameState, jogadorId, ActionType.USE_ABILITY)) {
      acoes.push(ActionType.USE_ABILITY);
    }
    if (this.podeRealizarAcao(gameState, jogadorId, ActionType.REPLACE_CARD)) {
      acoes.push(ActionType.REPLACE_CARD);
    }
    if (this.podeRealizarAcao(gameState, jogadorId, ActionType.DISCARD)) {
      acoes.push(ActionType.DISCARD);
    }
    if (this.podeRealizarAcao(gameState, jogadorId, ActionType.REACTION_DISCARD)) {
      acoes.push(ActionType.REACTION_DISCARD);
    }
    if (this.podeRealizarAcao(gameState, jogadorId, ActionType.DECLARE_END)) {
      acoes.push(ActionType.DECLARE_END);
    }

    return acoes;
  }
}

