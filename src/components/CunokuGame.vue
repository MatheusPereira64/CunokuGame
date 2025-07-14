<template>
  <div class="cunoku-game">
    <div>
      <h2>Jogadores</h2>
      <ul>
        <li v-for="(player, idx) in players" :key="idx">
          <b v-if="idx === jogadorDaVez">▶</b>
          {{ player.nome }} - Cartas: {{ player.mao.length }}
        </li>
      </ul>
    </div>
    <div>
      <h2>Baralho</h2>
      <p>Cartas restantes: {{ baralho.length }}</p>
    </div>
    <div>
      <h3>Sua mão</h3>
      <div class="mao">
        <button v-for="(carta, idx) in players[jogadorDaVez].mao" :key="idx" class="carta-btn animate__animated animate__fadeInUp"
          :class="{ 'carta-espia': cartaEspiada && cartaEspiada === carta }">
          <CartaSvg
            v-if="
              (habilidadeAtiva === 'espiar_propria' && cartaEspiada && cartaEspiada === carta) ||
              (habilidadeAtiva === 'troca' && substituindoTrocaSelf) ||
              (substituindoCarta)
            "
            :valor="mapValorSvg(carta.nome)"
            :naipe="mapNaipeSvg(carta.naipe)"
            :width="60"
            :height="90"
          />
          <CartaSvg v-else valor="?" :width="60" :height="90" />
        </button>
      </div>
    </div>
    <div v-if="!cartaComprada && !turnoFinalizado">
      <button class="btn-principal" @click="comprarCarta">Comprar carta</button>
    </div>
    <div v-else-if="cartaComprada && !turnoFinalizado">
      <p>Você comprou:
        <span class="carta-comprada animate__animated animate__bounceIn">
          <CartaSvg :valor="mapValorSvg(cartaComprada.nome)" :naipe="mapNaipeSvg(cartaComprada.naipe)" :width="60" :height="90" />
        </span>
      </p>
      <div v-if="mensagemHabilidade" class="habilidade-msg animate__animated animate__pulse">{{ mensagemHabilidade }}</div>
      <!-- Habilidade: Troca de cartas -->
      <div v-if="habilidadeAtiva === 'troca'">
        <p>Escolha um jogador para trocar uma carta:</p>
        <div class="mao">
          <button v-for="(player, idx) in players" :key="idx" v-if="idx !== jogadorDaVez" @click="selecionarJogadorTroca(idx)" class="btn-acao">
            {{ player.nome }}
          </button>
        </div>
        <div v-if="jogadorTroca !== null">
          <p>Escolha uma carta sua para trocar:</p>
          <div class="mao">
            <button v-for="(carta, idx) in players[jogadorDaVez].mao" :key="idx" class="carta-btn btn-acao animate__animated animate__pulse" @click="selecionarCartaTroca('self', idx)" :disabled="idxCartaTrocaSelf === idx">
              <CartaSvg :valor="mapValorSvg(carta.nome)" :naipe="mapNaipeSvg(carta.naipe)" :width="60" :height="90" />
            </button>
          </div>
          <p>Escolha uma carta do oponente para trocar:</p>
          <div class="mao">
            <button v-for="(carta, idx) in players[jogadorTroca].mao" :key="idx" class="carta-btn btn-acao animate__animated animate__pulse" @click="selecionarCartaTroca('oponente', idx)">
              <CartaSvg valor="?" :width="60" :height="90" />
            </button>
          </div>
        </div>
      </div>
      <!-- Habilidade: Espiar carta própria -->
      <div v-else-if="habilidadeAtiva === 'espiar_propria'">
        <p>Escolha uma carta sua para espiar:</p>
        <div class="mao">
          <button v-for="(carta, idx) in players[jogadorDaVez].mao" :key="idx" class="carta-btn btn-acao animate__animated animate__flipInY" @click="espiarCartaPropria(idx)">
            <CartaSvg v-if="cartaEspiada && cartaEspiada === carta" :valor="mapValorSvg(carta.nome)" :naipe="mapNaipeSvg(carta.naipe)" :width="60" :height="90" />
            <CartaSvg v-else valor="?" :width="60" :height="90" />
          </button>
        </div>
        <div v-if="cartaEspiada">
          <p>Você espiou:
            <span class="carta-espia animate__animated animate__flipInY">
              <CartaSvg :valor="mapValorSvg(cartaEspiada.nome)" :naipe="mapNaipeSvg(cartaEspiada.naipe)" :width="60" :height="90" />
            </span>
          </p>
          <button class="btn-principal" @click="finalizarHabilidade">OK</button>
        </div>
      </div>
      <!-- Habilidade: Espiar carta do oponente -->
      <div v-else-if="habilidadeAtiva === 'espiar_oponente'">
        <p>Escolha um jogador para espiar uma carta:</p>
        <div class="mao">
          <button v-for="(player, idx) in players" :key="idx" v-if="idx !== jogadorDaVez" @click="selecionarJogadorEspiar(idx)" class="btn-acao">
            {{ player.nome }}
          </button>
        </div>
        <div v-if="jogadorEspiar !== null">
          <p>Escolha uma carta do oponente para espiar:</p>
          <div class="mao">
            <button v-for="(carta, idx) in players[jogadorEspiar].mao" :key="idx" class="carta-btn btn-acao animate__animated animate__flipInY" @click="espiarCartaOponente(idx)">
              <CartaSvg v-if="cartaEspiada && cartaEspiada === carta" :valor="mapValorSvg(carta.nome)" :naipe="mapNaipeSvg(carta.naipe)" :width="60" :height="90" />
              <CartaSvg v-else valor="?" :width="60" :height="90" />
            </button>
          </div>
        </div>
        <div v-if="cartaEspiada">
          <p>Você espiou:
            <span class="carta-espia animate__animated animate__flipInY">
              <CartaSvg :valor="mapValorSvg(cartaEspiada.nome)" :naipe="mapNaipeSvg(cartaEspiada.naipe)" :width="60" :height="90" />
            </span>
          </p>
          <button class="btn-principal" @click="finalizarHabilidade">OK</button>
        </div>
      </div>
      <!-- Substituição normal -->
      <div v-else-if="substituindoCarta">
        <p>Escolha qual carta da sua mão deseja substituir:</p>
        <div class="mao">
          <button v-for="(carta, idx) in players[jogadorDaVez].mao" :key="idx" class="carta-btn btn-acao animate__animated animate__pulse" @click="substituirCarta(idx)">
            <CartaSvg :valor="mapValorSvg(carta.nome)" :naipe="mapNaipeSvg(carta.naipe)" :width="60" :height="90" />
          </button>
        </div>
      </div>
      <div v-else>
        <button v-if="habilidadeAtiva" class="btn-principal" @click="usarHabilidade">Usar habilidade</button>
        <button class="btn-principal" @click="iniciarSubstituicao">Ficar com a carta (substituir uma da mão)</button>
        <button class="btn-descartar" @click="descartarCarta">Descartar</button>
      </div>
    </div>
    <div v-if="turnoFinalizado">
      <button class="btn-principal" @click="proximoTurno">Próximo turno</button>
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
    numJogadores: {
      type: Number,
      default: 2
    }
  },
  data() {
    return {
      baralho: criarBaralho(),
      players: [],
      jogadorDaVez: 0,
      cartaComprada: null,
      turnoFinalizado: false,
      cartasPorJogador: 4,
      jogoIniciado: false,
      substituindoCarta: false,
      mensagemHabilidade: '',
      habilidadeAtiva: '',
      jogadorTroca: null,
      idxCartaTrocaSelf: null,
      idxCartaTrocaOponente: null,
      jogadorEspiar: null,
      cartaEspiada: null,
      substituindoTrocaSelf: false,
    };
  },
  watch: {
    numJogadores: {
      immediate: true,
      handler(n) {
        this.iniciarJogoComJogadores(n)
      }
    }
  },
  created() {
    // this.iniciarJogo(); // This line is now handled by the watch hook
  },
  components: { CartaSvg },
  methods: {
    iniciarJogoComJogadores(n) {
      this.baralho = criarBaralho();
      this.players = [];
      for (let i = 0; i < n; i++) {
        this.players.push({ nome: `Jogador ${i + 1}`, mao: [] });
      }
      for (let i = 0; i < this.cartasPorJogador; i++) {
        this.players.forEach(player => {
          player.mao.push(this.baralho.pop());
        });
      }
      this.jogadorDaVez = 0;
      this.cartaComprada = null;
      this.turnoFinalizado = false;
      this.jogoIniciado = true;
      this.substituindoCarta = false;
      this.mensagemHabilidade = '';
      this.habilidadeAtiva = '';
      this.jogadorTroca = null;
      this.idxCartaTrocaSelf = null;
      this.idxCartaTrocaOponente = null;
      this.jogadorEspiar = null;
      this.cartaEspiada = null;
      this.substituindoTrocaSelf = false;
    },
    comprarCarta() {
      if (this.baralho.length === 0) return;
      this.cartaComprada = this.baralho.pop();
      this.turnoFinalizado = false;
      this.mensagemHabilidade = this.getMensagemHabilidade(this.cartaComprada);
      this.substituindoCarta = false;
      this.habilidadeAtiva = this.getHabilidade(this.cartaComprada);
      this.jogadorTroca = null;
      this.idxCartaTrocaSelf = null;
      this.idxCartaTrocaOponente = null;
      this.jogadorEspiar = null;
      this.cartaEspiada = null;
      this.substituindoTrocaSelf = false;
    },
    iniciarSubstituicao() {
      this.substituindoCarta = true;
    },
    substituirCarta(idx) {
      this.players[this.jogadorDaVez].mao[idx] = this.cartaComprada;
      this.cartaComprada = null;
      this.substituindoCarta = false;
      this.turnoFinalizado = true;
      this.mensagemHabilidade = '';
      this.habilidadeAtiva = '';
      this.substituindoTrocaSelf = false;
    },
    descartarCarta() {
      this.cartaComprada = null;
      this.substituindoCarta = false;
      this.turnoFinalizado = true;
      this.mensagemHabilidade = '';
      this.habilidadeAtiva = '';
      this.substituindoTrocaSelf = false;
    },
    proximoTurno() {
      this.jogadorDaVez = (this.jogadorDaVez + 1) % this.players.length;
      this.turnoFinalizado = false;
      this.cartaComprada = null;
      this.substituindoCarta = false;
      this.mensagemHabilidade = '';
      this.habilidadeAtiva = '';
      this.jogadorTroca = null;
      this.idxCartaTrocaSelf = null;
      this.idxCartaTrocaOponente = null;
      this.jogadorEspiar = null;
      this.cartaEspiada = null;
      this.substituindoTrocaSelf = false;
    },
    getMensagemHabilidade(carta) {
      if (!carta) return '';
      if (['Nove', 'Dez'].includes(carta.nome)) {
        return 'Troque uma carta com outro jogador!';
      }
      if (['Sete', 'Oito'].includes(carta.nome)) {
        return 'Você pode olhar uma carta sua!';
      }
      if (['Cinco', 'Seis'].includes(carta.nome)) {
        return 'Você pode olhar uma carta de um oponente!';
      }
      if (carta.nome === 'Coringa') {
        return 'Coringa: valor negativo!';
      }
      return '';
    },
    getHabilidade(carta) {
      if (!carta) return '';
      if (['Nove', 'Dez'].includes(carta.nome)) return 'troca';
      if (['Sete', 'Oito'].includes(carta.nome)) return 'espiar_propria';
      if (['Cinco', 'Seis'].includes(carta.nome)) return 'espiar_oponente';
      return '';
    },
    usarHabilidade() {
      // Ativa interface da habilidade
      // (já está controlado pelo v-if/v-else-if do template)
    },
    // Troca de cartas
    selecionarJogadorTroca(idx) {
      this.jogadorTroca = idx;
      this.idxCartaTrocaSelf = null;
      this.idxCartaTrocaOponente = null;
      this.substituindoTrocaSelf = true;
    },
    selecionarCartaTroca(tipo, idx) {
      if (tipo === 'self') {
        this.idxCartaTrocaSelf = idx;
      } else if (tipo === 'oponente') {
        this.idxCartaTrocaOponente = idx;
      }
      if (this.idxCartaTrocaSelf !== null && this.idxCartaTrocaOponente !== null) {
        // Troca as cartas
        const temp = this.players[this.jogadorDaVez].mao[this.idxCartaTrocaSelf];
        this.players[this.jogadorDaVez].mao[this.idxCartaTrocaSelf] = this.players[this.jogadorTroca].mao[this.idxCartaTrocaOponente];
        this.players[this.jogadorTroca].mao[this.idxCartaTrocaOponente] = temp;
        this.finalizarHabilidade();
      }
    },
    // Espiar carta própria
    espiarCartaPropria(idx) {
      this.cartaEspiada = this.players[this.jogadorDaVez].mao[idx];
    },
    // Espiar carta do oponente
    selecionarJogadorEspiar(idx) {
      this.jogadorEspiar = idx;
      this.cartaEspiada = null;
    },
    espiarCartaOponente(idx) {
      this.cartaEspiada = this.players[this.jogadorEspiar].mao[idx];
    },
    finalizarHabilidade() {
      this.habilidadeAtiva = '';
      this.cartaEspiada = null;
      this.jogadorTroca = null;
      this.idxCartaTrocaSelf = null;
      this.idxCartaTrocaOponente = null;
      this.jogadorEspiar = null;
      this.turnoFinalizado = true;
      this.cartaComprada = null;
      this.mensagemHabilidade = '';
      this.substituindoCarta = false;
      this.substituindoTrocaSelf = false;
    },
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
</style> 