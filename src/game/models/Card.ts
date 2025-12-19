import { CardType } from '../enums/CardType';
import { Ability } from '../enums/Ability';
import { getCardValue, getCardType, getCardAbility } from '../enums/CardValue';

/**
 * Classe que representa uma carta do jogo Cunoku
 */
export class Card {
  /** Tipo da carta (REI, CORINGA, AS, etc) */
  public readonly tipo: CardType;
  
  /** Valor numérico da carta para pontuação */
  public readonly valor: number;
  
  /** Nome da carta (ex: "Rei", "5", "Ás") */
  public readonly nome: string;
  
  /** Naipe da carta (opcional, para futuro) */
  public readonly naipe?: string;
  
  /** Habilidade especial associada à carta */
  public readonly habilidade: Ability;

  /**
   * Cria uma nova carta
   * @param nome Nome da carta (ex: "Rei", "5", "Ás")
   * @param naipe Naipe opcional da carta
   */
  constructor(nome: string, naipe?: string) {
    this.nome = nome;
    this.naipe = naipe;
    this.valor = getCardValue(nome);
    this.tipo = getCardType(nome);
    this.habilidade = getCardAbility(nome);
  }

  /**
   * Retorna o valor numérico da carta
   */
  getValue(): number {
    return this.valor;
  }

  /**
   * Verifica se a carta possui habilidade especial
   */
  hasAbility(): boolean {
    return this.habilidade !== Ability.NONE;
  }

  /**
   * Compara duas cartas para verificar se são iguais
   * (mesmo número/letra, independente do naipe)
   * @param other Outra carta para comparar
   */
  equals(other: Card): boolean {
    return this.nome === other.nome;
  }

  /**
   * Retorna uma representação em string da carta
   */
  toString(): string {
    return this.naipe ? `${this.nome} de ${this.naipe}` : this.nome;
  }
}

