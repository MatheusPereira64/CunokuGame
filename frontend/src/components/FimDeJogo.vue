<template>
  <div class="fimdejogo-container" :class="`result-${gameResult}`">
    <!-- Efeitos de fundo -->
    <div class="endgame-background-effects">
      <div v-if="gameResult === 'win'" class="victory-effects">
        <div class="victory-burst"></div>
        <div class="victory-rays"></div>
      </div>
      <div v-if="gameResult === 'lose'" class="defeat-effects">
        <div class="defeat-shockwave"></div>
      </div>
      <div v-if="gameResult === 'draw'" class="draw-effects">
        <div class="draw-pulse"></div>
      </div>
    </div>
    
    <!-- Confetti para vitória -->
    <Confetti v-if="gameResult === 'win' && showConfetti" />
    
    <!-- Título principal -->
    <div class="endgame-title" :class="`title-${gameResult}`">
      <div class="title-icon">{{ getTitleIcon() }}</div>
      <h2>{{ getTitle() }}</h2>
      <div class="title-subtitle">{{ getSubtitle() }}</div>
    </div>
    
    <!-- Estatísticas da partida -->
    <div class="game-stats" v-if="showStats">
      <div class="stat-item">
        <div class="stat-icon">⏱️</div>
        <div class="stat-value">{{ gameStats.duration }}</div>
        <div class="stat-label">Duração</div>
      </div>
      <div class="stat-item">
        <div class="stat-icon">🃏</div>
        <div class="stat-value">{{ gameStats.cardsPlayed }}</div>
        <div class="stat-label">Cartas Jogadas</div>
      </div>
      <div class="stat-item">
        <div class="stat-icon">✨</div>
        <div class="stat-value">{{ gameStats.abilitiesUsed }}</div>
        <div class="stat-label">Habilidades</div>
      </div>
    </div>
    
    <!-- Ranking com animações -->
    <div class="ranking-container">
      <h3 class="ranking-title">🏆 Ranking Final</h3>
      <div class="ranking-list">
        <div 
          v-for="(item, idx) in ranking" 
          :key="item.nome"
          class="ranking-item"
          :class="`rank-${idx + 1}`"
          :style="{ '--delay': `${idx * 0.2}s` }"
        >
          <div class="rank-medal">{{ item.medalha || '🏅' }}</div>
          <div class="rank-info">
            <div class="rank-name">{{ item.nome }}</div>
            <div class="rank-score">{{ item.soma }} pontos</div>
          </div>
          <div class="rank-position">{{ idx + 1 }}º</div>
        </div>
      </div>
    </div>
    
    <!-- Cartas dos jogadores -->
    <div class="players-cards" v-if="showPlayerCards">
      <h3 class="cards-title">🃏 Cartas Finais</h3>
      <div class="players-grid">
        <div 
          v-for="(player, idx) in resultado?.jogadores || []" 
          :key="idx"
          class="player-card"
          :class="{ 'winner': resultado?.vencedores?.includes(player.nome) }"
        >
          <div class="player-name">{{ player.nome }}</div>
          <div class="player-cards-list">
            <div 
              v-for="(carta, cidx) in player.mao" 
              :key="cidx"
              class="final-card"
              :class="`card-${carta.nome}`"
            >
              {{ carta.nome }}{{ carta.naipe ? ' ' + carta.naipe : '' }}
            </div>
          </div>
          <div class="player-sum">{{ resultado?.somas?.find(s => s.nome === player.nome)?.soma }} pts</div>
        </div>
      </div>
    </div>
    
    <!-- Ações -->
    <div class="endgame-actions">
      <button 
        class="action-btn primary flash-button flash-hover-scale" 
        @click="handleNewGame"
      >
        <span class="btn-icon">🎮</span>
        <span class="btn-text">Novo Jogo</span>
      </button>
      <button 
        class="action-btn secondary flash-button flash-hover-scale" 
        @click="handleBackHome"
      >
        <span class="btn-icon">🏠</span>
        <span class="btn-text">Voltar ao Início</span>
      </button>
    </div>
    
    <!-- Partículas de celebração -->
    <div v-if="showParticles" class="celebration-particles">
      <div 
        v-for="particle in particles" 
        :key="particle.id"
        class="celebration-particle"
        :style="particle.style"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Confetti from './effects/Confetti.vue'

