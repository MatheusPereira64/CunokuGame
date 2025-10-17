<template>
  <div class="home-container">
    <h1 class="flash-text-glow flash-glow-pulse">{{ t('gameTitle') }}</h1>
    <div v-if="!modoEscolhido" class="menu-inicial">
      <button @click="selectMode('host')" class="flash-button flash-hover-scale flash-glow-pulse">{{ t('hostRoom') }}</button>
      <button @click="selectMode('join')" class="flash-button flash-hover-scale flash-glow-pulse">{{ t('joinRoom') }}</button>
      <button @click="selectMode('bots')" class="flash-button flash-hover-scale flash-glow-pulse">{{ t('playAgainstBots') }}</button>
    </div>
    <div v-else-if="modoEscolhido === 'host'" class="host-form">
      <h2>{{ t('hostRoomTitle') }}</h2>
      <label>{{ t('playerName') }}:
        <input v-model="nomeJogador" :placeholder="t('playerNamePlaceholder')" />
      </label>
      <label>{{ t('roomName') }}:
        <input v-model="nomeSala" :placeholder="t('roomNamePlaceholder')" />
      </label>
      <label>{{ t('numberOfPlayers') }}:
        <input type="number" v-model.number="qtdJogadores" min="2" max="6" />
      </label>
      <button :disabled="!nomeJogador" @click="hostearSalaWithSound" class="flash-button flash-hover-scale" :class="{ 'disabled': !nomeJogador }">{{ t('createRoom') }}</button>
      <button class="voltar flash-button flash-hover-rotate" @click="goBackWithSound">{{ t('back') }}</button>
    </div>
    <div v-else-if="modoEscolhido === 'join'" class="join-form">
      <h2>{{ t('joinRoomTitle') }}</h2>
      <label>{{ t('playerName') }}:
        <input v-model="nomeJogador" :placeholder="t('playerNamePlaceholder')" />
      </label>
      <label>{{ t('roomName') }}:
        <input v-model="nomeSala" :placeholder="t('enterRoomName')" />
      </label>
      <button :disabled="!nomeJogador || !nomeSala" @click="entrarSalaWithSound" class="flash-button flash-hover-scale" :class="{ 'disabled': !nomeJogador || !nomeSala }">{{ t('join') }}</button>
      <button class="voltar flash-button flash-hover-rotate" @click="goBackWithSound">{{ t('back') }}</button>
      <div class="lobbys-lista">
        <h3>{{ t('availableLobbies') }}</h3>
        <div v-if="carregandoLobbys">{{ t('loadingLobbies') }}</div>
        <div v-else-if="erroLobbys">{{ erroLobbys }}</div>
        <ul v-else>
          <li v-for="lobby in lobbys" :key="lobby.nome">
            <button class="lobby-btn flash-button flash-hover-glow" @click="selecionarLobbyWithSound(lobby.nome)">
              {{ lobby.nome }} ({{ lobby.jogadores }}/8)
            </button>
          </li>
          <li v-if="lobbys.length === 0">{{ t('noLobbiesAvailable') }}</li>
        </ul>
      </div>
    </div>
    <div v-else-if="modoEscolhido === 'bots'" class="bots-form">
      <h2>{{ t('playBotsTitle') }}</h2>
      <label>{{ t('yourName') }}:
        <input v-model="nomeJogador" :placeholder="t('playerNamePlaceholder')" />
      </label>
      <label>{{ t('numberOfBots') }}:
        <input type="number" v-model.number="qtdBots" min="1" max="5" />
      </label>
      <label>{{ t('difficulty') }}:
        <select v-model="dificuldadeBot">
          <option value="facil">{{ t('easy') }}</option>
          <option value="medio">{{ t('medium') }}</option>
          <option value="dificil">{{ t('hard') }}</option>
        </select>
      </label>
      <button :disabled="!nomeJogador || qtdBots < 1" @click="iniciarContraBotsWithSound" class="flash-button flash-hover-scale" :class="{ 'disabled': !nomeJogador || qtdBots < 1 }">{{ t('startAgainstBots') }}</button>
      <button class="voltar flash-button flash-hover-rotate" @click="goBackWithSound">{{ t('back') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { t } from '../i18n/index.js'
import { useAudioManager } from '../composables/useAudioManager.js'

// Sistema de áudio
const { playSFX } = useAudioManager()

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

// Funções com sons
const selectMode = (mode) => {
  playSFX('BUTTON_CLICK')
  modoEscolhido.value = mode
}

const goBackWithSound = () => {
  playSFX('BUTTON_CLICK')
  modoEscolhido.value = null
}

const hostearSalaWithSound = () => {
  if (!nomeJogador.value) {
    playSFX('ERROR')
    return
  }
  playSFX('BUTTON_CLICK')
  hostearSala()
}

const entrarSalaWithSound = () => {
  if (!nomeSala.value || !nomeJogador.value) {
    playSFX('ERROR')
    return
  }
  playSFX('BUTTON_CLICK')
  entrarSala()
}

const selecionarLobbyWithSound = (nome) => {
  playSFX('BUTTON_CLICK')
  selecionarLobby(nome)
}

const iniciarContraBotsWithSound = () => {
  if (!nomeJogador.value || qtdBots.value < 1) {
    playSFX('ERROR')
    return
  }
  playSFX('BUTTON_CLICK')
  iniciarContraBots()
}
</script>

<style scoped>
/* Layout principal da página inicial com tema cassino japonês */
.home-bg {
  min-height: 100vh;
  min-width: 100vw;
  position: relative;
  background: 
    linear-gradient(135deg, var(--deep-red) 0%, var(--japanese-black) 50%, var(--dark-navy) 100%),
    url('../../assets/bg/samurais.png') no-repeat center center;
  background-size: cover, contain;
  background-attachment: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-x: hidden;
}

.home-bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: 
    radial-gradient(circle at 20% 80%, rgba(220, 20, 60, 0.2) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(212, 175, 55, 0.2) 0%, transparent 50%),
    linear-gradient(135deg, rgba(28, 28, 28, 0.8) 0%, rgba(15, 20, 25, 0.9) 100%);
  z-index: 1;
  backdrop-filter: blur(2px);
}

/* Container principal elegante */
.home-container {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2.5rem;
  padding: 2rem;
  max-width: min(700px, 95vw);
  margin: 0 auto;
  text-align: center;
  width: 100%;
}

/* Título principal estilizado */
h1 {
  font-family: 'Cinzel', serif;
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 700;
  background: var(--gold-gradient);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;
  margin: 0 0 1rem 0;
  padding: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.8));
  animation: titleGlow 4s ease-in-out infinite alternate;
  transform: none;
  display: block;
  width: 100%;
  line-height: 1.1;
  letter-spacing: 0.02em;
}

