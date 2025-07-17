<template>
  <div class="cunoku-game">
    <!-- Notificação pop-up -->
    <transition name="fade">
      <div v-if="mensagemStatus" class="popup-notificacao">
        {{ mensagemStatus }}
      </div>
    </transition>
    <div v-if="!estado">
      <p>Aguardando sincronização do jogo...</p>
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
.cunoku-game {
  background: linear-gradient(135deg, #14532d 80%, #0a1a0a 100%);
  border-radius: 18px;
  box-shadow: 0 4px 32px #0008, 0 0 0 4px #d4af37;
  border: 2px solid #d4af37;
  padding: 32px 24px;
  min-height: 600px;
  max-width: 900px;
  margin: 0 auto;
  position: relative;
}
.mesa-cartas {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 2.5rem;
  margin-bottom: 2rem;
}
.coluna-cartas {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;
  gap: 0.7rem;
}
.pilha, .baralho {
  border: 2px solid #d4af37;
  border-radius: 10px;
  background: #232946;
  box-shadow: 0 2px 12px #0007;
  padding: 8px;
  min-width: 60px;
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.legenda-area {
  color: #ffe082;
  font-size: 0.95rem;
  text-align: center;
  margin-top: 0.3rem;
  font-weight: bold;
  text-shadow: 0 1px 4px #000a;
}
.mesa-mao {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  gap: 0.5rem;
}
.jogadores-area {
  margin-bottom: 1.2rem;
  background: rgba(20, 20, 30, 0.85);
  border-radius: 10px;
  padding: 1rem 2rem;
  color: #eebbc3;
  box-shadow: 0 1px 8px #0003;
  border: 1.5px solid #d4af37;
}
h2, h3 {
  color: #eebbc3;
}
ul {
  color: #eebbc3;
}
.mao {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.carta {
  background: #121629;
  border: 2px solid #eebbc3;
  border-radius: 8px;
  padding: 0.7rem 1.2rem;
  font-size: 1.1rem;
  color: #eebbc3;
  cursor: pointer;
  min-width: 60px;
  box-shadow: 0 2px 8px #0007;
  transition: background 0.2s, border 0.2s, color 0.2s;
}
.carta:hover, .btn-acao:hover {
  background: #eebbc3;
  color: #232946;
  border-color: #232946;
}
.carta-espia {
  background: #f6c177 !important;
  color: #232946 !important;
  border-color: #f6c177 !important;
}
.carta-comprada {
  color: #f6c177;
  font-size: 1.2rem;
}
.btn-principal {
  background: #eebbc3;
  color: #232946;
  border: none;
  border-radius: 6px;
  padding: 0.6rem 1.4rem;
  font-size: 1.1rem;
  margin: 0.2rem 0.5rem 0.2rem 0;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 1px 4px #0003;
  transition: background 0.2s, color 0.2s;
}
.btn-principal:hover {
  background: #f6c177;
  color: #232946;
}
.btn-descartar {
  background: #f25042;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.6rem 1.4rem;
  font-size: 1.1rem;
  margin: 0.2rem 0.5rem 0.2rem 0;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 1px 4px #0003;
  transition: background 0.2s, color 0.2s;
}
.btn-descartar:hover {
  background: #d7263d;
  color: #fff;
}
.btn-acao {
  background: #232946;
  color: #eebbc3;
  border: 2px solid #eebbc3;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
  min-width: 60px;
  margin: 0.1rem 0.2rem;
  box-shadow: 0 1px 4px #0003;
  transition: background 0.2s, color 0.2s, border 0.2s;
}
.btn-acao:active, .btn-acao:focus {
  background: #eebbc3;
  color: #232946;
  border-color: #232946;
}
.habilidade-msg {
  background: #f6c177;
  color: #232946;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  margin: 0.5rem 0 1rem 0;
  font-weight: bold;
  box-shadow: 0 1px 4px #0002;
}
.carta-btn {
  background: none;
  border: none;
  padding: 0;
  margin: 0 2px;
  box-shadow: none;
  cursor: pointer;
}
.carta-btn:focus {
  outline: 2px solid #f6c177;
}
.baralho-pilha {
  display: flex;
  gap: 2.5rem;
  margin-bottom: 1.5rem;
}
.topo-pilha {
  color: #f6c177;
  font-weight: bold;
  margin-top: 0.3rem;
}
.btn-descartar-carta {
  display: block;
  margin: 0.3rem auto 0 auto;
  background: #f25042;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.2rem 0.7rem;
  font-size: 0.95rem;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 1px 4px #0003;
  transition: background 0.2s, color 0.2s;
}
.btn-descartar-carta:hover {
  background: #d7263d;
  color: #fff;
}
.mensagem-pilha {
  margin-top: 1.2rem;
  background: #f6c177;
  color: #232946;
  border-radius: 8px;
  padding: 0.7rem 1.2rem;
  font-weight: bold;
  text-align: center;
  box-shadow: 0 1px 8px #0002;
}
.verso-carta {
  background: #232946;
  border-radius: 8px;
  border: 2px solid #eebbc3;
  box-shadow: 0 2px 8px #0007;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 90px;
}
.popup-notificacao {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #ffe082;
  color: #232946;
  padding: 2rem 3rem;
  border-radius: 18px;
  box-shadow: 0 4px 32px #0008, 0 0 0 4px #d4af37;
  font-size: 1.5rem;
  font-weight: bold;
  z-index: 9999;
  text-align: center;
  animation: popup-fadein 0.3s;
}
@keyframes popup-fadein {
  from { opacity: 0; transform: translate(-50%, -60%); }
  to { opacity: 1; transform: translate(-50%, -50%); }
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style> 