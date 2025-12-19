import { Player } from '../models/Player';
import { EventEmitter } from '../utils/EventEmitter';
import { Result, success, failure } from '../types/Result';
import { GameResult } from '../types/GameState';
import { TurnManagerEvents } from './TurnManagerEvents';
import { TurnInfo, EndGameState, RankingEntry } from './TurnManagerTypes';

/**
 * Gerenciador de turnos do jogo Cunoku
 * 
 * Responsabilidades:
 * - Controlar ordem dos jogadores (2 a 6)
 * - Contar número de turnos
 * - Permitir declaração de fim após 5 turnos
 * - Executar rodada final até retornar ao jogador que declarou fim
 * - Finalizar partida e calcular ranking
 * 
 * O TurnManager é totalmente desacoplado e pode ser usado independentemente.
 */
export class TurnManager extends EventEmitter<TurnManagerEvents> {
  /** Lista de jogadores na ordem de jogo */
  private players: Player[] = [];

  /** Índice do jogador atual na lista */
  private currentPlayerIndex: number = 0;

  /** Número do turno atual (incrementa a cada rodada completa) */
  private turnNumber: number = 0;

  /** Se o fim do jogo foi declarado */
  private endGameDeclared: boolean = false;

  /** ID do jogador que declarou fim */
  private endGameDeclaredBy: string | null = null;

  /** Número de turnos restantes após declaração de fim */
  private turnsRemaining: number | null = null;

