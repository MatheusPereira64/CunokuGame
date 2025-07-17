<script setup>
import { ref, onMounted } from 'vue'
import HomePage from './pages/HomePage.vue'
import JogoPage from './pages/JogoPage.vue'
import P2PService from './p2pService.js'
import { io } from 'socket.io-client'

const pagina = ref('inicio')
const numJogadores = ref(2)
const jogador = ref(null)
const sala = ref('')
const socket = ref(null)
const peers = ref([]) // Array de conexões P2P
const meuIndice = ref(null)
const totalJogadores = ref(2)
const modoBots = ref(false)
const nomesBots = ref([])
const dificuldadeBots = ref('facil')

function iniciarJogo({ qtd, jogadorInfo, salaInfo, bots, dificuldade, modoBots: isBots }) {
  numJogadores.value = qtd
  jogador.value = jogadorInfo
  sala.value = salaInfo
  modoBots.value = !!isBots
  nomesBots.value = bots || []
  dificuldadeBots.value = dificuldade || 'facil'
  pagina.value = 'jogo'
  if (!isBots) {
    // Conectar ao backend via Socket.IO
    socket.value = io('http://localhost:3000')
    socket.value.emit('entrar_sala', { nome: jogadorInfo.nome, sala: salaInfo })
    conectarP2P(qtd, salaInfo)
  } else {
    socket.value = null
  }
}

function conectarP2P(qtd, salaId) {
  totalJogadores.value = qtd
  peers.value = []
  const signalingUrl = 'ws://localhost:3001'
  const tempPeers = []
  let readyCount = 0

  // Callback para quando receber dados de qualquer peer
  function onData(data, from) {
    // Aqui você pode tratar as mensagens recebidas de outros jogadores
    console.log('Recebido de', from, data)
  }

  // Conectar ao servidor de sinalização
  const socket = new WebSocket(signalingUrl)
  socket.onopen = () => {
    socket.send(JSON.stringify({ type: 'join', sala: salaId }))
  }
  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.type === 'init') {
      meuIndice.value = msg.index
      totalJogadores.value = msg.total
      // Cria conexões P2P para todos os outros jogadores
      for (let i = 0; i < msg.total; i++) {
        if (i !== msg.index) {
          const peer = new P2PService(
            signalingUrl,
            salaId + '-' + Math.min(msg.index, i) + '-' + Math.max(msg.index, i),
            (data) => onData(data, i),
            () => { readyCount++; if (readyCount === msg.total - 1) console.log('Todos os canais P2P prontos!') },
            null,
            (err) => console.error('Erro P2P', err)
          )
          peer.connect()
          tempPeers[i] = peer
        } else {
          tempPeers[i] = null
        }
      }
      peers.value = tempPeers
    }
  }
  socket.onerror = (err) => console.error('Erro sinalização', err)
}

// Música de fundo
const audio = ref(null)
const volume = 0.3
const aguardandoInteracao = ref(true)

function iniciarMusica() {
  if (audio.value) {
    audio.value.volume = volume
    audio.value.play()
    aguardandoInteracao.value = false
  }
}

onMounted(() => {
  // Toca a música na primeira interação do usuário
  window.addEventListener('click', iniciarMusica, { once: true })
  window.addEventListener('touchstart', iniciarMusica, { once: true })
})
</script>

<template>
  <div class="app-layout">
    <div v-if="aguardandoInteracao" class="overlay-musica" @click="iniciarMusica">
      <div class="msg-musica">Clique para entrar no jogo e ativar o som 🎵</div>
    </div>
    <nav class="menu">
      <button :class="{ ativo: pagina === 'inicio' }" @click="pagina = 'inicio'">Início</button>
      <!-- Removido botão de navegação direta para Jogar -->
    </nav>
    <main>
      <HomePage v-if="pagina === 'inicio'" @iniciar-jogo="iniciarJogo" />
      <JogoPage v-else-if="pagina === 'jogo'"
        :num-jogadores="numJogadores"
        :jogador="jogador"
        :sala="sala"
        :socket="socket"
        :nome-jogador="jogador?.nome"
        :modo-bots="modoBots"
        :nomes-bots="nomesBots"
        :dificuldade-bots="dificuldadeBots"
      />
    </main>
    <div class="player-musica" style="pointer-events: none; background: none; border: none; box-shadow: none; padding: 0; position: fixed; right: 0; bottom: 0; z-index: 0;">
      <audio ref="audio" src="/src/assets/audio/elevator.mp3" loop />
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: #232946;
}
.menu {
  display: flex;
  gap: 1rem;
  background: #121629;
  padding: 1.2rem 2rem 1.2rem 2rem;
  border-radius: 0 0 16px 16px;
  box-shadow: 0 2px 16px #0005;
  justify-content: center;
}
.menu button {
  background: #232946;
  border: 2px solid #eebbc3;
  color: #eebbc3;
  font-size: 1.15rem;
  padding: 0.7rem 2.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s, color 0.2s, border 0.2s;
  margin: 0 0.2rem;
  box-shadow: 0 1px 4px #0003;
}
.menu button.ativo,
.menu button:hover {
  background: #eebbc3;
  color: #232946;
  border-color: #232946;
}
main {
  max-width: 700px;
  margin: 2rem auto;
  background: #232946;
  border-radius: 16px;
  box-shadow: 0 2px 16px #0005;
  padding: 2.5rem 2rem;
}
.player-musica {
  position: fixed;
  right: 24px;
  bottom: 24px;
  background: rgba(30,20,40,0.92);
  border: 2px solid #d4af37;
  border-radius: 16px;
  box-shadow: 0 2px 12px #0007;
  padding: 0.7rem 1.2rem 0.7rem 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  z-index: 1000;
}
.btn-musica {
  background: linear-gradient(90deg, #d4af37 60%, #b8860b 100%);
  color: #232946;
  border: none;
  border-radius: 8px;
  padding: 0.4rem 1.1rem;
  font-size: 1.1rem;
  font-weight: bold;
  box-shadow: 0 1px 4px #0003;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.btn-musica:hover {
  background: linear-gradient(90deg, #ffe082 60%, #d4af37 100%);
  color: #232946;
}
input[type="range"] {
  accent-color: #d4af37;
  width: 90px;
}
.overlay-musica {
  position: fixed;
  inset: 0;
  background: rgba(20, 10, 30, 0.92);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.msg-musica {
  color: #ffe082;
  font-size: 1.5rem;
  background: #232946;
  padding: 2rem 3rem;
  border-radius: 18px;
  border: 2px solid #d4af37;
  box-shadow: 0 2px 16px #000a;
  text-align: center;
}
</style>
