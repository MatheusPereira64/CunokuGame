<template>
  <div 
    class="card-display-flash"
    :class="cardClasses"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="card-back-flash" :class="{ 'small': small, 'large': large }">
      <span class="card-symbol">{{ cardSymbol }}</span>
      <div class="card-shine"></div>
      <div v-if="showGlow" class="card-glow-effect"></div>
    </div>
    <span v-if="showNumber" class="card-number-flash">{{ cardNumber }}</span>
    <div v-if="showParticles" class="card-particles">
      <div class="particle" v-for="n in 3" :key="n"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CardDisplay',
  props: {
    // Dados da carta
    card: {
      type: Object,
      required: true
    },
    // Tamanho da carta
    size: {
      type: String,
      default: 'normal', // 'small', 'normal', 'large'
      validator: value => ['small', 'normal', 'large'].includes(value)
    },
    // Mostrar número da carta
    showNumber: {
      type: Boolean,
      default: true
    },
    // Número da carta (se diferente do índice)
    cardNumber: {
      type: Number,
      default: null
    },
    // Mostrar efeito de brilho
    showGlow: {
      type: Boolean,
      default: false
    },
    // Mostrar partículas
    showParticles: {
      type: Boolean,
      default: false
    },
    // Estado da carta
    state: {
      type: String,
      default: 'normal', // 'normal', 'selected', 'disabled', 'hover'
      validator: value => ['normal', 'selected', 'disabled', 'hover'].includes(value)
    },
    // Tipo de carta
    cardType: {
      type: String,
      default: 'back', // 'back', 'front', 'joker', 'king', 'ace'
      validator: value => ['back', 'front', 'joker', 'king', 'ace'].includes(value)
    },
    // Animação de entrada
    enterAnimation: {
      type: String,
      default: 'none', // 'none', 'fade', 'scale', 'slide', 'flip'
      validator: value => ['none', 'fade', 'scale', 'slide', 'flip'].includes(value)
    }
  },
  emits: ['click', 'mouseenter', 'mouseleave'],
  computed: {
    small() {
      return this.size === 'small'
    },
    large() {
      return this.size === 'large'
    },
    cardSymbol() {
      switch (this.cardType) {
        case 'joker':
          return '🃏'
        case 'king':
          return '♔'
        case 'ace':
          return '🂡'
        case 'front':
          return this.getCardSymbol()
        default:
          return '🂠'
      }
    },
    cardClasses() {
      return [
        `card-${this.size}`,
        `card-${this.state}`,
        `card-${this.cardType}`,
        `card-enter-${this.enterAnimation}`,
        {
          'flash-hover-scale': this.state !== 'disabled',
          'flash-glow-pulse': this.showGlow,
          'card-selected': this.state === 'selected',
          'card-disabled': this.state === 'disabled'
        }
      ]
    }
  },
  methods: {
    handleClick(event) {
      if (this.state !== 'disabled') {
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
    },
    getCardSymbol() {
      if (!this.card) return '🂠'
      
      const { valor, naipe } = this.card
      const suitSymbols = {
        'espadas': '♠',
        'copas': '♥',
        'ouros': '♦',
        'paus': '♣'
      }
      
      const valueSymbols = {
        'A': 'A',
        '2': '2',
        '3': '3',
        '4': '4',
        '5': '5',
        '6': '6',
        '7': '7',
        '8': '8',
        '9': '9',
        '10': '10',
        'J': 'J',
        'Q': 'Q',
        'K': 'K'
      }
      
      const suit = suitSymbols[naipe] || '♠'
      const value = valueSymbols[valor] || valor
      
      return `${value}${suit}`
    }
  }
}
</script>

<style scoped>
/* Componente de exibição de carta reutilizável */
.card-display-flash {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  cursor: pointer;
  transition: all var(--flash-fast) var(--flash-bounce);
  z-index: 2;
  padding: 0.5rem;
  border-radius: 15px;
}

.card-display-flash:hover {
  transform: translateY(-12px) scale(1.1);
  background: rgba(255, 215, 0, 0.1);
}

.card-display-flash:active {
  transform: translateY(-6px) scale(0.95);
}

.card-display-flash.card-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.card-display-flash.card-disabled:hover {
  transform: none;
  background: none;
}

.card-display-flash.card-selected {
  background: rgba(255, 215, 0, 0.2);
  border: 2px solid var(--flash-gold);
  box-shadow: var(--flash-glow-medium);
}

