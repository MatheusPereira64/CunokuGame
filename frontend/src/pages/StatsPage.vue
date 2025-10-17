<template>
  <div class="stats-page">
    <div class="page-header">
      <h1 class="flash-text-glow">📊 Estatísticas</h1>
      <div class="level-display">
        <div class="level-info">
          <div class="level-number">{{ generalStats.level }}</div>
          <div class="level-label">Nível</div>
        </div>
        <div class="xp-bar">
          <div class="xp-fill" :style="{ width: `${levelProgress.percentage}%` }"></div>
          <div class="xp-text">{{ levelProgress.current }} / {{ levelProgress.needed }} XP</div>
        </div>
      </div>
    </div>

    <div class="stats-content">
      <!-- Estatísticas Principais -->
      <div class="stats-section">
        <h2 class="section-title">🎯 Estatísticas Principais</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">🎮</div>
            <div class="stat-info">
              <div class="stat-number">{{ generalStats.gamesPlayed }}</div>
              <div class="stat-label">Partidas Jogadas</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">🏆</div>
            <div class="stat-info">
              <div class="stat-number">{{ generalStats.wins }}</div>
              <div class="stat-label">Vitórias</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">📈</div>
            <div class="stat-info">
              <div class="stat-number">{{ generalStats.winRate }}%</div>
              <div class="stat-label">Taxa de Vitória</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">⏱️</div>
            <div class="stat-info">
              <div class="stat-number">{{ timeStats.hoursPlayed }}h</div>
              <div class="stat-label">Tempo Jogado</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estatísticas de Jogo -->
      <div class="stats-section">
        <h2 class="section-title">🎲 Estatísticas de Jogo</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">🃏</div>
            <div class="stat-info">
              <div class="stat-number">{{ generalStats.cardsDiscarded }}</div>
              <div class="stat-label">Cartas Descartadas</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">✨</div>
            <div class="stat-info">
              <div class="stat-number">{{ generalStats.abilitiesUsed }}</div>
              <div class="stat-label">Habilidades Usadas</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">💥</div>
            <div class="stat-info">
              <div class="stat-number">{{ generalStats.maxCombo }}</div>
              <div class="stat-label">Maior Combo</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">🔥</div>
            <div class="stat-info">
              <div class="stat-number">{{ detailedStats.maxWinStreak || 0 }}</div>
              <div class="stat-label">Maior Sequência</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estatísticas de Modos -->
      <div class="stats-section">
        <h2 class="section-title">🤖 vs 👥 Modos de Jogo</h2>
        <div class="modes-stats">
          <div class="mode-card">
            <div class="mode-header">
              <div class="mode-icon">🤖</div>
              <div class="mode-title">Contra Bots</div>
            </div>
            <div class="mode-stats">
              <div class="mode-stat">
                <span class="mode-label">Partidas:</span>
                <span class="mode-value">{{ detailedStats.botGames || 0 }}</span>
              </div>
              <div class="mode-stat">
                <span class="mode-label">Vitórias:</span>
                <span class="mode-value">{{ detailedStats.botWins || 0 }}</span>
              </div>
              <div class="mode-stat">
                <span class="mode-label">Taxa:</span>
                <span class="mode-value">{{ botWinRate }}%</span>
              </div>
            </div>
          </div>
          
          <div class="mode-card">
            <div class="mode-header">
              <div class="mode-icon">👥</div>
              <div class="mode-title">Multiplayer</div>
            </div>
            <div class="mode-stats">
              <div class="mode-stat">
                <span class="mode-label">Partidas:</span>
                <span class="mode-value">{{ detailedStats.multiplayerGames || 0 }}</span>
              </div>
              <div class="mode-stat">
                <span class="mode-label">Vitórias:</span>
                <span class="mode-value">{{ detailedStats.multiplayerWins || 0 }}</span>
              </div>
              <div class="mode-stat">
                <span class="mode-label">Taxa:</span>
                <span class="mode-value">{{ multiplayerWinRate }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estatísticas de Cartas -->
      <div class="stats-section">
        <h2 class="section-title">🃏 Cartas Especiais</h2>
        <div class="cards-stats">
          <div class="card-stat">
            <div class="card-icon">♔</div>
            <div class="card-info">
              <div class="card-number">{{ detailedStats.kingsDiscarded || 0 }}</div>
              <div class="card-label">Reis Descartados</div>
            </div>
          </div>
          
          <div class="card-stat">
            <div class="card-icon">🃏</div>
            <div class="card-info">
              <div class="card-number">{{ detailedStats.jokersDiscarded || 0 }}</div>
              <div class="card-label">Coringas Descartados</div>
            </div>
          </div>
          
          <div class="card-stat">
            <div class="card-icon">A</div>
            <div class="card-info">
              <div class="card-number">{{ detailedStats.acesDiscarded || 0 }}</div>
              <div class="card-label">Ases Descartados</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estatísticas de Habilidades -->
      <div class="stats-section">
        <h2 class="section-title">✨ Habilidades Usadas</h2>
        <div class="abilities-stats">
          <div class="ability-stat">
            <div class="ability-icon">👁️</div>
            <div class="ability-info">
              <div class="ability-number">{{ detailedStats.seeCardUsed || 0 }}</div>
              <div class="ability-label">Ver Carta</div>
            </div>
          </div>
          
          <div class="ability-stat">
            <div class="ability-icon">🔄</div>
            <div class="ability-info">
              <div class="ability-number">{{ detailedStats.swapCardsUsed || 0 }}</div>
              <div class="ability-label">Trocar Cartas</div>
            </div>
          </div>
          
          <div class="ability-stat">
            <div class="ability-icon">⏭️</div>
            <div class="ability-info">
              <div class="ability-number">{{ detailedStats.skipTurnUsed || 0 }}</div>
              <div class="ability-label">Pular Turno</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estatísticas de Tempo -->
      <div class="stats-section">
        <h2 class="section-title">⏰ Estatísticas de Tempo</h2>
        <div class="time-stats">
          <div class="time-stat">
            <div class="time-label">Tempo Total:</div>
            <div class="time-value">{{ formatTime(timeStats.totalTime) }}</div>
          </div>
          <div class="time-stat">
            <div class="time-label">Tempo Médio por Partida:</div>
            <div class="time-value">{{ formatTime(timeStats.averageGameTime) }}</div>
          </div>
          <div class="time-stat">
            <div class="time-label">Partida Mais Longa:</div>
            <div class="time-value">{{ formatTime(timeStats.longestGame) }}</div>
          </div>
          <div class="time-stat">
            <div class="time-label">Partida Mais Rápida:</div>
            <div class="time-value">{{ formatTime(timeStats.shortestGame) }}</div>
          </div>
        </div>
      </div>

      <!-- Estatísticas de Horário -->
      <div class="stats-section">
        <h2 class="section-title">🕐 Horários de Jogo</h2>
        <div class="time-chart">
          <div class="time-bar">
            <div class="time-label">Manhã (6h-12h)</div>
            <div class="time-bar-fill" :style="{ width: `${morningPercentage}%` }"></div>
            <div class="time-value">{{ timeOfDayStats.morning }}</div>
          </div>
          <div class="time-bar">
            <div class="time-label">Tarde (12h-18h)</div>
            <div class="time-bar-fill" :style="{ width: `${afternoonPercentage}%` }"></div>
            <div class="time-value">{{ timeOfDayStats.afternoon }}</div>
          </div>
          <div class="time-bar">
            <div class="time-label">Noite (18h-22h)</div>
            <div class="time-bar-fill" :style="{ width: `${eveningPercentage}%` }"></div>
            <div class="time-value">{{ timeOfDayStats.evening }}</div>
          </div>
          <div class="time-bar">
            <div class="time-label">Madrugada (22h-6h)</div>
            <div class="time-bar-fill" :style="{ width: `${nightPercentage}%` }"></div>
            <div class="time-value">{{ timeOfDayStats.night }}</div>
          </div>
        </div>
      </div>

      <!-- Estatísticas de Sessão Atual -->
      <div v-if="sessionStats.gamesPlayed > 0" class="stats-section">
        <h2 class="section-title">🎮 Sessão Atual</h2>
        <div class="session-stats">
          <div class="session-stat">
            <div class="session-label">Partidas:</div>
            <div class="session-value">{{ sessionStats.gamesPlayed }}</div>
          </div>
          <div class="session-stat">
            <div class="session-label">Vitórias:</div>
            <div class="session-value">{{ sessionStats.wins }}</div>
          </div>
          <div class="session-stat">
            <div class="session-label">Cartas Descartadas:</div>
            <div class="session-value">{{ sessionStats.cardsDiscarded }}</div>
          </div>
          <div class="session-stat">
            <div class="session-label">Habilidades Usadas:</div>
            <div class="session-value">{{ sessionStats.abilitiesUsed }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStats } from '../composables/useStats.js'

const {
  generalStats,
  sessionStats,
  getDetailedStats,
  getTimeStats,
  getTimeOfDayStats,
  getLevelProgress
} = useStats()

const detailedStats = computed(() => getDetailedStats())
const timeStats = computed(() => getTimeStats())
const timeOfDayStats = computed(() => getTimeOfDayStats())
const levelProgress = computed(() => getLevelProgress())

// Calcular taxas de vitória por modo
const botWinRate = computed(() => {
  const games = detailedStats.value.botGames || 0
  const wins = detailedStats.value.botWins || 0
  return games > 0 ? Math.round((wins / games) * 100) : 0
})

const multiplayerWinRate = computed(() => {
  const games = detailedStats.value.multiplayerGames || 0
  const wins = detailedStats.value.multiplayerWins || 0
  return games > 0 ? Math.round((wins / games) * 100) : 0
})

// Calcular percentuais de horário
const totalTimeGames = computed(() => {
  return timeOfDayStats.value.morning + 
         timeOfDayStats.value.afternoon + 
         timeOfDayStats.value.evening + 
         timeOfDayStats.value.night
})

const morningPercentage = computed(() => {
  return totalTimeGames.value > 0 ? 
    (timeOfDayStats.value.morning / totalTimeGames.value) * 100 : 0
})

const afternoonPercentage = computed(() => {
  return totalTimeGames.value > 0 ? 
    (timeOfDayStats.value.afternoon / totalTimeGames.value) * 100 : 0
})

const eveningPercentage = computed(() => {
  return totalTimeGames.value > 0 ? 
    (timeOfDayStats.value.evening / totalTimeGames.value) * 100 : 0
})

const nightPercentage = computed(() => {
  return totalTimeGames.value > 0 ? 
    (timeOfDayStats.value.night / totalTimeGames.value) * 100 : 0
})

// Função para formatar tempo
const formatTime = (milliseconds) => {
  if (!milliseconds) return '0s'
  
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}
</script>

<style scoped>
.stats-page {
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

.level-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  background: var(--card-gradient);
  border: 2px solid var(--primary-gold);
  border-radius: 15px;
  padding: 1.5rem;
  max-width: 500px;
  margin: 0 auto;
}

.level-info {
  text-align: center;
}

.level-number {
  font-size: 3rem;
  font-weight: 700;
  color: var(--secondary-gold);
  line-height: 1;
}

.level-label {
  font-size: 1rem;
  color: rgba(248, 248, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.xp-bar {
  flex: 1;
  height: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  position: relative;
  overflow: hidden;
}

.xp-fill {
  height: 100%;
  background: var(--gold-gradient);
  border-radius: 10px;
  transition: width 0.3s ease;
}

.xp-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--japanese-black);
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.5);
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.stats-section {
  background: var(--card-gradient);
  border: 2px solid var(--primary-gold);
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.section-title {
  font-family: 'Cinzel', serif;
  font-size: 1.5rem;
  color: var(--secondary-gold);
  margin-bottom: 1.5rem;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(212, 175, 55, 0.2);
}

.stat-icon {
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

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--pearl-white);
  line-height: 1;
}

.stat-label {
  font-size: 0.9rem;
  color: rgba(248, 248, 255, 0.8);
  margin-top: 0.25rem;
}

.modes-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.mode-card {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 10px;
  padding: 1.5rem;
}

.mode-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.mode-icon {
  font-size: 2rem;
}

.mode-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--pearl-white);
}