const props = defineProps({
  resultado: Object,
  gameStats: {
    type: Object,
    default: () => ({
      duration: '0:00',
      cardsPlayed: 0,
      abilitiesUsed: 0
    })
  },
  showStats: {
    type: Boolean,
    default: true
  },
  showPlayerCards: {
    type: Boolean,
    default: true
  },
  showConfetti: {
    type: Boolean,
    default: true
  },
  showParticles: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['voltar-inicio', 'novo-jogo'])

// Estado interno
const particles = ref([])
const particleId = ref(0)

// Computed properties
const gameResult = computed(() => {
  if (!props.resultado?.vencedores) return 'draw'
  
  // Assumindo que o primeiro jogador é o usuário atual
  const isWinner = props.resultado.vencedores.length === 1 && 
                   props.resultado.vencedores[0] === props.resultado.jogadores[0]?.nome
  
  if (isWinner) return 'win'
  if (props.resultado.vencedores.length > 1) return 'draw'
  return 'lose'
})

const ranking = computed(() => {
  if (!props.resultado?.somas) return [];
  // Ordena por soma crescente
  const ordenado = [...props.resultado.somas].sort((a, b) => a.soma - b.soma);
  // Atribui medalhas considerando empates
  let medalhas = ['🥇', '🥈', '🥉'];
  let ranking = [];
  let pos = 0;
  let lastSoma = null;
  let medalhaIdx = 0;
  for (let i = 0; i < ordenado.length; i++) {
    const s = ordenado[i];
    if (lastSoma === null || s.soma !== lastSoma) {
      pos = i;
      medalhaIdx = pos;
    }
    let medalha = medalhaIdx < 3 ? medalhas[medalhaIdx] : null;
    ranking.push({ ...s, medalha });
    lastSoma = s.soma;
  }
  return ranking;
});

// Métodos
const getTitleIcon = () => {
  const icons = {
    win: '🏆',
    lose: '😔',
    draw: '🤝'
  }
  return icons[gameResult.value] || '🎮'
}

const getTitle = () => {
  const titles = {
    win: 'VITÓRIA!',
    lose: 'DERROTA!',
    draw: 'EMPATE!'
  }
  return titles[gameResult.value] || 'Fim de Jogo!'
}

const getSubtitle = () => {
  const subtitles = {
    win: 'Parabéns! Você venceu!',
    lose: 'Não foi desta vez. Tente novamente!',
    draw: 'Foi um jogo equilibrado!'
  }
  return subtitles[gameResult.value] || 'Obrigado por jogar!'
}

const handleNewGame = () => {
  emit('novo-jogo')
}

const handleBackHome = () => {
  emit('voltar-inicio')
}

const createParticle = (config) => {
  const particle = {
    id: particleId.value++,
    x: config.x,
    y: config.y,
    vx: config.vx || 0,
    vy: config.vy || 0,
    life: config.life || 1000,
    maxLife: config.life || 1000,
    color: config.color || '#D4AF37',
    size: config.size || 4
  }
  
  particle.style = {
    left: `${particle.x}px`,
    top: `${particle.y}px`,
    width: `${particle.size}px`,
    height: `${particle.size}px`,
    backgroundColor: particle.color,
    opacity: 1
  }
  
  particles.value.push(particle)
  
  // Animar partícula
  const animateParticle = () => {
    particle.x += particle.vx
    particle.y += particle.vy
    particle.life -= 16 // ~60fps
    particle.vy += 0.1 // gravidade
    
    particle.style.left = `${particle.x}px`
    particle.style.top = `${particle.y}px`
    particle.style.opacity = particle.life / particle.maxLife
    
    if (particle.life > 0) {
      requestAnimationFrame(animateParticle)
    } else {
      removeParticle(particle.id)
    }
  }
  
  requestAnimationFrame(animateParticle)
}

const removeParticle = (id) => {
  const index = particles.value.findIndex(p => p.id === id)
  if (index > -1) {
    particles.value.splice(index, 1)
  }
}

const createCelebrationParticles = () => {
  if (!props.showParticles) return
  
  const colors = {
    win: ['#FFD700', '#FFA500', '#FF6347'],
    lose: ['#FF6B6B', '#DC143C', '#8B0000'],
    draw: ['#4169E1', '#1E90FF', '#00BFFF']
  }
  
  const colorSet = colors[gameResult.value] || ['#D4AF37']
  
  // Criar partículas de celebração
  for (let i = 0; i < 20; i++) {
    const color = colorSet[Math.floor(Math.random() * colorSet.length)]
    createParticle({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 3 - 1,
      life: 2000 + Math.random() * 1000,
      color: color,
      size: 3 + Math.random() * 5
    })
  }
}

// Inicialização
onMounted(() => {
  if (props.showParticles) {
    setTimeout(() => {
      createCelebrationParticles()
    }, 1000)
  }
})

// Cleanup
onUnmounted(() => {
  particles.value = []
})
</script>

<style scoped>
.fimdejogo-container {
  background: var(--card-gradient);
  border-radius: 25px;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.8),
    0 0 0 3px var(--primary-gold);
  border: 2px solid var(--primary-gold);
  padding: 2rem;
  min-height: 500px;
  max-width: 800px;
  margin: 2rem auto;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--pearl-white);
  animation: endgame-enter 1s ease-out;
  overflow: hidden;
}

