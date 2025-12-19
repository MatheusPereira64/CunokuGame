import { GameState } from '../enums/GameState';
import { ActionType } from '../enums/ActionType';
import { Ability } from '../enums/Ability';
import { Player } from '../models/Player';
import { Card } from '../models/Card';
import { DeckManager } from '../managers/DeckManager';
import { EventEmitter } from '../utils/EventEmitter';
import { Result, success, failure } from '../types/Result';
import {
  GameStateData,
  TurnState,
  AbilityState,
  GameResult,
} from '../types/GameState';
import { RulesEngineEvents } from './RulesEngineEvents';
import { TurnValidator } from './validators/TurnValidator';
import { ActionValidator } from './validators/ActionValidator';
import { AbilityValidator } from './validators/AbilityValidator';

/**
 * Motor de regras do jogo Cunoku
 * 
 * Responsabilidades:
 * - Controlar estado do jogo e turnos
 * - Validar e executar ações dos jogadores
 * - Implementar todas as regras do jogo
 * - Emitir eventos para notificar mudanças
 * 
 * O motor é totalmente desacoplado da interface e pode ser testado independentemente.
 */
export class RulesEngine extends EventEmitter<RulesEngineEvents> {
  private gameState: GameStateData;
  private deckManager: DeckManager;

  constructor() {
    super();
    this.deckManager = new DeckManager();
    this.gameState = this.criarEstadoInicial();
    this.configurarListenersDeckManager();
  }

  /**
   * Cria estado inicial do jogo
   */
  private criarEstadoInicial(): GameStateData {
    return {
      estado: GameState.WAITING,
      players: [],
      turnState: {
        jogadorAtivo: null,
        turnoAtual: 0,
        cartaComprada: null,
        cartaCompradaNesteTurno: false,
        turnoFinalizado: false,
      },
      abilityState: null,
      fimDeclarado: false,
      jogadorDeclarouFim: null,
      turnosRestantesFim: null,
    };
  }

  /**
   * Configura listeners do DeckManager
   */
  private configurarListenersDeckManager(): void {
    this.deckManager.on('reacao-iniciada', (carta, jogadorId) => {
      this.gameState.estado = GameState.REACTION;
      this.emit('reacao-iniciada', carta, jogadorId);
    });

    this.deckManager.on('reacao-finalizada', () => {
      if (this.gameState.estado === GameState.REACTION) {
        this.gameState.estado = GameState.PLAYING;
      }
    });
  }

  /**
   * Inicializa uma nova partida
   */
  inicializar(players: Player[]): void {
    // Valida número de jogadores
    if (players.length < 2 || players.length > 6) {
      throw new Error('Número de jogadores deve ser entre 2 e 6');
    }

    // Inicializa estado
    this.gameState = {
      estado: GameState.PLAYING,
      players: [...players],
      turnState: {
        jogadorAtivo: players[0].id,
        turnoAtual: 1,
        cartaComprada: null,
        cartaCompradaNesteTurno: false,
        turnoFinalizado: false,
      },
      abilityState: null,
      fimDeclarado: false,
      jogadorDeclarouFim: null,
      turnosRestantesFim: null,
    };

    // Inicializa baralho
    this.deckManager.inicializar(players.length);

    // Distribui cartas iniciais (4 cartas por jogador)
    players.forEach((player) => {
      for (let i = 0; i < 4; i++) {
        const carta = this.deckManager.comprarCarta();
        if (carta) {
          player.comprarCarta(carta);
        }
      }
    });
  }

  /**
   * Retorna o estado atual do jogo
   * Nota: Retorna referência direta. Para cópia, use getGameStateCopy()
   */
  getGameState(): GameStateData {
    return this.gameState;
  }

  /**
   * Retorna uma cópia do estado atual do jogo
   * Útil quando precisa modificar sem afetar o estado original
   */
  getGameStateCopy(): GameStateData {
    return JSON.parse(JSON.stringify(this.gameState));
  }

  /**
   * Retorna ações permitidas para um jogador
   */
  getAcoesPermitidas(jogadorId: string): ActionType[] {
    return TurnValidator.getAcoesPermitidas(this.gameState, jogadorId);
  }

