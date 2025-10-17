<template>
  <div class="flash-player-position"
       :class="[
         `position-${position}`,
         { 'active-turn': isActivePlayer },
         { 'current-player': isCurrentUser }
       ]">
    
    <!-- Efeitos de fundo -->
    <div class="player-background-effects">
      <div class="player-particles"></div>
      <div class="player-glow"></div>
    </div>
    
    <!-- Avatar/Nome do Jogador -->
    <div class="player-info">
      <div class="player-avatar-flash">
        <span class="avatar-icon-flash">{{ playerIcon }}</span>
        <div v-if="isActivePlayer" class="turn-indicator-ring-flash flash-glow-pulse"></div>
        <div class="avatar-glow-effect"></div>
      </div>
      <div class="player-name-flash flash-text-glow">{{ player.nome }}</div>
      <div class="player-stats-flash">
        <span class="card-count-flash">{{ player.mao.length }} cartas</span>
        <span v-if="isCurrentUser" class="you-indicator-flash flash-text-glow">(Você)</span>
      </div>
    </div>
    
    <!-- Cartas do Jogador -->
    <div class="player-cards-flash">
      <div v-if="isCurrentUser" class="my-hand-flash">
        <!-- Sua mão -->
        <div v-for="(carta, cardIdx) in playerHand" :key="`my-card-${cardIdx}`" 
             class="my-card-flash flash-hover-scale" 
             :class="{ 'card-revealed': isCardRevealed(cardIdx) }">
          <div class="card-container-flash">
            <CartaSvg v-if="isCardRevealed(cardIdx)" 
                     :valor="mapValorSvg(carta.nome)" 
                     :naipe="mapNaipeSvg(carta.naipe)" 
                     :width="70" :height="100"
                     class="revealed-card-flash" />
            <div v-else class="card-back-flash small">
              <span class="card-symbol">🂠</span>
              <div class="card-shine"></div>
            </div>
            <div class="card-particles" v-if="isCardRevealed(cardIdx)"></div>
          </div>
          <button v-if="canDiscard && isActivePlayer" 
                  class="discard-btn-flash flash-action-btn danger" @click="$emit('try-discard', cardIdx)">
            <span class="action-icon">🗑️</span>
            <span class="action-text">Descartar</span>
          </button>
          <button v-if="reactionActive && isCurrentUser && carta && carta.nome === reactionValue"
                  class="react-btn-flash flash-action-btn success flash-glow-pulse" @click="$emit('react-discard', cardIdx)">
            <span class="action-icon">⚡</span>
            <span class="action-text">Reagir</span>
          </button>
        </div>
      </div>
      <div v-else class="opponent-hand-flash">
        <!-- Cartas dos oponentes -->
        <div v-for="n in player.mao.length" :key="`opp-card-${playerIndex}-${n}`" class="opponent-card-flash flash-hover-scale">
          <div class="card-back-flash small">
            <span class="card-symbol">🂠</span>
            <div class="card-shine"></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Pontuação -->
    <div class="player-score-flash flash-card">
      <span class="score-label-flash">Pontos:</span>
      <span class="score-value-flash flash-text-glow">{{ player.pontuacao || 0 }}</span>
      <div class="score-glow-effect"></div>
    </div>
  </div>
</template>

<script>
import CartaSvg from '../../CartaSvg.vue'

