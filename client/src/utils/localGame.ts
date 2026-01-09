import { GameState, Player, Card } from "@shared/schema";

/**
 * Gera um UUID simples
 */
function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Cria um baralho completo (ou múltiplos baralhos)
 */
function createDeck(numberOfDecks: number = 1): Card[] {
  const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
  
  const deck: Card[] = [];
  
  // Cria múltiplos baralhos conforme necessário
  for (let deckNum = 0; deckNum < numberOfDecks; deckNum++) {
    SUITS.forEach(suit => {
      RANKS.forEach(rank => {
        deck.push({
          id: randomUUID(),
          suit,
          rank,
          value: getCardValue(rank),
          isFaceUp: false
        });
      });
    });
    
    // Add 2 Jokers per deck
    deck.push({ id: randomUUID(), suit: "spades", rank: "Joker", value: -1, isFaceUp: false });
    deck.push({ id: randomUUID(), suit: "hearts", rank: "Joker", value: -1, isFaceUp: false });
  }
  
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
}

/**
 * Retorna o valor da carta
 */
function getCardValue(rank: string): number {
  if (rank === "Joker") return -1;
  if (rank === "K") return 0;
  if (rank === "A") return 1;
  if (rank === "J") return 11;
  if (rank === "Q") return 12;
  return parseInt(rank) || 0;
}

/**
 * Cria jogadores bots
 */
function createBotPlayers(count: number, difficulty: "easy" | "medium" | "hard"): Player[] {
  const names = ["Bot Alpha", "Bot Beta", "Bot Gamma", "Bot Delta", "Bot Epsilon"];
  return Array.from({ length: count }).map((_, i) => ({
    id: randomUUID(),
    name: names[i] || `Bot ${i + 1}`,
    isBot: true,
    isConnected: true,
    hand: [],
    score: 0,
    knownCards: {}
  }));
}

/**
 * Inicializa uma partida offline contra bots
 */
export function createOfflineGame(
  playerName: string,
  botCount: number,
  botDifficulty: "easy" | "medium" | "hard"
): { gameState: GameState; playerId: string } {
  const playerId = randomUUID();
  
  // Cria jogador humano
  const humanPlayer: Player = {
    id: playerId,
    name: playerName,
    isBot: false,
    isConnected: true,
    hand: [],
    score: 0,
    knownCards: {} // Todas as cartas começam viradas conforme as regras
  };
  
  // Cria bots
  const botPlayers = createBotPlayers(botCount, botDifficulty);
  
  // Combina jogadores (humano primeiro)
  const players = [humanPlayer, ...botPlayers];
  
  // Cria baralho baseado no número de jogadores
  // Para cada jogador adicional além de 2, adiciona mais um baralho completo
  const numberOfDecks = Math.max(1, Math.ceil(players.length / 2));
  const deck = createDeck(numberOfDecks);
  
  players.forEach(player => {
    player.hand = [];
    for (let i = 0; i < 4; i++) {
      const card = deck.pop();
      if (card) {
        player.hand.push(card);
      }
    }
  });
  
  // Cria estado inicial do jogo
  // Garante que há pelo menos uma carta na pilha de descarte
  const topDiscard = deck.pop();
  const gameState: GameState = {
    deck,
    discardPile: topDiscard ? [topDiscard] : [],
    players,
    currentPlayerIndex: 0,
    turnPhase: "draw",
    drawnCard: null,
    drawnFromDiscard: false,
    round: 1,
    winnerId: null,
    logs: [`Game started! ${playerName} vs ${botCount} bot(s). Deck size: ${deck.length + 1} cards (${numberOfDecks} deck${numberOfDecks > 1 ? 's' : ''})`],
    finalRoundDeclarerId: null,
    isFinalRound: false
  };
  
  return { gameState, playerId };
}