/* Tamanhos da carta */
.card-display-flash.card-small {
  gap: 0.5rem;
  padding: 0.3rem;
}

.card-display-flash.card-large {
  gap: 1rem;
  padding: 0.8rem;
}

/* Carta de trás */
.card-back-flash {
  background: var(--flash-card-gradient);
  border: 3px solid var(--flash-gold);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--flash-glow-medium), var(--flash-shadow-medium);
  position: relative;
  overflow: hidden;
  transition: all var(--flash-fast) var(--flash-bounce);
}

.card-back-flash.small {
  width: 50px;
  height: 75px;
}

.card-back-flash:not(.small):not(.large) {
  width: 70px;
  height: 100px;
}

.card-back-flash.large {
  width: 90px;
  height: 130px;
}

/* Símbolo da carta */
.card-symbol {
  font-size: 2.5rem;
  color: var(--flash-gold);
  text-shadow: 0 0 10px var(--flash-gold);
  z-index: 2;
  transition: all var(--flash-fast) var(--flash-bounce);
}

.card-back-flash.small .card-symbol {
  font-size: 1.5rem;
}

.card-back-flash.large .card-symbol {
  font-size: 3.5rem;
}

/* Efeito de brilho */
.card-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), transparent);
  animation: flash-card-shine 3s ease-in-out infinite;
}

@keyframes flash-card-shine {
  0% { left: -100%; }
  50% { left: 100%; }
  100% { left: 100%; }
}

/* Efeito de brilho adicional */
.card-glow-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120%;
  height: 120%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, transparent 70%);
  border-radius: 50%;
  animation: flash-card-glow 2s ease-in-out infinite;
}

@keyframes flash-card-glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

/* Número da carta */
.card-number-flash {
  background: var(--flash-gold);
  color: var(--flash-dark);
  padding: 0.4rem 0.8rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: bold;
  text-shadow: none;
  box-shadow: var(--flash-glow-small);
  transition: all var(--flash-fast) var(--flash-bounce);
}

.card-display-flash.card-small .card-number-flash {
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
}

.card-display-flash.card-large .card-number-flash {
  padding: 0.6rem 1rem;
  font-size: 1.1rem;
}

/* Partículas da carta */
.card-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 3px;
  height: 3px;
  background: var(--flash-gold);
  border-radius: 50%;
  animation: flash-card-particle 2s ease-in-out infinite;
}

.particle:nth-child(1) {
  top: 20%;
  left: 20%;
  animation-delay: 0s;
}

.particle:nth-child(2) {
  top: 60%;
  right: 20%;
  animation-delay: 0.5s;
}

.particle:nth-child(3) {
  bottom: 20%;
  left: 50%;
  animation-delay: 1s;
}

@keyframes flash-card-particle {
  0%, 100% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Animações de entrada */
.card-display-flash.card-enter-fade {
  animation: flash-card-fade-in 0.5s ease-out;
}

.card-display-flash.card-enter-scale {
  animation: flash-card-scale-in 0.5s var(--flash-bounce);
}

.card-display-flash.card-enter-slide {
  animation: flash-card-slide-in 0.5s ease-out;
}

.card-display-flash.card-enter-flip {
  animation: flash-card-flip-in 0.6s ease-out;
}

@keyframes flash-card-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes flash-card-scale-in {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}

@keyframes flash-card-slide-in {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes flash-card-flip-in {
  from {
    transform: rotateY(180deg);
    opacity: 0;
  }
  to {
    transform: rotateY(0deg);
    opacity: 1;
  }
}

/* Estados especiais */
.card-display-flash.card-joker .card-symbol {
  color: var(--flash-neon-pink);
  text-shadow: 0 0 15px var(--flash-neon-pink);
}

.card-display-flash.card-king .card-symbol {
  color: var(--flash-neon-blue);
  text-shadow: 0 0 15px var(--flash-neon-blue);
}

.card-display-flash.card-ace .card-symbol {
  color: var(--flash-neon-green);
  text-shadow: 0 0 15px var(--flash-neon-green);
}

/* Responsividade */
@media (max-width: 768px) {
  .card-back-flash:not(.small):not(.large) {
    width: 60px;
    height: 85px;
  }
  
  .card-symbol {
    font-size: 2rem;
  }
  
  .card-back-flash.small .card-symbol {
    font-size: 1.2rem;
  }
  
  .card-back-flash.large .card-symbol {
    font-size: 3rem;
  }
}
</style>
