<template>
  <div class="game-state-indicator" :class="`state-${gameState}`">
    <!-- Indicador de vez do jogador -->
    <div v-if="gameState === 'player-turn'" class="turn-indicator">
      <div class="turn-pulse"></div>
      <div class="turn-text">
        <span class="turn-label">Sua Vez!</span>
        <span class="turn-timer" v-if="timeLeft > 0">{{ formatTime(timeLeft) }}</span>
      </div>
    </div>
    
    <!-- Indicador de vez do oponente -->
    <div v-if="gameState === 'opponent-turn'" class="opponent-turn-indicator">
      <div class="opponent-pulse"></div>
      <div class="opponent-text">
        <span class="opponent-label">{{ opponentName }} está jogando...</span>
        <div class="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
    
    <!-- Indicador de espera -->
    <div v-if="gameState === 'waiting'" class="waiting-indicator">
      <div class="waiting-spinner"></div>
      <div class="waiting-text">
        <span class="waiting-label">{{ waitingMessage }}</span>
      </div>
    </div>
    
    <!-- Indicador de erro -->
    <div v-if="gameState === 'error'" class="error-indicator">
      <div class="error-icon">⚠️</div>
      <div class="error-text">
        <span class="error-label">{{ errorMessage }}</span>
      </div>
    </div>
    
    <!-- Indicador de sucesso -->
    <div v-if="gameState === 'success'" class="success-indicator">
      <div class="success-icon">✅</div>
      <div class="success-text">
        <span class="success-label">{{ successMessage }}</span>
      </div>
    </div>
    
    <!-- Indicador de validação -->
    <div v-if="gameState === 'validating'" class="validating-indicator">
      <div class="validating-spinner"></div>
      <div class="validating-text">
        <span class="validating-label">Validando jogada...</span>
      </div>
    </div>
    
    <!-- Efeitos de partículas -->
    <div v-if="showParticles" class="state-particles">
      <div 
        v-for="particle in particles" 
        :key="particle.id"
        class="state-particle"
        :style="particle.style"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  gameState: {
    type: String,
    required: true,
    validator: (value) => [
      'player-turn', 
      'opponent-turn', 
      'waiting', 
      'error', 
      'success', 
      'validating'
    ].includes(value)
  },
  opponentName: {
    type: String,
    default: 'Oponente'
  },
  waitingMessage: {
    type: String,
    default: 'Aguardando...'
  },
  errorMessage: {
    type: String,
    default: 'Erro!'
  },
  successMessage: {
    type: String,
    default: 'Sucesso!'
  },
  timeLeft: {
    type: Number,
    default: 0
  },
  showParticles: {
    type: Boolean,
    default: true
  }
})

// Estado interno
const particles = ref([])
const particleId = ref(0)

// Computed properties
const isActive = computed(() => {
  return props.gameState !== 'idle'
})

// Métodos
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
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
    particle.vy += 0.05 // gravidade leve
    
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

const createStateParticles = () => {
  if (!props.showParticles) return
  
  const colors = {
    'player-turn': '#00FF00',
    'opponent-turn': '#FF6B6B',
    'waiting': '#FFD700',
    'error': '#FF0000',
    'success': '#00FF00',
    'validating': '#4169E1'
  }
  
  const color = colors[props.gameState] || '#D4AF37'
  
  // Criar partículas baseadas no estado
  for (let i = 0; i < 5; i++) {
    createParticle({
      x: 50 + Math.random() * 100,
      y: 50 + Math.random() * 50,
      vx: (Math.random() - 0.5) * 2,
      vy: -Math.random() * 2,
      life: 800 + Math.random() * 400,
      color: color,
      size: 2 + Math.random() * 3
    })
  }
}

// Watchers
watch(() => props.gameState, (newState) => {
  if (newState && props.showParticles) {
    setTimeout(() => {
      createStateParticles()
    }, 100)
  }
})

// Cleanup
onUnmounted(() => {
  particles.value = []
})
</script>

<style scoped>
.game-state-indicator {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  pointer-events: none;
  animation: state-enter 0.5s ease-out;
}

@keyframes state-enter {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* Indicador de vez do jogador */
.turn-indicator {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, #00FF00 0%, #00CC00 100%);
  color: white;
  padding: 1rem 2rem;
  border-radius: 50px;
  box-shadow: 
    0 8px 32px rgba(0, 255, 0, 0.4),
    0 0 0 2px rgba(0, 255, 0, 0.6);
  animation: turn-glow 2s ease-in-out infinite alternate;
}

.turn-pulse {
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  animation: turn-pulse 1s ease-in-out infinite;
}

@keyframes turn-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.7;
  }
}

