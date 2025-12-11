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
        <img v-if="isImageIcon" 
             :src="playerIcon" 
             :alt="player.nome" 
             class="avatar-image" />
        <span v-else class="avatar-icon">{{ playerIcon }}</span>
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
    },
    cartaEstaReveladaTemporariamente: {
      type: Function,
      default: () => false
    }
  },
  computed: {
    playerHand() {
      return this.player.mao || []
    },
    playerIcon() {
      // Se o ícone é uma URL de imagem, retornar como está
      if (this.player.icone && this.player.icone.startsWith('/')) {
        return this.player.icone
      }
      // Caso contrário, usar ícones emoji padrão
      const icons = ['🎯', '🎲', '🃏', '🎪', '🎨', '🎭']
      return this.player.icone || icons[this.playerIndex % icons.length]
    },
    isImageIcon() {
      return this.playerIcon && this.playerIcon.startsWith('/')
    }
  },
  methods: {
    isCardRevealed(cardIdx) {
      // No Cunoku, as cartas só são reveladas temporariamente com habilidades
      return this.cartaEstaReveladaTemporariamente(this.playerIndex, cardIdx)
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
/* Container do jogador - RESPONSIVO */
.player-position {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.2rem, 0.5vh, 0.4rem);
  padding: clamp(0.35rem, 1vw, 0.65rem);
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: clamp(2px, 0.3vw, 3px) solid #d4af37;
  border-radius: clamp(8px, 1.5vw, 15px);
  box-shadow: 
    0 clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 8px) rgba(0, 0, 0, 0.3),
    0 0 clamp(10px, 2vw, 20px) rgba(212, 175, 55, 0.3);
  min-width: clamp(80px, 15vw, 140px);
  max-width: clamp(100px, 18vw, 170px);
  pointer-events: auto;
  z-index: 4;
  justify-self: center;
  align-self: center;
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
  gap: clamp(0.15rem, 0.4vh, 0.35rem);
  z-index: 2;
}

.player-avatar {
  position: relative;
  width: clamp(28px, 5vw, 45px);
  height: clamp(28px, 5vw, 45px);
  background: linear-gradient(135deg, #d4af37 0%, #ffd700 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 8px) rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
}

.avatar-icon {
  font-size: clamp(14px, 2.5vw, 22px);
  color: #1a1a2e;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.turn-indicator-ring {
  position: absolute;
  top: clamp(-3px, -0.5vw, -5px);
  left: clamp(-3px, -0.5vw, -5px);
  right: clamp(-3px, -0.5vw, -5px);
  bottom: clamp(-3px, -0.5vw, -5px);
  border: clamp(2px, 0.3vw, 3px) solid #00ff00;
  border-radius: 50%;
  animation: turn-pulse 1s ease-in-out infinite;
}

@keyframes turn-pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.player-name {
  font-size: clamp(9px, 1.5vw, 13px);
  color: #d4af37;
  font-weight: bold;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.1rem, 0.2vh, 0.2rem);
}

.card-count {
  font-size: clamp(8px, 1.2vw, 11px);
  color: #ffffff;
}

.you-indicator {
  font-size: clamp(7px, 1vw, 9px);
  color: #00ff00;
  font-weight: bold;
}

/* Cartas do jogador */
.player-cards {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(0.1rem, 0.3vw, 0.2rem);
  justify-content: center;
  max-width: 100%;
}

.my-hand, .opponent-hand {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(0.1rem, 0.3vw, 0.2rem);
  justify-content: center;
}

.my-card, .opponent-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.05rem, 0.2vh, 0.1rem);
}

.card-container {
  position: relative;
  transition: transform 0.2s ease;
}

.card-container:hover {
  transform: translateY(clamp(-3px, -0.5vh, -5px));
}

.revealed-card {
  border-radius: clamp(4px, 0.8vw, 8px);
  box-shadow: 0 clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 8px) rgba(0, 0, 0, 0.3);
}

.card-back {
  width: clamp(28px, 5vw, 45px);
  height: clamp(42px, 7.5vw, 68px);
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #1d4ed8 100%);
  border: clamp(1px, 0.2vw, 2px) solid #d4af37;
  border-radius: clamp(4px, 0.8vw, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 8px) rgba(0, 0, 0, 0.3);
}

.opponent-card .card-back {
  width: clamp(18px, 3vw, 28px);
  height: clamp(27px, 4.5vw, 42px);
}

.card-symbol {
  font-size: clamp(10px, 1.8vw, 15px);
  color: #d4af37;
}

