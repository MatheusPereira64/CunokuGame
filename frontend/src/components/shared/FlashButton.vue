<template>
  <button 
    :class="buttonClasses"
    :disabled="disabled"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    v-bind="$attrs"
  >
    <div class="button-content-flash">
      <span v-if="icon" class="button-icon-flash">{{ icon }}</span>
      <span v-if="$slots.default" class="button-text-flash">
        <slot />
      </span>
    </div>
    <div class="button-glow-effect"></div>
    <div v-if="showParticles" class="button-particles">
      <div class="particle" v-for="n in 5" :key="n"></div>
    </div>
  </button>
</template>

<script>
export default {
  name: 'FlashButton',
  inheritAttrs: false,
  props: {
    // Variante do botão
    variant: {
      type: String,
      default: 'primary', // 'primary', 'secondary', 'success', 'warning', 'danger', 'info', 'ghost'
      validator: value => ['primary', 'secondary', 'success', 'warning', 'danger', 'info', 'ghost'].includes(value)
    },
    // Tamanho do botão
    size: {
      type: String,
      default: 'normal', // 'small', 'normal', 'large', 'xl'
      validator: value => ['small', 'normal', 'large', 'xl'].includes(value)
    },
    // Estado do botão
    state: {
      type: String,
      default: 'normal', // 'normal', 'loading', 'disabled', 'active'
      validator: value => ['normal', 'loading', 'disabled', 'active'].includes(value)
    },
    // Ícone do botão
    icon: {
      type: String,
      default: ''
    },
    // Mostrar partículas
    showParticles: {
      type: Boolean,
      default: false
    },
    // Efeito de brilho
    glow: {
      type: Boolean,
      default: true
    },
    // Efeito de pulso
    pulse: {
      type: Boolean,
      default: false
    },
    // Efeito de rotação
    rotate: {
      type: Boolean,
      default: false
    },
    // Efeito de escala
    scale: {
      type: Boolean,
      default: true
    },
    // Efeito de brilho personalizado
    customGlow: {
      type: String,
      default: ''
    }
  },
  emits: ['click', 'mouseenter', 'mouseleave'],
  computed: {
    buttonClasses() {
      return [
        'flash-button',
        `button-${this.variant}`,
        `button-${this.size}`,
        `button-${this.state}`,
        {
          'button-glow': this.glow,
          'button-pulse': this.pulse,
          'button-rotate': this.rotate,
          'button-scale': this.scale,
          'button-particles': this.showParticles,
          'flash-hover-scale': this.scale && this.state !== 'disabled',
          'flash-glow-pulse': this.pulse,
          'flash-hover-rotate': this.rotate
        }
      ]
    }
  },
  methods: {
    handleClick(event) {
      if (this.state !== 'disabled' && this.state !== 'loading') {
        this.$emit('click', event)
      }
    },
    handleMouseEnter(event) {
      if (this.state !== 'disabled') {
        this.$emit('mouseenter', event)
      }
    },
    handleMouseLeave(event) {
      if (this.state !== 'disabled') {
        this.$emit('mouseleave', event)
      }
    }
  }
}
</script>

<style scoped>
/* Componente de botão reutilizável */
.flash-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 15px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all var(--flash-fast) var(--flash-bounce);
  overflow: hidden;
  outline: none;
  font-family: inherit;
  text-decoration: none;
  box-shadow: var(--flash-glow-medium);
  background: var(--flash-dark-gradient);
  color: var(--flash-text-light);
  border: 2px solid var(--flash-gold);
}

.flash-button:focus {
  outline: none;
  box-shadow: var(--flash-glow-strong);
}

.flash-button:active {
  transform: translateY(2px) scale(0.98);
}

/* Conteúdo do botão */
.button-content-flash {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  position: relative;
  z-index: 2;
}

.button-icon-flash {
  font-size: 1.2rem;
  text-shadow: 0 0 10px currentColor;
  animation: flash-button-icon-pulse 2s ease-in-out infinite;
}

@keyframes flash-button-icon-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.button-text-flash {
  font-size: 1rem;
  text-shadow: 0 0 5px currentColor;
}

/* Efeito de brilho */
.button-glow-effect {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: left var(--flash-medium);
  pointer-events: none;
}

.flash-button:hover .button-glow-effect {
  left: 100%;
}

/* Partículas do botão */
.button-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 3px;
  height: 3px;
  background: var(--flash-gold);
  border-radius: 50%;
  animation: flash-button-particle 2s ease-in-out infinite;
}

.particle:nth-child(1) {
  top: 20%;
  left: 20%;
  animation-delay: 0s;
}

.particle:nth-child(2) {
  top: 30%;
  right: 20%;
  animation-delay: 0.2s;
}

.particle:nth-child(3) {
  bottom: 30%;
  left: 30%;
  animation-delay: 0.4s;
}

.particle:nth-child(4) {
  bottom: 20%;
  right: 30%;
  animation-delay: 0.6s;
}

