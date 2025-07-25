<template>
  <div class="cunoku-game">
    <!-- Notificação pop-up -->
    <transition name="fade">
      <div v-if="mensagemStatus" class="popup-notificacao">
        {{ mensagemStatus }}
      </div>
    </transition>
    <div v-if="!estado">
      <p>{{ t('waitingPlayers') }}</p>
    </div>
    <div v-else>
      <div class="mesa-cartas">
        <!-- Baralho -->
        <div class="coluna-cartas">
          <div class="baralho">
            <span v-if="estado.baralho.length > 0">
              <div class="verso-carta" style="width:60px;height:90px;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:2.2rem;color:#eebbc3;">🂠</span>
              </div>
            </span>
            <span v-else style="color:#d4af37;">Vazio</span>
          </div>
          <span class="legenda-area">Baralho<br>({{ estado.baralho.length }})</span>
        </div>
        <!-- Pilha de Descarte -->
        <div class="coluna-cartas">
          <div class="pilha">
            <CartaSvg v-if="estado.pilha.length > 0" :valor="mapValorSvg(estado.pilha[estado.pilha.length-1].nome)" :naipe="mapNaipeSvg(estado.pilha[estado.pilha.length-1].naipe)" :width="60" :height="90" />
            <span v-else style="color:#d4af37;">Vazio</span>
          </div>
          <span class="legenda-area">Descarte<br>({{ estado.pilha.length }})</span>
        </div>
        <!-- Mão do Jogador -->
        <div class="coluna-cartas">
          <span class="legenda-area">Sua mão</span>
          <div class="mao mesa-mao">
            <div v-for="(carta, idx) in maoReal" :key="idx" class="carta-btn animate__animated animate__fadeInUp">
              <CartaSvg v-if="cartaEstaRevelada(idx)" :valor="mapValorSvg(carta.nome)" :naipe="mapNaipeSvg(carta.naipe)" :width="60" :height="90" />
              <div v-else class="verso-carta" style="width:60px;height:90px;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:2.2rem;color:#eebbc3;">🂠</span>
              </div>
              <button v-if="indiceDescarteTentativa === null" class="btn-descartar-carta" @click="tentarDescarte(idx)">Descartar</button>
            </div>
          </div>
          <!-- Seleção de segunda carta para descarte -->
          <div v-if="indiceDescarteTentativa !== null" class="mensagem-pilha">
            <p>Selecione outra carta que você acredita ter o mesmo valor para descartar junto:</p>
            <div class="mao">
              <button v-for="(carta, idx2) in maoReal" :key="'descartar-'+idx2" v-if="idx2 !== indiceDescarteTentativa" class="carta-btn" @click="confirmarDescarte(idx2)">
                <span style="font-size:2.2rem;color:#eebbc3;">🂠</span>
              </button>
            </div>
            <button class="btn-principal" @click="cancelarDescarte">Cancelar</button>
          </div>
        </div>
      </div>
      <!-- Jogadores -->
      <div class="jogadores-area">
        <h2>Jogadores</h2>
        <ul>
          <li v-for="(player, idx) in estado.players" :key="idx">
            <b v-if="idx === estado.jogadorDaVez" style="color:#ffe082;">▶</b>
            {{ player.nome }} - Cartas: {{ player.mao.length }}
            <span v-if="idx === meuIndice">(Você)</span>
          </li>
        </ul>
      </div>
      <!-- Ações do Jogador -->
      <div v-if="estado.jogadorDaVez === meuIndice">
        <button class="btn-principal" @click="comprarCarta" v-if="!escolhendoAcao && !acaoPendente">Comprar carta</button>
        <!-- Fluxo de escolha de ação ao comprar carta -->
        <div v-if="escolhendoAcao && cartaComprada" class="acao-compra mesa-acao-compra">
          <h4>Você comprou:</h4>
          <CartaSvg :valor="mapValorSvg(cartaComprada.nome)" :naipe="mapNaipeSvg(cartaComprada.naipe)" :width="60" :height="90" />
          <p>Escolha o que fazer:</p>
          <ul>
            <li>
              <button class="btn-acao" @click="indiceSubstituir = indiceSubstituir === null ? 0 : null" :disabled="indiceSubstituir !== null">Substituir uma carta da mão</button>
              <div v-if="indiceSubstituir !== null">
                <span>Selecione a carta da mão para substituir:</span>
                <div class="mao">
                  <button v-for="(carta, idx) in estado.players[meuIndice]?.mao || []" :key="'sub-'+idx" class="carta-btn" @click="substituirCarta(idx)">
                    <div class="verso-carta" style="width:60px;height:90px;display:flex;align-items:center;justify-content:center;">
                      <span style="font-size:2.2rem;color:#eebbc3;">🂠</span>
                    </div>
                  </button>
                </div>
                <button class="btn-principal" @click="indiceSubstituir = null">Cancelar</button>
              </div>
            </li>
            <li>
              <button class="btn-acao" @click="descartarCartaComprada">Descartar carta comprada</button>
            </li>
            <li>
              <button class="btn-acao" @click="usarHabilidade">Usar habilidade da carta</button>
            </li>
          </ul>
        </div>
      </div>
      <div v-else>
        <p style="color:#ffe082;">Aguarde sua vez...</p>
      </div>
      <!-- Botão de fim de jogo -->
    </div>
    <div v-if="escolhendoCartaPropria">
      <div class="habilidade-msg">
        <p>Escolha uma carta da sua mão para ver:</p>
        <div class="mao">
          <button v-for="(carta, idx) in estado.players[meuIndice]?.mao || []" :key="'ver-'+idx" class="carta-btn" @click="escolherCartaPropria(idx)">
            <div class="verso-carta" style="width:60px;height:90px;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:2.2rem;color:#eebbc3;">🂠</span>
            </div>
          </button>
        </div>
      </div>
    </div>
    <div v-if="escolhendoCartaOponente">
      <div class="habilidade-msg">
        <p>Escolha um oponente para ver uma carta:</p>
        <ul>
          <li v-for="op in oponentesDisponiveis" :key="op.idx">
            <button class="btn-acao" @click="escolherCartaOponente(op.idx)">{{ op.nome }} ({{ op.qtd }} cartas)</button>
          </li>
        </ul>
        <div v-if="oponenteSelecionado !== null">
          <p>Escolha a carta do oponente {{ oponentesDisponiveis.find(o=>o.idx===oponenteSelecionado)?.nome }}:</p>
          <div class="mao">
            <button v-for="i in oponentesDisponiveis.find(o=>o.idx===oponenteSelecionado)?.qtd || 0" :key="'op-carta-'+i" class="carta-btn" @click="escolherCartaDoOponente(i-1)">
              <span>Carta {{ i }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="cartaRevelada" class="habilidade-msg">
      <p v-if="cartaRevelada.oponente">Você viu a carta do oponente {{ cartaRevelada.oponente }}: {{ cartaRevelada.carta.nome }} {{ cartaRevelada.carta.naipe || '' }}</p>
      <p v-else>Carta revelada: {{ cartaRevelada.carta.nome }} {{ cartaRevelada.carta.naipe || '' }}</p>
      <CartaSvg :valor="mapValorSvg(cartaRevelada.carta.nome)" :naipe="mapNaipeSvg(cartaRevelada.carta.naipe)" :width="60" :height="90" />
    </div>
    <div v-if="escolhendoJogadoresTroca">
      <div class="habilidade-msg">
        <p>Escolha dois jogadores para trocar cartas:</p>
        <ul>
          <li v-for="j in jogadoresDisponiveisTroca" :key="j.idx">
            <button class="btn-acao" :disabled="jogadoresSelecionadosTroca.includes(j.idx)" @click="escolherJogadorTroca(j.idx)">{{ j.nome }} ({{ j.qtd }} cartas)</button>
          </li>
        </ul>
        <div v-if="jogadoresSelecionadosTroca.length === 2">
          <button class="btn-principal" @click="confirmarJogadoresTroca">Confirmar troca</button>
        </div>
      </div>
    </div>
    <div v-if="aguardandoEscolhaTroca">
      <div class="habilidade-msg">
        <p>Escolha a carta para trocar do jogador {{ estado.players[jogadoresSelecionadosTroca[ordemTroca]]?.nome }}:</p>
        <div class="mao">
          <button v-for="i in qtdCartasTroca" :key="'troca-carta-'+i" class="carta-btn" @click="escolherCartaParaTroca(i-1)">
            <span>Carta {{ i }}</span>
          </button>
        </div>
      </div>
    </div>
    <div v-if="fimDeJogo && resultadoFinal">
      <h2>Fim de Jogo!</h2>
      <div>
        <h3>Cartas de todos os jogadores:</h3>
        <ul>
          <li v-for="(player, idx) in estado.players" :key="idx">
            <b>{{ player.nome }}</b>:
            <span v-for="(carta, cidx) in player.mao" :key="cidx">
              {{ carta.nome }}{{ carta.naipe ? ' ' + carta.naipe : '' }}
            </span>
            <span> | Soma: {{ resultadoFinal.somas.find(s => s.nome === player.nome)?.soma }}</span>
            <span v-if="resultadoFinal.vencedores.includes(player.nome)" style="color:#ffe082;font-weight:bold;"> ← Vencedor</span>
          </li>
        </ul>
      </div>
      <div>
        <h3>Vencedor{{ resultadoFinal.vencedores.length > 1 ? 'es' : '' }}:</h3>
        <ul>
          <li v-for="v in resultadoFinal.vencedores" :key="v">🏆 {{ v }}</li>
        </ul>
      </div>
    </div>
    <div v-else>
      <div v-if="estado && estado.turnoAtual >= 5 && !estado.fimDeclarado">
        <button class="btn-principal" @click="declararFimDeJogo">Declarar fim de jogo</button>
      </div>
      <div v-if="estado && estado.fimDeclarado && estado.turnosRestantesFim !== null">
        <div class="mensagem-pilha">Fim de jogo declarado! Restam {{ estado.turnosRestantesFim }} turnos até o final.</div>
      </div>
    </div>
  </div>
</template>

<script>
import CartaSvg from './CartaSvg.vue'
import { t } from '../i18n/index.js'
const VALORES_CARTAS = [
  { nome: 'Rei', valor: 0 },
  { nome: 'Às', valor: 1 },
  { nome: 'Cinco', valor: 5 },
  { nome: 'Seis', valor: 6 },
  { nome: 'Sete', valor: 7 },
  { nome: 'Oito', valor: 8 },
  { nome: 'Nove', valor: 9 },
  { nome: 'Dez', valor: 10 },
  { nome: 'Valete', valor: 11 },
  { nome: 'Rainha', valor: 12 },
  { nome: 'Coringa', valor: -1 },
];

const NAIPES = ['♠', '♥', '♦', '♣'];

function criarBaralho() {
  const baralho = [];
  for (const carta of VALORES_CARTAS) {
    if (carta.nome === 'Coringa') {
      baralho.push({ ...carta, naipe: null });
      baralho.push({ ...carta, naipe: null });
    } else {
      for (const naipe of NAIPES) {
        baralho.push({ ...carta, naipe });
      }
    }
  }
  for (let i = baralho.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
  }
  return baralho;
}

export default {
  name: 'CunokuGame',
  props: {
    numJogadores: { type: Number, default: 2 },
    jogador: { type: Object, default: null },
    socket: { type: Object, default: null },
    sala: { type: String, default: '' },
    estadoInicial: { type: Object, default: null },
    modoBots: { type: Boolean, default: false }
  },
  data() {
    return {
      estado: this.estadoInicial || null,
      meuIndice: null,
      cartaComprada: null, // Nova carta comprada
      escolhendoAcao: false, // Se está escolhendo o que fazer com a carta
      indiceSubstituir: null, // Índice da carta a substituir
      escolhendoCartaPropria: false, // Se está escolhendo carta para ver
      maxCartasProprias: 0, // Quantidade de cartas na mão
      cartaRevelada: null, // Carta revelada pela habilidade
      escolhendoCartaOponente: false, // Se está escolhendo carta de oponente
      oponentesDisponiveis: [], // Lista de oponentes para escolher
      oponenteSelecionado: null, // Índice do oponente selecionado
      escolhendoJogadoresTroca: false, // Se está escolhendo jogadores para troca
      jogadoresDisponiveisTroca: [], // Lista de jogadores para troca
      jogadoresSelecionadosTroca: [], // Índices dos jogadores selecionados
      cartasSelecionadasTroca: [], // NOVO: índices das cartas selecionadas para troca
      aguardandoEscolhaTroca: false, // Se está aguardando escolher carta para troca
      ordemTroca: null, // 0 ou 1, ordem da escolha da carta para troca
      qtdCartasTroca: 0, // Quantidade de cartas do jogador para troca
      cartasReveladas: [], // [{idx: 0, carta: {...}}]
      indiceDescarteTentativa: null, // NOVO: controle de descarte a qualquer momento
      mensagemStatus: '', // NOVO: mensagem de status
      fimDeJogo: false, // NOVO: controle de fim de jogo
      resultadoFinal: null, // NOVO: resultado do fim de jogo
      modoOffline: this.modoBots // Facilita checagem interna
    }
  },
  mounted() {
    if (this.modoOffline) {
      // Descobre o índice do jogador local
      this.meuIndice = this.estado.players.findIndex(p => p.nome === this.jogador.nome)
      // Se for vez de bot, já aciona
      this.$nextTick(() => {
        this.checarBotEVez()
      })
    }
  },
  computed: {
    maoReal() {
      // Mostra a mão real do backend, sem incluir carta comprada pendente
      if (!this.estado || this.meuIndice === null) return [];
      return this.estado.players[this.meuIndice]?.mao || [];
    },
    acaoPendente() {
      // Retorna true se há ação pendente para o jogador da vez
      return this.estado && this.estado.aguardandoAcao && this.estado.aguardandoAcao.jogador === this.meuIndice;
    },
  },
  watch: {
    socket: {
      immediate: true,
      handler(s) {
        if (s) {
          s.on('estado_jogo', (estado) => {
            // Detecta ação pendente para o jogador local
            if (estado && estado.aguardandoAcao && this.meuIndice !== null && estado.aguardandoAcao.jogador === this.meuIndice) {
              this.cartaComprada = estado.aguardandoAcao.carta;
              this.escolhendoAcao = true;
            } else {
              this.cartaComprada = null;
              this.escolhendoAcao = false;
            }
            this.estado = estado;
            // Descobre o índice do jogador local
            if (this.jogador && estado && estado.players) {
              this.meuIndice = estado.players.findIndex(p => p.nome === this.jogador.nome)
            }
          })
          s.on('escolher_carta_propria', ({ max }) => {
            this.escolhendoCartaPropria = true;
            this.maxCartasProprias = max;
          });
          s.on('carta_revelada', ({ carta, indice, oponente }) => {
            this.cartaRevelada = { carta, indice, oponente };
            // Revela apenas a carta escolhida da própria mão por 5 segundos
            if (typeof oponente === 'undefined' && typeof indice === 'number') {
              this.cartasReveladas.push({ idx: indice, carta });
              setTimeout(() => {
                this.cartasReveladas = this.cartasReveladas.filter(c => c.idx !== indice);
              }, 5000);
            }
            setTimeout(() => { this.cartaRevelada = null; }, 5000);
            this.escolhendoCartaPropria = false;
            this.escolhendoCartaOponente = false;
            this.oponenteSelecionado = null;
          });
          s.on('escolher_carta_oponente', ({ oponentes }) => {
            this.escolhendoCartaOponente = true;
            this.oponentesDisponiveis = oponentes;
            this.oponenteSelecionado = null;
          });
          s.on('escolher_jogadores_troca', ({ jogadores }) => {
            this.escolhendoJogadoresTroca = true;
            this.jogadoresDisponiveisTroca = jogadores;
            this.jogadoresSelecionadosTroca = [];
          });
          s.on('escolher_carta_para_troca', ({ idx, qtd, ordem }) => {
            this.aguardandoEscolhaTroca = true;
            this.ordemTroca = ordem;
            this.qtdCartasTroca = qtd;
          });
          s.on('mensagem', (msg) => {
            if (msg.tipo === 'fim_declarado') {
              this.mensagemStatus = `Fim de jogo declarado por ${msg.jogador}. O jogo terminará em 2 turnos completos!`;
            } else if (msg.tipo === 'descarte_correto') {
              this.mensagemStatus = `${msg.jogador} descartou duas cartas de valor ${msg.carta}!`;
            } else if (msg.tipo === 'descarte_errado') {
              this.mensagemStatus = `${msg.jogador} errou o descarte e comprou 2 cartas!`;
            } else if (msg.tipo === 'troca_cartas') {
              this.mensagemStatus = `O jogador ${msg.jogador} trocou a carta ${msg.cartaA} com a carta ${msg.cartaB} do Jogador ${msg.jogadorB}`;
              setTimeout(() => { this.mensagemStatus = ''; }, 4000);
            }
            setTimeout(() => { this.mensagemStatus = ''; }, 4000);
          });
          s.on('fim_de_jogo', (resultado) => {
            this.fimDeJogo = true;
            this.resultadoFinal = resultado;
            this.$emit && this.$emit('fim-de-jogo', resultado); // EMITIR EVENTO PARA O PAI
          });
        }
      }
    }
  },
  components: { CartaSvg },
  methods: {
    // Função de tradução
    t(key, params = {}) {
      return t(key, params)
    },
    
    // Exemplo: enviar ação para o backend
    comprarCarta() {
      if (this.modoOffline) {
        if (this.estado && this.estado.jogadorDaVez === this.meuIndice && !this.estado.aguardandoAcao) {
          const cartaComprada = this.estado.baralho.pop()
          this.cartaComprada = cartaComprada
          this.estado.aguardandoAcao = { jogador: this.meuIndice, carta: cartaComprada }
          this.escolhendoAcao = true
          this.$forceUpdate()
        }
        return
      }
      if (this.socket && this.estado && this.estado.jogadorDaVez === this.meuIndice) {
        this.socket.emit('comprar_carta', { sala: this.sala, jogador: this.jogador.nome })
        // Espera o backend responder com o novo estado para mostrar a carta comprada
        // A lógica de mostrar a carta será feita no handler do estado_jogo
      }
    },
    substituirCarta(idx) {
      if (this.modoOffline) {
        if (this.cartaComprada && this.estado && this.indiceSubstituir !== null) {
          const cartaDescartada = this.estado.players[this.meuIndice]?.mao[idx]
          this.estado.players[this.meuIndice].mao[idx] = this.cartaComprada
          this.estado.pilha.push(cartaDescartada)
          this.escolhendoAcao = false
          this.indiceSubstituir = null
          this.cartaComprada = null
          this.estado.aguardandoAcao = null
          this.$forceUpdate()
          setTimeout(() => {
            this.mensagemStatus = `Você descartou a carta ${cartaDescartada?.nome || '?'}${cartaDescartada?.naipe ? ' ' + cartaDescartada.naipe : ''} e comprou a carta ${this.cartaComprada?.nome || '?'}${this.cartaComprada?.naipe ? ' ' + this.cartaComprada.naipe : ''}`
            setTimeout(() => { this.mensagemStatus = '' }, 4000)
          }, 200)
          this.avancarTurnoLocal()
        }
        return
      }
      if (this.socket && this.cartaComprada && this.estado && this.indiceSubstituir !== null) {
        // Salva a carta que será descartada para mostrar na mensagem
        const cartaDescartada = this.estado.players[this.meuIndice]?.mao[idx];
        this.socket.emit('substituir_carta', {
          sala: this.sala,
          jogador: this.jogador.nome,
          indice: idx,
          carta: this.cartaComprada
        })
        this.escolhendoAcao = false;
        this.indiceSubstituir = null;
        // Mensagem temporária para o jogador
        setTimeout(() => {
          this.mensagemStatus = `Você descartou a carta ${cartaDescartada?.nome || '?'}${cartaDescartada?.naipe ? ' ' + cartaDescartada.naipe : ''} e comprou a carta ${this.cartaComprada?.nome || '?'}${this.cartaComprada?.naipe ? ' ' + this.cartaComprada.naipe : ''}`;
          setTimeout(() => { this.mensagemStatus = ''; }, 4000);
        }, 200); // Pequeno delay para garantir atualização do estado
        this.cartaComprada = null;
      }
    },
    descartarCartaComprada() {
      if (this.modoOffline) {
        if (this.cartaComprada && this.estado) {
          this.estado.pilha.push(this.cartaComprada)
          this.escolhendoAcao = false
          this.cartaComprada = null
          this.indiceSubstituir = null
          this.estado.aguardandoAcao = null
          this.$forceUpdate()
          this.avancarTurnoLocal()
        }
        return
      }
      if (this.socket && this.cartaComprada && this.estado) {
        this.socket.emit('descartar_carta', {
          sala: this.sala,
          jogador: this.jogador.nome,
          carta: this.cartaComprada
        })
        this.escolhendoAcao = false;
        this.cartaComprada = null;
        this.indiceSubstituir = null;
      }
    },
    usarHabilidade() {
      if (this.modoOffline) {
        if (!this.cartaComprada || !this.estado) return
        // Sete/Oito: ver carta própria
        if (this.cartaComprada.nome === 'Sete' || this.cartaComprada.nome === 'Oito') {
          this.escolhendoCartaPropria = true
          this.maxCartasProprias = this.estado.players[this.meuIndice].mao.length
          return
        }
        // Cinco/Seis: ver carta de oponente
        if (this.cartaComprada.nome === 'Cinco' || this.cartaComprada.nome === 'Seis') {
          this.escolhendoCartaOponente = true
          this.oponentesDisponiveis = this.estado.players.map((p, i) => ({ nome: p.nome, idx: i, qtd: p.mao.length })).filter((p, i) => i !== this.meuIndice)
          this.oponenteSelecionado = null
          return
        }
        // Nove/Dez: trocar cartas entre dois jogadores
        if (this.cartaComprada.nome === 'Nove' || this.cartaComprada.nome === 'Dez') {
          this.escolhendoJogadoresTroca = true
          this.jogadoresDisponiveisTroca = this.estado.players.map((p, i) => ({ nome: p.nome, idx: i, qtd: p.mao.length }))
          this.jogadoresSelecionadosTroca = []
          this.cartasSelecionadasTroca = []
          this.aguardandoEscolhaTroca = false
          this.ordemTroca = null
          this.qtdCartasTroca = 0
          return
        }
        // Outras habilidades podem ser implementadas aqui
        // Por padrão, descarta a carta
        this.estado.pilha.push(this.cartaComprada)
        this.escolhendoAcao = false
        this.cartaComprada = null
        this.estado.aguardandoAcao = null
        this.$forceUpdate()
        this.avancarTurnoLocal()
        return
      }
      if (this.socket && this.cartaComprada && this.estado) {
        this.socket.emit('usar_habilidade', {
          sala: this.sala,
          jogador: this.jogador.nome,
          carta: this.cartaComprada
        })
        this.escolhendoAcao = false;
        this.cartaComprada = null;
        this.indiceSubstituir = null;
      }
    },
    escolherCartaPropria(idx) {
      if (this.modoOffline) {
        const carta = this.estado.players[this.meuIndice].mao[idx]
        this.cartasReveladas.push({ idx, carta })
        this.cartaRevelada = { carta, indice: idx }
        setTimeout(() => {
          this.cartasReveladas = this.cartasReveladas.filter(c => c.idx !== idx)
          this.cartaRevelada = null
        }, 5000)
        this.escolhendoCartaPropria = false
        this.estado.pilha.push(this.cartaComprada)
        this.cartaComprada = null
        this.estado.aguardandoAcao = null
        this.escolhendoAcao = false
        this.$forceUpdate()
        this.avancarTurnoLocal()
        return
      }
      this.socket.emit('usar_habilidade', {
        sala: this.sala,
        jogador: this.jogador.nome,
        carta: this.cartaComprada,
        indiceAlvo: idx
      });
      this.escolhendoCartaPropria = false;
    },
    escolherCartaOponente(idxOponente) {
      if (this.modoOffline) {
        this.oponenteSelecionado = idxOponente
        return
      }
      this.oponenteSelecionado = idxOponente;
    },
    escolherCartaDoOponente(idxCarta) {
      if (this.modoOffline) {
        const idxOponente = this.oponenteSelecionado
        const carta = this.estado.players[idxOponente].mao[idxCarta]
        this.cartaRevelada = { carta, indice: idxCarta, oponente: this.estado.players[idxOponente].nome }
        setTimeout(() => {
          this.cartaRevelada = null
        }, 5000)
        this.escolhendoCartaOponente = false
        this.oponenteSelecionado = null
        this.estado.pilha.push(this.cartaComprada)
        this.cartaComprada = null
        this.estado.aguardandoAcao = null
        this.escolhendoAcao = false
        this.$forceUpdate()
        this.avancarTurnoLocal()
        return
      }
      this.socket.emit('usar_habilidade', {
        sala: this.sala,
        jogador: this.jogador.nome,
        carta: this.cartaComprada,
        alvo: this.oponenteSelecionado,
        indiceAlvo: idxCarta
      });
      this.escolhendoCartaOponente = false;
      this.oponenteSelecionado = null;
    },
    escolherJogadorTroca(idxJogador) {
      if (this.modoOffline) {
        if (!this.jogadoresSelecionadosTroca.includes(idxJogador) && this.jogadoresSelecionadosTroca.length < 2) {
          this.jogadoresSelecionadosTroca.push(idxJogador)
        }
        if (this.jogadoresSelecionadosTroca.length === 2) {
          this.aguardandoEscolhaTroca = true
          this.ordemTroca = 0
          const idx = this.jogadoresSelecionadosTroca[0]
          this.qtdCartasTroca = this.estado.players[idx]?.mao.length || 0
        }
        return
      }
      if (!this.jogadoresSelecionadosTroca.includes(idxJogador) && this.jogadoresSelecionadosTroca.length < 2) {
        this.jogadoresSelecionadosTroca.push(idxJogador)
      }
    },
    confirmarJogadoresTroca() {
      if (this.modoOffline) {
        this.cartasSelecionadasTroca = []
        this.ordemTroca = 0
        this.aguardandoEscolhaTroca = true
        const idx = this.jogadoresSelecionadosTroca[0]
        this.qtdCartasTroca = this.estado.players[idx]?.mao.length || 0
        return
      }
      this.cartasSelecionadasTroca = []
      this.ordemTroca = 0
      this.aguardandoEscolhaTroca = true
      const idx = this.jogadoresSelecionadosTroca[0]
      this.qtdCartasTroca = this.estado.players[idx]?.mao.length || 0
    },
    escolherCartaParaTroca(idxCarta) {
      if (this.modoOffline) {
        this.cartasSelecionadasTroca.push(idxCarta)
        if (this.ordemTroca === 0) {
          this.ordemTroca = 1
          const idx = this.jogadoresSelecionadosTroca[1]
          this.qtdCartasTroca = this.estado.players[idx]?.mao.length || 0
        } else {
          // Realiza a troca
          const idxA = this.jogadoresSelecionadosTroca[0]
          const idxB = this.jogadoresSelecionadosTroca[1]
          const cartaA = this.estado.players[idxA].mao[this.cartasSelecionadasTroca[0]]
          const cartaB = this.estado.players[idxB].mao[this.cartasSelecionadasTroca[1]]
          this.estado.players[idxA].mao[this.cartasSelecionadasTroca[0]] = cartaB
          this.estado.players[idxB].mao[this.cartasSelecionadasTroca[1]] = cartaA
          this.estado.pilha.push(this.cartaComprada)
          // Mensagem detalhada da troca
          this.mensagemStatus = `O jogador ${this.estado.players[this.meuIndice].nome} trocou a carta ${this.cartasSelecionadasTroca[0]+1} de ${this.estado.players[idxA].nome} pela carta ${this.cartasSelecionadasTroca[1]+1} de ${this.estado.players[idxB].nome}.`
          setTimeout(() => { this.mensagemStatus = '' }, 4000)
          // Limpa estados
          this.escolhendoJogadoresTroca = false
          this.jogadoresSelecionadosTroca = []
          this.cartasSelecionadasTroca = []
          this.aguardandoEscolhaTroca = false
          this.ordemTroca = null
          this.qtdCartasTroca = 0
          this.cartaComprada = null
          this.estado.aguardandoAcao = null
          this.escolhendoAcao = false
          this.$forceUpdate()
          this.avancarTurnoLocal()
        }
        return
      }
      this.cartasSelecionadasTroca.push(idxCarta)
      if (this.ordemTroca === 0) {
        this.ordemTroca = 1
        const idx = this.jogadoresSelecionadosTroca[1]
        this.qtdCartasTroca = this.estado.players[idx]?.mao.length || 0
      } else {
        this.socket.emit('usar_habilidade', {
          sala: this.sala,
          jogador: this.jogador.nome,
          carta: this.cartaComprada,
          alvos: this.jogadoresSelecionadosTroca,
          indicesAlvo: this.cartasSelecionadasTroca
        });
        // Limpa estados
        this.escolhendoJogadoresTroca = false;
        this.jogadoresSelecionadosTroca = [];
        this.cartasSelecionadasTroca = [];
        this.aguardandoEscolhaTroca = false;
        this.ordemTroca = null;
        this.qtdCartasTroca = 0;
        this.cartaComprada = null;
      }
    },
    // NOVO: tentativa de descarte a qualquer momento
    tentarDescarte(idx) {
      if (this.modoOffline) {
        // Descarte simples: uma carta igual ao topo da pilha
        const cartaMao = this.estado.players[this.meuIndice].mao[idx]
        const topoPilha = this.estado.pilha[this.estado.pilha.length-1]
        if (cartaMao && topoPilha && cartaMao.nome === topoPilha.nome) {
          // Descarte correto
          this.estado.pilha.push(cartaMao)
          this.estado.players[this.meuIndice].mao.splice(idx, 1)
          this.mensagemStatus = `Você descartou corretamente uma carta de valor ${cartaMao.nome}!`
          this.$forceUpdate()
          setTimeout(() => { this.mensagemStatus = '' }, 4000)
          this.avancarTurnoLocal()
        } else {
          // Punição: compra 2 cartas
          for (let i = 0; i < 2; i++) {
            if (this.estado.baralho.length > 0) {
              this.estado.players[this.meuIndice].mao.push(this.estado.baralho.pop())
            }
          }
          this.mensagemStatus = `Descarte inválido! Você comprou 2 cartas.`
          this.$forceUpdate()
          setTimeout(() => { this.mensagemStatus = '' }, 4000)
        }
        return
      }
      // Online: envia para o backend o índice da carta a ser descartada
      if (this.socket && this.estado) {
        this.socket.emit('tentar_descarte', {
          sala: this.sala,
          jogador: this.jogador.nome,
          indice: idx
        });
      }
    },
    confirmarDescarte(idx2) {
      if (this.modoOffline) {
        if (!this.estado) return
        const mao = this.estado.players[this.meuIndice].mao
        const idx1 = this.indiceDescarteTentativa
        if (
          typeof idx1 !== 'number' || typeof idx2 !== 'number' ||
          idx1 === idx2 ||
          idx1 < 0 || idx2 < 0 ||
          idx1 >= mao.length || idx2 >= mao.length
        ) {
          this.indiceDescarteTentativa = null
          return
        }
        const carta1 = mao[idx1]
        const carta2 = mao[idx2]
        if (carta1 && carta2 && carta1.nome === carta2.nome) {
          // Acertou: remove ambas e coloca na pilha
          if (idx1 > idx2) {
            mao.splice(idx1, 1)
            mao.splice(idx2, 1)
          } else {
            mao.splice(idx2, 1)
            mao.splice(idx1, 1)
          }
          this.estado.pilha.push(carta1, carta2)
          this.mensagemStatus = `Você descartou duas cartas de valor ${carta1.nome}!`
        } else {
          // Errou: compra 2 cartas se houver
          for (let i = 0; i < 2; i++) {
            if (this.estado.baralho.length > 0) {
              mao.push(this.estado.baralho.pop())
            }
          }
          this.mensagemStatus = `Você errou o descarte e comprou 2 cartas!`
        }
        this.indiceDescarteTentativa = null
        this.$forceUpdate()
        setTimeout(() => { this.mensagemStatus = '' }, 4000)
        return
      }
      // Envia para o backend a tentativa de descarte
      if (this.socket && this.estado) {
        this.socket.emit('tentar_descarte', {
          sala: this.sala,
          jogador: this.jogador.nome,
          indice1: this.indiceDescarteTentativa,
          indice2: idx2
        });
        this.indiceDescarteTentativa = null;
      }
    },
    cancelarDescarte() {
      this.indiceDescarteTentativa = null;
    },
    declararFimDeJogo() {
      if (this.modoOffline) {
        const minTurnos = 5
        if (this.estado && !this.estado.fimDeclarado && this.estado.turnoAtual >= minTurnos) {
          this.estado.fimDeclarado = true
          this.estado.jogadorDeclarouFim = this.jogador.nome
          this.estado.turnosRestantesFim = 2 * this.estado.players.length
          this.$forceUpdate()
        }
        return
      }
      if (this.socket && this.estado && !this.estado.fimDeclarado && this.estado.turnoAtual >= 5) {
        this.socket.emit('declarar_fim_de_jogo', {
          sala: this.sala,
          jogador: this.jogador.nome
        });
      }
    },
    // Adapte outros métodos para enviar eventos ao backend
    mapValorSvg(nome) {
      switch (nome) {
        case 'Às': return 'A';
        case 'Cinco': return '5';
        case 'Seis': return '6';
        case 'Sete': return '7';
        case 'Oito': return '8';
        case 'Nove': return '9';
        case 'Dez': return '10';
        case 'Valete': return 'J';
        case 'Rainha': return 'Q';
        case 'Rei': return 'K';
        case 'Coringa': return 'C';
        default: return '?';
      }
    },
    mapNaipeSvg(naipe) {
      switch (naipe) {
        case '♠': return 'S';
        case '♥': return 'H';
        case '♦': return 'D';
        case '♣': return 'C';
        default: return null;
      }
    },
    // NOVO: verifica se a carta está revelada
    cartaEstaRevelada(idx) {
      return this.cartasReveladas.some(c => c.idx === idx);
    },
    // --- MODO OFFLINE ---
    checarBotEVez() {
      if (!this.modoOffline || !this.estado || !this.estado.jogoIniciado) return
      const idx = this.estado.jogadorDaVez
      const player = this.estado.players[idx]
      if (player && player.humano === false) {
        setTimeout(() => this.jogarBot(idx), 800)
      }
    },
    jogarBot(idx) {
      if (!this.estado.jogoIniciado) return
      if (!this.estado.aguardandoAcao) {
        const cartaComprada = this.estado.baralho.pop()
        this.estado.aguardandoAcao = { jogador: idx, carta: cartaComprada }
        this.$forceUpdate()
        setTimeout(() => {
          // Se for carta de habilidade, bot usa habilidade
          if (['Cinco','Seis','Sete','Oito','Nove','Dez'].includes(cartaComprada.nome)) {
            this.usarHabilidadeBot(idx, cartaComprada)
            return
          }
          // Bot sempre descarta carta comprada se não for habilidade
          this.estado.pilha.push(this.estado.aguardandoAcao.carta)
          delete this.estado.aguardandoAcao
          this.avancarTurnoLocal()
        }, 900)
      }
    },
    usarHabilidadeBot(idx, carta) {
      // Lógica simples: bot sempre usa habilidade de forma aleatória
      const minTurnos = 5
      if (carta.nome === 'Sete' || carta.nome === 'Oito') {
        // Ver carta própria (escolhe aleatória)
        this.estado.pilha.push(carta)
        delete this.estado.aguardandoAcao
        this.avancarTurnoLocal()
        return
      }
      if (carta.nome === 'Cinco' || carta.nome === 'Seis') {
        // Ver carta de oponente (escolhe aleatório)
        const oponentes = this.estado.players.map((p, i) => i).filter(i => i !== idx)
        const alvo = oponentes[Math.floor(Math.random() * oponentes.length)]
        this.estado.pilha.push(carta)
        delete this.estado.aguardandoAcao
        this.avancarTurnoLocal()
        return
      }
      if (carta.nome === 'Nove' || carta.nome === 'Dez') {
        // Troca cartas entre dois jogadores aleatórios
        const indices = this.estado.players.map((p, i) => i)
        let j1 = idx
        while (j1 === idx) j1 = indices[Math.floor(Math.random() * indices.length)]
        let j2 = idx
        while (j2 === idx || j2 === j1) j2 = indices[Math.floor(Math.random() * indices.length)]
        const i1 = Math.floor(Math.random() * this.estado.players[j1].mao.length)
        const i2 = Math.floor(Math.random() * this.estado.players[j2].mao.length)
        const cartaA = this.estado.players[j1].mao[i1]
        const cartaB = this.estado.players[j2].mao[i2]
        this.estado.players[j1].mao[i1] = cartaB
        this.estado.players[j2].mao[i2] = cartaA
        this.estado.pilha.push(carta)
        // Mensagem detalhada da troca (exibe para todos localmente)
        this.mensagemStatus = `O jogador ${this.estado.players[idx].nome} trocou a carta ${i1+1} com a carta ${i2+1} do Jogador ${this.estado.players[j2].nome}`
        setTimeout(() => { this.mensagemStatus = '' }, 4000)
        delete this.estado.aguardandoAcao
        this.avancarTurnoLocal()
        return
      }
      // Fim de jogo: só pode declarar após minTurnos
      const soma = this.estado.players[idx].mao.reduce((acc, c) => acc + (typeof c.valor === 'number' ? c.valor : 0), 0)
      if (this.estado.turnoAtual >= minTurnos && soma < 15 && Math.random() < 0.8 && !this.estado.fimDeclarado) {
        this.estado.fimDeclarado = true
        this.estado.jogadorDeclarouFim = this.estado.players[idx].nome
        this.estado.turnosRestantesFim = 2 * this.estado.players.length
        this.$forceUpdate()
      }
      this.estado.pilha.push(carta)
      delete this.estado.aguardandoAcao
      this.avancarTurnoLocal()
    },
    avancarTurnoLocal() {
      // Avança o jogador da vez
      this.estado.jogadorDaVez = (this.estado.jogadorDaVez + 1) % this.estado.players.length
      if (this.estado.jogadorDaVez === 0) {
        this.estado.turnoAtual = (this.estado.turnoAtual || 1) + 1
      }
      // Se fim foi declarado, decrementa turnos restantes
      if (this.estado.fimDeclarado && this.estado.turnosRestantesFim !== null) {
        this.estado.turnosRestantesFim--
        if (this.estado.turnosRestantesFim <= 0) {
          this.estado.jogoIniciado = false
          // Calcula soma das cartas de cada jogador
          const somas = this.estado.players.map(p => ({ nome: p.nome, soma: p.mao.reduce((acc, c) => acc + (typeof c.valor === 'number' ? c.valor : 0), 0) }))
          const menor = Math.min(...somas.map(s => s.soma))
          const vencedores = somas.filter(s => s.soma === menor).map(s => s.nome)
          this.resultadoFinal = { somas, vencedores, jogadores: this.estado.players }
          this.fimDeJogo = true
          this.$emit('fim-de-jogo', this.resultadoFinal)
          return
        }
      }
      this.$forceUpdate()
      this.checarBotEVez()
    },
  },
};
</script>

<style scoped>
/* Container principal do jogo com tema cassino japonês */
.cunoku-game {
  background: 
    linear-gradient(135deg, rgba(25, 25, 112, 0.95) 0%, rgba(28, 28, 28, 0.95) 50%, rgba(15, 20, 25, 0.95) 100%),
    radial-gradient(circle at 30% 70%, rgba(220, 20, 60, 0.1) 0%, transparent 60%);
  backdrop-filter: blur(15px);
  border-radius: 24px;
  padding: clamp(1rem, 2vw, 1.5rem);
  min-height: auto;
  max-height: 90vh;
  overflow-y: auto;
  max-width: min(1200px, 95vw);
  margin: 0 auto;
  position: relative;
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.6),
    0 0 0 2px var(--primary-gold),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Efeito de padrão tradicional japonês */
.cunoku-game::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 25% 25%, rgba(212, 175, 55, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(220, 20, 60, 0.05) 0%, transparent 50%);
  border-radius: 24px;
  pointer-events: none;
}

