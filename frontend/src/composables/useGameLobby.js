import { ref, reactive, computed } from 'vue'
import { useGameSounds } from './useGameSounds.js'

export function useGameLobby() {
  const { playUISound, playGameSound } = useGameSounds()
  
  // Estado do lobby
  const lobbyState = reactive({
    isHosting: false,
    isJoining: false,
    isPlayingBots: false,
    roomName: '',
    playerName: '',
    botDifficulty: 'medium',
    maxPlayers: 6,
    currentPlayers: 1,
    isConnected: false,
    error: null,
    success: null
  })
  
  // Configurações de jogo
  const gameSettings = reactive({
    roomName: '',
    playerName: '',
    botDifficulty: 'medium',
    maxPlayers: 6,
    privateRoom: false,
    allowSpectators: true,
    autoStart: false,
    turnTimeLimit: 30,
    enableAbilities: true,
    enableAnimations: true,
    enableSounds: true
  })
  
  // Validações
  const validations = reactive({
    roomName: {
      required: true,
      minLength: 3,
      maxLength: 20,
      pattern: /^[a-zA-Z0-9_-]+$/,
      message: 'Nome da sala deve ter 3-20 caracteres e conter apenas letras, números, _ e -'
    },
    playerName: {
      required: true,
      minLength: 2,
      maxLength: 15,
      pattern: /^[a-zA-Z0-9_-]+$/,
      message: 'Nome do jogador deve ter 2-15 caracteres e conter apenas letras, números, _ e -'
    }
  })
  
  // Dificuldades de bot disponíveis
  const botDifficulties = [
    { value: 'easy', label: 'Fácil', description: 'Bots jogam de forma mais simples' },
    { value: 'medium', label: 'Médio', description: 'Bots jogam com estratégia equilibrada' },
    { value: 'hard', label: 'Difícil', description: 'Bots jogam com estratégia avançada' },
    { value: 'expert', label: 'Expert', description: 'Bots jogam com estratégia máxima' }
  ]
  
  // Número máximo de jogadores disponíveis
  const maxPlayerOptions = [2, 3, 4, 5, 6]
  
  // Tempo limite de turno disponível
  const turnTimeOptions = [
    { value: 15, label: '15 segundos', description: 'Jogo rápido' },
    { value: 30, label: '30 segundos', description: 'Padrão' },
    { value: 60, label: '1 minuto', description: 'Jogo relaxado' },
    { value: 0, label: 'Sem limite', description: 'Sem pressão de tempo' }
  ]
  
  /**
   * Valida um campo específico
   * @param {string} field - Nome do campo
   * @param {string} value - Valor a ser validado
   * @returns {Object} Resultado da validação
   */
  const validateField = (field, value) => {
    const validation = validations[field]
    if (!validation) return { valid: true, message: '' }
    
    // Verificar se é obrigatório
    if (validation.required && (!value || value.trim() === '')) {
      return { valid: false, message: `${field} é obrigatório` }
    }
    
    // Verificar comprimento mínimo
    if (validation.minLength && value.length < validation.minLength) {
      return { valid: false, message: `${field} deve ter pelo menos ${validation.minLength} caracteres` }
    }
    
    // Verificar comprimento máximo
    if (validation.maxLength && value.length > validation.maxLength) {
      return { valid: false, message: `${field} deve ter no máximo ${validation.maxLength} caracteres` }
    }
    
    // Verificar padrão
    if (validation.pattern && !validation.pattern.test(value)) {
      return { valid: false, message: validation.message }
    }
    
    return { valid: true, message: '' }
  }
  
  /**
   * Valida todos os campos obrigatórios
   * @returns {Object} Resultado da validação
   */
  const validateAll = () => {
    const errors = {}
    let isValid = true
    
    // Validar nome do jogador
    const playerNameValidation = validateField('playerName', gameSettings.playerName)
    if (!playerNameValidation.valid) {
      errors.playerName = playerNameValidation.message
      isValid = false
    }
    
    // Validar nome da sala (se estiver hospedando)
    if (lobbyState.isHosting) {
      const roomNameValidation = validateField('roomName', gameSettings.roomName)
      if (!roomNameValidation.valid) {
        errors.roomName = roomNameValidation.message
        isValid = false
      }
    }
    
    return { valid: isValid, errors }
  }
  
  /**
   * Inicia o processo de hospedagem de sala
   * @param {Object} settings - Configurações da sala
   */
  const startHosting = async (settings = {}) => {
    try {
      lobbyState.isHosting = true
      lobbyState.isJoining = false
      lobbyState.isPlayingBots = false
      lobbyState.error = null
      lobbyState.success = null
      
      // Atualizar configurações
      Object.assign(gameSettings, settings)
      
      // Validar configurações
      const validation = validateAll()
      if (!validation.valid) {
        lobbyState.error = 'Configurações inválidas'
        return false
      }
      
      // Tocar som de sucesso
      await playUISound('success')
      
      lobbyState.success = 'Sala criada com sucesso!'
      lobbyState.isConnected = true
      
      return true
    } catch (error) {
      console.error('Erro ao criar sala:', error)
      lobbyState.error = 'Erro ao criar sala'
      await playUISound('error')
      return false
    }
  }
  
  /**
   * Inicia o processo de entrada em sala
   * @param {Object} settings - Configurações de entrada
   */
  const startJoining = async (settings = {}) => {
    try {
      lobbyState.isJoining = true
      lobbyState.isHosting = false
      lobbyState.isPlayingBots = false
      lobbyState.error = null
      lobbyState.success = null
      
      // Atualizar configurações
      Object.assign(gameSettings, settings)
      
      // Validar configurações
      const validation = validateAll()
      if (!validation.valid) {
        lobbyState.error = 'Configurações inválidas'
        return false
      }
      
      // Tocar som de sucesso
      await playUISound('success')
      
      lobbyState.success = 'Entrando na sala...'
      lobbyState.isConnected = true
      
      return true
    } catch (error) {
      console.error('Erro ao entrar na sala:', error)
      lobbyState.error = 'Erro ao entrar na sala'
      await playUISound('error')
      return false
    }
  }
  
  /**
   * Inicia o jogo contra bots
   * @param {Object} settings - Configurações do jogo
   */
  const startBotsGame = async (settings = {}) => {
    try {
      lobbyState.isPlayingBots = true
      lobbyState.isHosting = false
      lobbyState.isJoining = false
      lobbyState.error = null
      lobbyState.success = null
      
      // Atualizar configurações
      Object.assign(gameSettings, settings)
      
      // Validar configurações
      const validation = validateAll()
      if (!validation.valid) {
        lobbyState.error = 'Configurações inválidas'
        return false
      }
      
      // Tocar som de início de jogo
      await playGameSound('game-start')
      
      lobbyState.success = 'Iniciando jogo contra bots...'
      lobbyState.isConnected = true
      
      return true
    } catch (error) {
      console.error('Erro ao iniciar jogo contra bots:', error)
      lobbyState.error = 'Erro ao iniciar jogo contra bots'
      await playUISound('error')
      return false
    }
  }
  
  /**
   * Cancela a operação atual
   */
  const cancelOperation = async () => {
    lobbyState.isHosting = false
    lobbyState.isJoining = false
    lobbyState.isPlayingBots = false
    lobbyState.error = null
    lobbyState.success = null
    lobbyState.isConnected = false
    
    await playUISound('close')
  }
  
  /**
   * Limpa mensagens de erro e sucesso
   */
  const clearMessages = () => {
    lobbyState.error = null
    lobbyState.success = null
  }
  
  /**
   * Atualiza configurações do jogo
   * @param {Object} newSettings - Novas configurações
   */
  const updateGameSettings = (newSettings) => {
    Object.assign(gameSettings, newSettings)
  }
  
  /**
   * Atualiza estado do lobby
   * @param {Object} newState - Novo estado
   */
  const updateLobbyState = (newState) => {
    Object.assign(lobbyState, newState)
  }
  
  /**
   * Reseta todas as configurações
   */
  const resetSettings = () => {
    Object.assign(gameSettings, {
      roomName: '',
      playerName: '',
      botDifficulty: 'medium',
      maxPlayers: 6,
      privateRoom: false,
      allowSpectators: true,
      autoStart: false,
      turnTimeLimit: 30,
      enableAbilities: true,
      enableAnimations: true,
      enableSounds: true
    })
    
    Object.assign(lobbyState, {
      isHosting: false,
      isJoining: false,
      isPlayingBots: false,
      roomName: '',
      playerName: '',
      botDifficulty: 'medium',
      maxPlayers: 6,
      currentPlayers: 1,
      isConnected: false,
      error: null,
      success: null
    })
  }
  
  /**
   * Gera nome de sala aleatório
   * @returns {string} Nome da sala gerado
   */
  const generateRoomName = () => {
    const adjectives = ['Epic', 'Cool', 'Awesome', 'Amazing', 'Fantastic', 'Incredible', 'Super', 'Ultra']
    const nouns = ['Game', 'Match', 'Battle', 'Challenge', 'Quest', 'Adventure', 'Journey', 'Mission']
    const numbers = Math.floor(Math.random() * 1000)
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    
    return `${adjective}${noun}${numbers}`
  }
  
  /**
   * Gera nome de jogador aleatório
   * @returns {string} Nome do jogador gerado
   */
  const generatePlayerName = () => {
    const names = ['Player', 'Gamer', 'Pro', 'Master', 'Champion', 'Hero', 'Legend', 'Warrior']
    const numbers = Math.floor(Math.random() * 1000)
    
    const name = names[Math.floor(Math.random() * names.length)]
    return `${name}${numbers}`
  }
  
  // Computed properties
  const isAnyOperationActive = computed(() => {
    return lobbyState.isHosting || lobbyState.isJoining || lobbyState.isPlayingBots
  })
  
  const canStartGame = computed(() => {
    return lobbyState.isConnected && gameSettings.playerName.trim() !== ''
  })
  
  const currentOperation = computed(() => {
    if (lobbyState.isHosting) return 'hosting'
    if (lobbyState.isJoining) return 'joining'
    if (lobbyState.isPlayingBots) return 'bots'
    return 'none'
  })
  
  const operationStatus = computed(() => {
    if (lobbyState.error) return 'error'
    if (lobbyState.success) return 'success'
    if (isAnyOperationActive.value) return 'loading'
    return 'idle'
  })
  
  const selectedBotDifficulty = computed(() => {
    return botDifficulties.find(diff => diff.value === gameSettings.botDifficulty) || botDifficulties[1]
  })
  
  const selectedTurnTime = computed(() => {
    return turnTimeOptions.find(time => time.value === gameSettings.turnTimeLimit) || turnTimeOptions[1]
  })
  
  return {
    // Estado
    lobbyState,
    gameSettings,
    validations,
    
    // Configurações
    botDifficulties,
    maxPlayerOptions,
    turnTimeOptions,
    
    // Métodos principais
    startHosting,
    startJoining,
    startBotsGame,
    cancelOperation,
    clearMessages,
    updateGameSettings,
    updateLobbyState,
    resetSettings,
    
    // Validações
    validateField,
    validateAll,
    
    // Utilitários
    generateRoomName,
    generatePlayerName,
    
    // Computed
    isAnyOperationActive,
    canStartGame,
    currentOperation,
    operationStatus,
    selectedBotDifficulty,
    selectedTurnTime
  }
}
