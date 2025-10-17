<script setup>
import { ref, onMounted, defineAsyncComponent } from 'vue'
import { t } from './i18n/index.js'
import { useAudioManager } from './composables/useAudioManager.js'
import { useAchievements } from './composables/useAchievements.js'
import { useThemes } from './composables/useThemes.js'
import { useStats } from './composables/useStats.js'
import { useTooltips } from './composables/useTooltips.js'
import { SOUNDS, CRITICAL_SOUNDS } from './utils/soundLibrary.js'
import './styles/animations.css'
import './styles/effects.css'
import './styles/themes.css'
import './styles/flash-game.css'
import AchievementNotification from './components/AchievementNotification.vue'
import ParticleSystem from './components/effects/ParticleSystem.vue'
import Confetti from './components/effects/Confetti.vue'
import ScreenShake from './components/effects/ScreenShake.vue'
import GlowEffect from './components/effects/GlowEffect.vue'
import Tooltip from './components/Tooltip.vue'
import Tutorial from './components/Tutorial.vue'
const HomePage = defineAsyncComponent(() => import('./pages/HomePage.vue'))
const JogoPage = defineAsyncComponent(() => import('./pages/JogoPage.vue'))
const AchievementsPage = defineAsyncComponent(() => import('./pages/AchievementsPage.vue'))
const StatsPage = defineAsyncComponent(() => import('./pages/StatsPage.vue'))
import LanguageSelector from './components/LanguageSelector.vue'

// Sistema de áudio
const {
  audioState,
  isInitialized,
  isLoading,
  initAudioContext,
  playSFX,
  playMusic,
  stopMusic,
  setMasterVolume,
  setMusicVolume,
  setSFXVolume,
  toggleMute,
  registerSound,
  preloadSounds
} = useAudioManager()

// Sistema de conquistas
const {
  achievementState,
  init: initAchievements,
  onGameStart,
  onGameWin,
  onGameLose,
  onCardDiscard,
  onAbilityUsed,
  onCombo,
  onRoomCreate
} = useAchievements()

// Sistema de temas
const {
  themeState,
  init: initThemes,
  applyTheme,
  getCurrentTheme,
  getAllThemes,
  isThemeActive,
  cycleNextTheme
} = useThemes()

// Sistema de estatísticas
const {
  statsState,
  init: initStats,
  onGameStart: statsOnGameStart,
  onGameWin: statsOnGameWin,
  onGameLose: statsOnGameLose,
  onCardDiscard: statsOnCardDiscard,
  onAbilityUsed: statsOnAbilityUsed,
  onCombo: statsOnCombo,
  onGameEnd: statsOnGameEnd
} = useStats()

// Sistema de tooltips
const {
  init: initTooltips,
  showGameTooltip,
  showHelpTooltip
} = useTooltips()

const pagina = ref('inicio')
const numJogadores = ref(2)
const jogador = ref(null)
const sala = ref('')

// Estados para efeitos visuais
const showParticles = ref(false)
const particles = ref([])
const showConfetti = ref(false)
const screenShake = ref(false)
const showGlow = ref(false)
const glowTarget = ref(null)
const socket = ref(null)
const peers = ref([]) // Array de conexões P2P
const meuIndice = ref(null)
const totalJogadores = ref(2)
const modoBots = ref(false)
const nomesBots = ref([])
const dificuldadeBots = ref('facil')

async function iniciarJogo({ qtd, jogadorInfo, salaInfo, bots, dificuldade, modoBots: isBots }) {
  numJogadores.value = qtd
  jogador.value = jogadorInfo
  sala.value = salaInfo
  modoBots.value = !!isBots
  nomesBots.value = bots || []
  dificuldadeBots.value = dificuldade || 'facil'
  pagina.value = 'jogo'
  if (!isBots) {
    const { io } = await import('socket.io-client')
    socket.value = io('http://localhost:3000')
    socket.value.emit('entrar_sala', { nome: jogadorInfo.nome, sala: salaInfo })
    await conectarP2P(qtd, salaInfo)
  } else {
    socket.value = null
  }
}

