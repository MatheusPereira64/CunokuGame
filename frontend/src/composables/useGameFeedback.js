import { ref, reactive, onMounted, onUnmounted } from 'vue'

// Estado global do feedback do jogo
const feedbackState = reactive({
  gameState: 'idle',
  currentPlayer: null,
  opponentName: '',
  timeLeft: 0,
  waitingMessage: '',
  errorMessage: '',
  successMessage: '',
  showParticles: true,
  notifications: [],
  progressIndicators: []
})

export function useGameFeedback() {
  const isInitialized = ref(false)

  // Inicializar sistema
  const init = () => {
    if (isInitialized.value) return

    // Carregar configurações do localStorage
    const savedConfig = localStorage.getItem('cunoku_feedback_config')
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        feedbackState.showParticles = config.showParticles !== false
      } catch (error) {
        console.warn('Erro ao carregar configurações de feedback:', error)
      }
    }

    isInitialized.value = true
  }

  // Gerenciar estado do jogo
  const setGameState = (state, options = {}) => {
    feedbackState.gameState = state
    
    if (options.opponentName) {
      feedbackState.opponentName = options.opponentName
    }
    
    if (options.timeLeft !== undefined) {
      feedbackState.timeLeft = options.timeLeft
    }
    
    if (options.waitingMessage) {
      feedbackState.waitingMessage = options.waitingMessage
    }
    
    if (options.errorMessage) {
      feedbackState.errorMessage = options.errorMessage
    }
    
    if (options.successMessage) {
      feedbackState.successMessage = options.successMessage
    }
  }

  // Feedback de ações
  const showActionFeedback = (type, title, message = '', duration = 3000) => {
    const notification = {
      id: Date.now() + Math.random(),
      type,
      title,
      message,
      duration,
      timestamp: Date.now()
    }

    feedbackState.notifications.push(notification)

    // Auto-remove após duração
    setTimeout(() => {
      removeNotification(notification.id)
    }, duration)

    return notification
  }

  // Feedback específico para cartas
  const showCardFeedback = (action, cardData) => {
    const feedbacks = {
      played: {
        type: 'card-played',
        title: 'Carta Jogada!',
        message: `${cardData.valor} de ${cardData.naipe || 'Coringa'}`
      },
      invalid: {
        type: 'card-invalid',
        title: 'Jogada Inválida!',
        message: 'Esta carta não pode ser descartada agora'
      },
      special: {
        type: 'card-played',
        title: 'Carta Especial!',
        message: cardData.valor === 'K' ? 'Rei jogado!' : 'Coringa jogado!'
      }
    }

    const feedback = feedbacks[action]
    if (feedback) {
      return showActionFeedback(feedback.type, feedback.title, feedback.message)
    }
  }

  // Feedback para habilidades
  const showAbilityFeedback = (abilityType, target = '') => {
    const feedbacks = {
      see_card: {
        type: 'ability-used',
        title: 'Habilidade Usada!',
        message: `Espiando carta de ${target}`
      },
      swap_cards: {
        type: 'ability-used',
        title: 'Habilidade Usada!',
        message: `Trocando cartas com ${target}`
      },
      skip_turn: {
        type: 'ability-used',
        title: 'Habilidade Usada!',
        message: 'Turno pulado'
      }
    }

    const feedback = feedbacks[abilityType]
    if (feedback) {
      return showActionFeedback(feedback.type, feedback.title, feedback.message)
    }
  }

  // Feedback para combos
  const showComboFeedback = (comboLength) => {
    const messages = {
      2: 'Combo Duplo!',
      3: 'Combo Triplo!',
      4: 'Combo Quádruplo!',
      5: 'Combo Quíntuplo!',
      6: 'Combo Sextuplo!',
      7: 'Combo Sétuplo!',
      8: 'Combo Óctuplo!',
      9: 'Combo Nônuplo!',
      10: 'COMBO PERFEITO!'
    }

    const title = messages[comboLength] || `Combo de ${comboLength}!`
    const message = comboLength >= 5 ? 'Incrível!' : 'Bom trabalho!'

    return showActionFeedback('combo', title, message, 2000)
  }

  // Feedback para vitória/derrota
  const showGameEndFeedback = (result, stats = {}) => {
    if (result === 'win') {
      return showActionFeedback('success', 'Vitória!', 'Parabéns! Você venceu!', 5000)
    } else if (result === 'lose') {
      return showActionFeedback('error', 'Derrota!', 'Tente novamente!', 5000)
    } else if (result === 'draw') {
      return showActionFeedback('info', 'Empate!', 'Foi um jogo equilibrado!', 5000)
    }
  }

  // Gerenciar indicadores de progresso
  const addProgressIndicator = (id, type, title, currentValue, maxValue, options = {}) => {
    const indicator = {
      id,
      type,
      title,
      currentValue,
      maxValue,
      animated: options.animated !== false,
      showGlow: options.showGlow !== false,
      showParticles: options.showParticles !== false,
      isVisible: true
    }

    feedbackState.progressIndicators.push(indicator)
    return indicator
  }

  const updateProgressIndicator = (id, currentValue, maxValue) => {
    const indicator = feedbackState.progressIndicators.find(i => i.id === id)
    if (indicator) {
      indicator.currentValue = currentValue
      indicator.maxValue = maxValue
    }
  }

  const removeProgressIndicator = (id) => {
    const index = feedbackState.progressIndicators.findIndex(i => i.id === id)
    if (index > -1) {
      feedbackState.progressIndicators.splice(index, 1)
    }
  }

  // Gerenciar notificações
  const removeNotification = (id) => {
    const index = feedbackState.notifications.findIndex(n => n.id === id)
    if (index > -1) {
      feedbackState.notifications.splice(index, 1)
    }
  }

  const clearAllNotifications = () => {
    feedbackState.notifications = []
  }

  // Feedback de validação
  const showValidationFeedback = (isValid, message = '') => {
    if (isValid) {
      return showActionFeedback('success', 'Válido!', message, 1500)
    } else {
      return showActionFeedback('error', 'Inválido!', message, 2000)
    }
  }

  // Feedback de conexão
  const showConnectionFeedback = (status, message = '') => {
    const feedbacks = {
      connecting: {
        type: 'info',
        title: 'Conectando...',
        message: 'Estabelecendo conexão'
      },
      connected: {
        type: 'success',
        title: 'Conectado!',
        message: 'Conexão estabelecida com sucesso'
      },
      disconnected: {
        type: 'error',
        title: 'Desconectado!',
        message: 'Conexão perdida'
      },
      reconnecting: {
        type: 'warning',
        title: 'Reconectando...',
        message: 'Tentando restabelecer conexão'
      }
    }

    const feedback = feedbacks[status]
    if (feedback) {
      return showActionFeedback(feedback.type, feedback.title, message || feedback.message)
    }
  }

  // Feedback de erro
  const showErrorFeedback = (error, context = '') => {
    const message = context ? `${context}: ${error}` : error
    return showActionFeedback('error', 'Erro!', message, 4000)
  }

  // Feedback de sucesso
  const showSuccessFeedback = (message, context = '') => {
    const fullMessage = context ? `${context}: ${message}` : message
    return showActionFeedback('success', 'Sucesso!', fullMessage, 2000)
  }

  // Configurações
  const setShowParticles = (show) => {
    feedbackState.showParticles = show
    saveConfig()
  }

  const saveConfig = () => {
    try {
      const config = {
        showParticles: feedbackState.showParticles
      }
      localStorage.setItem('cunoku_feedback_config', JSON.stringify(config))
    } catch (error) {
      console.warn('Erro ao salvar configurações de feedback:', error)
    }
  }

  // Utilitários
  const getGameState = () => {
    return feedbackState.gameState
  }

  const getNotifications = () => {
    return feedbackState.notifications
  }

  const getProgressIndicators = () => {
    return feedbackState.progressIndicators
  }

  const isGameState = (state) => {
    return feedbackState.gameState === state
  }

  // Cleanup
  const cleanup = () => {
    feedbackState.notifications = []
    feedbackState.progressIndicators = []
  }

  // Inicialização automática
  onMounted(() => {
    init()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    // Estado
    feedbackState: readonly(feedbackState),
    isInitialized,
    
    // Métodos principais
    init,
    setGameState,
    showActionFeedback,
    showCardFeedback,
    showAbilityFeedback,
    showComboFeedback,
    showGameEndFeedback,
    showValidationFeedback,
    showConnectionFeedback,
    showErrorFeedback,
    showSuccessFeedback,
    
    // Gerenciamento de notificações
    removeNotification,
    clearAllNotifications,
    
    // Gerenciamento de progresso
    addProgressIndicator,
    updateProgressIndicator,
    removeProgressIndicator,
    
    // Configurações
    setShowParticles,
    
    // Utilitários
    getGameState,
    getNotifications,
    getProgressIndicators,
    isGameState,
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
      console.warn('Tentativa de modificar estado readonly do feedback')
      return false
    }
  })
}
