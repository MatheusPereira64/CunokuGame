<template>
  <div 
    ref="shakeContainer" 
    class="screen-shake-container"
    :style="shakeStyle"
  >
    <slot />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  intensity: {
    type: Number,
    default: 10
  },
  duration: {
    type: Number,
    default: 500
  },
  frequency: {
    type: Number,
    default: 50
  }
})

const emit = defineEmits(['complete'])

const shakeContainer = ref(null)
const isShaking = ref(false)
const shakeStyle = reactive({
  transform: 'translateX(0px) translateY(0px)',
  transition: 'none'
})

let shakeInterval = null
let shakeTimeout = null

const startShake = (customIntensity = null, customDuration = null) => {
  if (isShaking.value) return
  
  const intensity = customIntensity || props.intensity
  const duration = customDuration || props.duration
  
  isShaking.value = true
  
  // Remover transição durante o shake
  shakeStyle.transition = 'none'
  
  // Função para gerar movimento aleatório
  const shake = () => {
    if (!isShaking.value) return
    
    const x = (Math.random() - 0.5) * intensity * 2
    const y = (Math.random() - 0.5) * intensity * 2
    
    shakeStyle.transform = `translateX(${x}px) translateY(${y}px)`
  }
  
  // Iniciar shake
  shakeInterval = setInterval(shake, 1000 / props.frequency)
  
  // Parar após a duração
  shakeTimeout = setTimeout(() => {
    stopShake()
  }, duration)
}

const stopShake = () => {
  if (!isShaking.value) return
  
  isShaking.value = false
  
  // Limpar intervalos
  if (shakeInterval) {
    clearInterval(shakeInterval)
    shakeInterval = null
  }
  
  if (shakeTimeout) {
    clearTimeout(shakeTimeout)
    shakeTimeout = null
  }
  
  // Retornar à posição original com transição suave
  shakeStyle.transition = 'transform 0.3s ease-out'
  shakeStyle.transform = 'translateX(0px) translateY(0px)'
  
  // Emitir evento após a transição
  setTimeout(() => {
    emit('complete')
  }, 300)
}

// Métodos públicos
const trigger = (intensity = null, duration = null) => {
  startShake(intensity, duration)
}

const stop = () => {
  stopShake()
}

// Expor métodos
defineExpose({
  trigger,
  stop
})

onUnmounted(() => {
  stopShake()
})
</script>

<style scoped>
.screen-shake-container {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