@keyframes titleGlow {
  0% { filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.8)); }
  100% { filter: drop-shadow(0 4px 16px rgba(212, 175, 55, 0.4)); }
}

/* Menu inicial com botões luxuosos */
.menu-inicial {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  max-width: 500px;
  align-items: center;
  justify-content: center;
}

.menu-inicial button {
  width: 100%;
  max-width: 400px;
  min-height: 60px;
  min-width: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  white-space: nowrap;
  font-size: clamp(0.8rem, 1.2vw, 0.95rem);
  padding: 1rem 2rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Estilos para botões desabilitados */
.flash-button.disabled,
.flash-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
  background: var(--card-gradient) !important;
  color: rgba(248, 248, 255, 0.5) !important;
}

.flash-button.disabled:hover,
.flash-button:disabled:hover {
  transform: none !important;
  box-shadow: none !important;
  background: var(--card-gradient) !important;
  color: rgba(248, 248, 255, 0.5) !important;
}

@media (min-width: 768px) {
  .menu-inicial {
    flex-direction: row;
    justify-content: center;
    gap: 1.5rem;
    max-width: 1000px;
  }
  
  .menu-inicial button {
    width: 260px;
    max-width: none;
    font-size: 0.9rem;
    padding: 1rem 1.8rem;
  }
}

@media (min-width: 1024px) {
  .menu-inicial button {
    width: 280px;
    font-size: 1rem;
    padding: 1rem 2rem;
  }
}

@media (min-width: 1200px) {
  .menu-inicial button {
    width: 300px;
    font-size: 1.1rem;
  }
}

/* Formulários elegantes */
.host-form, .join-form, .bots-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: 
    linear-gradient(135deg, rgba(25, 25, 112, 0.9) 0%, rgba(28, 28, 28, 0.9) 100%);
  backdrop-filter: blur(10px);
  padding: 2.5rem 3rem;
  border-radius: 24px;
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.6),
    0 0 0 2px var(--primary-gold),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  min-width: 320px;
  max-width: 500px;
  width: 100%;
  position: relative;
}

.host-form::before, .join-form::before, .bots-form::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 25% 25%, rgba(212, 175, 55, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(220, 20, 60, 0.05) 0%, transparent 50%);
  border-radius: 24px;
  pointer-events: none;
}

