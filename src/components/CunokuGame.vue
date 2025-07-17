<template>
  <div class="cunoku-game">
    <div v-if="!estado">
      <p>Aguardando sincronização do jogo...</p>
    </div>
    <div v-else>
      <div>
        <h2>Jogadores</h2>
        <ul>
          <li v-for="(player, idx) in estado.players" :key="idx">
            <b v-if="idx === estado.jogadorDaVez">▶</b>
            {{ player.nome }} - Cartas: {{ player.mao.length }}
            <span v-if="idx === meuIndice">(Você)</span>
          </li>
        </ul>
      </div>
      <div class="baralho-pilha">
        <div>
          <h2>Baralho</h2>
          <p>Cartas restantes: {{ estado.baralho.length }}</p>
        </div>
        <div>
          <h2>Pilha de Descarte</h2>
          <div v-if="estado.pilha.length > 0">
            <CartaSvg :valor="mapValorSvg(estado.pilha[estado.pilha.length-1].nome)" :naipe="mapNaipeSvg(estado.pilha[estado.pilha.length-1].naipe)" :width="60" :height="90" />
            <p class="topo-pilha">Topo: {{ estado.pilha[estado.pilha.length-1].nome }} {{ estado.pilha[estado.pilha.length-1].naipe || '' }}</p>
          </div>
          <div v-else>
            <p>Pilha vazia</p>
          </div>
        </div>
      </div>
      <div>
        <h3>Sua mão</h3>
        <div class="mao">
          <div v-for="(carta, idx) in maoReal" :key="idx" class="carta-btn animate__animated animate__fadeInUp">
            <CartaSvg :valor="mapValorSvg(carta.nome)" :naipe="mapNaipeSvg(carta.naipe)" :width="60" :height="90" />
          </div>
        </div>
      </div>
      <div v-if="estado.jogadorDaVez === meuIndice">
        <button class="btn-principal" @click="comprarCarta" v-if="!escolhendoAcao && !acaoPendente">Comprar carta</button>
        <!-- Fluxo de escolha de ação ao comprar carta -->
        <div v-if="escolhendoAcao && cartaComprada" class="acao-compra">
          <h4>Você comprou:</h4>
          <CartaSvg :valor="mapValorSvg(cartaComprada.nome)" :naipe="mapNaipeSvg(cartaComprada.naipe)" :width="60" :height="90" />
          <p>Escolha o que fazer:</p>
          <ul>
            <li>
              <button class="btn-acao" @click="indiceSubstituir = null">Substituir uma carta da mão</button>
              <div v-if="indiceSubstituir === null">
                <span>Selecione a carta da mão para substituir:</span>
                <div class="mao">
                  <button v-for="(carta, idx) in estado.players[meuIndice]?.mao || []" :key="'sub-'+idx" class="carta-btn" @click="substituirCarta(idx)">
                    <CartaSvg :valor="mapValorSvg(carta.nome)" :naipe="mapNaipeSvg(carta.naipe)" :width="60" :height="90" />
                  </button>
                </div>
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
        <p>Aguarde sua vez...</p>
      </div>
    </div>
    <div v-if="escolhendoCartaPropria">
      <div class="habilidade-msg">
        <p>Escolha uma carta da sua mão para ver:</p>
        <div class="mao">
          <button v-for="(carta, idx) in estado.players[meuIndice]?.mao || []" :key="'ver-'+idx" class="carta-btn" @click="escolherCartaPropria(idx)">
            <CartaSvg :valor="mapValorSvg(carta.nome)" :naipe="mapNaipeSvg(carta.naipe)" :width="60" :height="90" />
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
        <p>Escolha a carta para trocar:</p>
        <div class="mao">
          <button v-for="i in qtdCartasTroca" :key="'troca-carta-'+i" class="carta-btn" @click="escolherCartaParaTroca(i-1)">
            <span>Carta {{ i }}</span>
          </button>
        </div>
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
  },
  data() {
    return {
      estado: null,
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
      aguardandoEscolhaTroca: false, // Se está aguardando escolher carta para troca
      ordemTroca: null, // 0 ou 1, ordem da escolha da carta para troca
      qtdCartasTroca: 0, // Quantidade de cartas do jogador para troca
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
        }
      }
    }
  },
  components: { CartaSvg },
  methods: {
    // Exemplo: enviar ação para o backend
    comprarCarta() {
      if (this.socket && this.estado && this.estado.jogadorDaVez === this.meuIndice) {
        this.socket.emit('comprar_carta', { sala: this.sala, jogador: this.jogador.nome })
        // Espera o backend responder com o novo estado para mostrar a carta comprada
        // A lógica de mostrar a carta será feita no handler do estado_jogo
      }
    },
    substituirCarta(idx) {
      // Envia para o backend qual carta da mão será substituída pela carta comprada
      if (this.socket && this.cartaComprada && this.estado) {
        this.socket.emit('substituir_carta', {
          sala: this.sala,
          jogador: this.jogador.nome,
          indice: idx,
          carta: this.cartaComprada
        })
        this.escolhendoAcao = false;
        this.cartaComprada = null;
        this.indiceSubstituir = null;
      }
    },
    descartarCartaComprada() {
      // Envia para o backend o pedido de descarte da carta comprada
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
      // Envia para o backend o pedido de usar a habilidade da carta comprada
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
      // Envia para o backend o índice da carta da própria mão que o jogador quer ver
      this.socket.emit('usar_habilidade', {
        sala: this.sala,
        jogador: this.jogador.nome,
        carta: this.cartaComprada,
        indiceAlvo: idx
      });
      this.escolhendoCartaPropria = false;
    },
    escolherCartaOponente(idxOponente) {
      this.oponenteSelecionado = idxOponente;
    },
    escolherCartaDoOponente(idxCarta) {
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
      if (!this.jogadoresSelecionadosTroca.includes(idxJogador) && this.jogadoresSelecionadosTroca.length < 2) {
        this.jogadoresSelecionadosTroca.push(idxJogador);
      }
    },
    confirmarJogadoresTroca() {
      this.socket.emit('usar_habilidade', {
        sala: this.sala,
        jogador: this.jogador.nome,
        carta: this.cartaComprada,
        alvos: this.jogadoresSelecionadosTroca
      });
      this.escolhendoJogadoresTroca = false;
    },
    escolherCartaParaTroca(idxCarta) {
      // Envia para o backend o índice da carta escolhida para troca
      this.socket.emit('usar_habilidade', {
        sala: this.sala,
        jogador: this.jogador.nome,
        carta: this.cartaComprada,
        indicesAlvo: [idxCarta]
      });
      this.aguardandoEscolhaTroca = false;
      this.ordemTroca = null;
      this.qtdCartasTroca = 0;
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
  },
};
</script>

<style scoped>
.cunoku-game {
  margin: 0 auto;
  background: #232946;
  border-radius: 12px;
  padding: 28px;
  box-shadow: 0 2px 16px #0005;
  color: #f4f4f4;
  max-width: 600px;
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
</style> 