<template>
  <div class="achievements-page">
    <div class="page-header">
      <h1 class="flash-text-glow">🏆 Conquistas</h1>
      <div class="stats-overview">
        <div class="stat-card">
          <div class="stat-number">{{ unlockedCount }}</div>
          <div class="stat-label">Desbloqueadas</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ totalAchievements }}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ completionPercentage }}%</div>
          <div class="stat-label">Completado</div>
        </div>
      </div>
    </div>

    <div class="achievements-content">
      <!-- Filtros -->
      <div class="filters">
        <div class="filter-group">
          <label>Filtrar por:</label>
          <select v-model="selectedCategory" class="filter-select">
            <option value="">Todas as Categorias</option>
            <option v-for="(category, key) in categories" :key="key" :value="key">
              {{ category.icon }} {{ category.name }}
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Raridade:</label>
          <select v-model="selectedRarity" class="filter-select">
            <option value="">Todas as Raridades</option>
            <option v-for="(rarity, key) in rarities" :key="key" :value="key">
              {{ rarity.name }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>Status:</label>
          <select v-model="selectedStatus" class="filter-select">
            <option value="all">Todas</option>
            <option value="unlocked">Desbloqueadas</option>
            <option value="locked">Bloqueadas</option>
          </select>
        </div>
      </div>

      <!-- Lista de Conquistas -->
      <div class="achievements-grid">
        <div 
          v-for="achievement in filteredAchievements" 
          :key="achievement.id"
          class="achievement-card"
          :class="[
            `rarity-${achievement.rarity}`,
            { 'unlocked': isUnlocked(achievement.id) }
          ]"
        >
          <div class="achievement-icon">
            {{ achievement.icon }}
          </div>
          
          <div class="achievement-info">
            <h3 class="achievement-name">{{ achievement.name }}</h3>
            <p class="achievement-description">{{ achievement.description }}</p>
            
            <div class="achievement-meta">
              <span class="achievement-category">
                {{ categories[achievement.category]?.icon }} {{ categories[achievement.category]?.name }}
              </span>
              <span class="achievement-rarity" :style="{ color: rarities[achievement.rarity]?.color }">
                {{ rarities[achievement.rarity]?.name }}
              </span>
            </div>

            <div v-if="!isUnlocked(achievement.id)" class="achievement-progress">
              <div class="progress-info">
                <span>{{ progress[achievement.id]?.current || 0 }}</span>
                <span>/</span>
                <span>{{ progress[achievement.id]?.target || 0 }}</span>
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: `${progress[achievement.id]?.percentage || 0}%` }"
                ></div>
              </div>
            </div>

            <div v-else class="achievement-reward">
              <div v-if="achievement.reward.xp" class="reward-xp">
                +{{ achievement.reward.xp }} XP
              </div>
              <div v-if="achievement.reward.title" class="reward-title">
                {{ achievement.reward.title }}
              </div>
            </div>
          </div>

          <div v-if="isUnlocked(achievement.id)" class="achievement-status">
            <div class="unlocked-badge">✓</div>
          </div>
        </div>
      </div>

      <!-- Conquistas Próximas -->
      <div v-if="nearUnlock.length > 0" class="near-unlock-section">
        <h2 class="section-title">🎯 Próximas Conquistas</h2>
        <div class="near-unlock-grid">
          <div 
            v-for="item in nearUnlock" 
            :key="item.achievement.id"
            class="near-unlock-card"
          >
            <div class="near-icon">{{ item.achievement.icon }}</div>
            <div class="near-info">
              <h4>{{ item.achievement.name }}</h4>
              <div class="near-progress">
                <div class="progress-bar">
                  <div 
                    class="progress-fill" 
                    :style="{ width: `${item.progress.percentage}%` }"
                  ></div>
                </div>
                <span>{{ item.progress.percentage.toFixed(0) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAchievements } from '../composables/useAchievements.js'
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_RARITIES } from '../utils/achievementsList.js'

const {
  totalAchievements,
  unlockedCount,
  completionPercentage,
  getUnlockedAchievements,
  getLockedAchievements,
  getProgress,
  getAchievementsByCategory,
  getAchievementsByRarity,
  isUnlocked,
  getNearUnlock
} = useAchievements()

const selectedCategory = ref('')
const selectedRarity = ref('')
const selectedStatus = ref('all')

const categories = ACHIEVEMENT_CATEGORIES
const rarities = ACHIEVEMENT_RARITIES

// Computed properties
const allAchievements = computed(() => {
  const unlocked = getUnlockedAchievements()
  const locked = getLockedAchievements()
  return [...unlocked, ...locked]
})

const filteredAchievements = computed(() => {
  let filtered = allAchievements.value

  // Filtrar por categoria
  if (selectedCategory.value) {
    filtered = filtered.filter(achievement => achievement.category === selectedCategory.value)
  }

  // Filtrar por raridade
  if (selectedRarity.value) {
    filtered = filtered.filter(achievement => achievement.rarity === selectedRarity.value)
  }

  // Filtrar por status
  if (selectedStatus.value === 'unlocked') {
    filtered = filtered.filter(achievement => isUnlocked(achievement.id))
  } else if (selectedStatus.value === 'locked') {
    filtered = filtered.filter(achievement => !isUnlocked(achievement.id))
  }

  return filtered
})