  /**
   * Compra uma carta do baralho (obrigatório no início do turno)
   */
  comprarCarta(jogadorId: string): Result<Card> {
    const erro = ActionValidator.validarCompra(this.gameState, jogadorId);
    if (erro) {
      return failure(erro);
    }

    const carta = this.deckManager.comprarCarta();
    if (!carta) {
      return failure('Não há mais cartas no baralho');
    }

    // Atualiza estado do turno
    this.gameState.turnState.cartaComprada = carta;
    this.gameState.turnState.cartaCompradaNesteTurno = true;

    // Emite evento
    this.emit('carta-comprada', jogadorId, carta);

    return success(carta);
  }

  /**
   * Usa habilidade "Ver carta de oponente" (cartas 5 e 6)
   */
  usarHabilidadeVerOponente(
    carta: Card,
    jogadorId: string,
    oponenteId: string,
    indiceCarta: number
  ): Result<Card> {
    const erro = AbilityValidator.validarVerOponente(
      this.gameState,
      jogadorId,
      carta,
      oponenteId,
      indiceCarta
    );
    if (erro) {
      return failure(erro);
    }

    const oponente = this.gameState.players.find((p) => p.id === oponenteId);
    if (!oponente || indiceCarta >= oponente.getMaoSize()) {
      return failure('Carta não encontrada');
    }

    const cartaVista = oponente.mao[indiceCarta];

    // Atualiza estado de habilidade
    this.gameState.abilityState = {
      tipo: Ability.SEE_OPPONENT,
      carta,
      jogadorId,
      dados: { oponenteId, indiceCarta, cartaVista },
      completada: true,
    };

    this.emit('habilidade-usada', jogadorId, Ability.SEE_OPPONENT, {
      oponenteId,
      indiceCarta,
      cartaVista: cartaVista.nome,
    });

    return success(cartaVista);
  }

  /**
   * Usa habilidade "Ver carta própria" (cartas 7 e 8)
   */
  usarHabilidadeVerPropria(
    carta: Card,
    jogadorId: string,
    indiceCarta: number
  ): Result<Card> {
    const erro = AbilityValidator.validarVerPropria(
      this.gameState,
      jogadorId,
      carta,
      indiceCarta
    );
    if (erro) {
      return failure(erro);
    }

    const jogador = this.gameState.players.find((p) => p.id === jogadorId);
    if (!jogador || indiceCarta >= jogador.getMaoSize()) {
      return failure('Carta não encontrada');
    }

    const cartaVista = jogador.mao[indiceCarta];

    // Atualiza estado de habilidade
    this.gameState.abilityState = {
      tipo: Ability.SEE_OWN,
      carta,
      jogadorId,
      dados: { indiceCarta, cartaVista },
      completada: true,
    };

    this.emit('habilidade-usada', jogadorId, Ability.SEE_OWN, {
      indiceCarta,
      cartaVista: cartaVista.nome,
    });

    return success(cartaVista);
  }

  /**
   * Usa habilidade "Trocar cartas" (cartas 9 e 10)
   */
  usarHabilidadeTrocarCartas(
    carta: Card,
    jogadorId: string,
    jogador1Id: string,
    carta1Index: number,
    jogador2Id: string,
    carta2Index: number
  ): Result<void> {
    const erro = AbilityValidator.validarTrocarCartas(
      this.gameState,
      jogadorId,
      carta,
      jogador1Id,
      carta1Index,
      jogador2Id,
      carta2Index
    );
    if (erro) {
      return failure(erro);
    }

    const jogador1 = this.gameState.players.find((p) => p.id === jogador1Id);
    const jogador2 = this.gameState.players.find((p) => p.id === jogador2Id);

    if (!jogador1 || !jogador2) {
      return failure('Jogadores não encontrados');
    }

    // Efetua a troca
    const carta1 = jogador1.mao[carta1Index];
    const carta2 = jogador2.mao[carta2Index];

    jogador1.mao[carta1Index] = carta2;
    jogador2.mao[carta2Index] = carta1;

    // Atualiza estado de habilidade
    this.gameState.abilityState = {
      tipo: Ability.SWAP_CARDS,
      carta,
      jogadorId,
      dados: { jogador1Id, carta1Index, jogador2Id, carta2Index },
      completada: true,
    };

    this.emit('habilidade-usada', jogadorId, Ability.SWAP_CARDS, {
      jogador1Id,
      jogador2Id,
      carta1Index,
      carta2Index,
    });

    return success(undefined);
  }