/* Títulos dos formulários */
h2 {
  font-family: 'Cinzel', serif;
  color: var(--secondary-gold);
  text-align: center;
  margin-bottom: 1rem;
  font-size: clamp(1.4rem, 3vw, 1.8rem);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

/* Labels estilizados */
label {
  color: var(--pearl-white);
  font-weight: 600;
  font-family: 'Noto Sans JP', sans-serif;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 1rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* Inputs luxuosos */
input[type="text"], input[type="number"], select {
  padding: 0.8rem 1.2rem;
  border-radius: 12px;
  border: 2px solid rgba(212, 175, 55, 0.3);
  background: var(--card-gradient);
  color: var(--pearl-white);
  font-size: 1.1rem;
  font-family: 'Noto Sans JP', sans-serif;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.3),
    0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Específico para select */
select {
  appearance: none;
  background-image: 
    linear-gradient(145deg, #2A2A2A 0%, #1A1A1A 100%),
    url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'%3E%3Cpath fill='%23d4af37' d='M2 0L0 2h4zm0 5L0 3h4z'/%3E%3C/svg%3E");
  background-repeat: no-repeat, no-repeat;
  background-position: right 1rem center;
  background-size: auto, 0.8rem;
  padding-right: 3rem;
  cursor: pointer;
}

select option {
  background: var(--japanese-black);
  color: var(--pearl-white);
  font-weight: 500;
  padding: 0.5rem;
}

input[type="text"]:focus, input[type="number"]:focus, select:focus {
  outline: none;
  border-color: var(--primary-gold);
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.3),
    0 1px 0 rgba(255, 255, 255, 0.1),
    0 0 0 3px rgba(212, 175, 55, 0.2);
  background: linear-gradient(135deg, #333 0%, #222 100%);
}

input::placeholder {
  color: rgba(248, 248, 255, 0.5);
  font-style: italic;
}

/* Botões com estilo cassino premium */
button {
  background: var(--gold-gradient);
  color: var(--japanese-black);
  border: none;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  font-size: 1rem;
  font-weight: 700;
  font-family: 'Cinzel', serif;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: visible;
  box-shadow: 
    0 4px 16px rgba(212, 175, 55, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  white-space: nowrap;
  min-height: 50px;
  word-spacing: 0.05em;
  line-height: 1.2;
}

button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

button:hover:enabled {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  transform: translateY(-2px);
  box-shadow: 
    0 8px 24px rgba(212, 175, 55, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

button:hover:enabled::before {
  left: 100%;
}

button:active:enabled {
  transform: translateY(0);
}

/* Botão desabilitado */
button:disabled {
  background: linear-gradient(135deg, #666 0%, #444 100%);
  color: rgba(248, 248, 255, 0.5);
  cursor: not-allowed;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transform: none;
}

/* Botão voltar com estilo alternativo */
button.voltar {
  background: transparent;
  color: var(--pearl-white);
  border: 2px solid var(--primary-gold);
  margin-top: 0.5rem;
}

button.voltar:hover:enabled {
  background: var(--primary-gold);
  color: var(--japanese-black);
  border-color: var(--secondary-gold);
}

/* Lista de lobbys estilizada */
.lobbys-lista {
  margin-top: 2rem;
  background: 
    linear-gradient(135deg, rgba(0, 0, 0, 0.6) 0%, rgba(25, 25, 112, 0.4) 100%);
  border-radius: 16px;
  padding: 1.5rem 2rem;
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  color: var(--pearl-white);
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.lobbys-lista h3 {
  font-family: 'Cinzel', serif;
  color: var(--secondary-gold);
  margin-bottom: 1rem;
  text-align: center;
  font-size: 1.2rem;
}

.lobbys-lista ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.lobbys-lista li {
  margin-bottom: 0.8rem;
}

.lobbys-lista li:last-child {
  margin-bottom: 0;
}

/* Botões de lobby luxuosos */
.lobby-btn {
  background: linear-gradient(135deg, var(--jade-green) 0%, #00C851 100%);
  color: var(--pearl-white);
  border: none;
  border-radius: 10px;
  padding: 0.6rem 1.4rem;
  font-size: 1rem;
  font-weight: 600;
  width: 100%;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 2px 8px rgba(0, 168, 107, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.lobby-btn:hover {
  background: linear-gradient(135deg, #00C851 0%, #007E33 100%);
  transform: translateY(-1px);
  box-shadow: 
    0 4px 12px rgba(0, 168, 107, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* Responsividade móvel */
@media (max-width: 768px) {
  .home-container {
    padding: 1rem;
    gap: 2rem;
  }
  
  .host-form, .join-form, .bots-form {
    padding: 2rem;
    margin: 0 0.5rem;
  }
  
  .menu-inicial {
    gap: 1rem;
  }
  
  button {
    padding: 0.7rem 1.5rem;
    font-size: 1rem;
  }
  
  input[type="text"], input[type="number"], select {
    padding: 0.7rem 1rem;
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .home-container {
    padding: 0.5rem;
  }
  
  .host-form, .join-form, .bots-form {
    padding: 1.5rem;
    min-width: 280px;
  }
  
  h1 {
    font-size: 2rem;
  }
  
  h2 {
    font-size: 1.2rem;
  }
  
  button {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
  }
}

/* Animações especiais */
.menu-inicial button {
  animation: buttonFloat 3s ease-in-out infinite alternate;
  animation-delay: calc(var(--delay, 0) * 0.2s);
}

@keyframes buttonFloat {
  0% { transform: translateY(0px); }
  100% { transform: translateY(-5px); }
}

/* Estados de carregamento */
.carregando {
  opacity: 0.7;
  pointer-events: none;
}

.carregando::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  border: 2px solid var(--primary-gold);
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}
</style> 