const progress = computed(() => {
  const progressMap = {}
  allAchievements.value.forEach(achievement => {
    progressMap[achievement.id] = getProgress(achievement.id)
  })
  return progressMap
})

const nearUnlock = computed(() => getNearUnlock(80))

onMounted(() => {
  // Inicializar sistema de conquistas se necessário
})
</script>

<style scoped>
.achievements-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: var(--pearl-white);
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-header h1 {
  font-family: 'Cinzel', serif;
  font-size: 3rem;
  font-weight: 700;
  background: var(--gold-gradient);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 2rem;
}

.stats-overview {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--card-gradient);
  border: 2px solid var(--primary-gold);
  border-radius: 15px;
  padding: 1.5rem;
  text-align: center;
  min-width: 120px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--secondary-gold);
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  color: rgba(248, 248, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  justify-content: center;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--secondary-gold);
}

.filter-select {
  background: var(--card-gradient);
  border: 2px solid var(--primary-gold);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  color: var(--pearl-white);
  font-size: 0.9rem;
  min-width: 150px;
}

.filter-select:focus {
  outline: none;
  border-color: var(--secondary-gold);
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.achievement-card {
  background: var(--card-gradient);
  border: 2px solid var(--primary-gold);
  border-radius: 15px;
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.achievement-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(212, 175, 55, 0.1),
    transparent
  );
  transition: left 0.5s;
}

.achievement-card:hover::before {
  left: 100%;
}

.achievement-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(212, 175, 55, 0.3);
}

.achievement-card.unlocked {
  border-color: var(--secondary-gold);
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, #2A2A2A 100%);
}

.achievement-icon {
  font-size: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: var(--gold-gradient);
  border-radius: 50%;
  flex-shrink: 0;
}

.achievement-info {
  flex: 1;
}

.achievement-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--pearl-white);
  margin-bottom: 0.5rem;
  font-family: 'Cinzel', serif;
}

.achievement-description {
  font-size: 0.9rem;
  color: rgba(248, 248, 255, 0.8);
  line-height: 1.4;
  margin-bottom: 1rem;
}

.achievement-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.8rem;
}

.achievement-category {
  color: var(--secondary-gold);
  font-weight: 600;
}

.achievement-rarity {
  font-weight: 600;
}

.achievement-progress {
  margin-bottom: 1rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: rgba(248, 248, 255, 0.7);
  margin-bottom: 0.5rem;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--gold-gradient);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.achievement-reward {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.reward-xp {
  background: var(--gold-gradient);
  color: var(--japanese-black);
  padding: 0.25rem 0.5rem;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
}

.reward-title {
  background: rgba(212, 175, 55, 0.2);
  color: var(--secondary-gold);
  padding: 0.25rem 0.5rem;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.achievement-status {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.unlocked-badge {
  width: 30px;
  height: 30px;
  background: var(--gold-gradient);
  color: var(--japanese-black);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
}

/* Raridades */
.achievement-card.rarity-common {
  border-color: #808080;
}

.achievement-card.rarity-uncommon {
  border-color: #00FF00;
}

.achievement-card.rarity-rare {
  border-color: #0080FF;
}

.achievement-card.rarity-epic {
  border-color: #8000FF;
}

.achievement-card.rarity-legendary {
  border-color: #FF8000;
  animation: legendary-glow 2s ease-in-out infinite alternate;
}

@keyframes legendary-glow {
  0% {
    box-shadow: 0 4px 15px rgba(255, 128, 0, 0.3);
  }
  100% {
    box-shadow: 0 8px 25px rgba(255, 128, 0, 0.6);
  }
}

/* Seção de conquistas próximas */
.near-unlock-section {
  margin-top: 3rem;
}

.section-title {
  font-family: 'Cinzel', serif;
  font-size: 1.8rem;
  color: var(--secondary-gold);
  text-align: center;
  margin-bottom: 2rem;
}

.near-unlock-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.near-unlock-card {
  background: var(--card-gradient);
  border: 2px solid var(--accent-red);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.near-icon {
  font-size: 2rem;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gold-gradient);
  border-radius: 50%;
  flex-shrink: 0;
}

.near-info h4 {
  font-size: 1rem;
  color: var(--pearl-white);
  margin-bottom: 0.5rem;
}

.near-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.near-progress .progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.near-progress .progress-fill {
  height: 100%;
  background: var(--gold-gradient);
  border-radius: 2px;
}

.near-progress span {
  font-size: 0.8rem;
  color: var(--secondary-gold);
  font-weight: 600;
  min-width: 35px;
  text-align: right;
}

/* Responsividade */
@media (max-width: 768px) {
  .achievements-page {
    padding: 1rem;
  }
  
  .page-header h1 {
    font-size: 2rem;
  }
  
  .stats-overview {
    flex-direction: column;
    align-items: center;
  }
  
  .achievements-grid {
    grid-template-columns: 1fr;
  }
  
  .filters {
    flex-direction: column;
    align-items: center;
  }
  
  .filter-select {
    min-width: 200px;
  }
}
</style>
