import { Card } from '../models/Card';
import { createDeck, embaralharDeck } from '../utils/CardFactory';
import { EventEmitter } from '../utils/EventEmitter';

/**
 * Eventos emitidos pelo DeckManager
 */
export interface DeckManagerEvents {
  /** Emitido quando uma carta é comprada do baralho */
  'carta-comprada': [carta: Card];
  /** Emitido quando uma carta é descartada na pilha */
  'carta-descartada': [carta: Card, jogadorId: string];
  /** Emitido quando uma reação de descarte é iniciada */
  'reacao-iniciada': [carta: Card, jogadorId: string];
  /** Emitido quando a janela de reação é finalizada */
  'reacao-finalizada': [];
  /** Emitido quando a pilha de descarte é reciclada para virar novo baralho */
  'pilha-reciclada': [];
  /** Emitido quando o baralho de compra está esgotado */
  'baralho-esgotado': [];
}

/**
 * Gerenciador de baralho e pilha de descarte do jogo Cunoku
 * 
 * Responsabilidades:
 * - Gerenciar baralho de compra
 * - Gerenciar pilha de descarte
 * - Permitir compra e descarte de cartas
 * - Implementar descarte encadeado (reação)
 * - Reciclar pilha quando baralho acaba
 * - Emitir eventos para notificar mudanças
 */
export class DeckManager extends EventEmitter<DeckManagerEvents> {
  /** Baralho de compra (cartas disponíveis para comprar) */
  private baralho: Card[] = [];

  /** Pilha de descarte (cartas descartadas pelos jogadores) */
  private pilhaDescarte: Card[] = [];

  /** Estado de reação ativa (descarte encadeado) */
  private reacaoAtiva: boolean = false;

  /** Carta que gerou a reação atual */
  private cartaReacao: Card | null = null;

  /** Jogador que iniciou a reação atual */
  private jogadorOrigem: string | null = null;

  /** Timer para finalizar reação automaticamente */
  private reacaoTimer: ReturnType<typeof setTimeout> | null = null;

  /** Tempo em milissegundos para janela de reação (padrão: 5 segundos) */
  private tempoReacao: number = 5000;

  /**
   * Inicializa o baralho do jogo
   * Cria um deck completo, embaralha e prepara para o jogo
   * 
   * @param numJogadores Número de jogadores (pode ser usado para ajustar tamanho do deck)
   * @param incluirNaipes Se deve incluir naipes nas cartas (padrão: false)
   */
  inicializar(numJogadores: number = 2, incluirNaipes: boolean = false): void {
    // Cria deck completo
    const deck = createDeck(incluirNaipes);
    
    // Embaralha o deck
    this.baralho = embaralharDeck(deck);
    
    // Inicializa pilha de descarte vazia
    this.pilhaDescarte = [];
    
    // Reseta estado de reação
    this.reacaoAtiva = false;
    this.cartaReacao = null;
    this.jogadorOrigem = null;
    
    if (this.reacaoTimer) {
      clearTimeout(this.reacaoTimer);
      this.reacaoTimer = null;
    }
  }

  /**
   * Compra uma carta do topo do baralho
   * Se o baralho estiver vazio, recicla a pilha de descarte
   * 
   * @returns A carta comprada ou null se não houver mais cartas
   */
  comprarCarta(): Card | null {
    // Se baralho está vazio, tenta reciclar pilha
    if (this.baralho.length === 0) {
      if (this.pilhaDescarte.length > 1) {
        this.reciclarPilha();
      } else {
        // Não há mais cartas disponíveis
        this.emit('baralho-esgotado');
        return null;
      }
    }

    // Compra carta do topo (último elemento do array)
    const carta = this.baralho.pop();
    
    if (carta) {
      this.emit('carta-comprada', carta);
    }
    
    return carta ?? null;
  }

  /**
   * Descarta uma carta na pilha de descarte
   * Inicia reação se necessário
   * 
   * @param carta Carta a ser descartada
   * @param jogadorId ID do jogador que está descartando
   */
  descartarCarta(carta: Card, jogadorId: string): void {
    // Adiciona carta no topo da pilha (final do array)
    this.pilhaDescarte.push(carta);
    
    // Emite evento de descarte
    this.emit('carta-descartada', carta, jogadorId);
    
    // Inicia reação para descarte encadeado
    this.iniciarReacao(carta, jogadorId);
  }

  /**
   * Descarta uma carta com reação (para descarte encadeado)
   * Valida se a carta pode ser descartada na reação atual
   * 
   * @param carta Carta a ser descartada
   * @param jogadorId ID do jogador que está descartando
   * @returns true se o descarte foi bem-sucedido, false caso contrário
   */
  descartarComReacao(carta: Card, jogadorId: string): boolean {
    // Verifica se pode descartar na reação
    if (!this.podeDescartarReacao(carta, jogadorId)) {
      return false;
    }

    // Descarta a carta
    this.pilhaDescarte.push(carta);
    
    // Emite evento de descarte
    this.emit('carta-descartada', carta, jogadorId);
    
    return true;
  }

