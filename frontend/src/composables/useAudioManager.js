import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { SOUNDS, CRITICAL_SOUNDS, playGeneratedSound, isGeneratedSound } from '../utils/soundLibrary.js'

// Estado global do áudio
const audioState = reactive({
  masterVolume: 1.0,
  musicVolume: 0.3,
  sfxVolume: 0.7,
  isMuted: false,
  isMusicPlaying: false,
  currentMusic: null,
  audioContext: null,
  sounds: new Map(),
  userInteracted: false
})

// Cache de áudio
const audioCache = new Map()

export function useAudioManager() {
  const isInitialized = ref(false)
  const isLoading = ref(false)

  // Inicializar Web Audio API
  const initAudioContext = async () => {
    if (audioState.audioContext) return audioState.audioContext

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      audioState.audioContext = new AudioContext()
      
      // Resumir contexto se estiver suspenso
      if (audioState.audioContext.state === 'suspended') {
        await audioState.audioContext.resume()
      }
      
      isInitialized.value = true
      return audioState.audioContext
    } catch (error) {
      console.warn('Web Audio API não suportada, usando fallback:', error)
      return null
    }
  }

  // Carregar e cachear áudio
  const loadAudio = async (src, options = {}) => {
    if (audioCache.has(src)) {
      return audioCache.get(src)
    }

    try {
      const audio = new Audio(src)
      audio.preload = 'auto'
      audio.volume = options.volume || 1.0
      audio.loop = options.loop || false
      
      // Aguardar carregamento
      await new Promise((resolve, reject) => {
        audio.addEventListener('canplaythrough', resolve, { once: true })
        audio.addEventListener('error', reject, { once: true })
        audio.load()
      })

      audioCache.set(src, audio)
      return audio
    } catch (error) {
      console.warn(`Erro ao carregar áudio ${src}:`, error)
      return null
    }
  }

  // Marcar interação do usuário
  const markUserInteraction = () => {
    if (!audioState.userInteracted) {
      audioState.userInteracted = true
      initAudioContext()
    }
  }

  // Reproduzir efeito sonoro
  const playSFX = async (soundKey, options = {}) => {
    if (audioState.isMuted || audioState.sfxVolume === 0) return

    // Marcar interação do usuário
    markUserInteraction()

    try {
      // Verificar se é um som gerado
      if (isGeneratedSound(soundKey)) {
        playGeneratedSound(soundKey, ...(options.args || []))
        return
      }

      const soundConfig = audioState.sounds.get(soundKey)
      if (!soundConfig) {
        console.warn(`Som não encontrado: ${soundKey}`)
        return
      }

      const audio = await loadAudio(soundConfig.src, {
        volume: soundConfig.volume * audioState.sfxVolume * audioState.masterVolume,
        loop: false,
        ...options
      })

      if (audio) {
        audio.currentTime = 0
        audio.volume = soundConfig.volume * audioState.sfxVolume * audioState.masterVolume
        await audio.play()
      }
    } catch (error) {
      console.warn(`Erro ao reproduzir SFX ${soundKey}:`, error)
    }
  }

  // Reproduzir música de fundo
  const playMusic = async (musicKey, options = {}) => {
    // Marcar interação do usuário
    markUserInteraction()

    try {
      const musicConfig = audioState.sounds.get(musicKey)
      if (!musicConfig) {
        console.warn(`Música não encontrada: ${musicKey}`)
        return
      }

      // Parar música atual se estiver tocando
      if (audioState.currentMusic) {
        audioState.currentMusic.pause()
        audioState.currentMusic.currentTime = 0
      }

      const audio = await loadAudio(musicConfig.src, {
        volume: musicConfig.volume * audioState.musicVolume * audioState.masterVolume,
        loop: true,
        ...options
      })

      if (audio) {
        audioState.currentMusic = audio
        audioState.isMusicPlaying = true
        
        if (!audioState.isMuted) {
          await audio.play()
        }
      }
    } catch (error) {
      console.warn(`Erro ao reproduzir música ${musicKey}:`, error)
    }
  }

  // Parar música
  const stopMusic = (fadeOut = false) => {
    if (!audioState.currentMusic) return

    if (fadeOut) {
      fadeOutMusic(1000) // 1 segundo de fade
    } else {
      audioState.currentMusic.pause()
      audioState.currentMusic.currentTime = 0
      audioState.isMusicPlaying = false
    }
  }

  // Fade in/out
  const fadeInMusic = (duration = 2000) => {
    if (!audioState.currentMusic) return

    const audio = audioState.currentMusic
    const targetVolume = audio.volume
    audio.volume = 0
    
    const fadeInterval = 50
    const steps = duration / fadeInterval
    const volumeStep = targetVolume / steps
    let currentStep = 0

    const fadeTimer = setInterval(() => {
      currentStep++
      audio.volume = Math.min(volumeStep * currentStep, targetVolume)
      
      if (currentStep >= steps) {
        clearInterval(fadeTimer)
      }
    }, fadeInterval)
  }

  const fadeOutMusic = (duration = 2000) => {
    if (!audioState.currentMusic) return

    const audio = audioState.currentMusic
    const initialVolume = audio.volume
    
    const fadeInterval = 50
    const steps = duration / fadeInterval
    const volumeStep = initialVolume / steps
    let currentStep = 0

    const fadeTimer = setInterval(() => {
      currentStep++
      audio.volume = Math.max(initialVolume - (volumeStep * currentStep), 0)
      
      if (currentStep >= steps) {
        audio.pause()
        audio.currentTime = 0
        audioState.isMusicPlaying = false
        clearInterval(fadeTimer)
      }
    }, fadeInterval)
  }

  // Controles de volume
  const setMasterVolume = (volume) => {
    audioState.masterVolume = Math.max(0, Math.min(1, volume))
    updateAllVolumes()
  }

  const setMusicVolume = (volume) => {
    audioState.musicVolume = Math.max(0, Math.min(1, volume))
    if (audioState.currentMusic) {
      const musicConfig = Array.from(audioState.sounds.values()).find(s => s.type === 'music')
      if (musicConfig) {
        audioState.currentMusic.volume = musicConfig.volume * audioState.musicVolume * audioState.masterVolume
      }
    }
  }

  const setSFXVolume = (volume) => {
    audioState.sfxVolume = Math.max(0, Math.min(1, volume))
  }

  const toggleMute = () => {
    audioState.isMuted = !audioState.isMuted
    
    if (audioState.isMuted) {
      if (audioState.currentMusic) {
        audioState.currentMusic.pause()
      }
    } else {
      if (audioState.currentMusic && audioState.isMusicPlaying) {
        audioState.currentMusic.play()
      }
    }
  }

  // Atualizar volumes de todos os áudios
  const updateAllVolumes = () => {
    if (audioState.currentMusic) {
      const musicConfig = Array.from(audioState.sounds.values()).find(s => s.type === 'music')
      if (musicConfig) {
        audioState.currentMusic.volume = musicConfig.volume * audioState.musicVolume * audioState.masterVolume
      }
    }
  }

  // Registrar sons
  const registerSound = (key, config) => {
    audioState.sounds.set(key, {
      src: config.src,
      volume: config.volume || 1.0,
      type: config.type || 'sfx',
      ...config
    })
  }

  // Preload de sons críticos
  const preloadSounds = async (soundKeys) => {
    isLoading.value = true
    
    try {
      const loadPromises = soundKeys.map(async (key) => {
        const config = audioState.sounds.get(key)
        if (config) {
          await loadAudio(config.src, config)
        }
      })
      
      await Promise.all(loadPromises)
    } catch (error) {
      console.warn('Erro no preload de sons:', error)
    } finally {
      isLoading.value = false
    }
  }

  // Cleanup
  const cleanup = () => {
    if (audioState.currentMusic) {
      audioState.currentMusic.pause()
      audioState.currentMusic = null
    }
    
    audioCache.clear()
    audioState.sounds.clear()
    
    if (audioState.audioContext) {
      audioState.audioContext.close()
      audioState.audioContext = null
    }
  }

  // Inicialização automática
  onMounted(async () => {
    // Registrar sons da biblioteca
    Object.entries(SOUNDS).forEach(([key, config]) => {
      if (config.src) {
        registerSound(key, config)
      }
    })
    
    await initAudioContext()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    // Estado
    audioState: readonly(audioState),
    isInitialized,
    isLoading,
    
    // Métodos
    initAudioContext,
    loadAudio,
    playSFX,
    playMusic,
    stopMusic,
    fadeInMusic,
    fadeOutMusic,
    setMasterVolume,
    setMusicVolume,
    setSFXVolume,
    toggleMute,
    registerSound,
    preloadSounds,
    cleanup
  }
}

// Função helper para readonly
function readonly(obj) {
  return new Proxy(obj, {
    get(target, prop) {
      return target[prop]
    },
    set() {
      console.warn('Tentativa de modificar estado readonly do áudio')
      return false
    }
  })
}