.mode-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mode-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mode-label {
  color: rgba(248, 248, 255, 0.8);
}

.mode-value {
  font-weight: 600;
  color: var(--secondary-gold);
}

.cards-stats, .abilities-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.card-stat, .ability-stat {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
}

.card-icon, .ability-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.card-number, .ability-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--pearl-white);
  margin-bottom: 0.25rem;
}

.card-label, .ability-label {
  font-size: 0.9rem;
  color: rgba(248, 248, 255, 0.8);
}

.time-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.time-stat {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
}

.time-label {
  font-size: 0.9rem;
  color: rgba(248, 248, 255, 0.8);
  margin-bottom: 0.5rem;
}

.time-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--secondary-gold);
}

.time-chart {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.time-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 0.5rem 1rem;
}

.time-label {
  min-width: 120px;
  font-size: 0.9rem;
  color: rgba(248, 248, 255, 0.8);
}

.time-bar-fill {
  flex: 1;
  height: 20px;
  background: var(--gold-gradient);
  border-radius: 10px;
  transition: width 0.3s ease;
}

.time-value {
  min-width: 30px;
  text-align: right;
  font-weight: 600;
  color: var(--secondary-gold);
}

.session-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.session-stat {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
}

.session-label {
  font-size: 0.9rem;
  color: rgba(248, 248, 255, 0.8);
  margin-bottom: 0.5rem;
}

.session-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--secondary-gold);
}

/* Responsividade */
@media (max-width: 768px) {
  .stats-page {
    padding: 1rem;
  }
  
  .page-header h1 {
    font-size: 2rem;
  }
  
  .level-display {
    flex-direction: column;
    gap: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .modes-stats {
    grid-template-columns: 1fr;
  }
  
  .cards-stats, .abilities-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .time-stats, .session-stats {
    grid-template-columns: 1fr;
  }
}
</style>
