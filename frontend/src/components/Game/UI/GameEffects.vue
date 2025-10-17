<template>
  <div class="flash-game-effects">
    <!-- Background particles system -->
    <div v-if="showParticles" class="particles-container">
      <div 
        v-for="particle in particles" 
        :key="particle.id"
        class="particle"
        :style="{
          left: particle.x + '%',
          top: particle.y + '%',
          animationDelay: particle.delay + 's',
          animationDuration: particle.duration + 's'
        }"
      ></div>
    </div>

    <!-- Screen flash effects -->
    <div v-if="showFlash" class="screen-flash" :class="flashType"></div>

    <!-- Confetti for victory -->
    <div v-if="showConfetti" class="confetti-container">
      <div 
        v-for="confetti in confettiPieces" 
        :key="confetti.id"
        class="confetti-piece"
        :style="{
          left: confetti.x + '%',
          backgroundColor: confetti.color,
          animationDelay: confetti.delay + 's',
          animationDuration: confetti.duration + 's'
        }"
      ></div>
    </div>

    <!-- Screen shake effect -->
    <div v-if="screenShake" class="screen-shake" :class="shakeIntensity"></div>

    <!-- Glow effects -->
    <div v-if="showGlow" class="glow-effect" :class="glowType" :style="glowStyle"></div>

    <!-- Victory celebration -->
    <div v-if="showVictory" class="victory-celebration">
      <div class="victory-text flash-text-glow">VITÓRIA!</div>
      <div class="victory-particles">
        <div class="victory-particle" v-for="n in 20" :key="n"></div>
      </div>
    </div>

    <!-- Defeat effect -->
    <div v-if="showDefeat" class="defeat-effect">
      <div class="defeat-text">DERROTA</div>
      <div class="defeat-overlay"></div>
    </div>

    <!-- Draw effect -->
    <div v-if="showDraw" class="draw-effect">
      <div class="draw-text flash-text-glow">EMPATE</div>
      <div class="draw-symbols">
        <div class="draw-symbol">🤝</div>
        <div class="draw-symbol">🤝</div>
        <div class="draw-symbol">🤝</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GameEffects',
  props: {
    showParticles: {
      type: Boolean,
      default: false
    },
    showFlash: {
      type: Boolean,
      default: false
    },
    flashType: {
      type: String,
      default: 'success'
    },
    showConfetti: {
      type: Boolean,
      default: false
    },
    screenShake: {
      type: Boolean,
      default: false
    },
    shakeIntensity: {
      type: String,
      default: 'medium'
    },
    showGlow: {
      type: Boolean,
      default: false
    },
    glowType: {
      type: String,
      default: 'pulse'
    },
    glowStyle: {
      type: Object,
      default: () => ({})
    },
    showVictory: {
      type: Boolean,
      default: false
    },
    showDefeat: {
      type: Boolean,
      default: false
    },
    showDraw: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      particles: [],
      confettiPieces: []
    }
  },
  mounted() {
    this.generateParticles()
    this.generateConfetti()
  },
  methods: {
    generateParticles() {
      this.particles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 3 + Math.random() * 4
      }))
    },
    generateConfetti() {
      const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff']
      this.confettiPieces = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2,
        duration: 3 + Math.random() * 2
      }))
    }
  }
}
</script>

<style scoped>
/* Container principal dos efeitos */
.flash-game-effects {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
  overflow: hidden;
}

/* Sistema de partículas de fundo */
.particles-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: var(--flash-gold);
  border-radius: 50%;
  animation: flash-particle-float linear infinite;
  box-shadow: 0 0 10px var(--flash-gold);
}

@keyframes flash-particle-float {
  0% {
    transform: translateY(100vh) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) rotate(360deg);
    opacity: 0;
  }
}

/* Efeitos de flash na tela */
.screen-flash {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  animation: flash-screen-flash 0.5s ease-out;
}

.screen-flash.success {
  background: radial-gradient(circle, rgba(0, 255, 0, 0.3) 0%, transparent 70%);
}

.screen-flash.error {
  background: radial-gradient(circle, rgba(255, 0, 0, 0.3) 0%, transparent 70%);
}

.screen-flash.warning {
  background: radial-gradient(circle, rgba(255, 255, 0, 0.3) 0%, transparent 70%);
}

@keyframes flash-screen-flash {
  0% { opacity: 0; }
  50% { opacity: 1; }
  100% { opacity: 0; }
}

/* Sistema de confetti */
.confetti-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.confetti-piece {
  position: absolute;
  width: 10px;
  height: 10px;
  animation: flash-confetti-fall linear infinite;
}

