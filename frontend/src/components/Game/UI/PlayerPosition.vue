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
    
    <!-- Cartas do Jogador - em frente ao ícone -->
    <div class="player-cards">
      <div v-if="isCurrentUser" class="my-hand">
        <!-- Sua mão -->
        <div v-for="(carta, cardIdx) in playerHand" :key="`my-card-${cardIdx}`" 
             class="my-card" 
             :class="{ 'card-revealed': isCardRevealed(cardIdx) }">
          <div class="card-container">
            <CartaSvg v-if="isCardRevealed(cardIdx)" 
                     :valor="mapValorSvg(carta.nome)" 
                     :naipe="mapNaipeSvg(carta.naipe)" 
                     :width="60" :height="90"
                     class="revealed-card" />
            <div v-else class="card-back">
              <span class="card-symbol">🂠</span>
            </div>
          </div>
          <button v-if="canDiscard && isActivePlayer" 
                  class="discard-btn" @click="$emit('try-discard', cardIdx)">
            Descartar
          </button>
        </div>
      </div>
      
      <div v-else class="opponent-hand">
        <!-- Mão dos oponentes -->
        <div v-for="(carta, cardIdx) in playerHand" :key="`opponent-card-${cardIdx}`" 
             class="opponent-card">
          <div class="card-container">
            <CartaSvg v-if="isCardRevealed(cardIdx)" 
                     :valor="mapValorSvg(carta.nome)" 
                     :naipe="mapNaipeSvg(carta.naipe)" 
                     :width="40" :height="60"
                     class="revealed-card" />
            <div v-else class="card-back">
              <span class="card-symbol">🂠</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Botões de ação -->
    <div v-if="isCurrentUser" class="player-actions">
      <button v-if="canDiscard" 
              class="discard-btn" 
              @click="$emit('discard-card')">
        Descartar
      </button>
      
      <button v-if="canReact" 
              class="react-btn" 
              @click="$emit('react')">
        Reagir
      </button>
    </div>
    
    <!-- Pontuação do jogador -->
    <div v-if="player.pontuacao !== undefined" class="player-score">
      <span class="score-label">Pontos:</span>
      <span class="score-value">{{ player.pontuacao }}</span>
    </div>
  </div>
</template>

<script>
import CartaSvg from '../../CartaSvg.vue'

export default {
  name: 'PlayerPosition',
  components: {
    CartaSvg
  },
  props: {
    player: {
      type: Object,
      required: true
    },
    position: {
      type: String,
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
    canDiscard: {
      type: Boolean,
      default: false
    },
    canReact: {
      type: Boolean,
      default: false
    },
    reactionActive: {
      type: Boolean,
      default: false
    },
    reactionValue: {
      type: String,
      default: ''
    },
    playerIndex: {
      type: Number,
      default: 0
    }
  },
  computed: {
    playerHand() {
      return this.player.mao || []
    },
    playerIcon() {
      const icons = ['🎯', '🎲', '🃏', '🎪', '🎨', '🎭']
      return icons[this.playerIndex % icons.length]
    }
  },
  methods: {
    isCardRevealed(cardIdx) {
      // Lógica para determinar se a carta está revelada
      return this.isCurrentUser || this.player.cartasReveladas?.includes(cardIdx)
    },
    mapValorSvg(valor) {
      const valorMap = {
        'A': 'A', '2': '2', '3': '3', '4': '4', '5': '5',
        '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
        'J': 'J', 'Q': 'Q', 'K': 'K'
      }
      return valorMap[valor] || valor
    },
    mapNaipeSvg(naipe) {
      const naipeMap = {
        '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs'
      }
      return naipeMap[naipe] || naipe
    }
  }
}
</script>

<style scoped>
/* Container do jogador */
.player-position {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 3px solid #d4af37;
  border-radius: 15px;
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.3),
    0 0 20px rgba(212, 175, 55, 0.3);
  min-width: 150px;
  max-width: 200px;
  pointer-events: auto;
  z-index: 4;
}

/* Posições usando grid-area */
.position-bottom {
  grid-area: player-0;
  flex-direction: column;
}

.position-top {
  grid-area: player-1;
  flex-direction: column-reverse;
}

.position-left {
  grid-area: player-3;
  flex-direction: row;
}

.position-right {
  grid-area: player-2;
  flex-direction: row-reverse;
}

.position-top-left {
  grid-area: player-1;
  flex-direction: column-reverse;
}

.position-top-right {
  grid-area: player-2;
  flex-direction: column-reverse;
}

.position-bottom-left {
  grid-area: player-3;
  flex-direction: column;
}

.position-bottom-right {
  grid-area: player-4;
  flex-direction: column;
}

/* Info do jogador */
.player-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  z-index: 2;
}

.player-avatar {
  position: relative;
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #d4af37 0%, #ffd700 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.avatar-icon {
  font-size: 24px;
  color: #1a1a2e;
}

.turn-indicator-ring {
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  border: 3px solid #00ff00;
  border-radius: 50%;
  animation: turn-pulse 1s ease-in-out infinite;
}

@keyframes turn-pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.player-name {
  font-size: 14px;
  color: #d4af37;
  font-weight: bold;
  text-align: center;
}

.player-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.card-count {
  font-size: 12px;
  color: #ffffff;
}

.you-indicator {
  font-size: 10px;
  color: #00ff00;
  font-weight: bold;
}

/* Cartas do jogador */
.player-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  max-width: 100%;
}

.my-hand, .opponent-hand {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.my-card, .opponent-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.card-container {
  position: relative;
  transition: transform 0.2s ease;
}

.card-container:hover {
  transform: translateY(-5px);
}

.revealed-card {
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.card-back {
  width: 60px;
  height: 90px;
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #1d4ed8 100%);
  border: 2px solid #d4af37;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.opponent-card .card-back {
  width: 40px;
  height: 60px;
}

.card-symbol {
  font-size: 20px;
  color: #d4af37;
}

.opponent-card .card-symbol {
  font-size: 14px;
}

/* Botões de ação */
.player-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.discard-btn, .react-btn {
  padding: 0.25rem 0.5rem;
  border: 2px solid #d4af37;
  border-radius: 5px;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: #ffffff;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.react-btn {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
}

.discard-btn:hover, .react-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

/* Pontuação */
.player-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid #d4af37;
}

.score-label {
  font-size: 10px;
  color: #d4af37;
}

.score-value {
  font-size: 16px;
  color: #ffffff;
  font-weight: bold;
}

/* Estados especiais */
.active-turn {
  border-color: #00ff00;
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.3),
    0 0 20px rgba(0, 255, 0, 0.5);
}

.current-player {
  border-color: #ffd700;
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.3),
    0 0 20px rgba(255, 215, 0, 0.5);
}

/* Responsividade */
@media (max-width: 768px) {
  .player-position {
    min-width: 120px;
    max-width: 150px;
    padding: 0.5rem;
  }
  
  .player-avatar {
    width: 40px;
    height: 40px;
  }
  
  .avatar-icon {
    font-size: 20px;
  }
  
  .card-back {
    width: 50px;
    height: 75px;
  }
  
  .opponent-card .card-back {
    width: 35px;
    height: 50px;
  }
}
</style>