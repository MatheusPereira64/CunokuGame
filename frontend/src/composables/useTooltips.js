import { ref, reactive, onMounted, onUnmounted } from 'vue'

// Estado global dos tooltips
const tooltipState = reactive({
  isEnabled: true,
  globalDelay: 500,
  maxTooltips: 5,
  activeTooltips: new Set(),
  tooltipQueue: []
})

export function useTooltips() {
  const tooltipRefs = ref(new Map())

  // Inicializar sistema
  const init = () => {
    // Carregar configurações do localStorage
    const savedConfig = localStorage.getItem('cunoku_tooltips')
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        tooltipState.isEnabled = config.enabled !== false
        tooltipState.globalDelay = config.delay || 500
      } catch (error) {
        console.warn('Erro ao carregar configurações de tooltips:', error)
      }
    }

    // Adicionar listeners globais
    document.addEventListener('keydown', handleGlobalKeydown)
    document.addEventListener('click', handleGlobalClick)
  }

  // Registrar tooltip
  const registerTooltip = (id, tooltipRef) => {
    tooltipRefs.value.set(id, tooltipRef)
  }

  // Desregistrar tooltip
  const unregisterTooltip = (id) => {
    tooltipRefs.value.delete(id)
    tooltipState.activeTooltips.delete(id)
  }

  // Mostrar tooltip
  const showTooltip = (id, options = {}) => {
    if (!tooltipState.isEnabled) return

    const tooltipRef = tooltipRefs.value.get(id)
    if (!tooltipRef) return

    // Verificar limite de tooltips
    if (tooltipState.activeTooltips.size >= tooltipState.maxTooltips) {
      hideOldestTooltip()
    }

    tooltipState.activeTooltips.add(id)
    
    if (tooltipRef.show) {
      tooltipRef.show(options)
    }
  }

  // Esconder tooltip
  const hideTooltip = (id) => {
    const tooltipRef = tooltipRefs.value.get(id)
    if (!tooltipRef) return

    tooltipState.activeTooltips.delete(id)
    
    if (tooltipRef.hide) {
      tooltipRef.hide()
    }
  }

  // Esconder tooltip mais antigo
  const hideOldestTooltip = () => {
    const oldestId = tooltipState.activeTooltips.values().next().value
    if (oldestId) {
      hideTooltip(oldestId)
    }
  }

  // Esconder todos os tooltips
  const hideAllTooltips = () => {
    tooltipState.activeTooltips.forEach(id => {
      hideTooltip(id)
    })
  }

  // Alternar tooltip
  const toggleTooltip = (id, options = {}) => {
    if (tooltipState.activeTooltips.has(id)) {
      hideTooltip(id)
    } else {
      showTooltip(id, options)
    }
  }

  // Mostrar tooltip temporariamente
  const showTooltipTemporary = (id, duration = 3000, options = {}) => {
    showTooltip(id, options)
    
    setTimeout(() => {
      hideTooltip(id)
    }, duration)
  }

  // Configurar tooltip
  const configureTooltip = (id, config) => {
    const tooltipRef = tooltipRefs.value.get(id)
    if (!tooltipRef) return

    if (tooltipRef.configure) {
      tooltipRef.configure(config)
    }
  }

  // Obter tooltip ativo
  const getActiveTooltip = (id) => {
    return tooltipState.activeTooltips.has(id)
  }

  // Obter todos os tooltips ativos
  const getActiveTooltips = () => {
    return Array.from(tooltipState.activeTooltips)
  }

  // Habilitar/desabilitar tooltips
  const setTooltipsEnabled = (enabled) => {
    tooltipState.isEnabled = enabled
    
    if (!enabled) {
      hideAllTooltips()
    }
    
    // Salvar configuração
    saveConfig()
  }

  // Definir delay global
  const setGlobalDelay = (delay) => {
    tooltipState.globalDelay = Math.max(0, delay)
    saveConfig()
  }

  // Salvar configurações
  const saveConfig = () => {
    try {
      const config = {
        enabled: tooltipState.isEnabled,
        delay: tooltipState.globalDelay
      }
      localStorage.setItem('cunoku_tooltips', JSON.stringify(config))
    } catch (error) {
      console.warn('Erro ao salvar configurações de tooltips:', error)
    }
  }

  // Handlers globais
  const handleGlobalKeydown = (event) => {
    // ESC para esconder todos os tooltips
    if (event.key === 'Escape') {
      hideAllTooltips()
    }
    
    // F1 para alternar tooltips
    if (event.key === 'F1') {
      event.preventDefault()
      setTooltipsEnabled(!tooltipState.isEnabled)
    }
  }

  const handleGlobalClick = (event) => {
    // Esconder tooltips ao clicar fora
    if (tooltipState.activeTooltips.size > 0) {
      const clickedElement = event.target
      const isTooltip = clickedElement.closest('.tooltip')
      
      if (!isTooltip) {
        hideAllTooltips()
      }
    }
  }

  // Tooltips pré-definidos para o jogo
  const gameTooltips = {
    // Cartas
    card: {
      title: 'Carta',
      content: 'Clique para descartar esta carta na pilha de descarte',
      hint: 'A carta deve ser maior que a última carta descartada'
    },
    
    king: {
      title: 'Rei (0)',
      content: 'O Rei é a carta mais alta. Pode ser descartada em qualquer momento',
      hint: 'Use estratégicamente para quebrar sequências'
    },
    
    joker: {
      title: 'Coringa (-1)',
      content: 'O Coringa é a carta mais baixa. Pode ser descartada em qualquer momento',
      hint: 'Útil para começar uma nova sequência'
    },
    
    // Habilidades
    seeCard: {
      title: 'Ver Carta',
      content: 'Revela uma carta aleatória da mão de outro jogador',
      hint: 'Use para planejar suas jogadas'
    },
    
    swapCards: {
      title: 'Trocar Cartas',
      content: 'Troca uma carta sua por uma carta de outro jogador',
      hint: 'Escolha sabiamente qual carta trocar'
    },
    
    skipTurn: {
      title: 'Pular Turno',
      content: 'Pula seu turno sem descartar uma carta',
      hint: 'Use quando não tiver cartas válidas para descartar'
    },
    
    // Botões
    startGame: {
      title: 'Iniciar Jogo',
      content: 'Começa uma nova partida com as configurações selecionadas',
      hint: 'Certifique-se de que todos os jogadores estão prontos'
    },
    
    joinRoom: {
      title: 'Entrar na Sala',
      content: 'Conecta-se a uma sala existente usando o código',
      hint: 'Peça o código da sala para o criador'
    },
    
    createRoom: {
      title: 'Criar Sala',
      content: 'Cria uma nova sala de jogo e gera um código para compartilhar',
      hint: 'Compartilhe o código com outros jogadores'
    },
    
    // Configurações
    settings: {
      title: 'Configurações',
      content: 'Acesse as configurações do jogo, temas e controles',
      hint: 'Personalize sua experiência de jogo'
    },
    
    // Estatísticas
    stats: {
      title: 'Estatísticas',
      content: 'Visualize suas estatísticas de jogo e progresso',
      hint: 'Acompanhe seu desempenho ao longo do tempo'
    },
    
    // Conquistas
    achievements: {
      title: 'Conquistas',
      content: 'Veja suas conquistas desbloqueadas e progresso',
      hint: 'Complete objetivos para desbloquear recompensas'
    },
    
    // Temas
    theme: {
      title: 'Tema',
      content: 'Alterne entre os temas visuais disponíveis',
      hint: 'Escolha o tema que mais combina com você'
    },
    
    // Áudio
    audio: {
      title: 'Controle de Áudio',
      content: 'Ajuste o volume da música e efeitos sonoros',
      hint: 'Configure o áudio para sua preferência'
    }
  }

  // Obter tooltip pré-definido
  const getGameTooltip = (key) => {
    return gameTooltips[key] || null
  }

  // Mostrar tooltip do jogo
  const showGameTooltip = (elementId, tooltipKey, options = {}) => {
    const tooltipData = getGameTooltip(tooltipKey)
    if (!tooltipData) return

    const mergedOptions = {
      ...tooltipData,
      ...options
    }

    showTooltip(elementId, mergedOptions)
  }

  // Tooltip de ajuda contextual
  const showHelpTooltip = (elementId, context) => {
    const helpTexts = {
      firstGame: {
        title: 'Primeira Partida?',
        content: 'Bem-vindo ao Cunoku! O objetivo é descartar todas as suas cartas antes dos outros jogadores.',
        hint: 'Clique em uma carta para descartá-la'
      },
      cardRules: {
        title: 'Regras das Cartas',
        content: 'Descarte cartas em ordem crescente. Rei (0) é a mais alta, Coringa (-1) é a mais baixa.',
        hint: 'Use habilidades especiais quando necessário'
      },
      abilities: {
        title: 'Habilidades Especiais',
        content: 'Cada jogador tem habilidades únicas. Use-as estrategicamente para ganhar vantagem.',
        hint: 'Clique no ícone de habilidade para usá-la'
      }
    }

    const helpData = helpTexts[context]
    if (helpData) {
      showTooltip(elementId, helpData)
    }
  }

  // Cleanup
  onUnmounted(() => {
    document.removeEventListener('keydown', handleGlobalKeydown)
    document.removeEventListener('click', handleGlobalClick)
  })

  // Inicialização automática
  onMounted(() => {
    init()
  })

  return {
    // Estado
    tooltipState: readonly(tooltipState),
    
    // Métodos principais
    init,
    registerTooltip,
    unregisterTooltip,
    showTooltip,
    hideTooltip,
    toggleTooltip,
    showTooltipTemporary,
    configureTooltip,
    
    // Controle global
    hideAllTooltips,
    setTooltipsEnabled,
    setGlobalDelay,
    
    // Utilitários
    getActiveTooltip,
    getActiveTooltips,
    
    // Tooltips do jogo
    getGameTooltip,
    showGameTooltip,
    showHelpTooltip
  }
}

// Função helper para readonly
function readonly(obj) {
  return new Proxy(obj, {
    get(target, prop) {
      return target[prop]
    },
    set() {
      console.warn('Tentativa de modificar estado readonly dos tooltips')
      return false
    }
  })
}
