import { ref, reactive, onMounted } from 'vue'

// Estado global dos temas
const themeState = reactive({
  currentTheme: 'classic',
  isInitialized: false,
  availableThemes: {
    classic: {
      id: 'classic',
      name: 'Clássico',
      description: 'Tema original com cores douradas',
      icon: '🏛️',
      preview: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)'
    },
    neon: {
      id: 'neon',
      name: 'Neon',
      description: 'Cores vibrantes com efeitos de brilho',
      icon: '⚡',
      preview: 'linear-gradient(135deg, #000000 0%, #001100 100%)'
    },
    dark: {
      id: 'dark',
      name: 'Dark Mode',
      description: 'Tema escuro com azul',
      icon: '🌙',
      preview: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 100%)'
    },
    sakura: {
      id: 'sakura',
      name: 'Sakura',
      description: 'Tema rosa e branco inspirado em cerejeiras',
      icon: '🌸',
      preview: 'linear-gradient(135deg, #2F1B14 0%, #FFE4E1 100%)'
    }
  }
})

export function useThemes() {
  const isLoading = ref(false)

  // Inicializar sistema de temas
  const init = () => {
    if (themeState.isInitialized) return

    // Carregar tema salvo do localStorage
    const savedTheme = localStorage.getItem('cunoku_theme')
    if (savedTheme && themeState.availableThemes[savedTheme]) {
      themeState.currentTheme = savedTheme
    }

    // Aplicar tema inicial
    applyTheme(themeState.currentTheme)
    themeState.isInitialized = true
  }

  // Aplicar tema
  const applyTheme = (themeId) => {
    if (!themeState.availableThemes[themeId]) {
      console.warn(`Tema '${themeId}' não encontrado`)
      return false
    }

    // Remover classes de tema anteriores
    document.body.classList.remove(
      'theme-classic',
      'theme-neon', 
      'theme-dark',
      'theme-sakura'
    )

    // Aplicar novo tema
    if (themeId !== 'classic') {
      document.body.classList.add(`theme-${themeId}`)
    }

    // Atualizar estado
    themeState.currentTheme = themeId

    // Salvar no localStorage
    try {
      localStorage.setItem('cunoku_theme', themeId)
    } catch (error) {
      console.warn('Erro ao salvar tema:', error)
    }

    // Emitir evento personalizado
    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { theme: themeState.availableThemes[themeId], themeId }
    }))

    return true
  }

  // Obter tema atual
  const getCurrentTheme = () => {
    return themeState.availableThemes[themeState.currentTheme]
  }

  // Obter tema por ID
  const getTheme = (themeId) => {
    return themeState.availableThemes[themeId] || null
  }

  // Obter todos os temas
  const getAllThemes = () => {
    return Object.values(themeState.availableThemes)
  }

  // Verificar se tema está ativo
  const isThemeActive = (themeId) => {
    return themeState.currentTheme === themeId
  }

  // Obter próximo tema
  const getNextTheme = () => {
    const themeIds = Object.keys(themeState.availableThemes)
    const currentIndex = themeIds.indexOf(themeState.currentTheme)
    const nextIndex = (currentIndex + 1) % themeIds.length
    return themeIds[nextIndex]
  }

  // Obter tema anterior
  const getPreviousTheme = () => {
    const themeIds = Object.keys(themeState.availableThemes)
    const currentIndex = themeIds.indexOf(themeState.currentTheme)
    const prevIndex = currentIndex === 0 ? themeIds.length - 1 : currentIndex - 1
    return themeIds[prevIndex]
  }

  // Alternar para próximo tema
  const cycleNextTheme = () => {
    const nextTheme = getNextTheme()
    return applyTheme(nextTheme)
  }

  // Alternar para tema anterior
  const cyclePreviousTheme = () => {
    const prevTheme = getPreviousTheme()
    return applyTheme(prevTheme)
  }

  // Resetar para tema padrão
  const resetToDefault = () => {
    return applyTheme('classic')
  }

  // Obter estatísticas de uso de temas
  const getThemeStats = () => {
    try {
      const stats = JSON.parse(localStorage.getItem('cunoku_theme_stats') || '{}')
      return stats
    } catch (error) {
      console.warn('Erro ao carregar estatísticas de temas:', error)
      return {}
    }
  }

  // Atualizar estatísticas de uso
  const updateThemeStats = (themeId) => {
    try {
      const stats = getThemeStats()
      stats[themeId] = (stats[themeId] || 0) + 1
      stats.lastUsed = Date.now()
      localStorage.setItem('cunoku_theme_stats', JSON.stringify(stats))
    } catch (error) {
      console.warn('Erro ao salvar estatísticas de temas:', error)
    }
  }

  // Obter tema mais usado
  const getMostUsedTheme = () => {
    const stats = getThemeStats()
    let mostUsed = 'classic'
    let maxUsage = 0

    Object.entries(stats).forEach(([themeId, usage]) => {
      if (themeId !== 'lastUsed' && usage > maxUsage) {
        maxUsage = usage
        mostUsed = themeId
      }
    })

    return mostUsed
  }

  // Obter tema favorito (baseado em uso)
  const getFavoriteTheme = () => {
    return getMostUsedTheme()
  }

  // Aplicar tema com estatísticas
  const applyThemeWithStats = (themeId) => {
    const success = applyTheme(themeId)
    if (success) {
      updateThemeStats(themeId)
    }
    return success
  }

  // Obter preview de tema
  const getThemePreview = (themeId) => {
    const theme = getTheme(themeId)
    return theme ? theme.preview : null
  }

  // Verificar se tema está disponível
  const isThemeAvailable = (themeId) => {
    return themeId in themeState.availableThemes
  }

  // Obter temas por categoria (se implementado no futuro)
  const getThemesByCategory = (category) => {
    // Por enquanto, todos os temas são da categoria 'visual'
    return getAllThemes()
  }

  // Obter tema aleatório
  const getRandomTheme = () => {
    const themeIds = Object.keys(themeState.availableThemes)
    const randomIndex = Math.floor(Math.random() * themeIds.length)
    return themeIds[randomIndex]
  }

  // Aplicar tema aleatório
  const applyRandomTheme = () => {
    const randomTheme = getRandomTheme()
    return applyThemeWithStats(randomTheme)
  }

  // Obter tema baseado na hora do dia
  const getTimeBasedTheme = () => {
    const hour = new Date().getHours()
    
    if (hour >= 6 && hour < 12) {
      return 'sakura' // Manhã - tema suave
    } else if (hour >= 12 && hour < 18) {
      return 'classic' // Tarde - tema clássico
    } else if (hour >= 18 && hour < 22) {
      return 'dark' // Noite - tema escuro
    } else {
      return 'neon' // Madrugada - tema neon
    }
  }

  // Aplicar tema baseado na hora
  const applyTimeBasedTheme = () => {
    const timeTheme = getTimeBasedTheme()
    return applyThemeWithStats(timeTheme)
  }

  // Obter tema baseado na estação (se implementado no futuro)
  const getSeasonBasedTheme = () => {
    const month = new Date().getMonth()
    
    if (month >= 2 && month <= 4) {
      return 'sakura' // Primavera
    } else if (month >= 5 && month <= 7) {
      return 'classic' // Verão
    } else if (month >= 8 && month <= 10) {
      return 'dark' // Outono
    } else {
      return 'neon' // Inverno
    }
  }

  // Aplicar tema baseado na estação
  const applySeasonBasedTheme = () => {
    const seasonTheme = getSeasonBasedTheme()
    return applyThemeWithStats(seasonTheme)
  }

  // Inicialização automática
  onMounted(() => {
    init()
  })

  return {
    // Estado
    themeState: readonly(themeState),
    isLoading,
    
    // Métodos principais
    init,
    applyTheme,
    applyThemeWithStats,
    getCurrentTheme,
    getTheme,
    getAllThemes,
    isThemeActive,
    
    // Navegação entre temas
    getNextTheme,
    getPreviousTheme,
    cycleNextTheme,
    cyclePreviousTheme,
    
    // Temas especiais
    resetToDefault,
    getRandomTheme,
    applyRandomTheme,
    getTimeBasedTheme,
    applyTimeBasedTheme,
    getSeasonBasedTheme,
    applySeasonBasedTheme,
    
    // Estatísticas
    getThemeStats,
    updateThemeStats,
    getMostUsedTheme,
    getFavoriteTheme,
    
    // Utilitários
    getThemePreview,
    isThemeAvailable,
    getThemesByCategory
  }
}

// Função helper para readonly
function readonly(obj) {
  return new Proxy(obj, {
    get(target, prop) {
      return target[prop]
    },
    set() {
      console.warn('Tentativa de modificar estado readonly dos temas')
      return false
    }
  })
}
