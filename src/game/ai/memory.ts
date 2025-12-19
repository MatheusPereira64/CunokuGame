import { Card } from '../models/Card';
import { Player } from '../models/Player';

/**
 * Informação memorizada sobre uma carta vista
 */
export interface CardMemory {
  /** ID do jogador que possui a carta */
  playerId: string;
  /** Índice da carta na mão */
  cardIndex: number;
  /** Carta vista */
  card: Card;
  /** Turno em que foi vista */
  turnSeen: number;
  /** Confiança na memória (0-1) */
  confidence: number;
}

/**
 * Sistema de memória imperfeita para bots
 * Simula esquecimento e incerteza
 */
export class ImperfectMemory {
  private memories: Map<string, CardMemory[]> = new Map();
  private forgetProbability: number;
  private errorProbability: number;

  /**
   * @param forgetProbability Probabilidade de esquecer informação (0-1)
   * @param errorProbability Probabilidade de erro em decisões (0-1)
   */
  constructor(forgetProbability: number = 0.2, errorProbability: number = 0.1) {
    this.forgetProbability = forgetProbability;
    this.errorProbability = errorProbability;
  }

  /**
   * Registra uma carta vista
   */
  rememberCard(playerId: string, cardIndex: number, card: Card, turn: number): void {
    if (!this.memories.has(playerId)) {
      this.memories.set(playerId, []);
    }

    const memory: CardMemory = {
      playerId,
      cardIndex,
      card,
      turnSeen: turn,
      confidence: 1.0,
    };

    this.memories.get(playerId)!.push(memory);
  }

  /**
   * Tenta recuperar memória de uma carta
   * Pode retornar null se esqueceu ou informação incorreta
   */
  recallCard(playerId: string, cardIndex: number, currentTurn: number): Card | null {
    const playerMemories = this.memories.get(playerId);
    if (!playerMemories) {
      return null;
    }

    const memory = playerMemories.find((m) => m.cardIndex === cardIndex);
    if (!memory) {
      return null;
    }

    // Probabilidade de esquecer aumenta com o tempo
    const turnsSinceSeen = currentTurn - memory.turnSeen;
    const forgetChance = this.forgetProbability + turnsSinceSeen * 0.05;

    if (Math.random() < forgetChance) {
      return null; // Esqueceu
    }

    // Reduz confiança com o tempo
    memory.confidence = Math.max(0.3, 1.0 - turnsSinceSeen * 0.1);

    return memory.card;
  }

  /**
   * Retorna todas as memórias de um jogador
   */
  getPlayerMemories(playerId: string): CardMemory[] {
    return this.memories.get(playerId) || [];
  }

  /**
   * Limpa memórias antigas (simula esquecimento natural)
   */
  forgetOldMemories(currentTurn: number, maxTurnsOld: number = 5): void {
    this.memories.forEach((memories, playerId) => {
      const filtered = memories.filter(
        (m) => currentTurn - m.turnSeen <= maxTurnsOld
      );
      this.memories.set(playerId, filtered);
    });
  }

  /**
   * Verifica se deve cometer erro (para simular decisões ruins)
   */
  shouldMakeError(): boolean {
    return Math.random() < this.errorProbability;
  }

  /**
   * Limpa todas as memórias
   */
  clear(): void {
    this.memories.clear();
  }

  /**
   * Define probabilidade de esquecimento
   */
  setForgetProbability(probability: number): void {
    this.forgetProbability = Math.max(0, Math.min(1, probability));
  }

  /**
   * Define probabilidade de erro
   */
  setErrorProbability(probability: number): void {
    this.errorProbability = Math.max(0, Math.min(1, probability));
  }
}

