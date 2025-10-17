<template>
  <div class="flash-ability-interface" :class="`ability-${type}`">
    <!-- Efeitos de fundo específicos por habilidade -->
    <div class="ability-background-effects">
      <div v-if="type === 'own-card'" class="eye-effect-flash">
        <div class="eye-pupil-flash flash-glow-pulse"></div>
        <div class="eye-lid-flash"></div>
        <div class="eye-glow-effect"></div>
      </div>
      <div v-if="type === 'opponent-card'" class="spy-effect-flash">
        <div class="spy-glass-flash flash-glow-pulse"></div>
        <div class="spy-light-flash"></div>
        <div class="spy-particles"></div>
      </div>
      <div v-if="type === 'swap-cards'" class="swap-effect-flash">
        <div class="swap-arrows-flash">
          <div class="arrow-left-flash flash-hover-rotate">↔</div>
          <div class="arrow-right-flash flash-hover-rotate">↔</div>
        </div>
        <div class="swap-glow-effect"></div>
      </div>
    </div>
    
    <div class="ability-panel-flash flash-modal-content">
      <div class="ability-header-flash">
        <div class="ability-icon-flash flash-glow-pulse">{{ getIcon() }}</div>
        <h4 class="ability-title-flash flash-text-glow">{{ getTitle() }}</h4>
        <div class="ability-glow-effect"></div>
      </div>
      <p class="ability-description-flash">{{ getDescription() }}</p>
      
      <!-- Interface para ver carta própria -->
      <div v-if="type === 'own-card'" class="ability-content-flash">
        <div class="hand-selection-flash">
          <button v-for="(carta, idx) in gameState.players[currentPlayerIndex]?.mao || []" 
                  :key="`ver-${idx}`" class="hand-card-flash flash-hover-scale" @click="selectOwnCard(idx)">
            <div class="card-back-flash">
              <span class="card-symbol">🂠</span>
              <div class="card-shine"></div>
            </div>
            <span class="card-number-flash">{{ idx + 1 }}</span>
          </button>
        </div>
      </div>
      
      <!-- Interface para ver carta de oponente -->
      <div v-if="type === 'opponent-card'" class="ability-content-flash">
        <div class="players-selection-flash">
          <div v-for="player in opponents" :key="`player-${player.originalIndex}`" 
               class="player-option-flash flash-hover-scale" @click="selectPlayer(player.originalIndex)">
            <div class="player-info-flash">
              <span class="player-name-flash flash-text-glow">{{ player.nome }}</span>
              <span class="card-count-flash">{{ player.mao.length }} cartas</span>
            </div>
            <div class="player-cards-flash">
              <div v-for="(carta, cardIdx) in player.mao" :key="`card-${cardIdx}`" 
                   class="card-option-flash flash-hover-scale" @click.stop="selectOpponentCard(player.originalIndex, cardIdx)">
                <div class="card-back-flash small">
                  <span class="card-symbol">🂠</span>
                  <div class="card-shine"></div>
                </div>
                <span class="card-number-flash">{{ cardIdx + 1 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Interface para trocar cartas -->
      <div v-if="type === 'swap-cards'" class="ability-content-flash">
        <div class="swap-interface-flash">
          <div class="swap-step-flash" v-if="swapStep === 1">
            <h5 class="flash-text-glow">Escolha o primeiro jogador:</h5>
            <div class="players-grid-flash">
              <button v-for="player in allPlayers" :key="`p1-${player.originalIndex}`"
                      class="player-btn-flash flash-action-btn secondary" @click="selectFirstPlayer(player.originalIndex)">
                <span class="action-icon">👤</span>
                <span class="action-text">{{ player.nome }} ({{ player.mao.length }} cartas)</span>
              </button>
            </div>
          </div>
          
          <div class="swap-step-flash" v-if="swapStep === 2">
            <h5 class="flash-text-glow">Escolha a carta do {{ selectedPlayer1Name }}:</h5>
            <div class="hand-selection-flash">
              <button v-for="n in selectedPlayer1Cards" :key="`c1-${n}`"
                      class="hand-card-flash flash-hover-scale" @click="selectFirstCard(n-1)">
                <div class="card-back-flash">
                  <span class="card-symbol">🂠</span>
                  <div class="card-shine"></div>
                </div>
                <span class="card-number-flash">{{ n }}</span>
              </button>
            </div>
          </div>
          
          <div class="swap-step-flash" v-if="swapStep === 3">
            <h5 class="flash-text-glow">Escolha o segundo jogador:</h5>
            <div class="players-grid-flash">
              <button v-for="player in otherPlayers" :key="`p2-${player.originalIndex}`"
                      class="player-btn-flash flash-action-btn secondary" @click="selectSecondPlayer(player.originalIndex)">
                <span class="action-icon">👤</span>
                <span class="action-text">{{ player.nome }} ({{ player.mao.length }} cartas)</span>
              </button>
            </div>
          </div>
          
          <div class="swap-step-flash" v-if="swapStep === 4">
            <h5 class="flash-text-glow">Escolha a carta do {{ selectedPlayer2Name }}:</h5>
            <div class="hand-selection-flash">
              <button v-for="n in selectedPlayer2Cards" :key="`c2-${n}`"
                      class="hand-card-flash flash-hover-scale" @click="selectSecondCard(n-1)">
                <div class="card-back-flash">
                  <span class="card-symbol">🂠</span>
                  <div class="card-shine"></div>
                </div>
                <span class="card-number-flash">{{ n }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="ability-actions-flash">
        <button class="flash-action-btn cancel" @click="$emit('cancel-ability')">
          <span class="action-icon">❌</span>
          <span class="action-text">Cancelar</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AbilityInterface',
  props: {
    type: {
      type: String,
      required: true
    },
    gameState: {
      type: Object,
      required: true
    },
    currentPlayerIndex: {
      type: Number,
      required: true
    }
  },
  emits: ['ability-action', 'cancel-ability'],
  data() {
    return {
      swapStep: 1,
      selectedPlayer1: null,
      selectedCard1: null,
      selectedPlayer2: null,
      selectedCard2: null
    }
  },
  watch: {
    type: {
      immediate: true,
      handler(newType) {
        // Reset state when type changes
        this.swapStep = 1
        this.selectedPlayer1 = null
        this.selectedCard1 = null
        this.selectedPlayer2 = null
        this.selectedCard2 = null
      }
    }
  },
  computed: {
    opponents() {
      return this.gameState.players
        .filter((_, index) => index !== this.currentPlayerIndex)
        .map((player, filteredIndex) => {
          // Mapear de volta para o índice original
          const originalIndex = this.gameState.players.findIndex(p => p === player)
          return { ...player, originalIndex }
        })
    },
    allPlayers() {
      return this.gameState.players.map((player, index) => ({ ...player, originalIndex: index }))
    },
    otherPlayers() {
      return this.gameState.players
        .filter((_, index) => index !== this.selectedPlayer1)
        .map((player, filteredIndex) => {
          const originalIndex = this.gameState.players.findIndex(p => p === player)
          return { ...player, originalIndex }
        })
    },
    selectedPlayer1Name() {
      return this.selectedPlayer1 !== null ? this.gameState.players[this.selectedPlayer1]?.nome : ''
    },
    selectedPlayer2Name() {
      return this.selectedPlayer2 !== null ? this.gameState.players[this.selectedPlayer2]?.nome : ''
    },
    selectedPlayer1Cards() {
      return this.selectedPlayer1 !== null ? this.gameState.players[this.selectedPlayer1]?.mao.length || 0 : 0
    },
    selectedPlayer2Cards() {
      return this.selectedPlayer2 !== null ? this.gameState.players[this.selectedPlayer2]?.mao.length || 0 : 0
    }
  },
  methods: {
    getIcon() {
      switch (this.type) {
        case 'own-card':
          return '👁️'
        case 'opponent-card':
          return '🔍'
        case 'swap-cards':
          return '🔄'
        default:
          return '✨'
      }
    },
    getTitle() {
      switch (this.type) {
        case 'own-card':
          return 'Ver Carta Própria'
        case 'opponent-card':
          return 'Ver Carta do Oponente'
        case 'swap-cards':
          return 'Trocar Cartas'
        default:
          return 'Habilidade'
      }
    },
    getDescription() {
      switch (this.type) {
        case 'own-card':
          return 'Escolha uma carta da sua mão para ver:'
        case 'opponent-card':
          return 'Escolha um oponente e uma carta para espiar:'
        case 'swap-cards':
          return 'Escolha dois jogadores e suas cartas para trocar:'
        default:
          return ''
      }
    },
    selectOwnCard(cardIndex) {
      this.$emit('ability-action', {
        type: 'own-card',
        cardIndex
      })
    },
    selectPlayer(playerIndex) {
      // Método auxiliar se necessário
    },
    selectOpponentCard(playerIndex, cardIndex) {
      this.$emit('ability-action', {
        type: 'opponent-card',
        playerIndex,
        cardIndex
      })
    },
    selectFirstPlayer(playerIndex) {
      this.selectedPlayer1 = playerIndex
      this.swapStep = 2
    },
    selectFirstCard(cardIndex) {
      this.selectedCard1 = cardIndex
      this.swapStep = 3
    },
    selectSecondPlayer(playerIndex) {
      this.selectedPlayer2 = playerIndex
      this.swapStep = 4
    },
    selectSecondCard(cardIndex) {
      this.selectedCard2 = cardIndex
      this.$emit('ability-action', {
        type: 'swap-cards',
        player1: this.selectedPlayer1,
        card1: this.selectedCard1,
        player2: this.selectedPlayer2,
        card2: cardIndex
      })
    }
  }
}
</script>

<style scoped>
/* Interface de habilidades Flash */
.flash-ability-interface {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 160;
  background: var(--flash-dark-gradient);
  border: 4px solid var(--flash-gold);
  border-radius: 30px;
  padding: 2.5rem;
  backdrop-filter: blur(25px);
  box-shadow: var(--flash-glow-strong), var(--flash-shadow-strong);
  position: relative;
  overflow: hidden;
  max-width: 90vw;
  max-height: 90vh;
  animation: flash-modal-enter var(--flash-slow) var(--flash-bounce);
}

.flash-ability-interface::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.1), transparent);
  animation: flash-ability-sweep 4s ease-in-out infinite;
}

