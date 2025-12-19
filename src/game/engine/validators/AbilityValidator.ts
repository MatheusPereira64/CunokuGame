import { GameStateData } from '../../types/GameState';
import { Card } from '../../models/Card';
import { Ability } from '../../enums/Ability';

/**
 * Validador de habilidades
 */
export class AbilityValidator {
  /**
   * Valida uso de habilidade "Ver carta de oponente" (5 e 6)
   */
  static validarVerOponente(
    gameState: GameStateData,
    jogadorId: string,
    carta: Card,
    oponenteId: string,
    indiceCarta: number
  ): string | null {
    if (carta.habilidade !== Ability.SEE_OPPONENT) {
      return 'Carta não possui habilidade de ver oponente';
    }

    if (gameState.turnState.jogadorAtivo !== jogadorId) {
      return 'Não é seu turno';
    }

    if (!gameState.turnState.cartaComprada || !gameState.turnState.cartaComprada.equals(carta)) {
      return 'Você precisa ter comprado esta carta';
    }

    const oponente = gameState.players.find(p => p.id === oponenteId);
    if (!oponente) {
      return 'Oponente não encontrado';
    }

    if (oponente.id === jogadorId) {
      return 'Você não pode ver suas próprias cartas com esta habilidade';
    }

    if (indiceCarta < 0 || indiceCarta >= oponente.getMaoSize()) {
      return 'Índice de carta inválido';
    }

    return null;
  }

  /**
   * Valida uso de habilidade "Ver carta própria" (7 e 8)
   */
  static validarVerPropria(
    gameState: GameStateData,
    jogadorId: string,
    carta: Card,
    indiceCarta: number
  ): string | null {
    if (carta.habilidade !== Ability.SEE_OWN) {
      return 'Carta não possui habilidade de ver carta própria';
    }

    if (gameState.turnState.jogadorAtivo !== jogadorId) {
      return 'Não é seu turno';
    }

    if (!gameState.turnState.cartaComprada || !gameState.turnState.cartaComprada.equals(carta)) {
      return 'Você precisa ter comprado esta carta';
    }

    const jogador = gameState.players.find(p => p.id === jogadorId);
    if (!jogador) {
      return 'Jogador não encontrado';
    }

    if (indiceCarta < 0 || indiceCarta >= jogador.getMaoSize()) {
      return 'Índice de carta inválido';
    }

    return null;
  }

  /**
   * Valida uso de habilidade "Trocar cartas" (9 e 10)
   */
  static validarTrocarCartas(
    gameState: GameStateData,
    jogadorId: string,
    carta: Card,
    jogador1Id: string,
    carta1Index: number,
    jogador2Id: string,
    carta2Index: number
  ): string | null {
    if (carta.habilidade !== Ability.SWAP_CARDS) {
      return 'Carta não possui habilidade de trocar cartas';
    }

    if (gameState.turnState.jogadorAtivo !== jogadorId) {
      return 'Não é seu turno';
    }

    if (!gameState.turnState.cartaComprada || !gameState.turnState.cartaComprada.equals(carta)) {
      return 'Você precisa ter comprado esta carta';
    }

    const jogador1 = gameState.players.find(p => p.id === jogador1Id);
    const jogador2 = gameState.players.find(p => p.id === jogador2Id);

    if (!jogador1 || !jogador2) {
      return 'Um ou ambos os jogadores não foram encontrados';
    }

    if (jogador1Id === jogador2Id) {
      return 'Os dois jogadores devem ser diferentes';
    }

    if (carta1Index < 0 || carta1Index >= jogador1.getMaoSize()) {
      return 'Índice de carta do primeiro jogador inválido';
    }

    if (carta2Index < 0 || carta2Index >= jogador2.getMaoSize()) {
      return 'Índice de carta do segundo jogador inválido';
    }

    return null;
  }
}

