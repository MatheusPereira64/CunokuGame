import { computed, ref } from 'vue'

export function useCardUtils() {
  // Mapeamento de naipes para símbolos
  const suitSymbols = {
    'espadas': '♠',
    'copas': '♥',
    'ouros': '♦',
    'paus': '♣'
  }

  // Mapeamento de valores para símbolos
  const valueSymbols = {
    'A': 'A',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '10',
    'J': 'J',
    'Q': 'Q',
    'K': 'K'
  }

  // Cores dos naipes
  const suitColors = {
    'espadas': '#000000',
    'copas': '#ff0000',
    'ouros': '#ff0000',
    'paus': '#000000'
  }

  // Valores numéricos das cartas
  const cardValues = {
    'A': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13
  }

  /**
   * Mapeia o valor da carta para exibição
   * @param {string} valor - Valor da carta
   * @returns {string} Símbolo do valor
   */
  const mapValor = (valor) => {
    return valueSymbols[valor] || valor
  }

  /**
   * Mapeia o naipe da carta para símbolo
   * @param {string} naipe - Naipe da carta
   * @returns {string} Símbolo do naipe
   */
  const mapNaipe = (naipe) => {
    return suitSymbols[naipe] || '♠'
  }

  /**
   * Obtém a cor do naipe
   * @param {string} naipe - Naipe da carta
   * @returns {string} Cor do naipe
   */
  const getSuitColor = (naipe) => {
    return suitColors[naipe] || '#000000'
  }

  /**
   * Obtém o valor numérico da carta
   * @param {string} valor - Valor da carta
   * @returns {number} Valor numérico
   */
  const getCardValue = (valor) => {
    return cardValues[valor] || 0
  }

  /**
   * Verifica se uma carta é válida
   * @param {Object} carta - Objeto da carta
   * @returns {boolean} Se a carta é válida
   */
  const isValidCard = (carta) => {
    if (!carta || typeof carta !== 'object') return false
    if (!carta.valor || !carta.naipe) return false
    if (!valueSymbols[carta.valor]) return false
    if (!suitSymbols[carta.naipe]) return false
    return true
  }

  /**
   * Formata uma carta para exibição
   * @param {Object} carta - Objeto da carta
   * @returns {string} Carta formatada
   */
  const formatCard = (carta) => {
    if (!isValidCard(carta)) return 'Carta inválida'
    return `${mapValor(carta.valor)}${mapNaipe(carta.naipe)}`
  }

  /**
   * Compara duas cartas
   * @param {Object} carta1 - Primeira carta
   * @param {Object} carta2 - Segunda carta
   * @returns {number} -1, 0, ou 1 para ordenação
   */
  const compareCards = (carta1, carta2) => {
    if (!isValidCard(carta1) || !isValidCard(carta2)) return 0
    
    const valor1 = getCardValue(carta1.valor)
    const valor2 = getCardValue(carta2.valor)
    
    if (valor1 !== valor2) {
      return valor1 - valor2
    }
    
    // Se os valores são iguais, ordena por naipe
    const naipe1 = carta1.naipe
    const naipe2 = carta2.naipe
    return naipe1.localeCompare(naipe2)
  }

  /**
   * Ordena um array de cartas
   * @param {Array} cartas - Array de cartas
   * @returns {Array} Array de cartas ordenado
   */
  const sortCards = (cartas) => {
    if (!Array.isArray(cartas)) return []
    return [...cartas].sort(compareCards)
  }

  /**
   * Verifica se duas cartas têm o mesmo valor
   * @param {Object} carta1 - Primeira carta
   * @param {Object} carta2 - Segunda carta
   * @returns {boolean} Se as cartas têm o mesmo valor
   */
  const sameValue = (carta1, carta2) => {
    if (!isValidCard(carta1) || !isValidCard(carta2)) return false
    return carta1.valor === carta2.valor
  }

  /**
   * Verifica se duas cartas têm o mesmo naipe
   * @param {Object} carta1 - Primeira carta
   * @param {Object} carta2 - Segunda carta
   * @returns {boolean} Se as cartas têm o mesmo naipe
   */
  const sameSuit = (carta1, carta2) => {
    if (!isValidCard(carta1) || !isValidCard(carta2)) return false
    return carta1.naipe === carta2.naipe
  }

  /**
   * Verifica se duas cartas são iguais
   * @param {Object} carta1 - Primeira carta
   * @param {Object} carta2 - Segunda carta
   * @returns {boolean} Se as cartas são iguais
   */
  const sameCard = (carta1, carta2) => {
    if (!isValidCard(carta1) || !isValidCard(carta2)) return false
    return carta1.valor === carta2.valor && carta1.naipe === carta2.naipe
  }

  /**
   * Conta quantas cartas de cada valor existem
   * @param {Array} cartas - Array de cartas
   * @returns {Object} Contagem de valores
   */
  const countValues = (cartas) => {
    if (!Array.isArray(cartas)) return {}
    
    const counts = {}
    cartas.forEach(carta => {
      if (isValidCard(carta)) {
        counts[carta.valor] = (counts[carta.valor] || 0) + 1
      }
    })
    return counts
  }

  /**
   * Conta quantas cartas de cada naipe existem
   * @param {Array} cartas - Array de cartas
   * @returns {Object} Contagem de naipes
   */
  const countSuits = (cartas) => {
    if (!Array.isArray(cartas)) return {}
    
    const counts = {}
    cartas.forEach(carta => {
      if (isValidCard(carta)) {
        counts[carta.naipe] = (counts[carta.naipe] || 0) + 1
      }
    })
    return counts
  }

  /**
   * Encontra cartas duplicadas (mesmo valor)
   * @param {Array} cartas - Array de cartas
   * @returns {Array} Array de cartas duplicadas
   */
  const findDuplicates = (cartas) => {
    if (!Array.isArray(cartas)) return []
    
    const valueCounts = countValues(cartas)
    const duplicates = []
    
    cartas.forEach(carta => {
      if (isValidCard(carta) && valueCounts[carta.valor] > 1) {
        duplicates.push(carta)
      }
    })
    
    return duplicates
  }

  /**
   * Embaralha um array de cartas
   * @param {Array} cartas - Array de cartas
   * @returns {Array} Array de cartas embaralhado
   */
  const shuffleCards = (cartas) => {
    if (!Array.isArray(cartas)) return []
    
    const shuffled = [...cartas]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    return shuffled
  }

  /**
   * Cria um baralho completo
   * @returns {Array} Baralho completo
   */
  const createDeck = () => {
    const deck = []
    const suits = Object.keys(suitSymbols)
    const values = Object.keys(valueSymbols)
    
    suits.forEach(naipe => {
      values.forEach(valor => {
        deck.push({ valor, naipe })
      })
    })
    
    return deck
  }

  /**
   * Cria um baralho embaralhado
   * @returns {Array} Baralho embaralhado
   */
  const createShuffledDeck = () => {
    return shuffleCards(createDeck())
  }

  /**
   * Distribui cartas para jogadores
   * @param {Array} cartas - Array de cartas
   * @param {number} numPlayers - Número de jogadores
   * @param {number} cardsPerPlayer - Cartas por jogador
   * @returns {Array} Array de arrays de cartas para cada jogador
   */
  const dealCards = (cartas, numPlayers, cardsPerPlayer) => {
    if (!Array.isArray(cartas) || numPlayers <= 0 || cardsPerPlayer <= 0) return []
    
    const hands = Array.from({ length: numPlayers }, () => [])
    let cardIndex = 0
    
    for (let round = 0; round < cardsPerPlayer; round++) {
      for (let player = 0; player < numPlayers; player++) {
        if (cardIndex < cartas.length) {
          hands[player].push(cartas[cardIndex])
          cardIndex++
        }
      }
    }
    
    return hands
  }

  /**
   * Verifica se uma carta é especial (A, K, Q, J)
   * @param {Object} carta - Objeto da carta
   * @returns {boolean} Se a carta é especial
   */
  const isSpecialCard = (carta) => {
    if (!isValidCard(carta)) return false
    return ['A', 'K', 'Q', 'J'].includes(carta.valor)
  }

  /**
   * Verifica se uma carta é um Ás
   * @param {Object} carta - Objeto da carta
   * @returns {boolean} Se a carta é um Ás
   */
  const isAce = (carta) => {
    if (!isValidCard(carta)) return false
    return carta.valor === 'A'
  }

  /**
   * Verifica se uma carta é um Rei
   * @param {Object} carta - Objeto da carta
   * @returns {boolean} Se a carta é um Rei
   */
  const isKing = (carta) => {
    if (!isValidCard(carta)) return false
    return carta.valor === 'K'
  }

  /**
   * Verifica se uma carta é uma Dama
   * @param {Object} carta - Objeto da carta
   * @returns {boolean} Se a carta é uma Dama
   */
  const isQueen = (carta) => {
    if (!isValidCard(carta)) return false
    return carta.valor === 'Q'
  }

  /**
   * Verifica se uma carta é um Valete
   * @param {Object} carta - Objeto da carta
   * @returns {boolean} Se a carta é um Valete
   */
  const isJack = (carta) => {
    if (!isValidCard(carta)) return false
    return carta.valor === 'J'
  }

  return {
    // Mapeamentos
    mapValor,
    mapNaipe,
    getSuitColor,
    getCardValue,
    
    // Validações
    isValidCard,
    formatCard,
    
    // Comparações
    compareCards,
    sortCards,
    sameValue,
    sameSuit,
    sameCard,
    
    // Contagens
    countValues,
    countSuits,
    findDuplicates,
    
    // Manipulação
    shuffleCards,
    createDeck,
    createShuffledDeck,
    dealCards,
    
    // Verificações especiais
    isSpecialCard,
    isAce,
    isKing,
    isQueen,
    isJack,
    
    // Constantes
    suitSymbols,
    valueSymbols,
    suitColors,
    cardValues
  }
}
