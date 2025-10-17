import { ref, reactive, computed, onMounted } from 'vue'
import { ACHIEVEMENTS, getAchievementProgress, isAchievementUnlocked } from '../utils/achievementsList.js'

// Estado global das conquistas
const achievementState = reactive({
  unlocked: [],
  stats: {},
  notifications: [],
  isInitialized: false
})

export function useAchievements() {
  const isLoading = ref(false)
  const showNotifications = ref(true)

  // Inicializar sistema
  const init = () => {
    if (achievementState.isInitialized) return

    // Carregar conquistas desbloqueadas do localStorage
    const savedUnlocked = localStorage.getItem('cunoku_achievements')
    if (savedUnlocked) {
      try {
        achievementState.unlocked = JSON.parse(savedUnlocked)
      } catch (error) {
        console.warn('Erro ao carregar conquistas:', error)
        achievementState.unlocked = []
      }
    }

    // Carregar estatísticas do localStorage
    const savedStats = localStorage.getItem('cunoku_stats')
    if (savedStats) {
      try {
        achievementState.stats = JSON.parse(savedStats)
      } catch (error) {
        console.warn('Erro ao carregar estatísticas:', error)
        achievementState.stats = {}
      }
    }

    achievementState.isInitialized = true
  }

  // Salvar conquistas no localStorage
  const saveUnlocked = () => {
    try {
      localStorage.setItem('cunoku_achievements', JSON.stringify(achievementState.unlocked))
    } catch (error) {
      console.warn('Erro ao salvar conquistas:', error)
    }
  }

  // Salvar estatísticas no localStorage
  const saveStats = () => {
    try {
      localStorage.setItem('cunoku_stats', JSON.stringify(achievementState.stats))
    } catch (error) {
      console.warn('Erro ao salvar estatísticas:', error)
    }
  }

  // Atualizar estatística
  const updateStat = (statType, value = 1) => {
    if (!achievementState.isInitialized) init()

    const currentValue = achievementState.stats[statType] || 0
    achievementState.stats[statType] = currentValue + value
    saveStats()

    // Verificar conquistas relacionadas a esta estatística
    checkAchievements(statType)
  }

  // Definir estatística específica
  const setStat = (statType, value) => {
    if (!achievementState.isInitialized) init()

    achievementState.stats[statType] = value
    saveStats()

    // Verificar conquistas relacionadas a esta estatística
    checkAchievements(statType)
  }

  // Verificar conquistas baseadas em uma estatística
  const checkAchievements = (statType) => {
    const achievements = Object.values(ACHIEVEMENTS).filter(
      achievement => achievement.condition.type === statType
    )

    achievements.forEach(achievement => {
      if (!isAchievementUnlocked(achievement.id, achievementState.unlocked)) {
        const progress = getAchievementProgress(achievement.id, achievementState.stats)
        
        if (progress.percentage >= 100) {
          unlockAchievement(achievement.id)
        }
      }
    })
  }

  // Desbloquear conquista
  const unlockAchievement = (achievementId) => {
    if (achievementState.unlocked.includes(achievementId)) return

    const achievement = ACHIEVEMENTS[achievementId]
    if (!achievement) return

    achievementState.unlocked.push(achievementId)
    saveUnlocked()

    // Adicionar notificação
    if (showNotifications.value) {
      addNotification(achievement)
    }

    // Emitir evento personalizado
    window.dispatchEvent(new CustomEvent('achievement-unlocked', {
      detail: { achievement, id: achievementId }
    }))

    return achievement
  }

  // Adicionar notificação
  const addNotification = (achievement) => {
    const notification = {
      id: Date.now() + Math.random(),
      achievement,
      timestamp: Date.now()
    }

    achievementState.notifications.push(notification)

    // Remover notificação após 5 segundos
    setTimeout(() => {
      removeNotification(notification.id)
    }, 5000)
  }

  // Remover notificação
  const removeNotification = (notificationId) => {
    const index = achievementState.notifications.findIndex(n => n.id === notificationId)
    if (index > -1) {
      achievementState.notifications.splice(index, 1)
    }
  }

  // Obter conquistas desbloqueadas
  const getUnlockedAchievements = () => {
    return achievementState.unlocked.map(id => ACHIEVEMENTS[id]).filter(Boolean)
  }

  // Obter conquistas bloqueadas
  const getLockedAchievements = () => {
    return Object.values(ACHIEVEMENTS).filter(
      achievement => !achievementState.unlocked.includes(achievement.id)
    )
  }

  // Obter progresso de uma conquista
  const getProgress = (achievementId) => {
    return getAchievementProgress(achievementId, achievementState.stats)
  }

  // Obter conquistas por categoria
  const getAchievementsByCategory = (category) => {
    return Object.values(ACHIEVEMENTS).filter(achievement => achievement.category === category)
  }

  // Obter conquistas por raridade
  const getAchievementsByRarity = (rarity) => {
    return Object.values(ACHIEVEMENTS).filter(achievement => achievement.rarity === rarity)
  }

  // Verificar se conquista está desbloqueada
  const isUnlocked = (achievementId) => {
    return achievementState.unlocked.includes(achievementId)
  }

  // Obter estatísticas gerais
  const getStats = () => {
    return { ...achievementState.stats }
  }

  // Obter estatística específica
  const getStat = (statType) => {
    return achievementState.stats[statType] || 0
  }

  // Resetar todas as conquistas (para debug)
  const resetAll = () => {
    achievementState.unlocked = []
    achievementState.stats = {}
    achievementState.notifications = []
    saveUnlocked()
    saveStats()
  }

  // Obter conquistas próximas de serem desbloqueadas
  const getNearUnlock = (threshold = 80) => {
    const locked = getLockedAchievements()
    
    return locked
      .map(achievement => ({
        achievement,
        progress: getProgress(achievement.id)
      }))
      .filter(item => item.progress.percentage >= threshold)
      .sort((a, b) => b.progress.percentage - a.progress.percentage)
  }

  // Obter conquistas recém-desbloqueadas
  const getRecentUnlocks = (limit = 5) => {
    return achievementState.unlocked
      .slice(-limit)
      .map(id => ACHIEVEMENTS[id])
      .filter(Boolean)
      .reverse()
  }

  // Computed properties
  const totalAchievements = computed(() => Object.keys(ACHIEVEMENTS).length)
  const unlockedCount = computed(() => achievementState.unlocked.length)
  const completionPercentage = computed(() => 
    Math.round((unlockedCount.value / totalAchievements.value) * 100)
  )

  const unlockedByCategory = computed(() => {
    const categories = {}
    getUnlockedAchievements().forEach(achievement => {
      if (!categories[achievement.category]) {
        categories[achievement.category] = 0
      }
      categories[achievement.category]++
    })
    return categories
  })

  const unlockedByRarity = computed(() => {
    const rarities = {}
    getUnlockedAchievements().forEach(achievement => {
      if (!rarities[achievement.rarity]) {
        rarities[achievement.rarity] = 0
      }
      rarities[achievement.rarity]++
    })
    return rarities
  })

  // Eventos de jogo para atualizar estatísticas
  const onGameStart = (gameData) => {
    updateStat('games_played')
    
    if (gameData.mode === 'bots') {
      updateStat('bot_games')
    } else {
      updateStat('multiplayer_games')
    }

    // Verificar conquistas de horário
    const hour = new Date().getHours()
    if (hour >= 23 || hour <= 5) {
      updateStat('night_games')
    } else if (hour >= 5 && hour <= 8) {
      updateStat('morning_games')
    }
  }

  const onGameWin = (gameData) => {
    updateStat('wins')
    
    if (gameData.mode === 'bots') {
      updateStat('bot_wins')
      if (gameData.difficulty === 'dificil') {
        updateStat('hard_bot_wins')
      }
    }

    // Verificar sequência de vitórias
    const currentStreak = getStat('current_win_streak') + 1
    setStat('current_win_streak', currentStreak)
    setStat('max_win_streak', Math.max(getStat('max_win_streak'), currentStreak))

    // Verificar vitória rápida
    if (gameData.duration && gameData.duration < 120) {
      updateStat('fast_wins')
    }

    // Verificar jogo perfeito
    if (gameData.perfect) {
      updateStat('perfect_wins')
    }
  }

  const onGameLose = () => {
    setStat('current_win_streak', 0)
  }

  const onCardDiscard = (cardData) => {
    updateStat('cards_discarded')
    
    if (cardData.value === 0) {
      updateStat('kings_discarded')
    } else if (cardData.value === -1) {
      updateStat('jokers_discarded')
    }
  }

  const onAbilityUsed = (abilityType) => {
    updateStat('abilities_used')
    
    if (abilityType === 'see_card') {
      updateStat('see_card_used')
    } else if (abilityType === 'swap_cards') {
      updateStat('swap_cards_used')
    }
  }

  const onCombo = (comboLength) => {
    setStat('max_combo', Math.max(getStat('max_combo'), comboLength))
  }

  const onRoomCreate = () => {
    updateStat('rooms_created')
  }

  // Inicialização automática
  onMounted(() => {
    init()
  })

  return {
    // Estado
    achievementState: readonly(achievementState),
    isLoading,
    showNotifications,
    
    // Computed
    totalAchievements,
    unlockedCount,
    completionPercentage,
    unlockedByCategory,
    unlockedByRarity,
    
    // Métodos
    init,
    updateStat,
    setStat,
    unlockAchievement,
    getUnlockedAchievements,
    getLockedAchievements,
    getProgress,
    getAchievementsByCategory,
    getAchievementsByRarity,
    isUnlocked,
    getStats,
    getStat,
    getNearUnlock,
    getRecentUnlocks,
    resetAll,
    addNotification,
    removeNotification,
    
    // Eventos de jogo
    onGameStart,
    onGameWin,
    onGameLose,
    onCardDiscard,
    onAbilityUsed,
    onCombo,
    onRoomCreate
  }
}

// Função helper para readonly
function readonly(obj) {
  return new Proxy(obj, {
    get(target, prop) {
      return target[prop]
    },
    set() {
      console.warn('Tentativa de modificar estado readonly das conquistas')
      return false
    }
  })
}