@keyframes endgame-enter {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(50px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Efeitos de fundo */
.endgame-background-effects {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1;
  border-radius: 25px;
  overflow: hidden;
}

/* Efeitos de vitória */
.victory-effects {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.victory-burst {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  animation: victory-burst 2s ease-out infinite;
}

@keyframes victory-burst {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(3);
    opacity: 0;
  }
}

.victory-rays {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 300px;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(255, 215, 0, 0.2) 45deg,
    transparent 90deg,
    rgba(255, 215, 0, 0.2) 135deg,
    transparent 180deg,
    rgba(255, 215, 0, 0.2) 225deg,
    transparent 270deg,
    rgba(255, 215, 0, 0.2) 315deg,
    transparent 360deg
  );
  border-radius: 50%;
  animation: victory-rays 3s linear infinite;
}

@keyframes victory-rays {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}

/* Efeitos de derrota */
.defeat-effects {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.defeat-shockwave {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  border: 3px solid rgba(255, 0, 0, 0.5);
  border-radius: 50%;
  animation: defeat-shockwave 1.5s ease-out infinite;
}

@keyframes defeat-shockwave {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(4);
    opacity: 0;
  }
}

/* Efeitos de empate */
.draw-effects {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.draw-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 150px;
  height: 150px;
  background: radial-gradient(circle, rgba(65, 105, 225, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  animation: draw-pulse 2s ease-in-out infinite;
}

@keyframes draw-pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.5;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0.8;
  }
}

/* Título principal */
.endgame-title {
  text-align: center;
  margin-bottom: 2rem;
  z-index: 2;
  position: relative;
  animation: title-enter 1.2s ease-out;
}

@keyframes title-enter {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.title-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: title-icon-bounce 2s ease-in-out infinite;
}

@keyframes title-icon-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.endgame-title h2 {
  font-size: 3rem;
  font-weight: 900;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 3px;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
}

.title-subtitle {
  font-size: 1.2rem;
  margin-top: 0.5rem;
  opacity: 0.9;
}

/* Tipos de resultado */
.result-win .endgame-title h2 {
  color: #FFD700;
  animation: victory-glow 2s ease-in-out infinite alternate;
}

@keyframes victory-glow {
  0% {
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  }
  100% {
    text-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
  }
}

.result-lose .endgame-title h2 {
  color: #FF6B6B;
  animation: defeat-shake 0.5s ease-in-out;
}

@keyframes defeat-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.result-draw .endgame-title h2 {
  color: #4169E1;
  animation: draw-pulse-text 2s ease-in-out infinite;
}

@keyframes draw-pulse-text {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* Estatísticas da partida */
.game-stats {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  z-index: 2;
  position: relative;
  animation: stats-enter 1.5s ease-out;
}

@keyframes stats-enter {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--secondary-gold);
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.8;
}

/* Ranking */
.ranking-container {
  width: 100%;
  margin-bottom: 2rem;
  z-index: 2;
  position: relative;
  animation: ranking-enter 1.8s ease-out;
}

@keyframes ranking-enter {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.ranking-title {
  text-align: center;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--secondary-gold);
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  animation: ranking-item-enter 0.6s ease-out;
  animation-delay: var(--delay);
  animation-fill-mode: both;
}

@keyframes ranking-item-enter {
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.rank-medal {
  font-size: 1.5rem;
  min-width: 2rem;
  text-align: center;
}

.rank-info {
  flex: 1;
}

.rank-name {
  font-weight: 600;
  font-size: 1.1rem;
}

.rank-score {
  font-size: 0.9rem;
  opacity: 0.8;
}

.rank-position {
  font-weight: 700;
  color: var(--secondary-gold);
  font-size: 1.2rem;
}

/* Posições especiais */
.rank-1 {
  border-color: #FFD700;
  background: rgba(255, 215, 0, 0.1);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}

.rank-2 {
  border-color: #C0C0C0;
  background: rgba(192, 192, 192, 0.1);
}

.rank-3 {
  border-color: #CD7F32;
  background: rgba(205, 127, 50, 0.1);
}

/* Cartas dos jogadores */
.players-cards {
  width: 100%;
  margin-bottom: 2rem;
  z-index: 2;
  position: relative;
  animation: cards-enter 2s ease-out;
}

@keyframes cards-enter {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cards-title {
  text-align: center;
  font-size: 1.3rem;
  margin-bottom: 1rem;
  color: var(--secondary-gold);
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.player-card {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  transition: all 0.3s ease;
}

.player-card.winner {
  border-color: #FFD700;
  background: rgba(255, 215, 0, 0.1);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  animation: winner-glow 2s ease-in-out infinite alternate;
}

@keyframes winner-glow {
  0% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  }
  100% {
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
  }
}

.player-name {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--pearl-white);
}

.player-cards-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.final-card {
  background: var(--card-gradient);
  border: 1px solid var(--primary-gold);
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--pearl-white);
}

.player-sum {
  font-weight: 700;
  color: var(--secondary-gold);
  font-size: 1.1rem;
}

/* Ações */
.endgame-actions {
  display: flex;
  gap: 1rem;
  z-index: 2;
  position: relative;
  animation: actions-enter 2.2s ease-out;
}

@keyframes actions-enter {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  border: 2px solid var(--primary-gold);
  border-radius: 12px;
  background: var(--gold-gradient);
  color: var(--japanese-black);
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.action-btn.secondary {
  background: transparent;
  color: var(--pearl-white);
  border-color: rgba(248, 248, 255, 0.3);
}

.action-btn.secondary:hover {
  background: rgba(248, 248, 255, 0.1);
  border-color: var(--pearl-white);
}

.btn-icon {
  font-size: 1.2rem;
}

/* Partículas de celebração */
.celebration-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 3;
}

.celebration-particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 4;
}