  /**
   * Substitui uma carta da mão pela carta comprada
   */
  substituirCarta(
    jogadorId: string,
    indiceMao: number,
    cartaComprada: Card
  ): Result<Card> {
    const erro = ActionValidator.validarSubstituicao(
      this.gameState,
      jogadorId,
      indiceMao
    );
    if (erro) {
      return failure(erro);
    }

    if (!this.gameState.turnState.cartaComprada?.equals(cartaComprada)) {
      return failure('Carta comprada não corresponde');
    }

    const jogador = this.gameState.players.find((p) => p.id === jogadorId);
    if (!jogador) {
      return failure('Jogador não encontrado');
    }

    // Substitui carta
    const cartaAntiga = jogador.substituirCarta(indiceMao, cartaComprada);
    if (!cartaAntiga) {
      return failure('Falha ao substituir carta');
    }

    // Descarta carta antiga
    this.deckManager.descartarCarta(cartaAntiga, jogadorId);
    this.emit('carta-descartada', jogadorId, cartaAntiga, false);

    // Limpa carta comprada
    this.gameState.turnState.cartaComprada = null;

    return success(cartaAntiga);
  }

  /**
   * Descarta uma carta (comprada ou da mão)
   */
  descartarCarta(
    jogadorId: string,
    indiceMao?: number,
    descartarComprada: boolean = false
  ): Result<Card> {
    const erro = ActionValidator.validarDescarte(
      this.gameState,
      jogadorId,
      indiceMao,
      descartarComprada
    );
    if (erro) {
      return failure(erro);
    }

    const jogador = this.gameState.players.find((p) => p.id === jogadorId);
    if (!jogador) {
      return failure('Jogador não encontrado');
    }

    let cartaDescartada: Card | null = null;

    if (descartarComprada) {
      // Descarta carta comprada
      if (!this.gameState.turnState.cartaComprada) {
        return failure('Não há carta comprada para descartar');
      }
      cartaDescartada = this.gameState.turnState.cartaComprada;
      this.deckManager.descartarCarta(cartaDescartada, jogadorId);
      this.gameState.turnState.cartaComprada = null;
    } else {
      // Descarta carta da mão
      if (indiceMao === undefined) {
        return failure('Índice da carta não especificado');
      }
      cartaDescartada = jogador.descartarCarta(indiceMao);
      if (!cartaDescartada) {
        return failure('Falha ao descartar carta');
      }

      // Verifica se descartou carta errada (validação simplificada)
      // Em um jogo real, isso seria validado pela interface
      const descartouErrado = false; // TODO: implementar validação real

      if (descartouErrado) {
        this.aplicarPunicao(jogadorId);
        return failure('Carta descartada incorretamente. Punição aplicada.');
      }

      // Descarta e inicia reação
      this.deckManager.descartarCarta(cartaDescartada, jogadorId);
    }

    this.emit('carta-descartada', jogadorId, cartaDescartada, false);

    return success(cartaDescartada);
  }

  /**
   * Descarta carta em reação (descarte encadeado)
   */
  descartarReacao(jogadorId: string, indiceMao: number): Result<Card> {
    const erro = ActionValidator.validarDescarteReacao(
      this.gameState,
      jogadorId,
      indiceMao
    );
    if (erro) {
      return failure(erro);
    }

    const jogador = this.gameState.players.find((p) => p.id === jogadorId);
    if (!jogador) {
      return failure('Jogador não encontrado');
    }

    const carta = jogador.mao[indiceMao];
    if (!carta) {
      return failure('Carta não encontrada');
    }

    // Verifica se pode descartar em reação
    if (!this.deckManager.podeDescartarReacao(carta, jogadorId)) {
      return failure('Carta não pode ser descartada nesta reação');
    }

    // Remove da mão
    const cartaRemovida = jogador.descartarCarta(indiceMao);
    if (!cartaRemovida) {
      return failure('Falha ao remover carta da mão');
    }

    // Descarta via DeckManager
    const sucesso = this.deckManager.descartarComReacao(cartaRemovida, jogadorId);
    if (!sucesso) {
      // Recoloca carta na mão se falhar
      jogador.comprarCarta(cartaRemovida);
      return failure('Falha ao descartar em reação');
    }

    this.emit('carta-descartada', jogadorId, cartaRemovida, true);

    return success(cartaRemovida);
  }