  /**
   * Inicializa o TurnManager com a lista de jogadores
   * Valida número de jogadores (2 a 6) e define ordem inicial
   * 
   * @param players Lista de jogadores
   */
  inicializar(players: Player[]): void {
    // Valida número de jogadores
    if (players.length < 2 || players.length > 6) {
      throw new Error('Número de jogadores deve ser entre 2 e 6');
    }

    // Inicializa estado
    this.players = [...players];
    this.currentPlayerIndex = 0;
    this.turnNumber = 1; // Primeiro turno
    this.endGameDeclared = false;
    this.endGameDeclaredBy = null;
    this.turnsRemaining = null;

    // Emite evento de turno iniciado
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer) {
      this.emit('turno-iniciado', currentPlayer.id, this.turnNumber);
    }
  }

  /**
   * Retorna o jogador atual
   */
  getCurrentPlayer(): Player | null {
    if (this.players.length === 0 || this.currentPlayerIndex >= this.players.length) {
      return null;
    }
    return this.players[this.currentPlayerIndex];
  }

  /**
   * Retorna o ID do jogador atual
   */
  getCurrentPlayerId(): string | null {
    const player = this.getCurrentPlayer();
    return player?.id ?? null;
  }

  /**
   * Retorna o número do turno atual
   */
  getTurnNumber(): number {
    return this.turnNumber;
  }

  /**
   * Retorna informações sobre o turno atual
   */
  getTurnInfo(): TurnInfo {
    return {
      turnNumber: this.turnNumber,
      currentPlayerId: this.getCurrentPlayerId(),
      currentPlayer: this.getCurrentPlayer(),
      currentPlayerIndex: this.currentPlayerIndex,
      totalPlayers: this.players.length,
    };
  }

  /**
   * Retorna estado de fim de jogo
   */
  getEndGameState(): EndGameState {
    return {
      endGameDeclared: this.endGameDeclared,
      declaredBy: this.endGameDeclaredBy,
      turnsRemaining: this.turnsRemaining,
      isFinalRound: this.endGameDeclared && this.turnsRemaining !== null && this.turnsRemaining > 0,
    };
  }

  /**
   * Verifica se pode declarar fim do jogo
   * Requisito: mínimo de 5 turnos
   */
  canDeclareEnd(): boolean {
    return this.turnNumber >= 5 && !this.endGameDeclared;
  }

  /**
   * Verifica se está na fase de rodada final
   */
  isEndGamePhase(): boolean {
    return this.endGameDeclared && this.turnsRemaining !== null && this.turnsRemaining > 0;
  }

  /**
   * Declara fim do jogo
   * Valida se pode declarar (mínimo 5 turnos) e se o jogador é o ativo
   * 
   * @param playerId ID do jogador que está declarando fim
   */
  declararFim(playerId: string): Result<void> {
    // Valida se pode declarar fim
    if (!this.canDeclareEnd()) {
      return failure('É necessário pelo menos 5 turnos para declarar fim');
    }

    // Valida se é o jogador ativo
    if (this.getCurrentPlayerId() !== playerId) {
      return failure('Apenas o jogador ativo pode declarar fim');
    }

    // Valida se já foi declarado
    if (this.endGameDeclared) {
      return failure('Fim do jogo já foi declarado');
    }

    // Declara fim
    this.endGameDeclared = true;
    this.endGameDeclaredBy = playerId;
    // Define turnos restantes = número de jogadores (uma rodada completa)
    this.turnsRemaining = this.players.length;

    // Emite evento
    this.emit('fim-declarado', playerId, this.turnsRemaining);

    return success(undefined);
  }

  /**
   * Avança para o próximo turno
   * Incrementa turno quando volta ao primeiro jogador
   * Processa rodada final se necessário
   */
  nextTurn(): void {
    if (this.players.length === 0) {
      return;
    }

    // Se está na rodada final, decrementa turnos restantes
    if (this.isEndGamePhase() && this.turnsRemaining !== null) {
      this.turnsRemaining--;

      // Verifica se rodada final foi completada
      if (this.turnsRemaining <= 0) {
        this.emit('rodada-final-completa');
        return;
      }
    }

    // Emite evento de turno finalizado
    const currentPlayerId = this.getCurrentPlayerId();
    if (currentPlayerId) {
      this.emit('turno-finalizado', currentPlayerId);
    }

    // Avança para próximo jogador
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;

    // Incrementa turno se voltou ao primeiro jogador
    if (this.currentPlayerIndex === 0) {
      this.turnNumber++;
    }

    // Emite evento de novo turno iniciado
    const newPlayer = this.getCurrentPlayer();
    if (newPlayer) {
      this.emit('turno-iniciado', newPlayer.id, this.turnNumber);
    }
  }

  /**
   * Processa um turno na rodada final
   * Retorna true se a rodada final foi completada
   */
  processarRodadaFinal(): boolean {
    if (!this.isEndGamePhase()) {
      return false;
    }

    // Avança turno (já decrementa turnos restantes)
    this.nextTurn();

    // Verifica se completou rodada final
    return this.turnsRemaining !== null && this.turnsRemaining <= 0;
  }

  /**
   * Calcula o ranking dos jogadores
   * Ordena por pontuação (menor primeiro)
   * Trata empates atribuindo mesma posição
   * 
   * @param players Lista de jogadores (pode ser diferente da ordem atual)
   */
  calcularRanking(players: Player[]): RankingEntry[] {
    // Calcula pontuações
    const entries: RankingEntry[] = players.map((player) => ({
      player,
      score: player.calcularPontuacao(),
      position: 0, // Será atribuído depois
    }));

    // Ordena por pontuação (menor primeiro)
    entries.sort((a, b) => a.score - b.score);

    // Atribui posições (trata empates)
    let currentPosition = 1;
    for (let i = 0; i < entries.length; i++) {
      if (i > 0 && entries[i].score > entries[i - 1].score) {
        currentPosition = i + 1;
      }
      entries[i].position = currentPosition;
    }

    return entries;
  }

  /**
   * Finaliza a partida e calcula resultado completo
   * Calcula pontuações, gera ranking e identifica vencedor
   */
  finalizarPartida(): GameResult {
    // Calcula ranking
    const ranking = this.calcularRanking(this.players);

    // Converte para formato GameResult
    const classificacao = ranking.map((entry) => ({
      jogador: entry.player,
      pontuacao: entry.score,
      posicao: entry.position,
    }));

    // Identifica vencedor (primeiro lugar)
    const vencedor = classificacao[0].jogador;
    const pontuacaoVencedor = classificacao[0].pontuacao;

    const resultado: GameResult = {
      classificacao,
      vencedor,
      pontuacaoVencedor,
      turnosTotais: this.turnNumber,
    };

    // Emite evento
    this.emit('partida-finalizada', resultado);

    return resultado;
  }

  /**
   * Retorna lista de jogadores na ordem atual
   */
  getPlayers(): Player[] {
    return [...this.players];
  }

  /**
   * Retorna número total de jogadores
   */
  getTotalPlayers(): number {
    return this.players.length;
  }

  /**
   * Verifica se um jogador é o ativo no momento
   */
  isCurrentPlayer(playerId: string): boolean {
    return this.getCurrentPlayerId() === playerId;
  }

  /**
   * Retorna o índice de um jogador na ordem
   */
  getPlayerIndex(playerId: string): number {
    return this.players.findIndex((p) => p.id === playerId);
  }

  /**
   * Retorna o próximo jogador na ordem (sem avançar)
   */
  getNextPlayer(): Player | null {
    if (this.players.length === 0) {
      return null;
    }
    const nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
    return this.players[nextIndex];
  }

  /**
   * Reseta o TurnManager
   */
  reset(): void {
    this.players = [];
    this.currentPlayerIndex = 0;
    this.turnNumber = 0;
    this.endGameDeclared = false;
    this.endGameDeclaredBy = null;
    this.turnsRemaining = null;
    this.removeAllListeners();
  }
}