@keyframes flash-confetti-fall {
  0% {
    transform: translateY(-100px) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

/* Efeito de tremor de tela */
.screen-shake {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  animation: flash-screen-shake 0.5s ease-in-out;
}

.screen-shake.light {
  animation-duration: 0.3s;
}

.screen-shake.medium {
  animation-duration: 0.5s;
}

.screen-shake.strong {
  animation-duration: 0.8s;
}

@keyframes flash-screen-shake {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-2px, -1px); }
  20% { transform: translate(2px, 1px); }
  30% { transform: translate(-1px, 2px); }
  40% { transform: translate(1px, -2px); }
  50% { transform: translate(-2px, 1px); }
  60% { transform: translate(2px, -1px); }
  70% { transform: translate(-1px, -2px); }
  80% { transform: translate(1px, 2px); }
  90% { transform: translate(-2px, -1px); }
}

/* Efeitos de brilho */
.glow-effect {
  position: absolute;
  border-radius: 50%;
  animation: flash-glow-pulse 2s ease-in-out infinite;
}

.glow-effect.pulse {
  animation: flash-glow-pulse 2s ease-in-out infinite;
}

.glow-effect.rotate {
  animation: flash-glow-rotate 3s linear infinite;
}

.glow-effect.scale {
  animation: flash-glow-scale 1.5s ease-in-out infinite;
}

@keyframes flash-glow-pulse {
  0%, 100% { 
    transform: scale(1);
    opacity: 0.5;
  }
  50% { 
    transform: scale(1.2);
    opacity: 1;
  }
}

@keyframes flash-glow-rotate {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.1); }
  100% { transform: rotate(360deg) scale(1); }
}

@keyframes flash-glow-scale {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}

/* Celebração de vitória */
.victory-celebration {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 1001;
}

.victory-text {
  font-size: 4rem;
  font-weight: bold;
  color: var(--flash-gold);
  text-shadow: 0 0 20px var(--flash-gold);
  animation: flash-victory-text 2s ease-in-out infinite;
  margin-bottom: 2rem;
}

@keyframes flash-victory-text {
  0%, 100% { 
    transform: scale(1);
    text-shadow: 0 0 20px var(--flash-gold);
  }
  50% { 
    transform: scale(1.1);
    text-shadow: 0 0 40px var(--flash-gold), 0 0 60px var(--flash-gold);
  }
}

.victory-particles {
  position: relative;
  width: 200px;
  height: 200px;
  margin: 0 auto;
}

.victory-particle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--flash-gold);
  border-radius: 50%;
  animation: flash-victory-particle 3s ease-in-out infinite;
}

.victory-particle:nth-child(odd) {
  animation-delay: 0.5s;
}

.victory-particle:nth-child(even) {
  animation-delay: 1s;
}

@keyframes flash-victory-particle {
  0% {
    transform: translate(0, 0) scale(0);
    opacity: 1;
  }
  50% {
    transform: translate(50px, -50px) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(100px, -100px) scale(0);
    opacity: 0;
  }
}

/* Efeito de derrota */
.defeat-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 1001;
}

.defeat-text {
  font-size: 3rem;
  font-weight: bold;
  color: var(--flash-red);
  text-shadow: 0 0 20px var(--flash-red);
  animation: flash-defeat-text 1s ease-in-out infinite;
  margin-bottom: 1rem;
}

@keyframes flash-defeat-text {
  0%, 100% { 
    transform: scale(1);
    opacity: 0.8;
  }
  50% { 
    transform: scale(1.05);
    opacity: 1;
  }
}

.defeat-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255, 0, 0, 0.1) 0%, transparent 70%);
  animation: flash-defeat-overlay 2s ease-in-out infinite;
}

@keyframes flash-defeat-overlay {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

/* Efeito de empate */
.draw-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 1001;
}

.draw-text {
  font-size: 3rem;
  font-weight: bold;
  color: var(--flash-gold);
  text-shadow: 0 0 20px var(--flash-gold);
  animation: flash-draw-text 2s ease-in-out infinite;
  margin-bottom: 2rem;
}

@keyframes flash-draw-text {
  0%, 100% { 
    transform: scale(1);
    opacity: 0.8;
  }
  50% { 
    transform: scale(1.05);
    opacity: 1;
  }
}

.draw-symbols {
  display: flex;
  justify-content: center;
  gap: 2rem;
}

.draw-symbol {
  font-size: 3rem;
  animation: flash-draw-symbol 2s ease-in-out infinite;
}

.draw-symbol:nth-child(2) {
  animation-delay: 0.5s;
}

.draw-symbol:nth-child(3) {
  animation-delay: 1s;
}

@keyframes flash-draw-symbol {
  0%, 100% { 
    transform: scale(1) rotate(0deg);
  }
  50% { 
    transform: scale(1.2) rotate(10deg);
  }
}

/* Responsividade */
@media (max-width: 768px) {
  .victory-text {
    font-size: 2.5rem;
  }
  
  .defeat-text,
  .draw-text {
    font-size: 2rem;
  }
  
  .draw-symbol {
    font-size: 2rem;
  }
}
</style>
