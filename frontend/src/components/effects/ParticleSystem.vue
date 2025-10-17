<template>
  <div ref="container" class="particle-container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useParticles } from '../../composables/useParticles.js'

const props = defineProps({
  autoStart: {
    type: Boolean,
    default: true
  },
  maxParticles: {
    type: Number,
    default: 100
  }
})

const emit = defineEmits(['ready'])

const container = ref(null)
const {
  isInitialized,
  particleState,
  initCanvas,
  start,
  stop,
  clear,
  addParticle,
  explode,
  confetti,
  sparkle,
  smoke,
  rain,
  cleanup
} = useParticles()

// Expor métodos para o componente pai
defineExpose({
  addParticle,
  explode,
  confetti,
  sparkle,
  smoke,
  rain,
  clear,
  start,
  stop
})

onMounted(() => {
  if (container.value) {
    initCanvas(container.value)
    particleState.maxParticles = props.maxParticles
    
    if (props.autoStart) {
      start()
    }
    
    emit('ready')
  }
})

onUnmounted(() => {
  cleanup()
})

// Watch para mudanças no maxParticles
watch(() => props.maxParticles, (newValue) => {
  particleState.maxParticles = newValue
})
</script>

<style scoped>
.particle-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: 1000;
}
</style>
