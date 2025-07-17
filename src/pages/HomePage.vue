<template>
  <div class="home-container">
    <h1>Cunoku Online</h1>
    <div v-if="!modoEscolhido" class="menu-inicial">
      <button @click="modoEscolhido = 'host'">Hostear Sala</button>
      <button @click="modoEscolhido = 'join'">Entrar em Sala</button>
      <button @click="modoEscolhido = 'bots'">Jogar contra Bots</button>
    </div>
    <div v-else-if="modoEscolhido === 'host'" class="host-form">
      <h2>Hostear Sala</h2>
      <label>Nome do Jogador:
        <input v-model="nomeJogador" placeholder="Seu nome" />
      </label>
      <label>Nome da Sala:
        <input v-model="nomeSala" placeholder="Ex: minha-sala-123" />
      </label>
      <label>Número de Jogadores:
        <input type="number" v-model.number="qtdJogadores" min="2" max="8" />
      </label>
      <button :disabled="!nomeJogador" @click="hostearSala">Criar Sala</button>
      <button class="voltar" @click="modoEscolhido = null">Voltar</button>
    </div>
    <div v-else-if="modoEscolhido === 'join'" class="join-form">
      <h2>Entrar em Sala</h2>
      <label>Nome do Jogador:
        <input v-model="nomeJogador" placeholder="Seu nome" />
      </label>
      <label>Nome da Sala:
        <input v-model="nomeSala" placeholder="Digite o nome da sala" />
      </label>
      <button :disabled="!nomeJogador || !nomeSala" @click="entrarSala">Entrar</button>
      <button class="voltar" @click="modoEscolhido = null">Voltar</button>
      <div class="lobbys-lista">
        <h3>Lobbys Disponíveis</h3>
        <div v-if="carregandoLobbys">Carregando lobbys...</div>
        <div v-else-if="erroLobbys">{{ erroLobbys }}</div>
        <ul v-else>
          <li v-for="lobby in lobbys" :key="lobby.nome">
            <button class="lobby-btn" @click="selecionarLobby(lobby.nome)">
              {{ lobby.nome }} ({{ lobby.jogadores }}/8)
            </button>
          </li>
          <li v-if="lobbys.length === 0">Nenhum lobby disponível</li>
        </ul>
      </div>
    </div>
    <div v-else-if="modoEscolhido === 'bots'" class="bots-form">
      <h2>Jogar contra Bots</h2>
      <label>Seu nome:
        <input v-model="nomeJogador" placeholder="Seu nome" />
      </label>
      <label>Número de Bots:
        <input type="number" v-model.number="qtdBots" min="1" max="7" />
      </label>
      <label>Dificuldade:
        <select v-model="dificuldadeBot">
          <option value="facil">Fácil</option>
          <option value="medio">Médio</option>
          <option value="dificil">Difícil</option>
        </select>
      </label>
      <button :disabled="!nomeJogador || qtdBots < 1" @click="iniciarContraBots">Iniciar Contra Bots</button>
      <button class="voltar" @click="modoEscolhido = null">Voltar</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const emit = defineEmits(['iniciar-jogo'])
const modoEscolhido = ref(null)
const nomeSala = ref('')
const qtdJogadores = ref(2)
const nomeJogador = ref('')
const lobbys = ref([])
const carregandoLobbys = ref(false)
const erroLobbys = ref('')
let wsLobby = null
const qtdBots = ref(3)
const dificuldadeBot = ref('facil')

function buscarLobbys() {
  carregandoLobbys.value = true
  erroLobbys.value = ''
  lobbys.value = []
  if (wsLobby) wsLobby.close()
  wsLobby = new WebSocket('ws://localhost:3001')
  wsLobby.onopen = () => {
    wsLobby.send(JSON.stringify({ type: 'listar_lobbys' }))
  }
  wsLobby.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.type === 'lobbys_disponiveis') {
      lobbys.value = msg.lobbys
      carregandoLobbys.value = false
    }
  }
  wsLobby.onerror = () => {
    erroLobbys.value = 'Erro ao buscar lobbys.'
    carregandoLobbys.value = false
  }
}

function selecionarLobby(nome) {
  nomeSala.value = nome
}

function hostearSala() {
  if (!nomeSala.value) {
    nomeSala.value = 'sala-' + Math.random().toString(36).substring(2, 8)
  }
  if (!nomeJogador.value) return
  emit('iniciar-jogo', {
    qtd: qtdJogadores.value,
    jogadorInfo: { host: true, nome: nomeJogador.value },
    salaInfo: nomeSala.value
  })
}

function entrarSala() {
  if (!nomeSala.value || !nomeJogador.value) return
  emit('iniciar-jogo', {
    qtd: null, // será definido ao conectar
    jogadorInfo: { host: false, nome: nomeJogador.value },
    salaInfo: nomeSala.value
  })
}

function iniciarContraBots() {
  // Gera nomes de bots
  const nomesBots = [
    'Naldo', 'Hulk', 'Sanfona', 'Superlombra', 'Rufus', 'Marcelo fantasma', 'Zé Bolacha'
  ].slice(0, qtdBots.value)
  emit('iniciar-jogo', {
    qtd: qtdBots.value + 1,
    jogadorInfo: { host: true, nome: nomeJogador.value },
    salaInfo: 'bots-' + Math.random().toString(36).substring(2, 8),
    bots: nomesBots,
    dificuldade: dificuldadeBot.value,
    modoBots: true
  })
}

// Buscar lobbys ao escolher modo join
watch(modoEscolhido, (novo) => {
  if (novo === 'join') buscarLobbys()
})
</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}
.menu-inicial {
  display: flex;
  gap: 2rem;
}
.host-form, .join-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  background: #232946;
  padding: 2rem 2.5rem;
  border-radius: 16px;
  box-shadow: 0 2px 16px #0005;
  min-width: 320px;
}
label {
  color: #eebbc3;
  font-weight: bold;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
input[type="text"], input[type="number"] {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid #eebbc3;
  background: #121629;
  color: #fff;
  font-size: 1.1rem;
}
button {
  background: #eebbc3;
  color: #232946;
  border: none;
  border-radius: 8px;
  padding: 0.7rem 1.5rem;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: background 0.2s, color 0.2s;
}
button:disabled {
  background: #b6a1a9;
  color: #232946;
  cursor: not-allowed;
}
button.voltar {
  background: #232946;
  color: #eebbc3;
  border: 2px solid #eebbc3;
  margin-top: 0.2rem;
}
button:hover:enabled {
  background: #ffe082;
  color: #232946;
}
.lobbys-lista {
  margin-top: 1.5rem;
  background: #121629;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  box-shadow: 0 1px 8px #0005;
  color: #eebbc3;
}
.lobby-btn {
  background: #ffe082;
  color: #232946;
  border: none;
  border-radius: 8px;
  padding: 0.4rem 1.1rem;
  font-size: 1.05rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.lobby-btn:hover {
  background: #eebbc3;
  color: #232946;
}
.bots-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  background: #232946;
  padding: 2rem 2.5rem;
  border-radius: 16px;
  box-shadow: 0 2px 16px #0005;
  min-width: 320px;
}
</style> 