async function conectarP2P(qtd, salaId) {
  totalJogadores.value = qtd
  peers.value = []
  const signalingUrl = 'ws://localhost:3001'
  const tempPeers = []
  let readyCount = 0

  const { default: P2PService } = await import('./p2pService.js')

  // Callback para quando receber dados de qualquer peer
  function onData(data, from) {
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

// Sistema de música melhorado
const aguardandoInteracao = ref(true)

async function iniciarMusica() {
  try {
    console.log('Iniciando música...')
    
    // Marcar interação do usuário
    if (!audioState.userInteracted) {
      audioState.userInteracted = true
      await initAudioContext()
    }
    
    // Aguardar um pouco para garantir que o contexto esteja pronto
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Tocar música de fundo
    const success = await playMusic('BACKGROUND_MUSIC')
    
    if (success) {
      console.log('Música iniciada com sucesso!')
    } else {
      console.warn('Falha ao iniciar música, mas continuando...')
    }
    
    aguardandoInteracao.value = false
  } catch (error) {
    console.warn('Erro ao iniciar música:', error)
    aguardandoInteracao.value = false
  }
}

onMounted(async () => {
  // Inicializar sistema de áudio
  await initAudioContext()
  
  // Registrar sons
  Object.entries(SOUNDS).forEach(([key, config]) => {
    registerSound(key, config)
  })
  
  // Preload de sons críticos
  await preloadSounds(CRITICAL_SOUNDS)
  
  // Tentar tocar música automaticamente (alguns navegadores permitem)
  try {
    const musicStarted = await playMusic('BACKGROUND_MUSIC', { volume: 0.3 })
    if (musicStarted) {
      aguardandoInteracao.value = false
      console.log('Música iniciada automaticamente')
    } else {
      console.log('Música requer interação do usuário')
      // Toca a música na primeira interação do usuário
      window.addEventListener('click', iniciarMusica, { once: true })
      window.addEventListener('touchstart', iniciarMusica, { once: true })
    }
  } catch (error) {
    console.log('Música requer interação do usuário:', error)
    // Toca a música na primeira interação do usuário
    window.addEventListener('click', iniciarMusica, { once: true })
    window.addEventListener('touchstart', iniciarMusica, { once: true })
  }
  
  // Inicializar sistema de conquistas
  initAchievements()
  
  // Inicializar sistema de temas
  initThemes()
  
  // Inicializar sistema de estatísticas
  initStats()
  
  // Inicializar sistema de tooltips
  initTooltips()
})

// Função para remover notificação de conquista
const removeAchievementNotification = (notificationId) => {
  const index = achievementState.notifications.findIndex(n => n.id === notificationId)
  if (index > -1) {
    achievementState.notifications.splice(index, 1)
  }
}

// Callbacks do tutorial
const onTutorialComplete = () => {
  console.log('Tutorial concluído!')
  // Adicionar XP por completar tutorial
  if (statsOnGameStart) {
    statsOnGameStart({ mode: 'tutorial' })
  }
}

const onTutorialSkip = () => {
  console.log('Tutorial pulado')
}

// Funções de navegação com sons
const navigateTo = (page) => {
  playSFX('BUTTON_CLICK')
  pagina.value = page
}

const cycleNextThemeWithSound = () => {
  playSFX('BUTTON_CLICK')
  cycleNextTheme()
}

const toggleMuteWithSound = () => {
  playSFX('BUTTON_CLICK')
  toggleMute()
}

const setMusicVolumeWithSound = (volume) => {
  playSFX('BUTTON_HOVER')
  setMusicVolume(volume)
}

const setSFXVolumeWithSound = (volume) => {
  playSFX('BUTTON_HOVER')
  setSFXVolume(volume)
}
</script>

<template>
  <div class="app-layout">
    <div v-if="aguardandoInteracao" class="overlay-musica" @click="iniciarMusica">
      <div class="msg-musica flash-glow-pulse flash-text-glow">{{ t('gameStart') }} 🎵</div>
    </div>
    <nav class="menu">
      <Tooltip :title="'Início'" :content="'Voltar para a página inicial do jogo'" position="bottom">
        <button :class="{ ativo: pagina === 'inicio' }" @click="navigateTo('inicio')" class="flash-button flash-hover-scale">{{ t('gameStart') }}</button>
      </Tooltip>
      
      <Tooltip :title="'Conquistas'" :content="'Veja suas conquistas desbloqueadas e progresso'" position="bottom">
        <button :class="{ ativo: pagina === 'conquistas' }" @click="navigateTo('conquistas')" class="flash-button flash-hover-scale">🏆 Conquistas</button>
      </Tooltip>
      
      <Tooltip :title="'Estatísticas'" :content="'Visualize suas estatísticas de jogo e progresso'" position="bottom">
        <button :class="{ ativo: pagina === 'estatisticas' }" @click="navigateTo('estatisticas')" class="flash-button flash-hover-scale">📊 Estatísticas</button>
      </Tooltip>
      
      <div class="language-selector-nav">
        <LanguageSelector />
      </div>
      
      <Tooltip :title="'Tema'" :content="`Tema atual: ${getCurrentTheme()?.name}. Clique para alternar.`" position="bottom">
        <button @click="cycleNextThemeWithSound" class="theme-btn flash-hover-scale flash-glow-pulse">
          {{ getCurrentTheme()?.icon || '🎨' }}
        </button>
      </Tooltip>
      <div class="audio-controls">
        <Tooltip :title="'Controle de Áudio'" :content="audioState.isMuted ? 'Clique para ativar o som' : 'Clique para desativar o som'" position="bottom">
          <button @click="toggleMuteWithSound" class="audio-btn flash-hover-scale flash-glow-pulse">
            {{ audioState.isMuted ? '🔇' : '🔊' }}
          </button>
        </Tooltip>
        <div class="volume-controls" v-if="!audioState.isMuted">
          <label>🎵</label>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.1" 
            :value="audioState.musicVolume"
            @input="setMusicVolumeWithSound($event.target.value)"
            class="volume-slider"
          />
          <label>🔊</label>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.1" 
            :value="audioState.sfxVolume"
            @input="setSFXVolumeWithSound($event.target.value)"
            class="volume-slider"
          />
        </div>
      </div>
    </nav>
    <main>
      <Transition name="page" mode="out-in">
        <HomePage v-if="pagina === 'inicio'" @iniciar-jogo="iniciarJogo" key="home" />
        <AchievementsPage v-else-if="pagina === 'conquistas'" key="achievements" />
        <StatsPage v-else-if="pagina === 'estatisticas'" key="stats" />
        <JogoPage v-else-if="pagina === 'jogo'"
          :num-jogadores="numJogadores"
          :jogador="jogador"
          :sala="sala"
          :socket="socket"
          :nome-jogador="jogador?.nome"
          :modo-bots="modoBots"
          :nomes-bots="nomesBots"
          :dificuldade-bots="dificuldadeBots"
          key="game"
        />
      </Transition>
    </main>
    
    <!-- Sistema de Partículas -->
    <ParticleSystem v-if="showParticles" :particles="particles" />
    
    <!-- Efeito Confetti -->
    <Confetti v-if="showConfetti" @complete="showConfetti = false" />
    
    <!-- Screen Shake -->
    <ScreenShake :shake="screenShake" @complete="screenShake = false" />
    
    <!-- Glow Effect -->
    <GlowEffect v-if="showGlow" :target="glowTarget" />
    
    <!-- Notificações de Conquistas -->
    <AchievementNotification
      v-for="notification in achievementState.notifications"
      :key="notification.id"
      :notification="notification"
      @close="removeAchievementNotification"
    />
    
    <!-- Tutorial Interativo -->
    <Tutorial 
      :auto-start="true"
      :flash-style="true"
      @complete="onTutorialComplete"
      @skip="onTutorialSkip"
    />
  </div>
</template>

<style scoped>
/* Layout principal do aplicativo com tema cassino japonês */
.app-layout {
  min-height: 100vh;
  background: var(--casino-gradient);
  position: relative;
}

/* Overlay para ativação de música */
.overlay-musica {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  cursor: pointer;
  backdrop-filter: blur(5px);
}

.msg-musica {
  background: var(--gold-gradient);
  color: var(--japanese-black);
  padding: 2rem 3rem;
  border-radius: 20px;
  font-size: 1.3rem;
  font-weight: 700;
  font-family: 'Cinzel', serif;
  text-align: center;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  animation: pulseGlow 2s ease-in-out infinite alternate;
}

@keyframes pulseGlow {
  0% { transform: scale(1); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2); }
  100% { transform: scale(1.02); box-shadow: 0 12px 40px rgba(212, 175, 55, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3); }
}

/* Menu de navegação elegante */
.menu {
  display: flex;
  gap: 1.5rem;
  background: 
    linear-gradient(135deg, rgba(25, 25, 112, 0.95) 0%, rgba(28, 28, 28, 0.95) 100%);
  backdrop-filter: blur(10px);
  padding: 1.5rem 2rem;
  border-radius: 0 0 24px 24px;
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(212, 175, 55, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  justify-content: space-between;
  align-items: center;
  border-top: 3px solid var(--primary-gold);
}

.language-selector-nav {
  display: flex;
  align-items: center;
}

/* Controles de áudio */
.audio-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.audio-btn {
  background: var(--gold-gradient);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.audio-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.5);
}

.theme-btn {
  background: var(--gold-gradient);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  margin-left: 10px;
}

.theme-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.5);
}

