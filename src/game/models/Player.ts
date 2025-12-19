import { Card } from './Card';

/**
 * Classe que representa um jogador do jogo Cunoku
 */
export class Player {
  /** Identificador único do jogador */
  public readonly id: string;
  
  /** Nome do jogador */
  public readonly nome: string;
  
  /** Mão de cartas do jogador (viradas para baixo) */
  public mao: Card[];
  
  /** Indica se é um bot */
  public readonly isBot: boolean;
  
  /** Indica se é um jogador humano */
  public readonly isHuman: boolean;

  /**
   * Cria um novo jogador
   * @param id Identificador único
   * @param nome Nome do jogador
   * @param isBot Se é um bot
   */
  constructor(id: string, nome: string, isBot: boolean = false) {
    this.id = id;
    this.nome = nome;
    this.isBot = isBot;
    this.isHuman = !isBot;
    this.mao = [];
  }

  /**
   * Adiciona uma carta à mão do jogador
   * @param carta Carta a ser adicionada
   */
  comprarCarta(carta: Card): void {
    this.mao.push(carta);
  }

  /**
   * Remove e retorna uma carta da mão pelo índice
   * @param indice Índice da carta na mão (0-based)
   * @returns A carta removida ou null se índice inválido
   */
  descartarCarta(indice: number): Card | null {
    if (indice < 0 || indice >= this.mao.length) {
      return null;
    }
    return this.mao.splice(indice, 1)[0];
  }

  /**
   * Substitui uma carta da mão por uma nova carta
   * @param indice Índice da carta a ser substituída
   * @param novaCarta Nova carta para colocar na mão
   * @returns A carta antiga que foi substituída ou null se índice inválido
   */
  substituirCarta(indice: number, novaCarta: Card): Card | null {
    if (indice < 0 || indice >= this.mao.length) {
      return null;
    }
    const cartaAntiga = this.mao[indice];
    this.mao[indice] = novaCarta;
    return cartaAntiga;
  }

  /**
   * Calcula a pontuação total do jogador (soma dos valores das cartas)
   * @returns Soma dos valores das cartas na mão
   */
  calcularPontuacao(): number {
    return this.mao.reduce((soma, carta) => soma + carta.getValue(), 0);
  }

  /**
   * Retorna o número de cartas na mão
   */
  getMaoSize(): number {
    return this.mao.length;
  }

  /**
   * Verifica se o jogador tem uma carta específica na mão
   * @param carta Carta a ser verificada
   * @returns true se possui a carta
   */
  temCarta(carta: Card): boolean {
    return this.mao.some(c => c.equals(carta));
  }

  /**
   * Retorna uma representação em string do jogador
   */
  toString(): string {
    return `${this.nome} (${this.isBot ? 'Bot' : 'Humano'}) - ${this.mao.length} cartas`;
  }
}

