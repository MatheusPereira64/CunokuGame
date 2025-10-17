<template>
  <div class="flash-action-area">
    <!-- Efeitos de fundo -->
    <div class="action-background-effects">
      <div class="action-particles"></div>
      <div class="action-glow"></div>
    </div>
    
    <div v-if="isCurrentPlayerTurn" class="current-player-actions">
      <!-- Botão principal de comprar carta -->
      <div v-if="!choosingAction && !pendingAction" class="main-action">
        <button class="flash-action-btn primary flash-glow-pulse" @click="$emit('draw-card')">
          <span class="action-icon">🃏</span>
          <span class="action-text">Comprar Carta</span>
          <div class="action-shine"></div>
        </button>
      </div>
      
      <!-- Painel de ações após comprar carta -->
      <div v-if="choosingAction && drawnCard" class="card-action-panel flash-card">
        <div class="panel-header">
          <h4 class="flash-modal-title">🎯 Carta Comprada</h4>
          <div class="card-glow-effect"></div>
        </div>
        
        <div class="bought-card-display">
          <div class="card-container">
            <CartaSvg 
              :valor="mapValorSvg(drawnCard.nome)" 
              :naipe="mapNaipeSvg(drawnCard.naipe)" 
              :width="100" 
              :height="140"
              class="drawn-card-flash"
            />
            <div class="card-particles"></div>
          </div>
        </div>
        
        <div class="action-buttons">
          <button class="flash-action-btn secondary" @click="$emit('toggle-substitute')" 
                  :disabled="substituteIndex !== null">
            <span class="action-icon">🔄</span>
            <span class="action-text">Substituir</span>
          </button>
          <button class="flash-action-btn danger" @click="$emit('discard-drawn-card')">
            <span class="action-icon">🗑️</span>
            <span class="action-text">Descartar</span>
          </button>
          <button class="flash-action-btn success flash-glow-pulse" @click="$emit('use-ability')">
            <span class="action-icon">✨</span>
            <span class="action-text">Habilidade</span>
          </button>
        </div>
        
        <!-- Interface de substituição -->
        <div v-if="substituteIndex !== null" class="substitute-interface flash-card">
          <div class="substitute-header">
            <h5 class="flash-text-glow">Selecione a carta para substituir:</h5>
          </div>
          <div class="hand-selection">
            <button v-for="(carta, idx) in playerHand" 
                    :key="`sub-${idx}`" 
                    class="hand-card-flash flash-hover-scale" 
                    @click="$emit('substitute-card', idx)">
              <div class="card-back-flash">
                <span class="card-symbol">🂠</span>
                <div class="card-shine"></div>
              </div>
              <span class="card-number-flash">{{ idx + 1 }}</span>
            </button>
          </div>
          <button class="flash-action-btn cancel" @click="$emit('cancel-substitute')">
            <span class="action-icon">❌</span>
            <span class="action-text">Cancelar</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Estado de espera -->
    <div v-else class="waiting-turn flash-card">
      <div class="waiting-content">
        <div class="waiting-icon flash-glow-pulse">⏳</div>
        <p class="waiting-text flash-text-glow">Aguarde sua vez...</p>
        <div class="current-player-indicator">
          <span class="player-label">Vez de:</span>
          <span class="player-name flash-text-glow">{{ currentPlayerName }}</span>
        </div>
        <div class="waiting-animation">
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Botão de fim de jogo -->
    <div v-if="canDeclareEndGame" class="endgame-section">
      <button class="flash-action-btn endgame flash-glow-pulse" @click="$emit('declare-end-game')">
        <span class="action-icon">🏁</span>
        <span class="action-text">Declarar Fim de Jogo</span>
      </button>
    </div>
  </div>
</template>

<script>
import CartaSvg from '../../CartaSvg.vue'

