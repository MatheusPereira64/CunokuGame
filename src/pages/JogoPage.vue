<template>
  <div class="jogo-page">
    <div v-if="!jogoIniciado">
      <h2>Lobby da Sala: {{ sala }}</h2>
      <p>Jogador: <b>{{ jogador?.nome }}</b></p>
      <h3>Jogadores conectados:</h3>
      <ul>
        <li v-for="(p, idx) in jogadoresLobby" :key="idx">{{ p.nome }}</li>
      </ul>
      <button v-if="souHost" class="btn-principal" @click="iniciarJogo">Iniciar Jogo</button>
      <p v-else>Aguardando o host iniciar a partida...</p>
    </div>
    <CunokuGame v-else :num-jogadores="jogadoresLobby.length" :jogador="jogador" :socket="socket" />
  </div>
</template>

<script>
import CunokuGame from '../components/CunokuGame.vue'
export default {
  name: 'JogoPage',
  components: { CunokuGame },
  props: {
    numJogadores: { type: Number, default: 2 },
    jogador: { type: Object, default: null },
    sala: { type: String, default: '' },
    socket: { type: Object, default: null },
  },
  data() {
    return {
      jogadoresLobby: [],
      jogoIniciado: false,
    }
  },
  computed: {
    souHost() {
      // O primeiro jogador da lista é o host
      return this.jogadoresLobby.length > 0 && this.jogador && this.jogadoresLobby[0].nome === this.jogador.nome
    }
  },
  mounted() {
    if (this.socket) {
      this.socket.on('atualizar_jogadores', (jogadores) => {
        this.jogadoresLobby = jogadores
      })
      this.socket.emit('pedir_jogadores', { sala: this.sala })
      this.socket.on('jogo_iniciado', () => {
        this.jogoIniciado = true
      })
    }
  },
  methods: {
    iniciarJogo() {
      if (this.socket) {
        this.socket.emit('iniciar_jogo', { sala: this.sala })
      }
    }
  }
}
</script>

<style scoped>
.jogo-page {
  display: flex;
  flex-direction: column;
  align-items: center;
}
ul {
  color: #eebbc3;
  margin-bottom: 1.2rem;
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
</style> 