.opponent-card .card-symbol {
  font-size: clamp(7px, 1.2vw, 10px);
}

/* Botões de ação */
.player-actions {
  display: flex;
  gap: clamp(0.2rem, 0.5vw, 0.4rem);
  flex-wrap: wrap;
  justify-content: center;
}

.discard-btn, .react-btn {
  padding: clamp(0.1rem, 0.3vw, 0.2rem) clamp(0.2rem, 0.5vw, 0.4rem);
  border: clamp(1px, 0.2vw, 2px) solid #d4af37;
  border-radius: clamp(3px, 0.5vw, 5px);
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: #ffffff;
  font-size: clamp(7px, 1vw, 9px);
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.react-btn {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
}

.discard-btn:hover, .react-btn:hover {
  transform: translateY(clamp(-1px, -0.2vh, -2px));
  box-shadow: 0 clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 8px) rgba(0, 0, 0, 0.3);
}

/* Pontuação */
.player-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.1rem, 0.2vh, 0.2rem);
  background: rgba(0, 0, 0, 0.3);
  padding: clamp(0.2rem, 0.5vw, 0.4rem);
  border-radius: clamp(4px, 0.8vw, 8px);
  border: clamp(1px, 0.15vw, 1px) solid #d4af37;
}

.score-label {
  font-size: clamp(7px, 1vw, 9px);
  color: #d4af37;
}

.score-value {
  font-size: clamp(10px, 1.5vw, 14px);
  color: #ffffff;
  font-weight: bold;
}

/* Estados especiais */
.active-turn {
  border-color: #00ff00;
  box-shadow: 
    0 clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 8px) rgba(0, 0, 0, 0.3),
    0 0 clamp(10px, 2vw, 20px) rgba(0, 255, 0, 0.5);
}

.current-player {
  border-color: #ffd700;
  box-shadow: 
    0 clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 8px) rgba(0, 0, 0, 0.3),
    0 0 clamp(10px, 2vw, 20px) rgba(255, 215, 0, 0.5);
}

/* Responsividade para tablets */
@media (max-width: 1024px) {
  .player-position {
    min-width: clamp(75px, 14vw, 120px);
    max-width: clamp(95px, 17vw, 150px);
  }
}

/* Responsividade para celulares */
@media (max-width: 768px) {
  .player-position {
    min-width: clamp(65px, 18vw, 100px);
    max-width: clamp(80px, 22vw, 120px);
    padding: clamp(0.25rem, 0.8vw, 0.5rem);
    gap: clamp(0.15rem, 0.4vh, 0.3rem);
  }
  
  .player-avatar {
    width: clamp(22px, 6vw, 35px);
    height: clamp(22px, 6vw, 35px);
  }
  
  .avatar-icon {
    font-size: clamp(12px, 3vw, 18px);
  }
  
  .card-back {
    width: clamp(22px, 6vw, 35px);
    height: clamp(33px, 9vw, 52px);
  }
  
  .opponent-card .card-back {
    width: clamp(15px, 4vw, 22px);
    height: clamp(22px, 6vw, 33px);
  }
  
  .player-name {
    font-size: clamp(8px, 2vw, 11px);
  }
  
  .card-count {
    font-size: clamp(7px, 1.5vw, 9px);
  }
}

/* Responsividade para celulares pequenos */
@media (max-width: 480px) {
  .player-position {
    min-width: clamp(55px, 20vw, 85px);
    max-width: clamp(70px, 25vw, 100px);
    padding: clamp(0.2rem, 0.6vw, 0.4rem);
  }
  
  .player-avatar {
    width: clamp(18px, 7vw, 28px);
    height: clamp(18px, 7vw, 28px);
  }
  
  .card-back {
    width: clamp(18px, 7vw, 28px);
    height: clamp(27px, 10.5vw, 42px);
  }
  
  .opponent-card .card-back {
    width: clamp(12px, 5vw, 18px);
    height: clamp(18px, 7.5vw, 27px);
  }
}

/* Landscape em dispositivos móveis */
@media (max-height: 500px) and (orientation: landscape) {
  .player-position {
    min-width: clamp(70px, 12vw, 110px);
    max-width: clamp(90px, 15vw, 140px);
    flex-direction: row;
    gap: clamp(0.3rem, 1vw, 0.5rem);
  }
  
  .player-info {
    flex-direction: column;
  }
  
  .player-cards {
    flex-direction: column;
  }
}
</style>