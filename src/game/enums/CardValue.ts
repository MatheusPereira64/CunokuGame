import { CardType } from './CardType';
import { Ability } from './Ability';

/**
 * Mapa de valores das cartas do Cunoku
 * Chave: nome da carta, Valor: { valor numérico, tipo, habilidade }
 */
export const CARD_VALUES: Record<string, { valor: number; tipo: CardType; habilidade: Ability }> = {
  'Rei': { valor: 0, tipo: CardType.REI, habilidade: Ability.NONE },
  'Coringa': { valor: -1, tipo: CardType.CORINGA, habilidade: Ability.NONE },
  'Ás': { valor: 1, tipo: CardType.AS, habilidade: Ability.NONE },
  'Valete': { valor: 11, tipo: CardType.VALETE, habilidade: Ability.NONE },
  'Rainha': { valor: 12, tipo: CardType.RAINHA, habilidade: Ability.NONE },
  '5': { valor: 5, tipo: CardType.NUMERO, habilidade: Ability.SEE_OPPONENT },
  '6': { valor: 6, tipo: CardType.NUMERO, habilidade: Ability.SEE_OPPONENT },
  '7': { valor: 7, tipo: CardType.NUMERO, habilidade: Ability.SEE_OWN },
  '8': { valor: 8, tipo: CardType.NUMERO, habilidade: Ability.SEE_OWN },
  '9': { valor: 9, tipo: CardType.NUMERO, habilidade: Ability.SWAP_CARDS },
  '10': { valor: 10, tipo: CardType.NUMERO, habilidade: Ability.SWAP_CARDS },
  '11': { valor: 11, tipo: CardType.NUMERO, habilidade: Ability.NONE },
  '12': { valor: 12, tipo: CardType.NUMERO, habilidade: Ability.NONE },
};

/**
 * Obtém o valor numérico de uma carta pelo nome
 */
export function getCardValue(nome: string): number {
  return CARD_VALUES[nome]?.valor ?? 0;
}

/**
 * Obtém o tipo de uma carta pelo nome
 */
export function getCardType(nome: string): CardType {
  return CARD_VALUES[nome]?.tipo ?? CardType.NUMERO;
}

/**
 * Obtém a habilidade de uma carta pelo nome
 */
export function getCardAbility(nome: string): Ability {
  return CARD_VALUES[nome]?.habilidade ?? Ability.NONE;
}

