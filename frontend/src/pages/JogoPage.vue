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
    // Recebe resultado final do servidor e exibe tela de fim de jogo
    props.socket.on('fim_de_jogo', (resultado) => {
      // Garante lista de jogadores para exibição das mãos finais
      const jogadores = estadoJogo.value?.players || []
      resultadoFinal.value = { ...resultado, jogadores }
      fimDeJogo.value = true
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
/* Container do jogo - TELA CHEIA E RESPONSIVO */
.jogo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  width: 100vw;
  height: 100vh;
  max-width: 100vw;
  max-height: 100vh;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

.info-jogador {
  font-size: clamp(0.85rem, 1.5vw, 1.1rem);
  color: #eebbc3;
  margin-bottom: clamp(0.3rem, 1vh, 0.75rem);
}

.turno-msg {
  font-size: clamp(0.9rem, 1.8vw, 1.3rem);
  color: #ffe082;
  background: #232946;
  padding: clamp(0.5rem, 1.5vh, 0.9rem) clamp(1rem, 3vw, 1.8rem);
  border-radius: clamp(6px, 1vw, 12px);
  border: clamp(1px, 0.2vw, 2px) solid #d4af37;
  box-shadow: 0 2px 8px #0007;
  margin-bottom: clamp(0.5rem, 1.5vh, 1rem);
}

.lobby-jogadores {
  margin-bottom: clamp(0.3rem, 1vh, 0.75rem);
  background: #232946;
  border-radius: clamp(4px, 0.8vw, 8px);
  padding: clamp(0.5rem, 1.5vh, 0.9rem) clamp(1rem, 3vw, 1.8rem);
  color: #eebbc3;
  box-shadow: 0 1px 8px #0003;
}

.lobby-jogadores ul {
  margin: 0;
  padding-left: clamp(0.75rem, 2vw, 1.2rem);
}

.aguardando-msg {
  color: #ffe082;
  font-size: clamp(0.85rem, 1.5vw, 1.1rem);
  margin-top: clamp(0.3rem, 1vh, 0.75rem);
  text-align: center;
}

/* Responsividade para tablets */
@media (max-width: 1024px) {
  .jogo-container {
    gap: clamp(0.4rem, 1.2vh, 0.8rem);
  }
}

/* Responsividade para celulares */
@media (max-width: 768px) {
  .jogo-container {
    gap: clamp(0.3rem, 1vh, 0.6rem);
  }
  
  .info-jogador {
    font-size: clamp(0.75rem, 2vw, 0.95rem);
  }
  
  .turno-msg {
    padding: clamp(0.4rem, 1.2vh, 0.7rem) clamp(0.75rem, 2.5vw, 1.4rem);
    font-size: clamp(0.8rem, 2vw, 1rem);
  }
  
  .lobby-jogadores {
    padding: clamp(0.4rem, 1.2vh, 0.7rem) clamp(0.75rem, 2.5vw, 1.4rem);
  }
}

/* Responsividade para celulares pequenos */
@media (max-width: 480px) {
  .jogo-container {
    gap: clamp(0.25rem, 0.8vh, 0.5rem);
  }
}

/* Landscape em dispositivos móveis */
@media (max-height: 500px) and (orientation: landscape) {
  .jogo-container {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: clamp(0.25rem, 0.8vw, 0.5rem);
  }
}
</style> 