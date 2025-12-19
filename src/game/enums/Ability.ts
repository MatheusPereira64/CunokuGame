/**
 * Habilidades especiais das cartas do Cunoku
 */
export enum Ability {
  /** Sem habilidade especial */
  NONE = 'NONE',
  /** Ver carta de um oponente (Cartas 5 e 6) */
  SEE_OPPONENT = 'SEE_OPPONENT',
  /** Ver uma carta própria (Cartas 7 e 8) */
  SEE_OWN = 'SEE_OWN',
  /** Fazer 2 jogadores trocarem 1 carta (Cartas 9 e 10) */
  SWAP_CARDS = 'SWAP_CARDS',
}