export default {
  name: 'PlayerPosition',
  components: { CartaSvg },
  props: {
    player: {
      type: Object,
      required: true
    },
    playerIndex: {
      type: Number,
      required: true
    },
    totalPlayers: {
      type: Number,
      required: true
    },
    isActivePlayer: {
      type: Boolean,
      default: false
    },
    isCurrentUser: {
      type: Boolean,
      default: false
    },
    playerHand: {
      type: Array,
      default: () => []
    },
    revealedCards: {
      type: Array,
      default: () => []
    },
    canDiscard: {
      type: Boolean,
      default: false
    },
    reactionActive: {
      type: Boolean,
      default: false
    },
    reactionValue: {
      type: String,
      default: null
    }
  },
  emits: ['try-discard', 'react-discard'],
  computed: {
    position() {
      // Determina a posição do jogador ao redor da mesa oval
      const positions = {
        2: ['bottom', 'top'],
        3: ['bottom', 'top-left', 'top-right'],
        4: ['bottom', 'left', 'top', 'right'],
        5: ['bottom', 'bottom-left', 'top-left', 'top-right', 'bottom-right'],
        6: ['bottom', 'left', 'top-left', 'top-right', 'right', 'bottom-right']
      };
      
      const positionArray = positions[this.totalPlayers] || positions[6];
      return positionArray[this.playerIndex] || 'bottom';
    },
    playerIcon() {
      const icons = ['👤', '🎭', '🎪', '🎯', '🎲', '🎨'];
      return icons[this.playerIndex % icons.length];
    }
  },
  methods: {
    isCardRevealed(cardIdx) {
      return this.revealedCards.some(c => c.idx === cardIdx);
    },
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
/* Posições dos jogadores ao redor da mesa Flash */
.flash-player-position {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
  z-index: 3;
  background: var(--flash-dark-gradient);
  border: 3px solid var(--flash-gold);
  border-radius: 20px;
  padding: 1rem;
  box-shadow: var(--flash-glow), var(--flash-shadow-strong);
  position: relative;
  overflow: hidden;
  min-width: 120px;
  max-width: 160px;
}

.flash-player-position::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.1), transparent);
  animation: flash-player-sweep 3s ease-in-out infinite;
}

@keyframes flash-player-sweep {
  0% { left: -100%; }
  50% { left: 100%; }
  100% { left: 100%; }
}

/* Efeitos de fundo do jogador */
.player-background-effects {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.player-particles {
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 30% 30%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 70% 70%, rgba(0, 255, 255, 0.1) 0%, transparent 50%);
  animation: flash-player-particles 4s ease-in-out infinite;
}

.player-glow {
  position: absolute;
  top: -20%;
  left: -20%;
  width: 140%;
  height: 140%;
  background: radial-gradient(ellipse, rgba(255, 215, 0, 0.1) 0%, transparent 60%);
  animation: flash-player-glow 3s ease-in-out infinite;
}

@keyframes flash-player-particles {
  0%, 100% { opacity: 0.3; transform: translateY(0) rotate(0deg); }
  50% { opacity: 0.6; transform: translateY(-5px) rotate(180deg); }
}

@keyframes flash-player-glow {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.1); }
}

/* Posições otimizadas para 2-6 jogadores */
.position-bottom {
  bottom: -140px;
  left: 50%;
  transform: translateX(-50%);
  flex-direction: column;
}

.position-top {
  top: -140px;
  left: 50%;
  transform: translateX(-50%);
  flex-direction: column-reverse;
}

.position-left {
  left: -180px;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: row;
}

.position-right {
  right: -180px;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: row-reverse;
}

.position-top-left {
  top: -120px;
  left: 15%;
  flex-direction: column-reverse;
}

.position-top-right {
  top: -120px;
  right: 15%;
  flex-direction: column-reverse;
}

.position-bottom-left {
  bottom: -120px;
  left: 15%;
  flex-direction: column;
}

.position-bottom-right {
  bottom: -120px;
  right: 15%;
  flex-direction: column;
}

/* Info do jogador Flash */
.player-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  background: var(--flash-dark-gradient);
  padding: 1rem;
  border-radius: 15px;
  border: 2px solid var(--flash-gold);
  backdrop-filter: blur(10px);
  min-width: 120px;
  max-width: 160px;
  position: relative;
  z-index: 2;
}

.player-avatar-flash {
  position: relative;
  width: 60px;
  height: 60px;
  background: var(--flash-gold-gradient);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--flash-glow), var(--flash-shadow);
  animation: flash-avatar-pulse 2s ease-in-out infinite;
}

