import { Card } from '../models/Card';

/**
 * Naipes padrão do baralho (opcional, para futuro)
 */
const NAIPES = ['Copas', 'Espadas', 'Ouros', 'Paus'];

/**
 * Nomes das cartas especiais do Cunoku
 */
const CARTAS_ESPECIAIS = ['Rei', 'Coringa', 'Ás', 'Valete', 'Rainha'];

/**
 * Números das cartas numéricas do Cunoku (5-12)
 */
const NUMEROS = [5, 6, 7, 8, 9, 10, 11, 12];

/**
 * Cria uma carta específica do jogo Cunoku
 * @param nome Nome da carta (ex: "Rei", "5", "Ás")
 * @param naipe Naipe opcional da carta
 * @returns Nova instância de Card
 */
export function createCard(nome: string, naipe?: string): Card {
  return new Card(nome, naipe);
}

/**
 * Cria o deck completo do jogo Cunoku
 * O deck padrão contém todas as cartas necessárias para o jogo
 * @param incluirNaipes Se deve incluir naipes nas cartas (padrão: false)
 * @returns Array com todas as cartas do deck
 */
export function createDeck(incluirNaipes: boolean = false): Card[] {
  const deck: Card[] = [];

  // Adiciona cartas especiais (Rei, Coringa, Ás, Valete, Rainha)
  for (const nome of CARTAS_ESPECIAIS) {
    if (incluirNaipes) {
      for (const naipe of NAIPES) {
        deck.push(createCard(nome, naipe));
      }
    } else {
      deck.push(createCard(nome));
    }
  }

  // Adiciona cartas numéricas (5-12)
  for (const numero of NUMEROS) {
    if (incluirNaipes) {
      for (const naipe of NAIPES) {
        deck.push(createCard(numero.toString(), naipe));
      }
    } else {
      deck.push(createCard(numero.toString()));
    }
  }

  return deck;
}

/**
 * Embaralha um array de cartas usando o algoritmo Fisher-Yates
 * @param deck Array de cartas a ser embaralhado
 * @returns Novo array com as cartas embaralhadas (não modifica o original)
 */
export function embaralharDeck(deck: Card[]): Card[] {
  const deckEmbaralhado = [...deck];
  
  for (let i = deckEmbaralhado.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deckEmbaralhado[i], deckEmbaralhado[j]] = [deckEmbaralhado[j], deckEmbaralhado[i]];
  }
  
  return deckEmbaralhado;
}

/**
 * Cria e retorna um deck completo já embaralhado
 * @param incluirNaipes Se deve incluir naipes nas cartas (padrão: false)
 * @returns Array com todas as cartas do deck embaralhadas
 */
export function createDeckEmbaralhado(incluirNaipes: boolean = false): Card[] {
  const deck = createDeck(incluirNaipes);
  return embaralharDeck(deck);
}