/* Responsividade */
@media (max-width: 768px) {
  .fimdejogo-container {
    margin: 1rem;
    padding: 1.5rem;
    max-width: 100%;
  }
  
  .endgame-title h2 {
    font-size: 2rem;
  }
  
  .game-stats {
    flex-direction: column;
    gap: 1rem;
  }
  
  .players-grid {
    grid-template-columns: 1fr;
  }
  
  .endgame-actions {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
    justify-content: center;
  }
}
.resultados-area, .vencedores-area {
  width: 100%;
  margin-bottom: 2rem;
}
h2, h3 {
  color: #eebbc3;
  text-align: center;
}
ul {
  color: #eebbc3;
  list-style: none;
  padding: 0;
  margin: 0;
}
.btn-principal {
  background: #eebbc3;
  color: #232946;
  border: none;
  border-radius: 8px;
  padding: 0.8rem 2rem;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  margin-top: 2rem;
  box-shadow: 0 1px 4px #0003;
  transition: background 0.2s, color 0.2s;
}
.btn-principal:hover {
  background: #ffe082;
  color: #232946;
}
.somas-area {
  width: 100%;
  margin-bottom: 2rem;
  background: #232946;
  border-radius: 10px;
  padding: 1rem 1.5rem;
  box-shadow: 0 1px 8px #0005;
  color: #ffe082;
}
.somas-area ul {
  color: #ffe082;
  font-size: 1.15rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.somas-area li {
  margin-bottom: 0.5rem;
}
.ranking-area {
  width: 100%;
  margin-bottom: 2rem;
  background: #232946;
  border-radius: 10px;
  padding: 1rem 1.5rem;
  box-shadow: 0 1px 8px #0005;
  color: #ffe082;
}
.ranking-area ul {
  color: #ffe082;
  font-size: 1.18rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ranking-area li {
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style> 