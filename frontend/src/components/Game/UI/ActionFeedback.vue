<template>
  <div class="action-feedback" :class="`feedback-${type}`" v-if="isVisible">
    <div class="feedback-content">
      <div class="feedback-icon">{{ getIcon() }}</div>
      <div class="feedback-text">
        <div class="feedback-title">{{ title }}</div>
        <div v-if="message" class="feedback-message">{{ message }}</div>
      </div>
    </div>
    
    <!-- Efeitos visuais -->
    <div v-if="showEffects" class="feedback-effects">
      <div class="feedback-particles">
        <div 
          v-for="particle in particles" 
          :key="particle.id"
          class="feedback-particle"
          :style="particle.style"
        ></div>
      </div>
      
      <div v-if="type === 'success'" class="success-burst"></div>
      <div v-if="type === 'error'" class="error-shockwave"></div>
      <div v-if="type === 'warning'" class="warning-pulse"></div>
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
      'success', 
      'error', 
      'warning', 
      'info', 
      'card-played',
      'card-invalid',
      'ability-used',
      'combo'
    ].includes(value)
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    default: 3000
  },
  showEffects: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close'])

// Estado interno
const isVisible = ref(false)
const particles = ref([])
const particleId = ref(0)

// Computed properties
const getIcon = () => {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    'card-played': '🃏',
    'card-invalid': '🚫',
    'ability-used': '✨',
    combo: '💥'
  }
  return icons[props.type] || 'ℹ️'
}

// Métodos
const show = () => {
  isVisible.value = true
  
  if (props.showEffects) {
    createParticles()
  }
  
  // Auto-hide após duração
  setTimeout(() => {
    hide()
  }, props.duration)
}

const hide = () => {
  isVisible.value = false
  emit('close')
}

const createParticles = () => {
  const colors = {
    success: '#00FF00',
    error: '#FF0000',
    warning: '#FFD700',
    info: '#4169E1',
    'card-played': '#D4AF37',
    'card-invalid': '#FF6B6B',
    'ability-used': '#FF69B4',
    combo: '#FF4500'
  }
  
  const color = colors[props.type] || '#D4AF37'
  
  // Criar partículas baseadas no tipo
  const particleCount = props.type === 'combo' ? 15 : 8
  
  for (let i = 0; i < particleCount; i++) {
    createParticle({
      x: 50 + Math.random() * 100,
      y: 50 + Math.random() * 50,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 3 - 1,
      life: 1000 + Math.random() * 500,
      color: color,
      size: 2 + Math.random() * 4
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

// Expor métodos
defineExpose({
  show,
  hide
})

// Auto-show quando montado
onMounted(() => {
  show()
})

// Cleanup
onUnmounted(() => {
  particles.value = []
})
</script>

<style scoped>
.action-feedback {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1500;
  pointer-events: none;
  animation: feedback-enter 0.5s ease-out;
}

@keyframes feedback-enter {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.feedback-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--card-gradient);
  border: 2px solid var(--primary-gold);
  border-radius: 15px;
  padding: 1rem 1.5rem;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(212, 175, 55, 0.3);
  position: relative;
  z-index: 2;
}

.feedback-icon {
  font-size: 2rem;
  animation: feedback-icon-bounce 0.6s ease-in-out;
}

@keyframes feedback-icon-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.feedback-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.feedback-title {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--pearl-white);
}

.feedback-message {
  font-size: 0.9rem;
  color: rgba(248, 248, 255, 0.8);
}

/* Tipos de feedback */
.feedback-success {
  border-color: #00FF00;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(0, 255, 0, 0.6);
}

.feedback-error {
  border-color: #FF0000;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 0, 0, 0.6);
  animation: feedback-error-shake 0.5s ease-in-out;
}

@keyframes feedback-error-shake {
  0%, 100% { transform: translate(-50%, -50%); }
  25% { transform: translate(-52%, -50%); }
  75% { transform: translate(-48%, -50%); }
}

.feedback-warning {
  border-color: #FFD700;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 215, 0, 0.6);
}

.feedback-info {
  border-color: #4169E1;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(65, 105, 225, 0.6);
}

.feedback-card-played {
  border-color: #D4AF37;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(212, 175, 55, 0.6);
}

.feedback-card-invalid {
  border-color: #FF6B6B;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 107, 107, 0.6);
}

.feedback-ability-used {
  border-color: #FF69B4;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 105, 180, 0.6);
}

.feedback-combo {
  border-color: #FF4500;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 69, 0, 0.6);
  animation: feedback-combo-pulse 0.8s ease-in-out;
}

@keyframes feedback-combo-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.1); }
}

/* Efeitos visuais */
.feedback-effects {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.feedback-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.feedback-particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 3;
}

/* Efeitos específicos */
.success-burst {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(0, 255, 0, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  animation: success-burst 0.6s ease-out;
}

@keyframes success-burst {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

.error-shockwave {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  border: 2px solid #FF0000;
  border-radius: 50%;
  animation: error-shockwave 0.8s ease-out;
}

@keyframes error-shockwave {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(3);
    opacity: 0;
  }
}

.warning-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, transparent 70%);
  border-radius: 50%;
  animation: warning-pulse 1s ease-in-out infinite;
}

@keyframes warning-pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.8;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0.4;
  }
}

/* Responsividade */
@media (max-width: 768px) {
  .action-feedback {
    top: 60%;
    left: 10px;
    right: 10px;
    transform: none;
  }
  
  .feedback-content {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
  
  .feedback-icon {
    font-size: 1.5rem;
  }
}
</style>