/* Mesa de cartas com layout responsivo */
.mesa-cartas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: clamp(0.8rem, 2vw, 1.5rem);
  margin-bottom: 1rem;
  padding: 1rem;
  background: 
    linear-gradient(145deg, rgba(0, 0, 0, 0.3) 0%, rgba(25, 25, 112, 0.2) 100%);
  border-radius: 16px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  position: relative;
  z-index: 1;
}

@media (min-width: 768px) {
  .mesa-cartas {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Colunas de cartas estilizadas */
.coluna-cartas {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(212, 175, 55, 0.2);
  transition: all 0.3s ease;
}

.coluna-cartas:hover {
  background: rgba(212, 175, 55, 0.05);
  border-color: rgba(212, 175, 55, 0.4);
  transform: translateY(-1px);
}

/* Pilhas de baralho e descarte luxuosas */
.pilha, .baralho {
  border: 2px solid var(--primary-gold);
  border-radius: 12px;
  background: 
    linear-gradient(145deg, #2A2A2A 0%, #1A1A1A 100%);
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 0 10px rgba(212, 175, 55, 0.2);
  padding: 8px;
  min-width: 70px;
  min-height: 95px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.pilha:hover, .baralho:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 
    0 8px 20px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    0 0 15px rgba(212, 175, 55, 0.3);
}

/* Legendas elegantes */
.legenda-area {
  color: var(--secondary-gold);
  font-size: clamp(0.8rem, 1.5vw, 1rem);
  font-weight: 600;
  text-align: center;
  font-family: 'Cinzel', serif;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.8),
    0 0 10px rgba(212, 175, 55, 0.3);
  background: linear-gradient(135deg, var(--primary-gold), var(--secondary-gold));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Mão do jogador com layout flexível */
.mesa-mao {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(0.3rem, 1vw, 0.8rem);
  justify-content: center;
  align-items: center;
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  border: 1px solid rgba(212, 175, 55, 0.3);
}

/* Área de informações dos jogadores */
.jogadores-area {
  margin-bottom: 1rem;
  background: 
    linear-gradient(135deg, rgba(25, 25, 112, 0.8) 0%, rgba(0, 0, 0, 0.8) 100%);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  color: var(--pearl-white);
  box-shadow: 
    0 2px 12px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(212, 175, 55, 0.4);
  position: relative;
}

.jogadores-area::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    linear-gradient(45deg, transparent 30%, rgba(212, 175, 55, 0.05) 50%, transparent 70%);
  border-radius: 11px;
  pointer-events: none;
}

/* Tipografia refinada */
h2, h3 {
  color: var(--secondary-gold);
  font-family: 'Cinzel', serif;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

ul {
  color: var(--pearl-white);
  list-style: none;
  padding: 0;
}

ul li {
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(212, 175, 55, 0.2);
}

ul li:last-child {
  border-bottom: none;
}

/* Mão de cartas responsiva */
.mao {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(0.3rem, 1vw, 0.6rem);
  justify-content: center;
  margin-bottom: 1rem;
  padding: 0.5rem;
}

@media (max-width: 768px) {
  .mao {
    gap: 0.2rem;
  }
}
/* Cartas individuais com estilo premium */
.carta {
  background: var(--card-gradient);
  border: 2px solid var(--primary-gold);
  border-radius: 12px;
  padding: 0.8rem 1.4rem;
  font-size: clamp(0.9rem, 1.5vw, 1.1rem);
  font-weight: 600;
  color: var(--pearl-white);
  cursor: pointer;
  min-width: 70px;
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.carta::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s;
}

.carta:hover {
  background: linear-gradient(145deg, var(--primary-gold) 0%, var(--secondary-gold) 100%);
  color: var(--japanese-black);
  border-color: var(--secondary-gold);
  transform: translateY(-4px) scale(1.05);
  box-shadow: 
    0 8px 24px rgba(212, 175, 55, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.carta:hover::before {
  left: 100%;
}

.carta:active {
  transform: translateY(-2px) scale(1.02);
}

/* Estados especiais das cartas */
.carta-espia {
  background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%) !important;
  color: var(--pearl-white) !important;
  border-color: #FF6B35 !important;
  animation: espiaGlow 2s ease-in-out infinite alternate;
}

@keyframes espiaGlow {
  0% { box-shadow: 0 4px 16px rgba(255, 107, 53, 0.4); }
  100% { box-shadow: 0 8px 32px rgba(255, 107, 53, 0.8); }
}

.carta-comprada {
  color: var(--secondary-gold);
  font-size: clamp(1rem, 2vw, 1.3rem);
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

/* Botões de ação refinados */
.btn-principal {
  background: var(--gold-gradient);
  color: var(--japanese-black);
  border: none;
  border-radius: 12px;
  padding: 0.8rem 1.6rem;
  font-size: clamp(0.9rem, 1.5vw, 1.1rem);
  font-weight: 700;
  font-family: 'Cinzel', serif;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  margin: 0.3rem 0.6rem;
  box-shadow: 
    0 4px 16px rgba(212, 175, 55, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.btn-principal::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.btn-principal:hover {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  transform: translateY(-2px);
  box-shadow: 
    0 8px 24px rgba(212, 175, 55, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.btn-principal:hover::before {
  left: 100%;
}

/* Botão de descarte com tema de perigo elegante */
.btn-descartar {
  background: linear-gradient(135deg, var(--accent-red) 0%, var(--deep-red) 100%);
  color: var(--pearl-white);
  border: none;
  border-radius: 12px;
  padding: 0.8rem 1.6rem;
  font-size: clamp(0.9rem, 1.5vw, 1.1rem);
  font-weight: 700;
  font-family: 'Cinzel', serif;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  margin: 0.3rem 0.6rem;
  box-shadow: 
    0 4px 16px rgba(220, 20, 60, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-descartar:hover {
  background: linear-gradient(135deg, #FF1744 0%, #C62828 100%);
  transform: translateY(-2px);
  box-shadow: 
    0 8px 24px rgba(220, 20, 60, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

/* Botões de ação secundários */
.btn-acao {
  background: var(--card-gradient);
  color: var(--pearl-white);
  border: 2px solid var(--primary-gold);
  border-radius: 10px;
  padding: 0.6rem 1.2rem;
  font-size: clamp(0.8rem, 1.5vw, 1rem);
  font-weight: 600;
  cursor: pointer;
  margin: 0.2rem 0.3rem;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-acao:hover {
  background: var(--gold-gradient);
  color: var(--japanese-black);
  border-color: var(--secondary-gold);
  transform: translateY(-1px);
}

.btn-acao:active, .btn-acao:focus {
  background: var(--gold-gradient);
  color: var(--japanese-black);
  border-color: var(--secondary-gold);
  transform: translateY(0);
}

/* Mensagem de habilidade destacada */
.habilidade-msg {
  background: linear-gradient(135deg, var(--secondary-gold) 0%, var(--primary-gold) 100%);
  color: var(--japanese-black);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin: 1rem 0;
  font-weight: 700;
  font-family: 'Cinzel', serif;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 
    0 4px 16px rgba(212, 175, 55, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  text-align: center;
  animation: habilidadePulse 2s ease-in-out infinite alternate;
}

@keyframes habilidadePulse {
  0% { transform: scale(1); }
  100% { transform: scale(1.02); }
}

/* Estilo refinado para cartas clicáveis */
.carta-btn {
  background: transparent;
  border: none;
  padding: 0;
  margin: 0 clamp(2px, 0.5vw, 4px);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.carta-btn:focus {
  outline: 3px solid var(--secondary-gold);
  outline-offset: 3px;
  border-radius: 8px;
}

.carta-btn:hover {
  transform: translateY(-6px) scale(1.05);
  filter: drop-shadow(0 8px 16px rgba(212, 175, 55, 0.4));
}
/* Layout de baralho e pilha elegante */
.baralho-pilha {
  display: flex;
  gap: clamp(1.5rem, 4vw, 3rem);
  justify-content: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.topo-pilha {
  color: var(--secondary-gold);
  font-weight: 700;
  font-family: 'Cinzel', serif;
  margin-top: 0.5rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

/* Botão de descarte de carta individual */
.btn-descartar-carta {
  display: block;
  margin: 0.5rem auto 0 auto;
  background: linear-gradient(135deg, var(--accent-red) 0%, var(--deep-red) 100%);
  color: var(--pearl-white);
  border: none;
  border-radius: 8px;
  padding: 0.4rem 0.8rem;
  font-size: clamp(0.7rem, 1.2vw, 0.9rem);
  font-weight: 600;
  cursor: pointer;
  box-shadow: 
    0 2px 8px rgba(220, 20, 60, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-descartar-carta:hover {
  background: linear-gradient(135deg, #FF1744 0%, #C62828 100%);
  transform: translateY(-1px);
  box-shadow: 
    0 4px 12px rgba(220, 20, 60, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

/* Mensagem da pilha com estilo cassino */
.mensagem-pilha {
  margin-top: 1.5rem;
  background: linear-gradient(135deg, var(--secondary-gold) 0%, var(--primary-gold) 100%);
  color: var(--japanese-black);
  border-radius: 16px;
  padding: 1.2rem 2rem;
  font-weight: 700;
  font-family: 'Cinzel', serif;
  text-align: center;
  box-shadow: 
    0 4px 16px rgba(212, 175, 55, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  text-transform: uppercase;
  letter-spacing: 1px;
  animation: mensagemGlow 3s ease-in-out infinite alternate;
}

@keyframes mensagemGlow {
  0% { 
    box-shadow: 0 4px 16px rgba(212, 175, 55, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  100% { 
    box-shadow: 0 8px 32px rgba(212, 175, 55, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
}

/* Verso das cartas com padrão japonês */
.verso-carta {
  background: 
    var(--card-gradient),
    radial-gradient(circle at center, rgba(212, 175, 55, 0.1) 0%, transparent 70%);
  border-radius: 12px;
  border: 2px solid var(--primary-gold);
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(60px, 10vw, 80px);
  height: clamp(90px, 15vw, 120px);
  position: relative;
  transition: all 0.3s ease;
}

.verso-carta::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 80%;
  background: 
    repeating-conic-gradient(
      from 0deg at center,
      transparent 0deg,
      rgba(212, 175, 55, 0.1) 45deg,
      transparent 90deg
    );
  border-radius: 8px;
  pointer-events: none;
}

.verso-carta:hover {
  transform: scale(1.05);
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    0 0 20px rgba(212, 175, 55, 0.3);
}

/* Popup de notificação luxuoso */
.popup-notificacao {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: 
    linear-gradient(135deg, var(--secondary-gold) 0%, var(--primary-gold) 100%);
  color: var(--japanese-black);
  padding: 2.5rem 3.5rem;
  border-radius: 24px;
  box-shadow: 
    0 16px 64px rgba(0, 0, 0, 0.8),
    0 0 0 3px var(--primary-gold),
    inset 0 2px 0 rgba(255, 255, 255, 0.3);
  font-size: clamp(1.2rem, 3vw, 1.8rem);
  font-weight: 700;
  font-family: 'Cinzel', serif;
  z-index: 9999;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
  animation: popup-entrada 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  max-width: 90vw;
}

@keyframes popup-entrada {
  0% { 
    opacity: 0; 
    transform: translate(-50%, -60%) scale(0.8) rotateY(20deg);
  }
  100% { 
    opacity: 1; 
    transform: translate(-50%, -50%) scale(1) rotateY(0deg);
  }
}

/* Transições suaves */
.fade-enter-active, .fade-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* Responsividade móvel aprimorada */
@media (max-width: 768px) {
  .cunoku-game {
    padding: 0.8rem;
    margin: 0.5rem;
    border-radius: 16px;
    max-height: 85vh;
  }
  
  .mesa-cartas {
    grid-template-columns: 1fr;
    gap: 0.8rem;
    padding: 0.8rem;
    margin-bottom: 0.8rem;
  }
  
  .baralho-pilha {
    gap: 1rem;
  }
  
  .pilha, .baralho {
    min-width: 60px;
    min-height: 80px;
    padding: 6px;
  }
  
  .verso-carta {
    width: 50px !important;
    height: 70px !important;
  }
  
  .btn-principal, .btn-descartar {
    padding: 0.5rem 1rem;
    margin: 0.2rem 0.3rem;
    font-size: 0.8rem;
  }
  
  .popup-notificacao {
    padding: 1.5rem 2rem;
    font-size: 1.2rem;
  }
  
  .mensagem-pilha {
    padding: 0.8rem 1.2rem;
    margin-top: 0.8rem;
  }
  
  .jogadores-area {
    padding: 0.8rem 1rem;
    margin-bottom: 0.8rem;
  }
  
  .legenda-area {
    font-size: 0.7rem;
  }
}

@media (max-width: 480px) {
  .cunoku-game {
    padding: 0.5rem;
    max-height: 90vh;
  }
  
  .carta {
    padding: 0.5rem 0.8rem;
    font-size: 0.8rem;
    min-width: 45px;
  }
  
  .mao {
    gap: 0.1rem;
  }
  
  .mesa-mao {
    gap: 0.2rem;
    padding: 0.4rem;
  }
  
  .btn-acao {
    padding: 0.3rem 0.6rem;
    font-size: 0.7rem;
    margin: 0.1rem;
  }
  
  .verso-carta {
    width: 45px !important;
    height: 65px !important;
  }
  
  .verso-carta span {
    font-size: 1.5rem !important;
  }
  
  .pilha, .baralho {
    min-width: 50px;
    min-height: 70px;
  }
}

/* Ajustes específicos para altura da tela */
@media (max-height: 700px) {
  .cunoku-game {
    max-height: 95vh;
    padding: 0.5rem;
  }
  
  .mesa-cartas {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
  }
  
  .jogadores-area {
    margin-bottom: 0.5rem;
    padding: 0.8rem 1rem;
  }
  
  h2, h3 {
    margin: 0.5rem 0;
  }
}

/* Animações de entrada para elementos */
.animate__fadeInUp {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  0% {
    opacity: 0;
    transform: translateY(30px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Efeitos especiais para atmosfera de cassino */
.cunoku-game::after {
  content: '';
  position: absolute;
  top: 10%;
  left: 10%;
  right: 10%;
  bottom: 10%;
  background: 
    radial-gradient(ellipse at top left, rgba(212, 175, 55, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(220, 20, 60, 0.03) 0%, transparent 50%);
  border-radius: 20px;
  pointer-events: none;
  z-index: 0;
}
</style> 