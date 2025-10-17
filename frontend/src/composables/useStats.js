import { ref, reactive, computed, onMounted } from 'vue'

// Estado global das estatísticas
const statsState = reactive({
  stats: {},
  isInitialized: false,
  currentLevel: 1,
  currentXP: 0,
  totalXP: 0,
  sessionStartTime: null,
  sessionStats: {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    cardsDiscarded: 0,
    abilitiesUsed: 0,
    combos: 0,
    maxCombo: 0,
    timePlayed: 0
  }
})

// Configuração de níveis
const LEVEL_CONFIG = {
  baseXP: 1000,
  multiplier: 1.2,
  maxLevel: 50
}

export function useStats() {
  const isLoading = ref(false)

  // Inicializar sistema
  const init = () => {
    if (statsState.isInitialized) return

    // Carregar estatísticas do localStorage
    const savedStats = localStorage.getItem('cunoku_stats')
    if (savedStats) {
      try {
        const parsed = JSON.parse(savedStats)
        statsState.stats = parsed.stats || {}
        statsState.currentLevel = parsed.level || 1
        statsState.currentXP = parsed.xp || 0
        statsState.totalXP = parsed.totalXP || 0
      } catch (error) {
        console.warn('Erro ao carregar estatísticas:', error)
        statsState.stats = {}
      }
    }

    // Inicializar estatísticas padrão se não existirem
    initializeDefaultStats()

    // Iniciar sessão
    startSession()

    statsState.isInitialized = true
  }

  // Inicializar estatísticas padrão
  const initializeDefaultStats = () => {
    const defaultStats = {
      // Estatísticas gerais
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      totalTimePlayed: 0,
      totalCardsDiscarded: 0,
      totalAbilitiesUsed: 0,
      totalCombos: 0,
      maxCombo: 0,
      
      // Estatísticas de vitória
      winStreak: 0,
      maxWinStreak: 0,
      perfectWins: 0,
      fastWins: 0,
      
      // Estatísticas de jogo
      botGames: 0,
      botWins: 0,
      multiplayerGames: 0,
      multiplayerWins: 0,
      
      // Estatísticas de cartas
      kingsDiscarded: 0,
      jokersDiscarded: 0,
      acesDiscarded: 0,
      
      // Estatísticas de habilidades
      seeCardUsed: 0,
      swapCardsUsed: 0,
      skipTurnUsed: 0,
      
      // Estatísticas de tempo
      averageGameTime: 0,
      longestGame: 0,
      shortestGame: 0,
      
      // Estatísticas de sessão
      sessionsPlayed: 0,
      totalSessions: 0,
      
      // Estatísticas de conquistas
      achievementsUnlocked: 0,
      
      // Estatísticas de temas
      themesUsed: {},
      
      // Estatísticas de horário
      morningGames: 0,
      afternoonGames: 0,
      eveningGames: 0,
      nightGames: 0,
      
      // Estatísticas de dias da semana
      mondayGames: 0,
      tuesdayGames: 0,
      wednesdayGames: 0,
      thursdayGames: 0,
      fridayGames: 0,
      saturdayGames: 0,
      sundayGames: 0
    }

    // Mesclar com estatísticas existentes
    statsState.stats = { ...defaultStats, ...statsState.stats }
  }

  // Salvar estatísticas no localStorage
  const saveStats = () => {
    try {
      const statsToSave = {
        stats: statsState.stats,
        level: statsState.currentLevel,
        xp: statsState.currentXP,
        totalXP: statsState.totalXP,
        lastUpdated: Date.now()
      }
      localStorage.setItem('cunoku_stats', JSON.stringify(statsToSave))
    } catch (error) {
      console.warn('Erro ao salvar estatísticas:', error)
    }
  }

  // Atualizar estatística
  const updateStat = (statName, value = 1) => {
    if (!statsState.isInitialized) init()

    const currentValue = statsState.stats[statName] || 0
    statsState.stats[statName] = currentValue + value
    saveStats()

    // Atualizar estatísticas de sessão
    if (statsState.sessionStats.hasOwnProperty(statName)) {
      statsState.sessionStats[statName] += value
    }
  }

  // Definir estatística específica
  const setStat = (statName, value) => {
    if (!statsState.isInitialized) init()

    statsState.stats[statName] = value
    saveStats()

    // Atualizar estatísticas de sessão
    if (statsState.sessionStats.hasOwnProperty(statName)) {
      statsState.sessionStats[statName] = value
    }
  }

  // Adicionar XP
  const addXP = (amount, reason = '') => {
    if (!statsState.isInitialized) init()

    statsState.currentXP += amount
    statsState.totalXP += amount

    // Verificar se subiu de nível
    const newLevel = calculateLevel(statsState.currentXP)
    if (newLevel > statsState.currentLevel) {
      const levelsGained = newLevel - statsState.currentLevel
      statsState.currentLevel = newLevel
      
      // Emitir evento de level up
      window.dispatchEvent(new CustomEvent('level-up', {
        detail: { 
          newLevel, 
          levelsGained, 
          xpGained: amount, 
          reason 
        }
      }))
    }

    saveStats()
  }

  // Calcular nível baseado no XP
  const calculateLevel = (xp) => {
    let level = 1
    let xpNeeded = LEVEL_CONFIG.baseXP

    while (xp >= xpNeeded && level < LEVEL_CONFIG.maxLevel) {
      xp -= xpNeeded
      level++
      xpNeeded = Math.floor(xpNeeded * LEVEL_CONFIG.multiplier)
    }

    return level
  }

  // Calcular XP necessário para o próximo nível
  const getXPForNextLevel = () => {
    const currentLevelXP = getXPForLevel(statsState.currentLevel)
    const nextLevelXP = getXPForLevel(statsState.currentLevel + 1)
    return nextLevelXP - currentLevelXP
  }

  // Calcular XP total necessário para um nível
  const getXPForLevel = (level) => {
    let totalXP = 0
    let xpNeeded = LEVEL_CONFIG.baseXP

    for (let i = 1; i < level; i++) {
      totalXP += xpNeeded
      xpNeeded = Math.floor(xpNeeded * LEVEL_CONFIG.multiplier)
    }

    return totalXP
  }

  // Obter progresso do nível atual
  const getLevelProgress = () => {
    const currentLevelXP = getXPForLevel(statsState.currentLevel)
    const nextLevelXP = getXPForLevel(statsState.currentLevel + 1)
    const xpInCurrentLevel = statsState.currentXP - currentLevelXP
    const xpNeededForNext = nextLevelXP - currentLevelXP
    
    return {
      current: xpInCurrentLevel,
      needed: xpNeededForNext,
      percentage: Math.min((xpInCurrentLevel / xpNeededForNext) * 100, 100)
    }
  }

  // Iniciar sessão
  const startSession = () => {
    statsState.sessionStartTime = Date.now()
    statsState.sessionStats = {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      cardsDiscarded: 0,
      abilitiesUsed: 0,
      combos: 0,
      maxCombo: 0,
      timePlayed: 0
    }
  }

  // Finalizar sessão
  const endSession = () => {
    if (statsState.sessionStartTime) {
      const sessionTime = Date.now() - statsState.sessionStartTime
      updateStat('totalTimePlayed', sessionTime)
      statsState.sessionStats.timePlayed = sessionTime
    }
    
    updateStat('totalSessions', 1)
    statsState.sessionStartTime = null
  }

  // Obter estatísticas gerais
  const getGeneralStats = () => {
    return {
      level: statsState.currentLevel,
      xp: statsState.currentXP,
      totalXP: statsState.totalXP,
      gamesPlayed: statsState.stats.totalGames || 0,
      wins: statsState.stats.totalWins || 0,
      losses: statsState.stats.totalLosses || 0,
      winRate: calculateWinRate(),
      timePlayed: statsState.stats.totalTimePlayed || 0,
      cardsDiscarded: statsState.stats.totalCardsDiscarded || 0,
      abilitiesUsed: statsState.stats.totalAbilitiesUsed || 0,
      maxCombo: statsState.stats.maxCombo || 0
    }
  }

  // Calcular taxa de vitória
  const calculateWinRate = () => {
    const wins = statsState.stats.totalWins || 0
    const total = statsState.stats.totalGames || 0
    return total > 0 ? Math.round((wins / total) * 100) : 0
  }

  // Obter estatísticas de sessão
  const getSessionStats = () => {
    return { ...statsState.sessionStats }
  }

  // Obter estatísticas detalhadas
  const getDetailedStats = () => {
    return { ...statsState.stats }
  }

  // Obter estatística específica
  const getStat = (statName) => {
    return statsState.stats[statName] || 0
  }

  // Obter estatísticas por categoria
  const getStatsByCategory = () => {
    return {
      general: {
        level: statsState.currentLevel,
        xp: statsState.currentXP,
        totalXP: statsState.totalXP,
        gamesPlayed: statsState.stats.totalGames || 0,
        timePlayed: statsState.stats.totalTimePlayed || 0
      },
      performance: {
        wins: statsState.stats.totalWins || 0,
        losses: statsState.stats.totalLosses || 0,
        winRate: calculateWinRate(),
        winStreak: statsState.stats.winStreak || 0,
        maxWinStreak: statsState.stats.maxWinStreak || 0
      },
      gameplay: {
        cardsDiscarded: statsState.stats.totalCardsDiscarded || 0,
        abilitiesUsed: statsState.stats.totalAbilitiesUsed || 0,
        combos: statsState.stats.totalCombos || 0,
        maxCombo: statsState.stats.maxCombo || 0
      },
      modes: {
        botGames: statsState.stats.botGames || 0,
        botWins: statsState.stats.botWins || 0,
        multiplayerGames: statsState.stats.multiplayerGames || 0,
        multiplayerWins: statsState.stats.multiplayerWins || 0
      },
      cards: {
        kingsDiscarded: statsState.stats.kingsDiscarded || 0,
        jokersDiscarded: statsState.stats.jokersDiscarded || 0,
        acesDiscarded: statsState.stats.acesDiscarded || 0
      },
      abilities: {
        seeCardUsed: statsState.stats.seeCardUsed || 0,
        swapCardsUsed: statsState.stats.swapCardsUsed || 0,
        skipTurnUsed: statsState.stats.skipTurnUsed || 0
      }
    }
  }

  // Obter estatísticas de tempo
  const getTimeStats = () => {
    const totalTime = statsState.stats.totalTimePlayed || 0
    const games = statsState.stats.totalGames || 0
    
    return {
      totalTime,
      averageGameTime: games > 0 ? Math.round(totalTime / games) : 0,
      longestGame: statsState.stats.longestGame || 0,
      shortestGame: statsState.stats.shortestGame || 0,
      hoursPlayed: Math.round(totalTime / (1000 * 60 * 60) * 10) / 10,
      minutesPlayed: Math.round(totalTime / (1000 * 60) * 10) / 10
    }
  }

  // Obter estatísticas de horário
  const getTimeOfDayStats = () => {
    return {
      morning: statsState.stats.morningGames || 0,
      afternoon: statsState.stats.afternoonGames || 0,
      evening: statsState.stats.eveningGames || 0,
      night: statsState.stats.nightGames || 0
    }
  }

  // Obter estatísticas de dias da semana
  const getDayOfWeekStats = () => {
    return {
      monday: statsState.stats.mondayGames || 0,
      tuesday: statsState.stats.tuesdayGames || 0,
      wednesday: statsState.stats.wednesdayGames || 0,
      thursday: statsState.stats.thursdayGames || 0,
      friday: statsState.stats.fridayGames || 0,
      saturday: statsState.stats.saturdayGames || 0,
      sunday: statsState.stats.sundayGames || 0
    }
  }

  // Eventos de jogo
  const onGameStart = (gameData = {}) => {
    updateStat('totalGames')
    
    // Atualizar estatísticas de modo
    if (gameData.mode === 'bots') {
      updateStat('botGames')
    } else {
      updateStat('multiplayerGames')
    }

    // Atualizar estatísticas de horário
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) {
      updateStat('morningGames')
    } else if (hour >= 12 && hour < 18) {
      updateStat('afternoonGames')
    } else if (hour >= 18 && hour < 22) {
      updateStat('eveningGames')
    } else {
      updateStat('nightGames')
    }

    // Atualizar estatísticas de dia da semana
    const day = new Date().getDay()
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    updateStat(`${days[day]}Games`)

    // Adicionar XP por iniciar jogo
    addXP(10, 'Iniciar jogo')
  }

  const onGameWin = (gameData = {}) => {
    updateStat('totalWins')
    
    // Atualizar estatísticas de modo
    if (gameData.mode === 'bots') {
      updateStat('botWins')
    } else {
      updateStat('multiplayerWins')
    }

    // Atualizar sequência de vitórias
    const currentStreak = getStat('winStreak') + 1
    setStat('winStreak', currentStreak)
    setStat('maxWinStreak', Math.max(getStat('maxWinStreak'), currentStreak))

    // Verificar vitória rápida
    if (gameData.duration && gameData.duration < 120000) { // 2 minutos
      updateStat('fastWins')
      addXP(50, 'Vitória rápida')
    }

    // Verificar jogo perfeito
    if (gameData.perfect) {
      updateStat('perfectWins')
      addXP(100, 'Jogo perfeito')
    }

    // Adicionar XP base por vitória
    addXP(100, 'Vitória')
  }

  const onGameLose = () => {
    updateStat('totalLosses')
    setStat('winStreak', 0)
    addXP(25, 'Participação')
  }

  const onCardDiscard = (cardData = {}) => {
    updateStat('totalCardsDiscarded')
    
    // Atualizar estatísticas específicas de cartas
    if (cardData.value === 0) {
      updateStat('kingsDiscarded')
    } else if (cardData.value === -1) {
      updateStat('jokersDiscarded')
    } else if (cardData.value === 1) {
      updateStat('acesDiscarded')
    }

    // Adicionar XP por descartar carta
    addXP(1, 'Descartar carta')
  }

  const onAbilityUsed = (abilityType) => {
    updateStat('totalAbilitiesUsed')
    
    // Atualizar estatísticas específicas de habilidades
    if (abilityType === 'see_card') {
      updateStat('seeCardUsed')
    } else if (abilityType === 'swap_cards') {
      updateStat('swapCardsUsed')
    } else if (abilityType === 'skip_turn') {
      updateStat('skipTurnUsed')
    }

    // Adicionar XP por usar habilidade
    addXP(5, 'Usar habilidade')
  }

  const onCombo = (comboLength) => {
    updateStat('totalCombos')
    setStat('maxCombo', Math.max(getStat('maxCombo'), comboLength))
    
    // Adicionar XP por combo
    addXP(comboLength * 2, `Combo de ${comboLength}`)
  }

  const onGameEnd = (gameData = {}) => {
    // Atualizar tempo de jogo
    if (gameData.duration) {
      updateStat('totalTimePlayed', gameData.duration)
      
      // Atualizar estatísticas de tempo
      const currentLongest = getStat('longestGame')
      const currentShortest = getStat('shortestGame')
      
      if (gameData.duration > currentLongest) {
        setStat('longestGame', gameData.duration)
      }
      
      if (currentShortest === 0 || gameData.duration < currentShortest) {
        setStat('shortestGame', gameData.duration)
      }
    }
  }

  // Resetar todas as estatísticas
  const resetAllStats = () => {
    statsState.stats = {}
    statsState.currentLevel = 1
    statsState.currentXP = 0
    statsState.totalXP = 0
    initializeDefaultStats()
    saveStats()
  }

  // Computed properties
  const levelProgress = computed(() => getLevelProgress())
  const xpForNextLevel = computed(() => getXPForNextLevel())
  const winRate = computed(() => calculateWinRate())
  const generalStats = computed(() => getGeneralStats())
  const sessionStats = computed(() => getSessionStats())

  // Inicialização automática
  onMounted(() => {
    init()
  })

  return {
    // Estado
    statsState: readonly(statsState),
    isLoading,
    
    // Computed
    levelProgress,
    xpForNextLevel,
    winRate,
    generalStats,
    sessionStats,
    
    // Métodos principais
    init,
    updateStat,
    setStat,
    addXP,
    getGeneralStats,
    getDetailedStats,
    getStat,
    getStatsByCategory,
    getTimeStats,
    getTimeOfDayStats,
    getDayOfWeekStats,
    getSessionStats,
    
    // Nível e XP
    calculateLevel,
    getXPForNextLevel,
    getXPForLevel,
    getLevelProgress,
    
    // Sessão
    startSession,
    endSession,
    
    // Eventos de jogo
    onGameStart,
    onGameWin,
    onGameLose,
    onCardDiscard,
    onAbilityUsed,
    onCombo,
    onGameEnd,
    
    // Utilitários
    resetAllStats
  }
}

// Função helper para readonly
function readonly(obj) {
  return new Proxy(obj, {
    get(target, prop) {
      return target[prop]
    },
    set() {
      console.warn('Tentativa de modificar estado readonly das estatísticas')
      return false
    }
  })
}