.avatar-icon-flash {
  font-size: 2rem;
  color: var(--japanese-black);
  font-weight: bold;
}

.turn-indicator-ring-flash {
  position: absolute;
  top: -8px;
  left: -8px;
  right: -8px;
  bottom: -8px;
  border: 4px solid var(--flash-neon-blue);
  border-radius: 50%;
  animation: flash-ring-rotate 2s linear infinite;
  box-shadow: 0 0 25px var(--flash-neon-blue);
}

@keyframes flash-ring-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.avatar-glow-effect {
  position: absolute;
  top: -10px;
  left: -10px;
  right: -10px;
  bottom: -10px;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  animation: flash-avatar-glow 2s ease-in-out infinite;
}

@keyframes flash-avatar-glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

.player-name-flash {
  color: var(--flash-gold);
  font-weight: bold;
  font-size: 0.9rem;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 0 10px currentColor;
}

.player-stats-flash {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.card-count-flash {
  color: var(--flash-neon-blue);
  font-size: 0.8rem;
  font-weight: bold;
  text-shadow: 0 0 5px currentColor;
}

.you-indicator-flash {
  color: var(--flash-gold);
  font-size: 0.7rem;
  font-weight: bold;
  text-shadow: 0 0 5px currentColor;
}

/* Estados do jogador Flash */
.flash-player-position.active-turn {
  border-color: var(--flash-neon-blue);
  box-shadow: 0 0 30px var(--flash-neon-blue), var(--flash-shadow-strong);
  animation: flash-player-active 1s ease-in-out infinite;
}

@keyframes flash-player-active {
  0%, 100% { 
    box-shadow: 0 0 30px var(--flash-neon-blue), var(--flash-shadow-strong);
  }
  50% { 
    box-shadow: 0 0 40px var(--flash-neon-blue), 0 0 60px var(--flash-neon-blue), var(--flash-shadow-strong);
  }
}

.flash-player-position.current-player {
  border-color: var(--flash-gold);
  background: var(--flash-dark-gradient);
  box-shadow: var(--flash-glow-strong), var(--flash-shadow-strong);
}

/* Cartas dos jogadores Flash */
.player-cards-flash {
  display: flex;
  gap: 0.4rem;
  max-width: 350px;
  justify-content: center;
  flex-wrap: wrap;
  position: relative;
  z-index: 2;
}

.my-hand-flash {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  max-width: 400px;
  justify-content: center;
}

.my-card-flash {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  margin: 0.2rem;
  transition: all var(--flash-normal) var(--flash-ease);
}

.my-card-flash.card-revealed {
  transform: scale(1.1);
  z-index: 10;
}

.card-container-flash {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.revealed-card-flash {
  box-shadow: var(--flash-glow-strong), var(--flash-shadow-strong);
  border-radius: 12px;
  animation: flash-card-reveal 0.5s var(--flash-bounce);
}

@keyframes flash-card-reveal {
  from { 
    transform: scale(0.5) rotate(-180deg);
    opacity: 0;
  }
  to { 
    transform: scale(1) rotate(0deg);
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

.opponent-hand-flash {
  display: flex;
  gap: 0.2rem;
  justify-content: center;
  flex-wrap: wrap;
}

.opponent-card-flash {
  transform: scale(0.8);
  margin: 0.1rem;
  transition: all var(--flash-normal) var(--flash-ease);
}

.opponent-card-flash:hover {
  transform: scale(0.9);
}

.card-back-flash.small {
  width: 60px;
  height: 85px;
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

.card-back-flash.small:hover {
  box-shadow: var(--flash-glow-strong), var(--flash-shadow-strong);
}

.card-symbol {
  font-size: 1.8rem;
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

.discard-btn-flash, .react-btn-flash {
  padding: 0.3rem 0.6rem;
  font-size: 0.7rem;
  min-width: 80px;
  height: 35px;
  margin-top: 0.3rem;
}

.discard-btn-flash .action-icon, .react-btn-flash .action-icon {
  font-size: 0.8rem;
}

.discard-btn-flash .action-text, .react-btn-flash .action-text {
  font-size: 0.7rem;
}

/* Pontuação Flash */
.player-score-flash {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  background: var(--flash-dark-gradient);
  padding: 0.8rem;
  border-radius: 15px;
  border: 2px solid var(--flash-gold);
  box-shadow: var(--flash-glow);
  position: relative;
  z-index: 2;
  min-width: 80px;
}

.score-label-flash {
  color: var(--flash-gold);
  font-size: 0.8rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-shadow: 0 0 5px currentColor;
}

.score-value-flash {
  color: var(--flash-neon-blue);
  font-size: 1.2rem;
  font-weight: bold;
  text-shadow: 0 0 10px currentColor;
}

.score-glow-effect {
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  background: radial-gradient(circle, rgba(0, 255, 255, 0.2) 0%, transparent 70%);
  border-radius: 15px;
  animation: flash-score-glow 2s ease-in-out infinite;
}

@keyframes flash-score-glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

/* Responsividade */
@media (max-width: 768px) {
  .flash-player-position {
    min-width: 100px;
    max-width: 140px;
    padding: 0.8rem;
  }
  
  .player-info {
    min-width: 80px;
    max-width: 120px;
    padding: 0.8rem;
  }
  
  .player-avatar-flash {
    width: 50px;
    height: 50px;
  }
  
  .avatar-icon-flash {
    font-size: 1.6rem;
  }
  
  .player-name-flash {
    font-size: 0.8rem;
    max-width: 100px;
  }
  
  .card-count-flash {
    font-size: 0.7rem;
  }
  
  .card-back-flash.small {
    width: 50px;
    height: 70px;
  }
  
  .card-symbol {
    font-size: 1.4rem;
  }
  
  .discard-btn-flash, .react-btn-flash {
    padding: 0.2rem 0.4rem;
    font-size: 0.6rem;
    min-width: 60px;
    height: 30px;
  }
  
  .player-score-flash {
    min-width: 60px;
    padding: 0.6rem;
  }
  
  .score-value-flash {
    font-size: 1rem;
  }
  
  .you-indicator-flash {
    font-size: 0.6rem;
  }
  
  .position-left {
    left: -110px;
  }
  
  .position-right {
    right: -110px;
  }
  
  .position-bottom {
    bottom: -90px;
  }
  
  .position-top {
    top: -90px;
  }
  
  .position-top-left,
  .position-bottom-left {
    left: 5%;
  }
  
  .position-top-right,
  .position-bottom-right {
    right: 5%;
  }
  
  .card-back.small {
    width: 35px;
    height: 55px;
  }
  
  .discard-btn {
    padding: 0.08rem 0.25rem;
    font-size: 0.5rem;
    letter-spacing: 0.2px;
  }
}

/* Ajustes específicos para número de jogadores */
@media (max-width: 768px) {
  /* Para 5-6 jogadores em mobile, compactar posições */
  .position-top-left,
  .position-bottom-left {
    left: 8%;
  }
  
  .position-top-right,
  .position-bottom-right {
    right: 8%;
  }
  
  .position-left {
    left: -140px;
  }
  
  .position-right {
    right: -140px;
  }
}

/* Otimização para 6 jogadores */
[data-player-count="6"] .position-top-left {
  left: 12%;
  top: -90px;
}

[data-player-count="6"] .position-top-right {
  right: 12%;
  top: -90px;
}

[data-player-count="6"] .position-bottom-right {
  right: 12%;
  bottom: -90px;
}

/* Otimização para 5 jogadores */
[data-player-count="5"] .position-bottom-left {
  left: 20%;
  bottom: -80px;
}

[data-player-count="5"] .position-bottom-right {
  right: 20%;
  bottom: -80px;
}
</style>
