<template>
  <div class="progress-indicator" :class="`progress-${type}`" v-if="isVisible">
    <div class="progress-header">
      <div class="progress-icon">{{ getIcon() }}</div>
      <div class="progress-title">{{ title }}</div>
      <div class="progress-value">{{ currentValue }}/{{ maxValue }}</div>
    </div>
    
    <div class="progress-bar-container">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${percentage}%` }"
          :class="{ 'progress-animated': animated }"
        ></div>
        <div v-if="showGlow" class="progress-glow"></div>
      </div>
      <div class="progress-percentage">{{ Math.round(percentage) }}%</div>
    </div>
    
    <div v-if="showParticles && isComplete" class="progress-particles">
      <div 
        v-for="particle in particles" 
        :key="particle.id"
        class="progress-particle"
        :style="particle.style"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: (value) => [
      'xp', 
      'level', 
      'combo', 
      'cards', 
      'time', 
      'health',
      'energy',
      'streak'
    ].includes(value)
  },
  title: {
    type: String,
    required: true
  },
  currentValue: {
    type: Number,
    required: true
  },
  maxValue: {
    type: Number,
    required: true
  },
  animated: {
    type: Boolean,
    default: true
  },
  showGlow: {
    type: Boolean,
    default: true
  },
  showParticles: {
    type: Boolean,
    default: true
  },
  isVisible: {
    type: Boolean,
    default: true
  }
})

// Estado interno
const particles = ref([])
const particleId = ref(0)

// Computed properties
const percentage = computed(() => {
  if (props.maxValue === 0) return 0
  return Math.min((props.currentValue / props.maxValue) * 100, 100)
})

const isComplete = computed(() => {
  return props.currentValue >= props.maxValue
})

const getIcon = () => {
  const icons = {
    xp: '⭐',
    level: '📈',
    combo: '💥',
    cards: '🃏',
    time: '⏱️',
    health: '❤️',
    energy: '⚡',
    streak: '🔥'
  }
  return icons[props.type] || '📊'
}

// Métodos
const createParticles = () => {
  if (!props.showParticles || !isComplete.value) return
  
  const colors = {
    xp: '#FFD700',
    level: '#4169E1',
    combo: '#FF4500',
    cards: '#D4AF37',
    time: '#00FF00',
    health: '#FF0000',
    energy: '#FFFF00',
    streak: '#FF6B6B'
  }
  
  const color = colors[props.type] || '#D4AF37'
  
  // Criar partículas de celebração
  for (let i = 0; i < 10; i++) {
    createParticle({
      x: 50 + Math.random() * 100,
      y: 50 + Math.random() * 50,
      vx: (Math.random() - 0.5) * 6,
      vy: -Math.random() * 4 - 2,
      life: 1500 + Math.random() * 500,
      color: color,
      size: 3 + Math.random() * 4
    })
  }
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
    particle.vy += 0.08 // gravidade
    
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

// Watchers
watch(() => isComplete.value, (newValue) => {
  if (newValue && props.showParticles) {
    setTimeout(() => {
      createParticles()
    }, 200)
  }
})

// Cleanup
onUnmounted(() => {
  particles.value = []
})
</script>

<style scoped>
.progress-indicator {
  background: var(--card-gradient);
  border: 2px solid var(--primary-gold);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
  animation: progress-enter 0.5s ease-out;
}

@keyframes progress-enter {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.progress-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.progress-icon {
  font-size: 1.2rem;
  animation: progress-icon-pulse 2s ease-in-out infinite;
}

@keyframes progress-icon-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.progress-title {
  font-weight: 600;
  color: var(--pearl-white);
  flex: 1;
}

.progress-value {
  font-weight: 700;
  color: var(--secondary-gold);
  font-family: 'Courier New', monospace;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-bar {
  flex: 1;
  height: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--gold-gradient);
  border-radius: 6px;
  transition: width 0.5s ease;
  position: relative;
  z-index: 2;
}

.progress-animated {
  animation: progress-fill-glow 2s ease-in-out infinite alternate;
}

@keyframes progress-fill-glow {
  0% {
    box-shadow: 0 0 5px rgba(212, 175, 55, 0.5);
  }
  100% {
    box-shadow: 0 0 15px rgba(212, 175, 55, 0.8);
  }
}

.progress-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  );
  animation: progress-glow-sweep 2s ease-in-out infinite;
  z-index: 1;
}

@keyframes progress-glow-sweep {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.progress-percentage {
  font-weight: 600;
  color: var(--secondary-gold);
  font-size: 0.9rem;
  min-width: 40px;
  text-align: right;
}

/* Tipos de progresso */
.progress-xp {
  border-color: #FFD700;
}

.progress-xp .progress-fill {
  background: linear-gradient(90deg, #FFD700 0%, #FFA500 100%);
}

.progress-level {
  border-color: #4169E1;
}

.progress-level .progress-fill {
  background: linear-gradient(90deg, #4169E1 0%, #1E40AF 100%);
}

.progress-combo {
  border-color: #FF4500;
}

.progress-combo .progress-fill {
  background: linear-gradient(90deg, #FF4500 0%, #FF6347 100%);
}

.progress-cards {
  border-color: #D4AF37;
}

.progress-cards .progress-fill {
  background: linear-gradient(90deg, #D4AF37 0%, #B8860B 100%);
}

.progress-time {
  border-color: #00FF00;
}

.progress-time .progress-fill {
  background: linear-gradient(90deg, #00FF00 0%, #32CD32 100%);
}

.progress-health {
  border-color: #FF0000;
}

.progress-health .progress-fill {
  background: linear-gradient(90deg, #FF0000 0%, #DC143C 100%);
}

.progress-energy {
  border-color: #FFFF00;
}

.progress-energy .progress-fill {
  background: linear-gradient(90deg, #FFFF00 0%, #FFD700 100%);
}

.progress-streak {
  border-color: #FF6B6B;
}

.progress-streak .progress-fill {
  background: linear-gradient(90deg, #FF6B6B 0%, #FF1493 100%);
}

/* Partículas de progresso */
.progress-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 3;
}

.progress-particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 4;
}

/* Efeitos especiais para progresso completo */
.progress-indicator:has(.progress-fill[style*="width: 100%"]) {
  animation: progress-complete 0.6s ease-in-out;
}

@keyframes progress-complete {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* Responsividade */
@media (max-width: 768px) {
  .progress-indicator {
    padding: 0.75rem;
  }
  
  .progress-header {
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .progress-icon {
    font-size: 1rem;
  }
  
  .progress-title {
    font-size: 0.9rem;
  }
  
  .progress-value {
    font-size: 0.8rem;
  }
  
  .progress-bar {
    height: 10px;
  }
  
  .progress-percentage {
    font-size: 0.8rem;
    min-width: 35px;
  }
}
</style>
