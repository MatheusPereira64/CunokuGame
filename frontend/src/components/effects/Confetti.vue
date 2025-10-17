<template>
  <div ref="container" class="confetti-container">
    <ParticleSystem 
      ref="particleSystem"
      :auto-start="false"
      :max-particles="200"
      @ready="onParticleSystemReady"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import ParticleSystem from './ParticleSystem.vue'

const props = defineProps({
  duration: {
    type: Number,
    default: 3000
  },
  colors: {
    type: Array,
    default: () => ['#D4AF37', '#FFD700', '#DC143C', '#FFB7C5', '#00A86B', '#191970']
  },
  count: {
    type: Number,
    default: 100
  }
})

const emit = defineEmits(['complete'])

const container = ref(null)
const particleSystem = ref(null)
let isActive = ref(false)
let timeoutId = null

const onParticleSystemReady = () => {
  startConfetti()
}

const startConfetti = () => {
  if (!particleSystem.value || isActive.value) return
  
  isActive.value = true
  
  // Configurar confetti
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  
  // Criar múltiplas explosões de confetti
  const explosions = 5
  for (let i = 0; i < explosions; i++) {
    setTimeout(() => {
      if (particleSystem.value) {
        particleSystem.value.confetti(
          centerX + (Math.random() - 0.5) * 200,
          centerY + (Math.random() - 0.5) * 100,
          {
            count: props.count / explosions,
            colors: props.colors
          }
        )
      }
    }, i * 200)
  }
  
  // Parar após a duração especificada
  timeoutId = setTimeout(() => {
    stopConfetti()
  }, props.duration)
}

const stopConfetti = () => {
  isActive.value = false
  
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  
  if (particleSystem.value) {
    particleSystem.value.clear()
  }
  
  emit('complete')
}

// Métodos públicos
const trigger = () => {
  if (isActive.value) {
    stopConfetti()
  }
  startConfetti()
}

const stop = () => {
  stopConfetti()
}

// Expor métodos
defineExpose({
  trigger,
  stop
})

onMounted(() => {
  // Auto-start se não especificado
  if (props.autoStart !== false) {
    startConfetti()
  }
})

onUnmounted(() => {
  stopConfetti()
})
</script>

<style scoped>
.confetti-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}
</style>