@keyframes flash-ability-sweep {
  0% { left: -100%; }
  50% { left: 100%; }
  100% { left: 100%; }
}
/* Efeitos de fundo específicos por habilidade */
.ability-background-effects {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1;
  border-radius: 30px;
  overflow: hidden;
}

/* Efeito para Ver Carta Própria Flash */
.ability-own-card {
  border-color: var(--flash-neon-blue);
  box-shadow: 
    var(--flash-glow-strong),
    0 0 40px var(--flash-neon-blue),
    var(--flash-shadow-strong);
}

.eye-effect-flash {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 250px;
  height: 250px;
  opacity: 0.2;
}

.eye-pupil-flash {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, var(--flash-neon-blue) 0%, var(--flash-purple) 100%);
  border-radius: 50%;
  animation: flash-eye-blink 3s ease-in-out infinite;
  box-shadow: 0 0 30px var(--flash-neon-blue);
}

.eye-lid-flash {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 150px;
  height: 80px;
  background: linear-gradient(45deg, var(--flash-neon-blue) 0%, transparent 100%);
  border-radius: 50%;
  animation: flash-eye-lid-move 3s ease-in-out infinite;
}

.eye-glow-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(0, 255, 255, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  animation: flash-eye-glow 2s ease-in-out infinite;
}