  /**
   * Verifica se um jogador pode descartar uma carta na reação atual
   * 
   * @param carta Carta que o jogador quer descartar
   * @param jogadorId ID do jogador
   * @returns true se pode descartar, false caso contrário
   */
  podeDescartarReacao(carta: Card, jogadorId: string): boolean {
    // Deve haver reação ativa
    if (!this.reacaoAtiva || !this.cartaReacao) {
      return false;
    }

    // Jogador não pode reagir à própria carta
    if (jogadorId === this.jogadorOrigem) {
      return false;
    }

    // Carta deve ter o mesmo nome (independente de naipe)
    return carta.equals(this.cartaReacao);
  }

  /**
   * Inicia uma janela de reação para descarte encadeado
   * Outros jogadores podem descartar cartas do mesmo valor
   * 
   * @param carta Carta que iniciou a reação
   * @param jogadorId ID do jogador que descartou
   */
  private iniciarReacao(carta: Card, jogadorId: string): void {
    // Define estado de reação
    this.reacaoAtiva = true;
    this.cartaReacao = carta;
    this.jogadorOrigem = jogadorId;

    // Emite evento de reação iniciada
    this.emit('reacao-iniciada', carta, jogadorId);

    // Limpa timer anterior se existir
    if (this.reacaoTimer) {
      clearTimeout(this.reacaoTimer);
    }

    // Define timer para finalizar reação automaticamente
    this.reacaoTimer = setTimeout(() => {
      this.finalizarReacao();
    }, this.tempoReacao);
  }

  /**
   * Finaliza a janela de reação atual
   */
  finalizarReacao(): void {
    this.reacaoAtiva = false;
    this.cartaReacao = null;
    this.jogadorOrigem = null;

    if (this.reacaoTimer) {
      clearTimeout(this.reacaoTimer);
      this.reacaoTimer = null;
    }

    this.emit('reacao-finalizada');
  }

  /**
   * Recicla a pilha de descarte para virar novo baralho de compra
   * Mantém apenas a última carta descartada (topo da pilha) visível
   */
  reciclarPilha(): void {
    if (this.pilhaDescarte.length <= 1) {
      return; // Não há cartas suficientes para reciclar
    }

    // Pega a última carta (topo da pilha) para manter visível
    const topoPilha = this.pilhaDescarte.pop()!;

    // Pega o resto da pilha e embaralha
    const restoPilha = this.pilhaDescarte;
    this.baralho = embaralharDeck(restoPilha);

    // Coloca o topo de volta na pilha (agora vazia)
    this.pilhaDescarte = [topoPilha];

    // Emite evento de reciclagem
    this.emit('pilha-reciclada');
  }

  /**
   * Retorna a carta do topo da pilha de descarte sem removê-la
   * 
   * @returns Carta do topo ou null se pilha estiver vazia
   */
  pegarTopoDescarte(): Card | null {
    if (this.pilhaDescarte.length === 0) {
      return null;
    }
    return this.pilhaDescarte[this.pilhaDescarte.length - 1];
  }

  /**
   * Retorna o número de cartas no baralho de compra
   */
  getBaralhoSize(): number {
    return this.baralho.length;
  }

  /**
   * Retorna o número de cartas na pilha de descarte
   */
  getPilhaSize(): number {
    return this.pilhaDescarte.length;
  }

  /**
   * Verifica se há reação ativa no momento
   */
  isReacaoAtiva(): boolean {
    return this.reacaoAtiva;
  }

  /**
   * Retorna a carta que gerou a reação atual
   */
  getCartaReacao(): Card | null {
    return this.cartaReacao;
  }

  /**
   * Define o tempo de janela de reação em milissegundos
   * 
   * @param tempo Tempo em milissegundos
   */
  setTempoReacao(tempo: number): void {
    this.tempoReacao = tempo;
  }

  /**
   * Retorna o tempo de janela de reação atual
   */
  getTempoReacao(): number {
    return this.tempoReacao;
  }

  /**
   * Valida se uma carta pode ser descartada em reação a outra
   * 
   * @param carta Carta a ser validada
   * @param cartaDescartada Carta que foi descartada originalmente
   * @returns true se as cartas têm o mesmo valor (mesmo nome)
   */
  validarDescarte(carta: Card, cartaDescartada: Card): boolean {
    return carta.equals(cartaDescartada);
  }

  /**
   * Limpa todos os recursos e listeners
   * Útil para resetar o estado do gerenciador
   */
  limpar(): void {
    this.baralho = [];
    this.pilhaDescarte = [];
    this.reacaoAtiva = false;
    this.cartaReacao = null;
    this.jogadorOrigem = null;

    if (this.reacaoTimer) {
      clearTimeout(this.reacaoTimer);
      this.reacaoTimer = null;
    }

    this.removeAllListeners();
  }
}

