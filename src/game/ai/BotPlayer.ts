import { Player } from '../models/Player';
import { Card } from '../models/Card';
import { Ability } from '../enums/Ability';
import { IAgent, AIDecision } from './IAgent';
import { ImperfectMemory } from './memory';
import {
  avaliarCarta,
  escolherCartaParaDescartar,
  deveSubstituirCarta,
  escolherCartaParaSubstituir,
  deveUsarHabilidade,
  escolherOponente,
  escolherCartaOponente,
  escolherCartaPropria,
  escolherTrocaCartas,
  deveDeclararFim,
} from './heuristics';

/**
 * Dificuldade do bot
 */
export enum BotDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

/**
 * Bot player com IA baseada em heurísticas
 * 
 * O bot usa o mesmo RulesEngine dos jogadores humanos e não tem acesso
 * a informações ocultas. Toma decisões baseadas em heurísticas e memória imperfeita.
 */
export class BotPlayer extends Player implements IAgent {
  private memory: ImperfectMemory;
  private difficulty: BotDifficulty;
  private knownCards: Map<string, Card[]> = new Map(); // Cartas vistas de outros jogadores

  constructor(id: string, nome: string, difficulty: BotDifficulty = BotDifficulty.MEDIUM) {
    super(id, nome, true); // isBot = true

    this.difficulty = difficulty;
    
    // Configura memória baseada na dificuldade
    switch (difficulty) {
      case BotDifficulty.EASY:
        this.memory = new ImperfectMemory(0.4, 0.3); // Esquece mais, erra mais
        break;
      case BotDifficulty.MEDIUM:
        this.memory = new ImperfectMemory(0.2, 0.1);
        break;
      case BotDifficulty.HARD:
        this.memory = new ImperfectMemory(0.1, 0.05); // Esquece pouco, erra pouco
        break;
    }
  }

  /**
   * Decide qual ação tomar no turno atual
   */
  decidirAcao(
    cartaComprada: Card | null,
    mao: Card[],
    outrosJogadores: Player[],
    turnoAtual: number
  ): AIDecision {
    if (!cartaComprada) {
      return { action: 'discard' };
    }

    // Decide se deve usar habilidade
    if (cartaComprada.hasAbility() && deveUsarHabilidade(cartaComprada, mao, turnoAtual)) {
      // Verifica se deve cometer erro
      if (this.memory.shouldMakeError()) {
        // Erro: não usa habilidade mesmo quando deveria
        return { action: 'discard_bought' };
      }
      return { action: 'use_ability' };
    }

    // Decide se deve substituir carta
    if (deveSubstituirCarta(cartaComprada, mao)) {
      // Verifica se deve cometer erro
      if (this.memory.shouldMakeError()) {
        // Erro: não substitui mesmo quando deveria
        return { action: 'discard_bought' };
      }
      return {
        action: 'replace_card',
        data: { cardIndex: escolherCartaParaSubstituir(cartaComprada, mao) },
      };
    }

    // Descarta carta comprada
    return { action: 'discard_bought' };
  }

  /**
   * Escolhe índice de carta para descartar
   */
  escolherCartaParaDescartar(mao: Card[]): number {
    let index = escolherCartaParaDescartar(mao);

    // Pode cometer erro ocasional
    if (this.memory.shouldMakeError() && mao.length > 1) {
      // Escolhe carta aleatória (erro)
      index = Math.floor(Math.random() * mao.length);
    }

    return index;
  }

  /**
   * Decide se deve substituir carta
   */
  deveSubstituirCarta(cartaComprada: Card, mao: Card[]): boolean {
    return deveSubstituirCarta(cartaComprada, mao);
  }

  /**
   * Escolhe índice da carta a ser substituída
   */
  escolherCartaParaSubstituir(cartaComprada: Card, mao: Card[]): number {
    return escolherCartaParaSubstituir(cartaComprada, mao);
  }

  /**
   * Decide se deve usar habilidade
   */
  deveUsarHabilidade(carta: Card, mao: Card[], turnoAtual: number = 0): boolean {
    // Usa heurística base, mas pode errar
    if (this.memory.shouldMakeError()) {
      return Math.random() < 0.3; // Decisão aleatória quando erra
    }
    return deveUsarHabilidade(carta, mao, turnoAtual);
  }

  /**
   * Escolhe oponente para habilidade "Ver Oponente"
   */
  escolherOponente(outrosJogadores: Player[]): string | null {
    const memoria = this.buildMemoryMap();
    return escolherOponente(outrosJogadores, memoria);
  }

  /**
   * Escolhe índice de carta do oponente para ver
   */
  escolherCartaOponente(opponent: Player): number {
    return escolherCartaOponente(opponent);
  }

  /**
   * Escolhe índice de carta própria para ver
   */
  escolherCartaPropria(mao: Card[]): number {
    return escolherCartaPropria(mao);
  }

  /**
   * Escolhe jogadores e cartas para trocar
   */
  escolherTrocaCartas(
    outrosJogadores: Player[],
    mao: Card[]
  ): { player1Id: string; card1Index: number; player2Id: string; card2Index: number } | null {
    const memoria = this.buildMemoryMap();
    return escolherTrocaCartas(outrosJogadores, mao, memoria);
  }

  /**
   * Decide se deve declarar fim do jogo
   */
  deveDeclararFim(mao: Card[], turnoAtual: number, pontuacaoAtual: number): boolean {
    return deveDeclararFim(mao, turnoAtual, pontuacaoAtual);
  }

  /**
   * Registra carta vista de outro jogador
   */
  verCartaOponente(playerId: string, cardIndex: number, card: Card, turn: number): void {
    this.memory.rememberCard(playerId, cardIndex, card, turn);
    
    if (!this.knownCards.has(playerId)) {
      this.knownCards.set(playerId, []);
    }
    const cards = this.knownCards.get(playerId)!;
    if (cards.length <= cardIndex) {
      cards.length = cardIndex + 1;
    }
    cards[cardIndex] = card;
  }

  /**
   * Registra carta própria vista
   */
  verCartaPropria(cardIndex: number, card: Card): void {
    // Bot sempre sabe suas próprias cartas (não precisa de memória imperfeita)
    // Mas pode "esquecer" informações de outros jogadores
  }

  /**
   * Constrói mapa de memória para heurísticas
   */
  private buildMemoryMap(): Map<string, Card[]> {
    return new Map(this.knownCards);
  }

  /**
   * Limpa memórias antigas
   */
  limparMemoriasAntigas(turnoAtual: number): void {
    this.memory.forgetOldMemories(turnoAtual);
  }

  /**
   * Retorna dificuldade do bot
   */
  getDifficulty(): BotDifficulty {
    return this.difficulty;
  }
}

