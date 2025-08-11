<template>
  <div class="jogo-container">
    <template v-if="!jogoIniciado && !props.modoBots">
      <!-- LOBBY ONLINE -->
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
      <CunokuGame v-if="!fimDeJogo" :socket="props.socket" :jogador="props.jogador" :num-jogadores="props.numJogadores" :sala="props.sala" :estado-inicial="estadoJogo" @fim-de-jogo="mostrarFimDeJogo" @novo-jogo="iniciarNovoJogo" :modo-bots="props.modoBots" />
      <FimDeJogo v-else :resultado="resultadoFinal" @voltar-inicio="voltarInicio" @novo-jogo="iniciarNovoJogo" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, defineAsyncComponent } from 'vue'
const CunokuGame = defineAsyncComponent(() => import('../components/Game/CunokuGameRefactored.vue'))
const FimDeJogo = defineAsyncComponent(() => import('../components/FimDeJogo.vue'))
const props = defineProps({
  numJogadores: Number,
  jogador: Object,
  sala: String,
  socket: Object,
  nomeJogador: String,
  modoBots: Boolean,
  nomesBots: Array,
  dificuldadeBots: String
})

const jogadoresConectados = ref([])
const estadoJogo = ref(null)
const jogoIniciado = ref(false)
const fimDeJogo = ref(false)
const resultadoFinal = ref(null)

// --- MODO BOTS OFFLINE ---
if (props.modoBots) {
  // Inicializa estado do jogo localmente
  const players = [
    { nome: props.jogador.nome, mao: [], humano: true },
    ...props.nomesBots.map(nome => ({ nome, mao: [], humano: false }))
  ]
  const baralho = criarBaralhoLocal()
  const cartasPorJogador = 4
  for (let i = 0; i < cartasPorJogador; i++) {
    players.forEach(player => {
      player.mao.push(baralho.pop())
    })
  }
  const pilha = [baralho.pop()]
  estadoJogo.value = {
    players,
    baralho,
    pilha,
    jogadorDaVez: 0,
    cartasPorJogador,
    jogoIniciado: true,
    aguardandoAcao: null,
    turnoAtual: 1,
    fimDeclarado: false,
    jogadorDeclarouFim: null,
    turnosRestantesFim: null,
    resultadoFinal: null
  }
  jogoIniciado.value = true
  // TODO: Gerenciar turnos e ações dos bots localmente
}

function mostrarFimDeJogo(resultado) {
  fimDeJogo.value = true
  resultadoFinal.value = resultado
}

function iniciarNovoJogo() {
  console.log('Iniciando novo jogo...')
  
  // Reset do estado para nova partida
  fimDeJogo.value = false
  resultadoFinal.value = null
  
  if (props.modoBots) {
    console.log('Modo bots - criando novo estado')
    
    // Modo offline - cria novo estado com os mesmos jogadores
    const players = estadoJogo.value.players.map(player => ({
      ...player,
      mao: [],
      points: 0 // Reset pontos se existir
    }))
    
    const baralho = criarBaralhoLocal()
    const cartasPorJogador = 4
    
    // Distribui cartas para todos os jogadores
    for (let i = 0; i < cartasPorJogador; i++) {
      players.forEach(player => {
        player.mao.push(baralho.pop())
      })
    }
    
    const pilha = [baralho.pop()]
    
    // Cria novo estado de jogo completamente limpo
    estadoJogo.value = {
      players,
      baralho,
      pilha,
      jogadorDaVez: 0,
      cartasPorJogador,
      jogoIniciado: true,
      aguardandoAcao: null,
      turnoAtual: 1,
      fimDeclarado: false,
      jogadorDeclarouFim: null,
      turnosRestantesFim: null,
      resultadoFinal: null
    }
    
    console.log('Novo estado criado:', estadoJogo.value)
  } else {
    // Modo online - solicita novo jogo ao servidor
    console.log('Modo online - solicitando novo jogo ao servidor')
    if (props.socket && props.sala) {
      props.socket.emit('iniciar_jogo', { sala: props.sala })
    }
  }
}

function voltarInicio() {
  fimDeJogo.value = false
  resultadoFinal.value = null
  jogoIniciado.value = false
  estadoJogo.value = null
  // Opcional: pode emitir evento para App.vue se quiser resetar socket
}

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
    // Se for sala de bots, inicia automaticamente
    if (props.sala && props.sala.startsWith('bots-')) {
      setTimeout(() => iniciarJogo(), 300)
    }
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

function criarBaralhoLocal() {
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
  ]
  const NAIPES = ['♠', '♥', '♦', '♣']
  let baralho = []
  // Multiplicador para garantir pelo menos 10 rodadas completas
  const numJogadores = typeof props === 'object' && props.numJogadores ? props.numJogadores : 4
  const cartasNecessarias = numJogadores * 10 * 4 // 10 rodadas, 4 cartas por jogador
  const baralhoBase = []
  for (const carta of VALORES_CARTAS) {
    if (carta.nome === 'Coringa') {
      baralhoBase.push({ ...carta, naipe: null })
      baralhoBase.push({ ...carta, naipe: null })
    } else {
      for (const naipe of NAIPES) {
        baralhoBase.push({ ...carta, naipe })
      }
    }
  }
  const multiplicador = Math.ceil(cartasNecessarias / baralhoBase.length)
  for (let m = 0; m < multiplicador; m++) {
    baralho = baralho.concat(baralhoBase.map(c => ({ ...c })))
  }
  for (let i = baralho.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[baralho[i], baralho[j]] = [baralho[j], baralho[i]]
  }
  return baralho
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