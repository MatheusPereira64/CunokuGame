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
          <div v-for="(carta, idx) in estado.players[meuIndice]?.mao || []" :key="idx" class="carta-btn animate__animated animate__fadeInUp">
            <CartaSvg :valor="mapValorSvg(carta.nome)" :naipe="mapNaipeSvg(carta.naipe)" :width="60" :height="90" />
          </div>
        </div>
      </div>
      <div v-if="estado.jogadorDaVez === meuIndice">
        <button class="btn-principal" @click="comprarCarta">Comprar carta</button>
        <!-- Adicione outros botões de ação aqui -->
      </div>
      <div v-else>
        <p>Aguarde sua vez...</p>
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
  },
  data() {
    return {
      estado: null,
      meuIndice: null,
    }
  },
  watch: {
    socket: {
      immediate: true,
      handler(s) {
        if (s) {
          s.on('estado_jogo', (estado) => {
            this.estado = estado
            // Descobre o índice do jogador local
            if (this.jogador && estado && estado.players) {
              this.meuIndice = estado.players.findIndex(p => p.nome === this.jogador.nome)
            }
          })
        }
      }
    }
  },
  components: { CartaSvg },
  methods: {
    // Exemplo: enviar ação para o backend
    comprarCarta() {
      if (this.socket && this.estado) {
        this.socket.emit('comprar_carta', { sala: this.$parent.sala, jogador: this.jogador.nome })
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