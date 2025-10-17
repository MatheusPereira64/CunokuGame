<template>
  <div class="ability-interface" :class="`ability-${type}`">
    <!-- Efeitos de fundo específicos por habilidade -->
    <div class="ability-background-effects">
      <div v-if="type === 'own-card'" class="eye-effect">
        <div class="eye-pupil"></div>
        <div class="eye-lid"></div>
      </div>
      <div v-if="type === 'opponent-card'" class="spy-effect">
        <div class="spy-glass"></div>
        <div class="spy-light"></div>
      </div>
      <div v-if="type === 'swap-cards'" class="swap-effect">
        <div class="swap-arrows">
          <div class="arrow-left">↔</div>
          <div class="arrow-right">↔</div>
        </div>
      </div>
    </div>
    
    <div class="ability-panel">
      <div class="ability-header">
        <div class="ability-icon">{{ getIcon() }}</div>
        <h4>{{ getTitle() }}</h4>
      </div>
      <p>{{ getDescription() }}</p>
      
      <!-- Interface para ver carta própria -->
      <div v-if="type === 'own-card'" class="ability-content">
        <div class="hand-selection">
          <button v-for="(carta, idx) in gameState.players[currentPlayerIndex]?.mao || []" 
                  :key="`ver-${idx}`" class="hand-card" @click="selectOwnCard(idx)">
            <div class="card-back">
              <span>🂠</span>
            </div>
            <span class="card-number">{{ idx + 1 }}</span>
          </button>
        </div>
      </div>
      
      <!-- Interface para ver carta de oponente -->
      <div v-if="type === 'opponent-card'" class="ability-content">
        <div class="players-selection">
          <div v-for="player in opponents" :key="`player-${player.originalIndex}`" 
               class="player-option" @click="selectPlayer(player.originalIndex)">
            <div class="player-info">
              <span class="player-name">{{ player.nome }}</span>
              <span class="card-count">{{ player.mao.length }} cartas</span>
            </div>
            <div class="player-cards">
              <div v-for="(carta, cardIdx) in player.mao" :key="`card-${cardIdx}`" 
                   class="card-option" @click.stop="selectOpponentCard(player.originalIndex, cardIdx)">
                <div class="card-back small">
                  <span>🂠</span>
                </div>
                <span class="card-number">{{ cardIdx + 1 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Interface para trocar cartas -->
      <div v-if="type === 'swap-cards'" class="ability-content">
        <div class="swap-interface">
          <div class="swap-step" v-if="swapStep === 1">
            <h5>Escolha o primeiro jogador:</h5>
            <div class="players-grid">
              <button v-for="player in allPlayers" :key="`p1-${player.originalIndex}`"
                      class="player-btn" @click="selectFirstPlayer(player.originalIndex)">
                {{ player.nome }} ({{ player.mao.length }} cartas)
              </button>
            </div>
          </div>
          
          <div class="swap-step" v-if="swapStep === 2">
            <h5>Escolha a carta do {{ selectedPlayer1Name }}:</h5>
            <div class="hand-selection">
              <button v-for="n in selectedPlayer1Cards" :key="`c1-${n}`"
                      class="hand-card" @click="selectFirstCard(n-1)">
                <div class="card-back">
                  <span>🂠</span>
                </div>
                <span class="card-number">{{ n }}</span>
              </button>
            </div>
          </div>
          
          <div class="swap-step" v-if="swapStep === 3">
            <h5>Escolha o segundo jogador:</h5>
            <div class="players-grid">
              <button v-for="player in otherPlayers" :key="`p2-${player.originalIndex}`"
                      class="player-btn" @click="selectSecondPlayer(player.originalIndex)">
                {{ player.nome }} ({{ player.mao.length }} cartas)
              </button>
            </div>
          </div>
          
          <div class="swap-step" v-if="swapStep === 4">
            <h5>Escolha a carta do {{ selectedPlayer2Name }}:</h5>
            <div class="hand-selection">
              <button v-for="n in selectedPlayer2Cards" :key="`c2-${n}`"
                      class="hand-card" @click="selectSecondCard(n-1)">
                <div class="card-back">
                  <span>🂠</span>
                </div>
                <span class="card-number">{{ n }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="ability-actions">
        <button class="action-btn cancel" @click="$emit('cancel-ability')">Cancelar</button>
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
.ability-interface {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 160;
  background: 
    linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.85) 100%);
  border: 3px solid #d4af37;
  border-radius: 25px;
  padding: 2rem;
  backdrop-filter: blur(20px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  animation: ability-enter 0.5s ease-out;
}

@keyframes ability-enter {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
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
  border-radius: 25px;
  overflow: hidden;
}

/* Efeito para Ver Carta Própria */
.ability-own-card {
  border-color: #4169e1;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.8),
    0 0 30px rgba(65, 105, 225, 0.3);
}

.eye-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  opacity: 0.1;
}

.eye-pupil {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, #4169e1 0%, #1e3a8a 100%);
  border-radius: 50%;
  animation: eye-blink 3s ease-in-out infinite;
}

.eye-lid {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 60px;
  background: linear-gradient(45deg, #4169e1 0%, transparent 100%);
  border-radius: 50%;
  animation: eye-lid-move 3s ease-in-out infinite;
}

@keyframes eye-blink {
  0%, 90%, 100% { transform: translate(-50%, -50%) scaleY(1); }
  95% { transform: translate(-50%, -50%) scaleY(0.1); }
}

@keyframes eye-lid-move {
  0%, 90%, 100% { transform: translate(-50%, -50%) scaleY(1); }
  95% { transform: translate(-50%, -50%) scaleY(0.1); }
}

/* Efeito para Ver Carta do Oponente */
.ability-opponent-card {
  border-color: #dc2626;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.8),
    0 0 30px rgba(220, 38, 38, 0.3);
}

.spy-effect {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 100px;
  height: 100px;
  opacity: 0.2;
}

.spy-glass {
  position: absolute;
  top: 0;
  left: 0;
  width: 100px;
  height: 100px;
  border: 3px solid #dc2626;
  border-radius: 50%;
  animation: spy-scan 2s ease-in-out infinite;
}

.spy-light {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  background: #dc2626;
  border-radius: 50%;
  animation: spy-light-move 2s ease-in-out infinite;
}

@keyframes spy-scan {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(180deg); }
}

@keyframes spy-light-move {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.5); }
}