@keyframes flash-eye-blink {
  0%, 90%, 100% { transform: translate(-50%, -50%) scaleY(1); }
  95% { transform: translate(-50%, -50%) scaleY(0.1); }
}

@keyframes flash-eye-lid-move {
  0%, 90%, 100% { transform: translate(-50%, -50%) scaleY(1); }
  95% { transform: translate(-50%, -50%) scaleY(0.1); }
}

@keyframes flash-eye-glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

/* Efeito para Ver Carta do Oponente Flash */
.ability-opponent-card {
  border-color: var(--flash-neon-pink);
  box-shadow: 
    var(--flash-glow-strong),
    0 0 40px var(--flash-neon-pink),
    var(--flash-shadow-strong);
}

.spy-effect-flash {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 120px;
  height: 120px;
  opacity: 0.3;
}

.spy-glass-flash {
  position: absolute;
  top: 0;
  left: 0;
  width: 120px;
  height: 120px;
  border: 4px solid var(--flash-neon-pink);
  border-radius: 50%;
  animation: flash-spy-scan 2s ease-in-out infinite;
  box-shadow: 0 0 20px var(--flash-neon-pink);
}

.spy-light-flash {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  background: var(--flash-neon-pink);
  border-radius: 50%;
  animation: flash-spy-light-move 2s ease-in-out infinite;
  box-shadow: 0 0 15px var(--flash-neon-pink);
}