.volume-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.volume-controls label {
  font-size: 0.9rem;
  color: var(--pearl-white);
  min-width: 20px;
  text-align: center;
}

.volume-slider {
  width: 60px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: var(--gold-gradient);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--gold-gradient);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.menu button {
  background: var(--card-gradient);
  border: 2px solid var(--primary-gold);
  color: var(--pearl-white);
  font-size: 1.15rem;
  font-family: 'Cinzel', serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0.8rem 2.5rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin: 0 0.3rem;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.menu button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s;
}

.menu button.ativo,
.menu button:hover {
  background: var(--gold-gradient);
  color: var(--japanese-black);
  border-color: var(--secondary-gold);
  transform: translateY(-2px);
  box-shadow: 
    0 4px 16px rgba(212, 175, 55, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.menu button:hover::before {
  left: 100%;
}

.menu button:active {
  transform: translateY(0);
}

/* Container principal */
main {
  max-width: min(1200px, 98vw);
  margin: 1rem auto;
  background: 
    linear-gradient(135deg, rgba(25, 25, 112, 0.9) 0%, rgba(28, 28, 28, 0.9) 100%);
  backdrop-filter: blur(15px);
  border-radius: 24px;
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.6),
    0 0 0 2px var(--primary-gold),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  padding: clamp(1rem, 3vw, 2rem);
  position: relative;
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
}

/* Transições de página estilo Flash */
.page-enter-active {
  animation: flash-page-enter 0.6s ease-out;
}

.page-leave-active {
  animation: flash-page-leave 0.4s ease-in;
}

@keyframes flash-page-enter {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes flash-page-leave {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
}

main::before {
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

/* Player de música elegante */
.player-musica {
  position: fixed;
  right: 24px;
  bottom: 24px;
  background: 
    linear-gradient(135deg, rgba(25, 25, 112, 0.95) 0%, rgba(28, 28, 28, 0.95) 100%);
  backdrop-filter: blur(10px);
  border: 2px solid var(--primary-gold);
  border-radius: 20px;
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 1000;
  transition: all 0.3s ease;
}

.player-musica:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 12px 32px rgba(0, 0, 0, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    0 0 20px rgba(212, 175, 55, 0.3);
}

.btn-musica {
  background: var(--gold-gradient);
  color: var(--japanese-black);
  border: none;
  border-radius: 10px;
  padding: 0.5rem 1.3rem;
  font-size: 1rem;
  font-weight: 700;
  font-family: 'Cinzel', serif;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 
    0 2px 8px rgba(212, 175, 55, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.btn-musica::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.btn-musica:hover {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  transform: translateY(-1px);
  box-shadow: 
    0 4px 12px rgba(212, 175, 55, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.btn-musica:hover::before {
  left: 100%;
}

/* Responsividade móvel */
@media (max-width: 768px) {
  .menu {
    padding: 1rem;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .language-selector-nav {
    order: -1;
    width: 100%;
    justify-content: center;
    margin-bottom: 0.5rem;
  }
  
  .menu button {
    padding: 0.6rem 1.5rem;
    font-size: 1rem;
    margin: 0.2rem;
  }
  
  main {
    margin: 1rem auto;
    padding: 1.5rem;
  }
  
  .player-musica {
    right: 16px;
    bottom: 16px;
    padding: 0.8rem 1rem;
  }
  
  .btn-musica {
    padding: 0.4rem 1rem;
    font-size: 0.9rem;
  }
  
  .msg-musica {
    padding: 1.5rem 2rem;
    font-size: 1.1rem;
    margin: 1rem;
  }
}

@media (max-width: 480px) {
  .menu {
    padding: 0.8rem;
    border-radius: 0 0 16px 16px;
    gap: 0.5rem;
  }
  
  .language-selector-nav {
    margin-bottom: 0.3rem;
  }
  
  .menu button {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    width: 100%;
    max-width: 200px;
  }
  
  main {
    margin: 0.5rem auto;
    padding: 1rem;
    border-radius: 16px;
  }
  
  .player-musica {
    right: 8px;
    bottom: 8px;
    padding: 0.6rem 0.8rem;
  }
}

/* Animações de entrada */
.menu button {
  animation: slideInFromTop 0.6s ease-out;
  animation-fill-mode: both;
  animation-delay: calc(var(--index, 0) * 0.1s);
}

@keyframes slideInFromTop {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

main {
  animation: fadeInScale 0.8s ease-out;
}

@keyframes fadeInScale {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