  /**
   * Aplica punição por descarte errado (compra 2 cartas)
   */
  aplicarPunicao(jogadorId: string): void {
    const jogador = this.gameState.players.find((p) => p.id === jogadorId);
    if (!jogador) {
      return;
    }

    // Compra 2 cartas
    for (let i = 0; i < 2; i++) {
      const carta = this.deckManager.comprarCarta();
      if (carta) {
        jogador.comprarCarta(carta);
      }
    }

    this.emit('punicao-aplicada', jogadorId, 2);
  }

  /**
   * Declara fim do jogo
   */
  declararFim(jogadorId: string): Result<void> {
    const erro = ActionValidator.validarDeclararFim(this.gameState, jogadorId);
    if (erro) {
      return failure(erro);
    }

    this.gameState.fimDeclarado = true;
    this.gameState.jogadorDeclarouFim = jogadorId;
    this.gameState.turnosRestantesFim = this.gameState.players.length;

    this.emit('fim-declarado', jogadorId, this.gameState.turnosRestantesFim);

    return success(undefined);
  }

  /**
   * Finaliza o turno atual e avança para o próximo jogador
   */
  finalizarTurno(): void {
    if (this.gameState.turnState.turnoFinalizado) {
      return;
    }

    const jogadorAtual = this.gameState.turnState.jogadorAtivo;
    if (!jogadorAtual) {
      return;
    }

    // Se fim foi declarado, decrementa turnos restantes
    if (this.gameState.fimDeclarado && this.gameState.turnosRestantesFim !== null) {
      this.gameState.turnosRestantesFim--;

      // Verifica se chegou no jogador que declarou fim
      if (this.gameState.turnosRestantesFim <= 0) {
        this.finalizarPartida();
        return;
      }
    }

    // Descarta carta comprada se ainda estiver na mão do jogador
    // (não deveria acontecer, mas garante consistência)
    if (this.gameState.turnState.cartaComprada) {
      const jogador = this.gameState.players.find((p) => p.id === jogadorAtual);
      if (jogador && jogador.temCarta(this.gameState.turnState.cartaComprada)) {
        this.deckManager.descartarCarta(
          this.gameState.turnState.cartaComprada,
          jogadorAtual
        );
      }
    }

    // Emite evento de turno finalizado
    this.emit('turno-finalizado', jogadorAtual);

    // Avança para próximo jogador
    this.avancarJogador();

    // Reseta estado do turno
    this.gameState.turnState.cartaComprada = null;
    this.gameState.turnState.cartaCompradaNesteTurno = false;
    this.gameState.turnState.turnoFinalizado = false;
    this.gameState.abilityState = null;

    // Inicia próximo turno
    if (this.gameState.estado === GameState.PLAYING) {
      this.emit('turno-iniciado', this.gameState.turnState.jogadorAtivo!, this.gameState.turnState.turnoAtual);
    }
  }

  /**
   * Avança para o próximo jogador
   */
  private avancarJogador(): void {
    const indiceAtual = this.gameState.players.findIndex(
      (p) => p.id === this.gameState.turnState.jogadorAtivo
    );

    if (indiceAtual === -1) {
      return;
    }

    const proximoIndice = (indiceAtual + 1) % this.gameState.players.length;
    this.gameState.turnState.jogadorAtivo = this.gameState.players[proximoIndice].id;

    // Incrementa turno se voltou ao primeiro jogador
    if (proximoIndice === 0) {
      this.gameState.turnState.turnoAtual++;
    }
  }

  /**
   * Finaliza a partida e calcula resultado
   */
  finalizarPartida(): GameResult {
    this.gameState.estado = GameState.GAME_OVER;

    // Calcula pontuações
    const classificacao = this.gameState.players
      .map((player) => ({
        jogador: player,
        pontuacao: player.calcularPontuacao(),
        posicao: 0, // Será preenchido depois
      }))
      .sort((a, b) => a.pontuacao - b.pontuacao);

    // Atribui posições
    classificacao.forEach((item, index) => {
      item.posicao = index + 1;
    });

    const vencedor = classificacao[0].jogador;
    const pontuacaoVencedor = classificacao[0].pontuacao;

    const resultado: GameResult = {
      classificacao,
      vencedor,
      pontuacaoVencedor,
      turnosTotais: this.gameState.turnState.turnoAtual,
    };

    this.emit('partida-finalizada', resultado);

    return resultado;
  }
}

