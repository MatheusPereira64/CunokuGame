<template>
  <div 
    class="carta-container"
    :class="[
      `carta-${cardType}`,
      { 
        'carta-hoverable': hoverable,
        'carta-clickable': clickable,
        'carta-selected': selected,
        'carta-disabled': disabled,
        'carta-flipping': isFlipping,
        'carta-glow': showGlow,
        'carta-pulse': showPulse
      }
    ]"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="carta-inner" :class="{ 'carta-flipped': isFlipped }">
      <!-- Frente da carta -->
      <div class="carta-face carta-front">
        <svg :width="width" :height="height" viewBox="0 0 80 120" class="carta-svg">
          <!-- Fundo da carta -->
          <rect x="2" y="2" width="76" height="116" rx="10" :fill="corFundo" stroke="#222" stroke-width="3" />
          <!-- Valor e naipe -->
          <text x="12" y="28" font-size="22" font-weight="bold" :fill="corValor">{{ valor }}</text>
          <text v-if="naipe" x="12" y="48" font-size="20" :fill="corNaipe">{{ simboloNaipe }}</text>
          <!-- Valor e naipe invertido -->
          <text x="68" y="112" font-size="22" font-weight="bold" :fill="corValor" text-anchor="end" transform="rotate(180 68 112)">{{ valor }}</text>
          <text v-if="naipe" x="68" y="92" font-size="20" :fill="corNaipe" text-anchor="end" transform="rotate(180 68 92)">{{ simboloNaipe }}</text>
          <!-- Coringa -->
          <g v-if="!naipe && valor === 'C'">
            <circle cx="40" cy="60" r="18" fill="#f6c177" stroke="#d7263d" stroke-width="3" />
            <text x="40" y="68" font-size="22" font-weight="bold" fill="#d7263d" text-anchor="middle">🃏</text>
          </g>
        </svg>
      </div>
      
      <!-- Verso da carta -->
      <div class="carta-face carta-back">
        <svg :width="width" :height="height" viewBox="0 0 80 120" class="carta-svg">
          <rect x="2" y="2" width="76" height="116" rx="10" fill="#1a1a2e" stroke="#D4AF37" stroke-width="3" />
          <g transform="translate(40, 60)">
            <circle cx="0" cy="0" r="25" fill="none" stroke="#D4AF37" stroke-width="2" />
            <circle cx="0" cy="0" r="15" fill="none" stroke="#D4AF37" stroke-width="1" />
            <text x="0" y="5" font-size="16" font-weight="bold" fill="#D4AF37" text-anchor="middle">CUNOKU</text>
          </g>
        </svg>
      </div>
    </div>
    
    <!-- Efeitos de partículas -->
    <div v-if="showParticles" class="carta-particles">
      <div 
        v-for="particle in particles" 
        :key="particle.id"
        class="carta-particle"
        :style="particle.style"
      ></div>
    </div>
    
    <!-- Efeito de glow -->
    <div v-if="showGlow" class="carta-glow-effect"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  valor: { type: String, required: true }, // A, 5, 6, 7, 8, 9, 10, J, Q, K, C
  naipe: { type: String, default: null }, // S, H, D, C ou null
  width: { type: [Number, String], default: 80 },
  height: { type: [Number, String], default: 120 },
  hoverable: { type: Boolean, default: true },
  clickable: { type: Boolean, default: true },
  selected: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  showGlow: { type: Boolean, default: false },
  showPulse: { type: Boolean, default: false },
  showParticles: { type: Boolean, default: false }
})

const emit = defineEmits(['click', 'mouseenter', 'mouseleave'])

// Estado interno
const isFlipped = ref(false)
const isFlipping = ref(false)
const particles = ref([])
const particleId = ref(0)

// Computed properties
const cardType = computed(() => {
  if (!props.naipe && props.valor === 'C') return 'joker'
  if (props.valor === 'K') return 'king'
  if (props.valor === 'A') return 'ace'
  return 'normal'
})

const corFundo = computed(() => {
  if (!props.naipe && props.valor === 'C') return '#fffbe6'
  return '#fff'
})

const corValor = computed(() => {
  if (props.naipe === 'H' || props.naipe === 'D') return '#d7263d'
  if (!props.naipe && props.valor === 'C') return '#d7263d'
  return '#232946'
})

const corNaipe = computed(() => {
  if (props.naipe === 'H' || props.naipe === 'D') return '#d7263d'
  if (props.naipe === 'S' || props.naipe === 'C') return '#232946'
  return '#232946'
})

const simboloNaipe = computed(() => {
  switch (props.naipe) {
    case 'S': return '♠'
    case 'H': return '♥'
    case 'D': return '♦'
    case 'C': return '♣'
    default: return ''
  }
})

// Métodos
const handleClick = () => {
  if (props.disabled || !props.clickable) return
  
  emit('click', { valor: props.valor, naipe: props.naipe })
  
  // Efeito de click
  createClickEffect()
}

const handleMouseEnter = () => {
  if (props.disabled) return
  
  emit('mouseenter', { valor: props.valor, naipe: props.naipe })
  
  // Efeito de hover
  if (props.showParticles) {
    createHoverParticles()
  }
}

