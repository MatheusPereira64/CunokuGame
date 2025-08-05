<template>
  <div class="player-position"
       :class="[
         `position-${position}`,
         { 'active-turn': isActivePlayer },
         { 'current-player': isCurrentUser }
       ]">
    
    <!-- Avatar/Nome do Jogador -->
    <div class="player-info">
      <div class="player-avatar">
        <span class="avatar-icon">{{ playerIcon }}</span>
        <div v-if="isActivePlayer" class="turn-indicator-ring"></div>
      </div>
      <div class="player-name">{{ player.nome }}</div>
      <div class="player-stats">
        <span class="card-count">{{ player.mao.length }} cartas</span>
        <span v-if="isCurrentUser" class="you-indicator">(Você)</span>
      </div>
    </div>
    
    <!-- Cartas do Jogador -->
    <div class="player-cards">
      <div v-if="isCurrentUser" class="my-hand">
        <!-- Sua mão -->
        <div v-for="(carta, cardIdx) in playerHand" :key="`my-card-${cardIdx}`" 
             class="my-card" 
             :class="{ 'card-revealed': isCardRevealed(cardIdx) }">
          <CartaSvg v-if="isCardRevealed(cardIdx)" 
                   :valor="mapValorSvg(carta.nome)" 
                   :naipe="mapNaipeSvg(carta.naipe)" 
                   :width="60" :height="90" />
          <div v-else class="card-back small">
            <span>🂠</span>
          </div>
          <button v-if="canDiscard && isActivePlayer" 
                  class="discard-btn" @click="$emit('try-discard', cardIdx)">
            Descartar
          </button>
        </div>
      </div>
      <div v-else class="opponent-hand">
        <!-- Cartas dos oponentes -->
        <div v-for="n in player.mao.length" :key="`opp-card-${playerIndex}-${n}`" class="opponent-card">
          <div class="card-back small">
            <span>🂠</span>
          </div>
        </div>
      </div>
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
    }
  },
  emits: ['try-discard'],
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
        case 'Dama': return 'Q';
        case 'Rei': return 'K';
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
/* Posições dos jogadores ao redor da mesa */
.player-position {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  z-index: 3;
}

/* Posicionamento específico para cada posição */
.position-bottom {
  bottom: -120px;
  left: 50%;
  transform: translateX(-50%);
  flex-direction: column;
}

.position-top {
  top: -120px;
  left: 50%;
  transform: translateX(-50%);
  flex-direction: column-reverse;
}

.position-left {
  left: -160px;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: row;
}

.position-right {
  right: -160px;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: row-reverse;
}

.position-top-left {
  top: -100px;
  left: 10%;
  flex-direction: column-reverse;
}

.position-top-right {
  top: -100px;
  right: 10%;
  flex-direction: column-reverse;
}

.position-bottom-left {
  bottom: -100px;
  left: 10%;
  flex-direction: column;
}

.position-bottom-right {
  bottom: -100px;
  right: 10%;
  flex-direction: column;
}

/* Info do jogador */
.player-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  background: 
    linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.6) 100%);
  padding: 0.8rem;
  border-radius: 12px;
  border: 2px solid rgba(212, 175, 55, 0.4);
  backdrop-filter: blur(10px);
  min-width: 100px;
  max-width: 140px;
}

.player-avatar {
  position: relative;
  width: 50px;
  height: 50px;
  background: 
    linear-gradient(135deg, #d4af37 0%, #ffd700 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.5);
}

.avatar-icon {
  font-size: 1.6rem;
}

.turn-indicator-ring {
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  border: 3px solid #ffd700;
  border-radius: 50%;
  animation: rotate 2s linear infinite;
  box-shadow: 0 0 20px #ffd700;
}

@keyframes rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.player-name {
  color: #ffd700;
  font-weight: bold;
  font-size: 0.8rem;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}

.card-count {
  color: #ccc;
  font-size: 0.7rem;
}

.you-indicator {
  color: #d4af37;
  font-size: 0.6rem;
  font-weight: bold;
}

/* Estados do jogador */
.player-position.active-turn .player-info {
  border-color: #ffd700;
  box-shadow: 0 0 25px rgba(212, 175, 55, 0.5);
  animation: glow 2s ease-in-out infinite alternate;
}

@keyframes glow {
  0% { box-shadow: 0 0 25px rgba(212, 175, 55, 0.5); }
  100% { box-shadow: 0 0 35px rgba(212, 175, 55, 0.8); }
}

.player-position.current-player .player-info {
  border-color: #1e3a8a;
  background: 
    linear-gradient(135deg, rgba(30, 58, 138, 0.7) 0%, rgba(30, 58, 138, 0.4) 100%);
}

/* Cartas dos jogadores */
.player-cards {
  display: flex;
  gap: 0.2rem;
  max-width: 300px;
  justify-content: center;
  flex-wrap: wrap;
}

.my-hand {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
  max-width: 350px;
  justify-content: center;
}

.my-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  margin: 0.1rem;
}

.my-card.card-revealed {
  transform: scale(1.05);
  z-index: 10;
}

.opponent-hand {
  display: flex;
  gap: 0.1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.opponent-card {
  transform: scale(0.7);
  margin: 0.05rem;
}

.card-back.small {
  width: 50px;
  height: 75px;
  background: 
    linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border: 2px solid #d4af37;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.card-back.small span {
  font-size: 1.5rem;
  color: #eebbc3;
}

.discard-btn {
  background: 
    linear-gradient(135deg, #8b0000 0%, #a00 100%);
  color: white;
  border: none;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-top: 0.2rem;
}

.discard-btn:hover {
  background: 
    linear-gradient(135deg, #a00 0%, #c00 100%);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(139, 0, 0, 0.5);
}

/* Responsividade */
@media (max-width: 768px) {
  .player-info {
    min-width: 70px;
    max-width: 90px;
    padding: 0.5rem;
  }
  
  .player-avatar {
    width: 35px;
    height: 35px;
  }
  
  .avatar-icon {
    font-size: 1.2rem;
  }
  
  .player-name {
    font-size: 0.65rem;
    max-width: 70px;
  }
  
  .card-count {
    font-size: 0.55rem;
  }
  
  .you-indicator {
    font-size: 0.5rem;
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
</style>