export default {
  name: 'ActionArea',
  components: { CartaSvg },
  props: {
    isCurrentPlayerTurn: {
      type: Boolean,
      default: false
    },
    choosingAction: {
      type: Boolean,
      default: false
    },
    pendingAction: {
      type: Boolean,
      default: false
    },
    drawnCard: {
      type: Object,
      default: null
    },
    substituteIndex: {
      type: Number,
      default: null
    },
    playerHand: {
      type: Array,
      default: () => []
    },
    currentPlayerName: {
      type: String,
      default: ''
    },
    canDeclareEndGame: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'draw-card',
    'toggle-substitute',
    'discard-drawn-card',
    'use-ability',
    'substitute-card',
    'cancel-substitute',
    'declare-end-game'
  ],
  methods: {
    mapValorSvg(nome) {
      switch (nome) {
        case 'Ás': return 'A';
        case 'Às': return 'A';
        case 'Dois': return '2';
        case 'Três': return '3';
        case 'Quatro': return '4';
        case 'Cinco': return '5';
        case 'Seis': return '6';
        case 'Sete': return '7';
        case 'Oito': return '8';
        case 'Nove': return '9';
        case 'Dez': return '10';
        case 'Valete': return 'J';
        case 'Rainha': return 'Q';
        case 'Rei': return 'K';
        case 'Coringa': return 'C';
        default: return null;
      }
    },
    mapNaipeSvg(naipe) {
      switch (naipe) {
        case '♠': return 'S';
        case '♥': return 'H';
        case '♦': return 'D';
        case '♣': return 'C';
        default: return null;
      }
    }
  }
}
</script>

<style scoped>
/* Área de ações Flash */
.flash-action-area {
  position: fixed;
  top: 60%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  z-index: 100;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  background: var(--flash-dark-gradient);
  padding: 1rem 1.5rem;
  border-radius: 20px;
  border: 3px solid var(--flash-gold);
  backdrop-filter: blur(15px);
  box-shadow: var(--flash-glow-strong), var(--flash-shadow-strong);
}

.flash-action-area::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.1), transparent);
  animation: flash-action-sweep 3s ease-in-out infinite;
}

/* Efeitos de fundo */
.action-background-effects {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.action-particles {
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 20% 20%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(0, 255, 255, 0.1) 0%, transparent 50%);
  animation: flash-particles-float 4s ease-in-out infinite;
}

.action-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.05) 0%, transparent 70%);
  animation: flash-glow-rotate 6s linear infinite;
}

@keyframes flash-particles-float {
  0%, 100% { opacity: 0.3; transform: translateY(0); }
  50% { opacity: 0.6; transform: translateY(-10px); }
}

@keyframes flash-glow-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.current-player-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  position: relative;
  z-index: 2;
}

/* Botões Flash */
.flash-action-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  font-family: 'Arial Black', Arial, sans-serif;
  font-weight: bold;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--japanese-black);
  background: var(--flash-gold-gradient);
  border: none;
  border-radius: 25px;
  cursor: pointer;
  overflow: hidden;
  transition: all var(--flash-normal) var(--flash-ease);
  box-shadow: var(--flash-shadow);
  text-decoration: none;
  min-width: 140px;
  height: 50px;
}

.flash-action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left var(--flash-slow) var(--flash-ease);
}

.flash-action-btn:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: var(--flash-glow-strong), var(--flash-shadow-strong);
  color: var(--japanese-black);
}

.flash-action-btn:hover::before {
  left: 100%;
}

.flash-action-btn:active {
  transform: translateY(0) scale(0.98);
  transition: all var(--flash-fast) var(--flash-ease);
}

.flash-action-btn.primary {
  background: var(--flash-gold-gradient);
  color: var(--japanese-black);
}

.flash-action-btn.secondary {
  background: var(--flash-neon-gradient);
  color: white;
}

.flash-action-btn.danger {
  background: linear-gradient(135deg, #FF4444 0%, #CC0000 100%);
  color: white;
}

.flash-action-btn.success {
  background: linear-gradient(135deg, #00FF00 0%, #00CC00 100%);
  color: var(--japanese-black);
}

.flash-action-btn.cancel {
  background: linear-gradient(135deg, #8b0000 0%, #dc2626 100%);
  color: white;
}

.flash-action-btn.endgame {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  animation: flash-glow-pulse 2s ease-in-out infinite;
}

.action-icon {
  font-size: 18px;
  animation: flash-icon-bounce 2s ease-in-out infinite;
}

.action-text {
  font-weight: bold;
}

.action-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  animation: flash-shine 2s ease-in-out infinite;
}

@keyframes flash-icon-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes flash-shine {
  0% { left: -100%; }
  50% { left: 100%; }
  100% { left: 100%; }
}

/* Painel de ações de carta */
.card-action-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  background: var(--flash-dark-gradient);
  padding: 2rem;
  border-radius: 20px;
  border: 3px solid var(--flash-gold);
  backdrop-filter: blur(15px);
  max-width: 90vw;
  position: relative;
  overflow: hidden;
}

.panel-header {
  text-align: center;
  position: relative;
}

.flash-modal-title {
  color: var(--flash-gold);
  margin: 0;
  font-size: 1.2rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-shadow: 0 0 10px currentColor;
}

.card-glow-effect {
  position: absolute;
  top: -10px;
  left: -10px;
  right: -10px;
  bottom: -10px;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, transparent 70%);
  border-radius: 20px;
  animation: flash-card-glow 2s ease-in-out infinite;
}