@keyframes turn-glow {
  0% {
    box-shadow: 
      0 8px 32px rgba(0, 255, 0, 0.4),
      0 0 0 2px rgba(0, 255, 0, 0.6);
  }
  100% {
    box-shadow: 
      0 8px 32px rgba(0, 255, 0, 0.6),
      0 0 0 3px rgba(0, 255, 0, 0.8);
  }
}

.turn-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.turn-label {
  font-weight: 700;
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.turn-timer {
  font-size: 0.9rem;
  opacity: 0.9;
  font-family: 'Courier New', monospace;
}

/* Indicador de vez do oponente */
.opponent-turn-indicator {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, #FF6B6B 0%, #FF4444 100%);
  color: white;
  padding: 1rem 2rem;
  border-radius: 50px;
  box-shadow: 
    0 8px 32px rgba(255, 107, 107, 0.4),
    0 0 0 2px rgba(255, 107, 107, 0.6);
}

.opponent-pulse {
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  animation: opponent-pulse 1.5s ease-in-out infinite;
}

@keyframes opponent-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

.opponent-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.opponent-label {
  font-weight: 600;
  font-size: 1rem;
}

.loading-dots {
  display: flex;
  gap: 0.25rem;
}

.loading-dots span {
  width: 6px;
  height: 6px;
  background: white;
  border-radius: 50%;
  animation: loading-dot 1.4s ease-in-out infinite both;
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }
.loading-dots span:nth-child(3) { animation-delay: 0s; }

@keyframes loading-dot {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Indicador de espera */
.waiting-indicator {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #1a1a1a;
  padding: 1rem 2rem;
  border-radius: 50px;
  box-shadow: 
    0 8px 32px rgba(255, 215, 0, 0.4),
    0 0 0 2px rgba(255, 215, 0, 0.6);
}

.waiting-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(26, 26, 26, 0.3);
  border-top: 3px solid #1a1a1a;
  border-radius: 50%;
  animation: waiting-spin 1s linear infinite;
}

@keyframes waiting-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.waiting-text {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.waiting-label {
  font-weight: 600;
  font-size: 1rem;
}

/* Indicador de erro */
.error-indicator {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, #FF0000 0%, #CC0000 100%);
  color: white;
  padding: 1rem 2rem;
  border-radius: 50px;
  box-shadow: 
    0 8px 32px rgba(255, 0, 0, 0.4),
    0 0 0 2px rgba(255, 0, 0, 0.6);
  animation: error-shake 0.5s ease-in-out;
}

@keyframes error-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.error-icon {
  font-size: 1.5rem;
  animation: error-bounce 0.6s ease-in-out;
}

@keyframes error-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.error-text {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.error-label {
  font-weight: 600;
  font-size: 1rem;
}

/* Indicador de sucesso */
.success-indicator {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, #00FF00 0%, #00CC00 100%);
  color: white;
  padding: 1rem 2rem;
  border-radius: 50px;
  box-shadow: 
    0 8px 32px rgba(0, 255, 0, 0.4),
    0 0 0 2px rgba(0, 255, 0, 0.6);
  animation: success-bounce 0.6s ease-in-out;
}

@keyframes success-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.success-icon {
  font-size: 1.5rem;
  animation: success-check 0.6s ease-in-out;
}

@keyframes success-check {
  0% { transform: scale(0) rotate(0deg); }
  50% { transform: scale(1.2) rotate(180deg); }
  100% { transform: scale(1) rotate(360deg); }
}

.success-text {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.success-label {
  font-weight: 600;
  font-size: 1rem;
}

/* Indicador de validação */
.validating-indicator {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, #4169E1 0%, #1E40AF 100%);
  color: white;
  padding: 1rem 2rem;
  border-radius: 50px;
  box-shadow: 
    0 8px 32px rgba(65, 105, 225, 0.4),
    0 0 0 2px rgba(65, 105, 225, 0.6);
}

.validating-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: validating-spin 1s linear infinite;
}

@keyframes validating-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.validating-text {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.validating-label {
  font-weight: 600;
  font-size: 1rem;
}

/* Partículas de estado */
.state-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.state-particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 2;
}

/* Responsividade */
@media (max-width: 768px) {
  .game-state-indicator {
    top: 10px;
    left: 10px;
    right: 10px;
    transform: none;
  }
  
  .turn-indicator,
  .opponent-turn-indicator,
  .waiting-indicator,
  .error-indicator,
  .success-indicator,
  .validating-indicator {
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
  }
}
</style>