.particle:nth-child(5) {
  top: 50%;
  left: 50%;
  animation-delay: 0.8s;
}

@keyframes flash-button-particle {
  0%, 100% {
    transform: scale(0) translate(0, 0);
    opacity: 0;
  }
  50% {
    transform: scale(1) translate(20px, -20px);
    opacity: 1;
  }
}

/* Tamanhos */
.flash-button.button-small {
  padding: 0.6rem 1.2rem;
  font-size: 0.8rem;
  border-radius: 10px;
}

.flash-button.button-small .button-icon-flash {
  font-size: 1rem;
}

.flash-button.button-normal {
  padding: 1rem 2rem;
  font-size: 1rem;
}

.flash-button.button-large {
  padding: 1.3rem 2.5rem;
  font-size: 1.1rem;
  border-radius: 18px;
}

.flash-button.button-large .button-icon-flash {
  font-size: 1.4rem;
}

.flash-button.button-xl {
  padding: 1.6rem 3rem;
  font-size: 1.2rem;
  border-radius: 20px;
}

.flash-button.button-xl .button-icon-flash {
  font-size: 1.6rem;
}

/* Variantes */
.flash-button.button-primary {
  background: var(--flash-gold-gradient);
  border-color: var(--flash-gold);
  color: var(--flash-dark);
  text-shadow: none;
}

.flash-button.button-primary:hover {
  background: var(--flash-gold);
  box-shadow: var(--flash-glow-strong), 0 0 30px var(--flash-gold);
}

.flash-button.button-secondary {
  background: var(--flash-dark-gradient);
  border-color: var(--flash-gold);
  color: var(--flash-gold);
}

.flash-button.button-secondary:hover {
  border-color: var(--flash-neon-blue);
  color: var(--flash-neon-blue);
  box-shadow: var(--flash-glow-strong), 0 0 30px var(--flash-neon-blue);
}

.flash-button.button-success {
  background: var(--flash-green-gradient);
  border-color: var(--flash-neon-green);
  color: var(--flash-dark);
  text-shadow: none;
}

.flash-button.button-success:hover {
  box-shadow: var(--flash-glow-strong), 0 0 30px var(--flash-neon-green);
}

.flash-button.button-warning {
  background: var(--flash-orange-gradient);
  border-color: var(--flash-orange);
  color: var(--flash-dark);
  text-shadow: none;
}

.flash-button.button-warning:hover {
  box-shadow: var(--flash-glow-strong), 0 0 30px var(--flash-orange);
}

.flash-button.button-danger {
  background: var(--flash-red-gradient);
  border-color: var(--flash-red);
  color: var(--flash-text-light);
}

.flash-button.button-danger:hover {
  box-shadow: var(--flash-glow-strong), 0 0 30px var(--flash-red);
}

.flash-button.button-info {
  background: var(--flash-blue-gradient);
  border-color: var(--flash-neon-blue);
  color: var(--flash-dark);
  text-shadow: none;
}

.flash-button.button-info:hover {
  box-shadow: var(--flash-glow-strong), 0 0 30px var(--flash-neon-blue);
}

.flash-button.button-ghost {
  background: transparent;
  border-color: var(--flash-gold);
  color: var(--flash-gold);
}

.flash-button.button-ghost:hover {
  background: rgba(255, 215, 0, 0.1);
  border-color: var(--flash-neon-blue);
  color: var(--flash-neon-blue);
}

/* Estados */
.flash-button.button-loading {
  cursor: wait;
  opacity: 0.8;
}

.flash-button.button-loading .button-icon-flash {
  animation: flash-button-loading 1s linear infinite;
}

@keyframes flash-button-loading {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.flash-button.button-disabled {
  cursor: not-allowed;
  opacity: 0.5;
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 215, 0, 0.3);
  color: rgba(255, 255, 255, 0.5);
}

.flash-button.button-disabled:hover {
  transform: none;
  box-shadow: var(--flash-glow-medium);
}

.flash-button.button-active {
  background: var(--flash-gold);
  color: var(--flash-dark);
  box-shadow: var(--flash-glow-strong);
}

/* Efeitos especiais */
.flash-button.button-pulse {
  animation: flash-button-pulse 2s ease-in-out infinite;
}

@keyframes flash-button-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.flash-button.button-rotate:hover {
  animation: flash-button-rotate 0.5s ease-in-out;
}

@keyframes flash-button-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(5deg); }
}

/* Responsividade */
@media (max-width: 768px) {
  .flash-button.button-normal {
    padding: 0.8rem 1.5rem;
    font-size: 0.9rem;
  }
  
  .flash-button.button-large {
    padding: 1rem 2rem;
    font-size: 1rem;
  }
  
  .flash-button.button-xl {
    padding: 1.2rem 2.5rem;
    font-size: 1.1rem;
  }
}

/* Animações de entrada */
.flash-button {
  animation: flash-button-enter 0.5s ease-out;
}

@keyframes flash-button-enter {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
