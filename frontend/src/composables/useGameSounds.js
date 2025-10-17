import { ref, computed } from 'vue'
import { useAudioManager } from './useAudioManager.js'

export function useGameSounds() {
  const { playSFX, playMusic, setSFXVolume, setMusicVolume, isMuted } = useAudioManager()
  
  // Estado dos sons de jogo
  const gameSoundsEnabled = ref(true)
  const contextualSounds = ref(true)
  const ambientSounds = ref(true)
  
  // Volume específico para diferentes contextos
  const volumeContexts = ref({
    ui: 0.8,        // Sons de interface
    game: 0.9,      // Sons de jogo
    ambient: 0.3,   // Sons ambientes
    music: 0.4,     // Música de fundo
    voice: 1.0      // Sons de voz/efeitos especiais
  })
  
  // Sons contextuais por tipo de ação
  const contextualSoundMap = {
    // Ações de jogo
    'card-draw': 'CARD_DRAW',
    'card-discard': 'CARD_DISCARD',
    'card-flip': 'CARD_FLIP',
    'card-shuffle': 'CARD_SHUFFLE',
    
    // Ações de interface
    'button-click': 'BUTTON_CLICK',
    'button-hover': 'BUTTON_HOVER',
    'modal-open': 'MODAL_OPEN',
    'modal-close': 'MODAL_CLOSE',
    
    // Estados de jogo
    'turn-start': 'TURN_START',
    'turn-end': 'TURN_END',
    'game-start': 'GAME_START',
    'game-end': 'GAME_END',
    
    // Resultados
    'victory': 'VICTORY',
    'defeat': 'DEFEAT',
    'draw': 'DRAW',
    'achievement': 'ACHIEVEMENT',
    
    // Habilidades
    'ability-use': 'ABILITY_USE',
    'ability-success': 'ABILITY_SUCCESS',
    'ability-fail': 'ABILITY_FAIL',
    
    // Efeitos especiais
    'confetti': 'CONFETTI',
    'screen-shake': 'SCREEN_SHAKE',
    'glow-effect': 'GLOW_EFFECT',
    'particle-burst': 'PARTICLE_BURST'
  }
  
  // Sons ambientes
  const ambientSoundMap = {
    'background-music': 'BACKGROUND_MUSIC',
    'menu-music': 'MENU_MUSIC',
    'game-music': 'GAME_MUSIC',
    'victory-music': 'VICTORY_MUSIC',
    'defeat-music': 'DEFEAT_MUSIC'
  }
  
  /**
   * Toca um som contextual
   * @param {string} context - Contexto do som
   * @param {Object} options - Opções adicionais
   */
  const playContextualSound = async (context, options = {}) => {
    if (!gameSoundsEnabled.value || !contextualSounds.value) return false
    
    const soundKey = contextualSoundMap[context]
    if (!soundKey) {
      console.warn(`Som contextual não encontrado: ${context}`)
      return false
    }
    
    const volume = volumeContexts.value[options.volumeContext || 'ui'] * (options.volume || 1)
    
    try {
      await playSFX(soundKey, { volume })
      return true
    } catch (error) {
      console.warn(`Erro ao tocar som contextual ${context}:`, error)
      return false
    }
  }
  
  /**
   * Toca música ambiente
   * @param {string} ambient - Tipo de música ambiente
   * @param {Object} options - Opções adicionais
   */
  const playAmbientMusic = async (ambient, options = {}) => {
    if (!gameSoundsEnabled.value || !ambientSounds.value) return false
    
    const musicKey = ambientSoundMap[ambient]
    if (!musicKey) {
      console.warn(`Música ambiente não encontrada: ${ambient}`)
      return false
    }
    
    const volume = volumeContexts.value.music * (options.volume || 1)
    
    try {
      await playMusic(musicKey, { volume })
      return true
    } catch (error) {
      console.warn(`Erro ao tocar música ambiente ${ambient}:`, error)
      return false
    }
  }
  
  /**
   * Toca som de carta
   * @param {string} action - Ação da carta
   * @param {Object} options - Opções adicionais
   */
  const playCardSound = async (action, options = {}) => {
    const cardSounds = {
      'draw': 'card-draw',
      'discard': 'card-discard',
      'flip': 'card-flip',
      'shuffle': 'card-shuffle',
      'hover': 'button-hover',
      'click': 'button-click'
    }
    
    const context = cardSounds[action] || 'button-click'
    return await playContextualSound(context, { ...options, volumeContext: 'game' })
  }
  
  /**
   * Toca som de interface
   * @param {string} action - Ação da interface
   * @param {Object} options - Opções adicionais
   */
  const playUISound = async (action, options = {}) => {
    const uiSounds = {
      'click': 'button-click',
      'hover': 'button-hover',
      'open': 'modal-open',
      'close': 'modal-close',
      'success': 'ability-success',
      'error': 'ability-fail'
    }
    
    const context = uiSounds[action] || 'button-click'
    return await playContextualSound(context, { ...options, volumeContext: 'ui' })
  }
  
  /**
   * Toca som de jogo
   * @param {string} action - Ação do jogo
   * @param {Object} options - Opções adicionais
   */
  const playGameSound = async (action, options = {}) => {
    const gameSounds = {
      'turn-start': 'turn-start',
      'turn-end': 'turn-end',
      'game-start': 'game-start',
      'game-end': 'game-end',
      'victory': 'victory',
      'defeat': 'defeat',
      'draw': 'draw',
      'achievement': 'achievement'
    }
    
    const context = gameSounds[action] || 'button-click'
    return await playContextualSound(context, { ...options, volumeContext: 'game' })
  }
  
  /**
   * Toca som de habilidade
   * @param {string} ability - Tipo de habilidade
   * @param {string} result - Resultado da habilidade
   * @param {Object} options - Opções adicionais
   */
  const playAbilitySound = async (ability, result = 'use', options = {}) => {
    const abilitySounds = {
      'use': 'ability-use',
      'success': 'ability-success',
      'fail': 'ability-fail'
    }
    
    const context = abilitySounds[result] || 'ability-use'
    return await playContextualSound(context, { ...options, volumeContext: 'game' })
  }
  
  /**
   * Toca som de efeito visual
   * @param {string} effect - Tipo de efeito
   * @param {Object} options - Opções adicionais
   */
  const playEffectSound = async (effect, options = {}) => {
    const effectSounds = {
      'confetti': 'confetti',
      'shake': 'screen-shake',
      'glow': 'glow-effect',
      'particles': 'particle-burst'
    }
    
    const context = effectSounds[effect] || 'button-click'
    return await playContextualSound(context, { ...options, volumeContext: 'voice' })
  }
  
  /**
   * Toca sequência de sons
   * @param {Array} sounds - Array de sons para tocar
   * @param {Object} options - Opções adicionais
   */
  const playSoundSequence = async (sounds, options = {}) => {
    if (!Array.isArray(sounds) || sounds.length === 0) return false
    
    const delay = options.delay || 100
    const results = []
    
    for (let i = 0; i < sounds.length; i++) {
      const sound = sounds[i]
      const result = await playContextualSound(sound.context, {
        ...sound.options,
        ...options
      })
      results.push(result)
      
      if (i < sounds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    return results.every(result => result)
  }
  
  /**
   * Toca som com fade in/out
   * @param {string} context - Contexto do som
   * @param {Object} options - Opções adicionais
   */
  const playSoundWithFade = async (context, options = {}) => {
    const fadeIn = options.fadeIn || 0
    const fadeOut = options.fadeOut || 0
    const duration = options.duration || 1000
    
    // Implementar fade in/out se necessário
    return await playContextualSound(context, options)
  }
  
  /**
   * Para todos os sons
   */
  const stopAllSounds = () => {
    // Implementar parada de todos os sons se necessário
    console.log('Parando todos os sons')
  }
  
  /**
   * Atualiza volume de um contexto
   * @param {string} context - Contexto do volume
   * @param {number} volume - Novo volume (0-1)
   */
  const updateVolumeContext = (context, volume) => {
    if (volumeContexts.value.hasOwnProperty(context)) {
      volumeContexts.value[context] = Math.max(0, Math.min(1, volume))
    }
  }
  
  /**
   * Ativa/desativa sons contextuais
   * @param {boolean} enabled - Se os sons contextuais estão ativos
   */
  const setContextualSounds = (enabled) => {
    contextualSounds.value = enabled
  }
  
  /**
   * Ativa/desativa sons ambientes
   * @param {boolean} enabled - Se os sons ambientes estão ativos
   */
  const setAmbientSounds = (enabled) => {
    ambientSounds.value = enabled
  }
  
  /**
   * Ativa/desativa todos os sons de jogo
   * @param {boolean} enabled - Se todos os sons estão ativos
   */
  const setGameSounds = (enabled) => {
    gameSoundsEnabled.value = enabled
  }
  
  // Computed properties
  const isGameSoundsEnabled = computed(() => gameSoundsEnabled.value)
  const isContextualSoundsEnabled = computed(() => contextualSounds.value)
  const isAmbientSoundsEnabled = computed(() => ambientSounds.value)
  
  const volumeSettings = computed(() => ({
    ui: volumeContexts.value.ui,
    game: volumeContexts.value.game,
    ambient: volumeContexts.value.ambient,
    music: volumeContexts.value.music,
    voice: volumeContexts.value.voice
  }))
  
  return {
    // Estado
    gameSoundsEnabled: isGameSoundsEnabled,
    contextualSounds: isContextualSoundsEnabled,
    ambientSounds: isAmbientSoundsEnabled,
    volumeSettings,
    
    // Métodos principais
    playContextualSound,
    playAmbientMusic,
    playCardSound,
    playUISound,
    playGameSound,
    playAbilitySound,
    playEffectSound,
    playSoundSequence,
    playSoundWithFade,
    stopAllSounds,
    
    // Configurações
    updateVolumeContext,
    setContextualSounds,
    setAmbientSounds,
    setGameSounds,
    
    // Mapeamentos (para referência)
    contextualSoundMap,
    ambientSoundMap
  }
}
