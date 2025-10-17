<template>
  <div 
    class="tooltip-container"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
    @focus="showTooltip"
    @blur="hideTooltip"
  >
    <slot />
    
    <Transition name="tooltip" appear>
      <div 
        v-if="isVisible"
        class="tooltip"
        :class="[
          `tooltip-${position}`,
          `tooltip-${size}`,
          { 'tooltip-flash': flashStyle }
        ]"
        :style="tooltipStyle"
        ref="tooltipRef"
      >
        <div class="tooltip-content">
          <div v-if="title" class="tooltip-title">{{ title }}</div>
          <div v-if="content" class="tooltip-text" v-html="content"></div>
          <div v-if="hint" class="tooltip-hint">{{ hint }}</div>
        </div>
        <div class="tooltip-arrow" :class="`arrow-${position}`"></div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  hint: {
    type: String,
    default: ''
  },
  position: {
    type: String,
    default: 'top',
    validator: (value) => ['top', 'bottom', 'left', 'right'].includes(value)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  delay: {
    type: Number,
    default: 500
  },
  flashStyle: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  offset: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})

const emit = defineEmits(['show', 'hide'])

const isVisible = ref(false)
const tooltipRef = ref(null)
const showTimeout = ref(null)
const hideTimeout = ref(null)

const tooltipStyle = computed(() => {
  if (!isVisible.value) return {}
  
  return {
    '--offset-x': `${props.offset.x}px`,
    '--offset-y': `${props.offset.y}px`
  }
})

const showTooltip = () => {
  if (props.disabled) return
  
  clearTimeout(hideTimeout.value)
  
  showTimeout.value = setTimeout(() => {
    isVisible.value = true
    emit('show')
    
    // Reposicionar após mostrar
    nextTick(() => {
      repositionTooltip()
    })
  }, props.delay)
}

const hideTooltip = () => {
  clearTimeout(showTimeout.value)
  
  hideTimeout.value = setTimeout(() => {
    isVisible.value = false
    emit('hide')
  }, 100)
}

const repositionTooltip = () => {
  if (!tooltipRef.value) return
  
  const tooltip = tooltipRef.value
  const rect = tooltip.getBoundingClientRect()
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  
  // Verificar se tooltip está fora da viewport
  if (rect.right > viewport.width) {
    tooltip.style.left = 'auto'
    tooltip.style.right = '0'
  }
  
  if (rect.bottom > viewport.height) {
    tooltip.style.top = 'auto'
    tooltip.style.bottom = '100%'
  }
}

// Cleanup
onUnmounted(() => {
  clearTimeout(showTimeout.value)
  clearTimeout(hideTimeout.value)
})
</script>

<style scoped>
.tooltip-container {
  position: relative;
  display: inline-block;
}

.tooltip {
  position: absolute;
  z-index: 10000;
  background: var(--card-gradient);
  border: 2px solid var(--primary-gold);
  border-radius: 8px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(212, 175, 55, 0.3);
  color: var(--pearl-white);
  font-size: 0.9rem;
  line-height: 1.4;
  max-width: 300px;
  word-wrap: break-word;
  pointer-events: none;
  transform: translate(var(--offset-x, 0), var(--offset-y, 0));
}

.tooltip-flash {
  animation: tooltip-glow 2s ease-in-out infinite alternate;
}

.tooltip-content {
  padding: 12px 16px;
  position: relative;
}

.tooltip-title {
  font-weight: 700;
  color: var(--secondary-gold);
  margin-bottom: 4px;
  font-size: 1rem;
}

.tooltip-text {
  color: var(--pearl-white);
  margin-bottom: 4px;
}

.tooltip-hint {
  font-size: 0.8rem;
  color: rgba(248, 248, 255, 0.7);
  font-style: italic;
  margin-top: 4px;
}

.tooltip-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border: 6px solid transparent;
}

/* Posições */
.tooltip-top {
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translate(var(--offset-x, 0), var(--offset-y, 0));
  margin-bottom: 8px;
}

.tooltip-top .arrow-top {
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-top-color: var(--primary-gold);
  border-bottom: none;
}

.tooltip-bottom {
  top: 100%;
  left: 50%;
  transform: translateX(-50%) translate(var(--offset-x, 0), var(--offset-y, 0));
  margin-top: 8px;
}

.tooltip-bottom .arrow-bottom {
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-bottom-color: var(--primary-gold);
  border-top: none;
}

.tooltip-left {
  right: 100%;
  top: 50%;
  transform: translateY(-50%) translate(var(--offset-x, 0), var(--offset-y, 0));
  margin-right: 8px;
}

.tooltip-left .arrow-left {
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  border-left-color: var(--primary-gold);
  border-right: none;
}

.tooltip-right {
  left: 100%;
  top: 50%;
  transform: translateY(-50%) translate(var(--offset-x, 0), var(--offset-y, 0));
  margin-left: 8px;
}

.tooltip-right .arrow-right {
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  border-right-color: var(--primary-gold);
  border-left: none;
}

/* Tamanhos */
.tooltip-small {
  max-width: 200px;
  font-size: 0.8rem;
}

.tooltip-small .tooltip-content {
  padding: 8px 12px;
}

.tooltip-medium {
  max-width: 300px;
  font-size: 0.9rem;
}

.tooltip-large {
  max-width: 400px;
  font-size: 1rem;
}

.tooltip-large .tooltip-content {
  padding: 16px 20px;
}

/* Animações */
.tooltip-enter-active {
  animation: tooltip-fade-in 0.3s ease-out;
}

.tooltip-leave-active {
  animation: tooltip-fade-out 0.2s ease-in;
}

@keyframes tooltip-fade-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes tooltip-fade-out {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px) scale(0.9);
  }
}

@keyframes tooltip-glow {
  0% {
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(212, 175, 55, 0.3);
  }
  100% {
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.6),
      0 0 0 2px rgba(212, 175, 55, 0.6),
      0 0 20px rgba(212, 175, 55, 0.3);
  }
}

/* Animações específicas por posição */
.tooltip-top.tooltip-enter-active {
  animation: tooltip-slide-down 0.3s ease-out;
}

.tooltip-bottom.tooltip-enter-active {
  animation: tooltip-slide-up 0.3s ease-out;
}

.tooltip-left.tooltip-enter-active {
  animation: tooltip-slide-right 0.3s ease-out;
}

.tooltip-right.tooltip-enter-active {
  animation: tooltip-slide-left 0.3s ease-out;
}

@keyframes tooltip-slide-down {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes tooltip-slide-up {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes tooltip-slide-right {
  from {
    opacity: 0;
    transform: translateY(-50%) translateX(10px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) translateX(0) scale(1);
  }
}

@keyframes tooltip-slide-left {
  from {
    opacity: 0;
    transform: translateY(-50%) translateX(-10px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) translateX(0) scale(1);
  }
}

/* Responsividade */
@media (max-width: 768px) {
  .tooltip {
    max-width: 250px;
    font-size: 0.8rem;
  }
  
  .tooltip-content {
    padding: 10px 12px;
  }
}
</style>