@keyframes flash-card-glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

.bought-card-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.card-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawn-card-flash {
  transform: scale(1.1);
  transition: transform var(--flash-normal) var(--flash-ease);
  animation: flash-card-enter 0.5s var(--flash-bounce);
}

.drawn-card-flash:hover {
  transform: scale(1.2) rotate(5deg);
}

@keyframes flash-card-enter {
  from { 
    transform: scale(0.5) rotate(-180deg);
    opacity: 0;
  }
  to { 
    transform: scale(1.1) rotate(0deg);
    opacity: 1;
  }
}

.card-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 50%);
  border-radius: 50%;
  animation: flash-particles-pulse 2s ease-in-out infinite;
}

@keyframes flash-particles-pulse {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.5); opacity: 0.6; }
}

.action-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

/* Interface de substituição */
.substitute-interface {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  background: var(--flash-dark-gradient);
  padding: 2rem;
  border-radius: 20px;
  border: 2px solid var(--flash-gold);
  position: relative;
  overflow: hidden;
}

.substitute-header {
  text-align: center;
}

.hand-selection {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 600px;
}

.hand-card-flash {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all var(--flash-normal) var(--flash-ease);
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: 10px;
}

.hand-card-flash:hover {
  transform: translateY(-8px) scale(1.1);
  background: rgba(255, 215, 0, 0.1);
}

.card-back-flash {
  width: 60px;
  height: 90px;
  background: var(--flash-dark-gradient);
  border: 3px solid var(--flash-gold);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--flash-glow), var(--flash-shadow);
  position: relative;
  overflow: hidden;
}

.card-back-flash:hover {
  box-shadow: var(--flash-glow-strong), var(--flash-shadow-strong);
}

.card-symbol {
  font-size: 2rem;
  color: var(--flash-gold);
  text-shadow: 0 0 10px currentColor;
}

.card-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: flash-card-shine 2s ease-in-out infinite;
}

@keyframes flash-card-shine {
  0% { left: -100%; }
  50% { left: 100%; }
  100% { left: 100%; }
}

.card-number-flash {
  background: var(--flash-gold-gradient);
  color: var(--japanese-black);
  padding: 0.3rem 0.6rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: bold;
  box-shadow: var(--flash-shadow);
}

/* Estado de espera */
.waiting-turn {
  text-align: center;
  padding: 2rem;
  background: var(--flash-dark-gradient);
  border: 3px solid var(--flash-gold);
  border-radius: 20px;
  position: relative;
  overflow: hidden;
}

.waiting-content {
  position: relative;
  z-index: 2;
}

.waiting-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  display: block;
}

.waiting-text {
  color: var(--flash-gold);
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.current-player-indicator {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.player-label {
  color: var(--flash-gold);
  font-weight: bold;
}

.player-name {
  color: var(--flash-neon-blue);
  font-size: 1.1rem;
  font-weight: bold;
}

.waiting-animation {
  margin-top: 1rem;
}

.loading-dots {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  background: var(--flash-gold);
  border-radius: 50%;
  animation: flash-dot-bounce 1.4s ease-in-out infinite both;
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes flash-dot-bounce {
  0%, 80%, 100% { 
    transform: scale(0);
    opacity: 0.5;
  }
  40% { 
    transform: scale(1);
    opacity: 1;
  }
}

/* Responsividade */
@media (max-width: 768px) {
  .flash-action-area {
    padding: 0.8rem 1rem;
    gap: 0.6rem;
    top: 65%;
    max-width: 98vw;
  }
  
  .flash-action-btn {
    padding: 10px 16px;
    font-size: 14px;
    min-width: 120px;
    height: 45px;
  }
  
  .card-action-panel {
    padding: 1.5rem;
    gap: 1rem;
  }
  
  .action-buttons {
    gap: 0.8rem;
  }
  
  .hand-selection {
    gap: 0.8rem;
  }
  
  .card-back-flash {
    width: 50px;
    height: 75px;
  }
  
  .card-symbol {
    font-size: 1.5rem;
  }
}
</style>