const handleMouseLeave = () => {
  if (props.disabled) return
  
  emit('mouseleave', { valor: props.valor, naipe: props.naipe })
}

const flipCard = (duration = 600) => {
  if (isFlipping.value) return
  
  isFlipping.value = true
  isFlipped.value = !isFlipped.value
  
  setTimeout(() => {
    isFlipping.value = false
  }, duration)
}

const createClickEffect = () => {
  // Efeito de partículas no click
  if (props.showParticles) {
    for (let i = 0; i < 8; i++) {
      createParticle({
        x: 40,
        y: 60,
        angle: (i / 8) * Math.PI * 2,
        speed: 2 + Math.random() * 2,
        life: 1000,
        color: cardType.value === 'joker' ? '#d7263d' : '#D4AF37'
      })
    }
  }
}

const createHoverParticles = () => {
  // Partículas suaves no hover
  for (let i = 0; i < 3; i++) {
    createParticle({
      x: 20 + Math.random() * 40,
      y: 20 + Math.random() * 80,
      angle: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 0.5,
      life: 500,
      color: cardType.value === 'joker' ? '#d7263d' : '#D4AF37'
    })
  }
}

const createParticle = (config) => {
  const particle = {
    id: particleId.value++,
    x: config.x,
    y: config.y,
    vx: Math.cos(config.angle) * config.speed,
    vy: Math.sin(config.angle) * config.speed,
    life: config.life,
    maxLife: config.life,
    color: config.color,
    size: 2 + Math.random() * 3
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

// Expor métodos para uso externo
defineExpose({
  flipCard,
  createClickEffect,
  createHoverParticles
})
</script>

<style scoped>
.carta-container {
  position: relative;
  display: inline-block;
  perspective: 1000px;
  margin: 0 2px;
}

.carta-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.carta-flipped {
  transform: rotateY(180deg);
}

.carta-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 10px;
}

.carta-back {
  transform: rotateY(180deg);
}

.carta-svg {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  background: #fff;
  transition: all 0.3s ease;
}

/* Estados da carta */
.carta-hoverable:hover .carta-svg {
  transform: translateY(-5px) scale(1.05);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
}

.carta-clickable {
  cursor: pointer;
}

.carta-clickable:active .carta-svg {
  transform: scale(0.95);
}

.carta-selected .carta-svg {
  border: 3px solid var(--primary-gold);
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.6);
}

.carta-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.carta-disabled:hover .carta-svg {
  transform: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Animações de flip */
.carta-flipping .carta-inner {
  animation: carta-flip 0.6s ease-in-out;
}

@keyframes carta-flip {
  0% { transform: rotateY(0deg); }
  50% { transform: rotateY(90deg); }
  100% { transform: rotateY(180deg); }
}

/* Efeitos especiais */
.carta-glow .carta-svg {
  animation: carta-glow 2s ease-in-out infinite alternate;
}

@keyframes carta-glow {
  0% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  100% {
    box-shadow: 
      0 2px 8px rgba(0, 0, 0, 0.3),
      0 0 20px rgba(212, 175, 55, 0.6);
  }
}

.carta-pulse .carta-svg {
  animation: carta-pulse 1s ease-in-out infinite;
}

@keyframes carta-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* Tipos de carta */
.carta-joker .carta-svg {
  background: linear-gradient(135deg, #fffbe6 0%, #fff8dc 100%);
  border: 2px solid #d7263d;
}

.carta-king .carta-svg {
  background: linear-gradient(135deg, #fff 0%, #f8f8ff 100%);
  border: 2px solid var(--primary-gold);
}

.carta-ace .carta-svg {
  background: linear-gradient(135deg, #fff 0%, #f0f8ff 100%);
  border: 2px solid #4169e1;
}

/* Efeitos de partículas */
.carta-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.carta-particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 11;
}

/* Efeito de glow */
.carta-glow-effect {
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  background: radial-gradient(
    circle,
    rgba(212, 175, 55, 0.3) 0%,
    transparent 70%
  );
  border-radius: 15px;
  pointer-events: none;
  z-index: 1;
  animation: glow-pulse 2s ease-in-out infinite alternate;
}

@keyframes glow-pulse {
  0% {
    opacity: 0.5;
    transform: scale(1);
  }
  100% {
    opacity: 1;
    transform: scale(1.1);
  }
}

/* Animações de entrada */
.carta-container {
  animation: carta-enter 0.5s ease-out;
}

@keyframes carta-enter {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Animações de descarte */
.carta-descartando {
  animation: carta-descarte 0.8s ease-in forwards;
}

@keyframes carta-descarte {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
    opacity: 0.8;
  }
  100% {
    transform: translateY(100px) rotate(360deg);
    opacity: 0;
  }
}

/* Responsividade */
@media (max-width: 768px) {
  .carta-container {
    margin: 0 1px;
  }
  
  .carta-hoverable:hover .carta-svg {
    transform: translateY(-3px) scale(1.03);
  }
}

/* Melhorias de performance */
.carta-container {
  will-change: transform;
}

.carta-svg {
  will-change: transform, box-shadow;
}

.carta-particle {
  will-change: transform, opacity;
}
</style> 