.spy-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle, rgba(255, 20, 147, 0.1) 0%, transparent 50%);
  border-radius: 50%;
  animation: flash-spy-particles 3s ease-in-out infinite;
}

@keyframes flash-spy-scan {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(180deg); }
}

@keyframes flash-spy-light-move {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.5); }
}

@keyframes flash-spy-particles {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

/* Efeito para Trocar Cartas Flash */
.ability-swap-cards {
  border-color: var(--flash-neon-green);
  box-shadow: 
    var(--flash-glow-strong),
    0 0 40px var(--flash-neon-green),
    var(--flash-shadow-strong);
}

.swap-effect-flash {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 350px;
  height: 120px;
  opacity: 0.2;
}

.swap-arrows-flash {
  position: relative;
  width: 100%;
  height: 100%;
}

.arrow-left-flash, .arrow-right-flash {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 4rem;
  color: var(--flash-neon-green);
  animation: flash-swap-arrow-move 1.5s ease-in-out infinite;
  text-shadow: 0 0 20px var(--flash-neon-green);
}

.arrow-left-flash {
  left: 20px;
  animation-delay: 0s;
}

.arrow-right-flash {
  right: 20px;
  animation-delay: 0.75s;
}

.swap-glow-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 80px;
  background: linear-gradient(90deg, transparent, var(--flash-neon-green), transparent);
  opacity: 0.3;
  animation: flash-swap-glow 2s ease-in-out infinite;
}

@keyframes flash-swap-arrow-move {
  0%, 100% { transform: translateY(-50%) scale(1); }
  50% { transform: translateY(-50%) scale(1.3); }
}

@keyframes flash-swap-glow {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.5; }
}

/* Header da habilidade Flash */
.ability-header-flash {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
  z-index: 2;
  position: relative;
  padding: 1rem;
  background: var(--flash-dark-gradient);
  border-radius: 20px;
  border: 2px solid var(--flash-gold);
  box-shadow: var(--flash-glow-medium);
}

.ability-icon-flash {
  font-size: 3rem;
  animation: flash-ability-icon-pulse 2s ease-in-out infinite;
  text-shadow: 0 0 20px currentColor;
}

.ability-title-flash {
  color: var(--flash-gold);
  margin: 0;
  font-size: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: bold;
  text-shadow: 0 0 10px var(--flash-gold);
}

.ability-glow-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent, rgba(255, 215, 0, 0.1), transparent);
  border-radius: 20px;
  animation: flash-ability-glow 3s ease-in-out infinite;
}

@keyframes flash-ability-icon-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

@keyframes flash-ability-glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

.ability-panel-flash {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  z-index: 2;
  position: relative;
}

.ability-description-flash {
  color: var(--flash-text-light);
  text-align: center;
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.6;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
}

.ability-content-flash {
  width: 100%;
  max-width: 700px;
}

.hand-selection-flash {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
  padding: 1rem;
  background: var(--flash-dark-gradient);
  border-radius: 20px;
  border: 2px solid var(--flash-gold);
  box-shadow: var(--flash-glow-medium);
}

.hand-card-flash {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  cursor: pointer;
  transition: all var(--flash-fast) var(--flash-bounce);
  background: none;
  border: none;
  z-index: 2;
  padding: 0.5rem;
  border-radius: 15px;
}

.hand-card-flash:hover {
  transform: translateY(-12px) scale(1.1);
  background: rgba(255, 215, 0, 0.1);
}

.hand-card-flash:active {
  transform: translateY(-6px) scale(0.95);
}

.card-back-flash {
  width: 70px;
  height: 100px;
  background: var(--flash-card-gradient);
  border: 3px solid var(--flash-gold);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--flash-glow-medium), var(--flash-shadow-medium);
  position: relative;
  overflow: hidden;
}

.card-back-flash.small {
  width: 50px;
  height: 75px;
}

.card-symbol {
  font-size: 2.5rem;
  color: var(--flash-gold);
  text-shadow: 0 0 10px var(--flash-gold);
  z-index: 2;
}

.card-back-flash.small .card-symbol {
  font-size: 1.5rem;
}

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

