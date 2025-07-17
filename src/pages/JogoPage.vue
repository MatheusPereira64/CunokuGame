<template>
  <div class="jogo-container">
    <template v-if="!jogoIniciado">
      <!-- LOBBY -->
      <div class="info-jogador">
        <span>Você é: <b>{{ nomeJogador }}</b></span>
      </div>
      <div class="lobby-jogadores">
        <h3>Jogadores no lobby:</h3>
        <ul>
          <li v-for="j in jogadoresConectados" :key="j.id || j.nome">{{ j.nome }}</li>
        </ul>
      </div>
      <div v-if="mostrarBotaoIniciar">
        <button class="btn-principal" @click="iniciarJogo">Iniciar Jogo</button>
      </div>
      <div class="aguardando-msg" v-else>
        <span>Aguardando o host iniciar o jogo...</span>
      </div>
    </template>
    <template v-else>
      <!-- TELA DE JOGO -->
      <CunokuGame :socket="props.socket" :jogador="props.jogador" :num-jogadores="props.numJogadores" :sala="props.sala" :estado-inicial="estadoJogo" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import CunokuGame from '../components/CunokuGame.vue'
const props = defineProps({
  numJogadores: Number,
  jogador: Object,
  sala: String,
  socket: Object,
  nomeJogador: String
})

const jogadoresConectados = ref([])
const estadoJogo = ref(null)
const jogoIniciado = ref(false)

// Ouve atualizações de jogadores conectados e estado do jogo
onMounted(() => {
  if (props.socket) {
    props.socket.on('atualizar_jogadores', (lista) => {
      jogadoresConectados.value = lista
    })
    props.socket.on('estado_jogo', (estado) => {
      estadoJogo.value = estado
      jogoIniciado.value = true
    })
    // Também ouve o evento de início do jogo (caso queira mostrar animação, etc)
    props.socket.on('jogo_iniciado', () => {
      jogoIniciado.value = true
    })
    // Solicita a lista ao entrar
    props.socket.emit('pedir_jogadores', { sala: props.sala })
  }
})

const mostrarBotaoIniciar = computed(() => {
  return props.jogador?.host && jogadoresConectados.value.length === props.numJogadores
})

function iniciarJogo() {
  if (props.socket && props.sala) {
    props.socket.emit('iniciar_jogo', { sala: props.sala })
  }
}
</script>

<style scoped>
.jogo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}
.info-jogador {
  font-size: 1.2rem;
  color: #eebbc3;
  margin-bottom: 1rem;
}
.turno-msg {
  font-size: 1.4rem;
  color: #ffe082;
  background: #232946;
  padding: 1rem 2rem;
  border-radius: 12px;
  border: 2px solid #d4af37;
  box-shadow: 0 2px 8px #0007;
  margin-bottom: 1.5rem;
}
.lobby-jogadores {
  margin-bottom: 1rem;
  background: #232946;
  border-radius: 8px;
  padding: 1rem 2rem;
  color: #eebbc3;
  box-shadow: 0 1px 8px #0003;
}
.lobby-jogadores ul {
  margin: 0;
  padding-left: 1.2rem;
}
.aguardando-msg {
  color: #ffe082;
  font-size: 1.2rem;
  margin-top: 1rem;
  text-align: center;
}
</style> 