/* Efeito para Trocar Cartas */
.ability-swap-cards {
  border-color: #10b981;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.8),
    0 0 30px rgba(16, 185, 129, 0.3);
}

.swap-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 100px;
  opacity: 0.1;
}

.swap-arrows {
  position: relative;
  width: 100%;
  height: 100%;
}

.arrow-left, .arrow-right {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 3rem;
  color: #10b981;
  animation: swap-arrow-move 1.5s ease-in-out infinite;
}

.arrow-left {
  left: 20px;
  animation-delay: 0s;
}

.arrow-right {
  right: 20px;
  animation-delay: 0.75s;
}

@keyframes swap-arrow-move {
  0%, 100% { transform: translateY(-50%) scale(1); }
  50% { transform: translateY(-50%) scale(1.2); }
}

/* Header da habilidade */
.ability-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  z-index: 2;
  position: relative;
}

.ability-icon {
  font-size: 2rem;
  animation: ability-icon-pulse 2s ease-in-out infinite;
}

@keyframes ability-icon-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.ability-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.ability-panel h4 {
  color: #ffd700;
  margin: 0;
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.ability-panel p {
  color: #ccc;
  text-align: center;
  margin: 0;
}

.ability-content {
  width: 100%;
  max-width: 600px;
}

.hand-selection {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.hand-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: none;
  border: none;
  z-index: 2;
}

.hand-card:hover {
  transform: translateY(-8px) scale(1.05);
}

.hand-card:active {
  transform: translateY(-4px) scale(0.95);
}

.card-back {
  width: 60px;
  height: 90px;
  background: 
    linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border: 2px solid #d4af37;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.card-back.small {
  width: 40px;
  height: 60px;
}

.card-back span {
  font-size: 2rem;
  color: #eebbc3;
}

.card-back.small span {
  font-size: 1.2rem;
}

.card-number {
  background: #d4af37;
  color: #0f3d2e;
  padding: 0.3rem 0.6rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: bold;
}

.players-selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.player-option {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.player-option:hover {
  border-color: #d4af37;
  background: rgba(212, 175, 55, 0.1);
}

.player-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.player-name {
  color: #ffd700;
  font-weight: bold;
}

.card-count {
  color: #ccc;
  font-size: 0.9rem;
}

.player-cards {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.card-option {
  cursor: pointer;
  transition: all 0.3s ease;
}

.card-option:hover {
  transform: scale(1.1);
}

.swap-interface {
  width: 100%;
}

.swap-step h5 {
  color: #ffd700;
  margin-bottom: 1rem;
  text-align: center;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.player-btn {
  background: 
    linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%);
  border: 2px solid rgba(212, 175, 55, 0.3);
  color: #ffd700;
  padding: 1rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  position: relative;
  overflow: hidden;
  z-index: 2;
}

.player-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  transition: left 0.5s;
}

.player-btn:hover::before {
  left: 100%;
}

.player-btn:hover {
  border-color: #d4af37;
  background: 
    linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.1) 100%);
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 25px rgba(212, 175, 55, 0.3);
}

.player-btn:active {
  transform: translateY(0) scale(0.98);
}

.ability-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.action-btn {
  background: 
    linear-gradient(135deg, #8b0000 0%, #dc2626 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: 'Cinzel', serif;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.action-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
}
</style>