.card-number-flash {
  background: var(--flash-gold);
  color: var(--flash-dark);
  padding: 0.4rem 0.8rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: bold;
  text-shadow: none;
  box-shadow: var(--flash-glow-small);
}

.players-selection-flash {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  background: var(--flash-dark-gradient);
  border-radius: 20px;
  border: 2px solid var(--flash-gold);
  box-shadow: var(--flash-glow-medium);
}

.player-option-flash {
  background: var(--flash-dark-gradient);
  border: 2px solid var(--flash-gold);
  border-radius: 15px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all var(--flash-fast) var(--flash-bounce);
  position: relative;
  overflow: hidden;
}

.player-option-flash:hover {
  border-color: var(--flash-neon-blue);
  background: rgba(0, 255, 255, 0.1);
  box-shadow: var(--flash-glow-medium);
  transform: translateY(-5px);
}

.player-info-flash {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.player-name-flash {
  color: var(--flash-gold);
  font-weight: bold;
  font-size: 1.1rem;
  text-shadow: 0 0 10px var(--flash-gold);
}

.card-count-flash {
  color: var(--flash-text-light);
  font-size: 1rem;
  background: var(--flash-gold);
  color: var(--flash-dark);
  padding: 0.3rem 0.8rem;
  border-radius: 10px;
  font-weight: bold;
}

.player-cards-flash {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  justify-content: center;
}

.card-option-flash {
  cursor: pointer;
  transition: all var(--flash-fast) var(--flash-bounce);
  position: relative;
}

.card-option-flash:hover {
  transform: scale(1.15) translateY(-5px);
}

.swap-interface-flash {
  width: 100%;
  padding: 1rem;
  background: var(--flash-dark-gradient);
  border-radius: 20px;
  border: 2px solid var(--flash-gold);
  box-shadow: var(--flash-glow-medium);
}

.swap-step-flash h5 {
  color: var(--flash-gold);
  margin-bottom: 2rem;
  text-align: center;
  font-size: 1.3rem;
  text-shadow: 0 0 10px var(--flash-gold);
}

.players-grid-flash {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.player-btn-flash {
  background: var(--flash-dark-gradient);
  border: 2px solid var(--flash-gold);
  color: var(--flash-gold);
  padding: 1.5rem;
  border-radius: 15px;
  cursor: pointer;
  transition: all var(--flash-fast) var(--flash-bounce);
  font-weight: bold;
  position: relative;
  overflow: hidden;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.player-btn-flash::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 215, 0, 0.2),
    transparent
  );
  transition: left var(--flash-medium);
}

.player-btn-flash:hover::before {
  left: 100%;
}

.player-btn-flash:hover {
  border-color: var(--flash-neon-green);
  background: rgba(0, 255, 0, 0.1);
  transform: translateY(-5px) scale(1.05);
  box-shadow: var(--flash-glow-medium);
}

.player-btn-flash:active {
  transform: translateY(-2px) scale(0.98);
}

.action-icon {
  font-size: 1.5rem;
  text-shadow: 0 0 10px currentColor;
}

.action-text {
  font-size: 1rem;
  text-shadow: 0 0 5px currentColor;
}

.ability-actions-flash {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 2rem;
  padding: 1rem;
  background: var(--flash-dark-gradient);
  border-radius: 20px;
  border: 2px solid var(--flash-gold);
  box-shadow: var(--flash-glow-medium);
}

.flash-action-btn {
  background: var(--flash-red-gradient);
  color: var(--flash-text-light);
  border: 2px solid var(--flash-red);
  padding: 1.2rem 2.5rem;
  border-radius: 15px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all var(--flash-fast) var(--flash-bounce);
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  box-shadow: var(--flash-glow-medium);
  position: relative;
  overflow: hidden;
}

.flash-action-btn::before {
  content: '';
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
}

.flash-action-btn:hover::before {
  left: 100%;
}

.flash-action-btn:hover {
  transform: translateY(-5px) scale(1.05);
  box-shadow: var(--flash-glow-strong);
  border-color: var(--flash-neon-pink);
}

.flash-action-btn:active {
  transform: translateY(-2px) scale(0.98);
}

.flash-action-btn.cancel {
  background: var(--flash-dark-gradient);
  border-color: var(--flash-gold);
  color: var(--flash-gold);
}

.flash-action-btn.cancel:hover {
  border-color: var(--flash-neon-pink);
  background: rgba(255, 20, 147, 0.1);
}
</style>
