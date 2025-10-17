<template>
  <div 
    ref="glowContainer"
    class="glow-effect"
    :class="glowClasses"
    :style="glowStyle"
  >
    <slot />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  color: {
    type: String,
    default: '#D4AF37'
  },
  intensity: {
    type: Number,
    default: 1
  },
  size: {
    type: Number,
    default: 20
  },
  animated: {
    type: Boolean,
    default: true
  },
  pulse: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'box-shadow', // box-shadow, text-shadow, border
    validator: (value) => ['box-shadow', 'text-shadow', 'border'].includes(value)
  }
})

const glowContainer = ref(null)

const glowClasses = computed(() => {
  const classes = []
  
  if (props.animated) {
    classes.push('glow-animated')
  }
  
  if (props.pulse) {
    classes.push('glow-pulse')
  }
  
  return classes
})

const glowStyle = computed(() => {
  const styles = {}
  
  switch (props.type) {
    case 'box-shadow':
      const shadowSize = props.size * props.intensity
      const shadowOpacity = 0.3 * props.intensity
      styles.boxShadow = `
        0 0 ${shadowSize}px ${props.color}${Math.floor(shadowOpacity * 255).toString(16).padStart(2, '0')},
        0 0 ${shadowSize * 2}px ${props.color}${Math.floor(shadowOpacity * 0.5 * 255).toString(16).padStart(2, '0')},
        0 0 ${shadowSize * 3}px ${props.color}${Math.floor(shadowOpacity * 0.3 * 255).toString(16).padStart(2, '0')}
      `
      break
      
    case 'text-shadow':
      const textShadowSize = props.size * props.intensity
      const textShadowOpacity = 0.8 * props.intensity
      styles.textShadow = `
        0 0 ${textShadowSize}px ${props.color}${Math.floor(textShadowOpacity * 255).toString(16).padStart(2, '0')},
        0 0 ${textShadowSize * 2}px ${props.color}${Math.floor(textShadowOpacity * 0.5 * 255).toString(16).padStart(2, '0')}
      `
      break
      
    case 'border':
      styles.border = `2px solid ${props.color}`
      styles.boxShadow = `0 0 ${props.size}px ${props.color}${Math.floor(0.5 * 255).toString(16).padStart(2, '0')}`
      break
  }
  
  return styles
})

// Watch para mudanças nas props
watch([() => props.color, () => props.intensity, () => props.size], () => {
  // Força re-render do estilo
}, { deep: true })
</script>

<style scoped>
.glow-effect {
  position: relative;
  transition: all 0.3s ease;
}

.glow-animated {
  animation: glow-pulse 2s ease-in-out infinite;
}

.glow-pulse {
  animation: glow-pulse 1s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.2);
  }
}

/* Efeitos específicos por tipo */
.glow-effect[data-type="box-shadow"] {
  border-radius: inherit;
}

.glow-effect[data-type="text-shadow"] {
  color: inherit;
}

.glow-effect[data-type="border"] {
  border-radius: inherit;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

/* Hover effects */
.glow-effect:hover {
  transform: scale(1.02);
}

/* Variantes de cor */
.glow-effect.glow-gold {
  --glow-color: #D4AF37;
}

.glow-effect.glow-red {
  --glow-color: #DC143C;
}

.glow-effect.glow-blue {
  --glow-color: #191970;
}

.glow-effect.glow-green {
  --glow-color: #00A86B;
}

.glow-effect.glow-pink {
  --glow-color: #FFB7C5;
}
</style>
