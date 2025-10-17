<template>
  <div class="poker-table-container" :data-player-count="gameState.players.length">
    <!-- Efeitos de fundo da mesa -->
    <div class="table-background-effects">
      <div class="table-particles"></div>
      <div class="table-glow"></div>
    </div>
    
    <!-- Mesa quadrada de poker -->
    <div class="poker-table">
      <!-- Centro da mesa -->
      <div class="table-center">
        <!-- Baralho -->
        <div class="deck-area">
          <div class="deck-stack" v-if="gameState.baralho.length > 0">
            <div class="card-back" v-for="n in Math.min(3, gameState.baralho.length)" :key="n" 
                 :style="{ transform: `translate(${(n-1)*2}px, ${(n-1)*-2}px)`, zIndex: n }">
              <span class="card-symbol">🂠</span>
            </div>
          </div>
          <div v-else class="empty-deck">Vazio</div>
          <span class="deck-label">Baralho ({{ gameState.baralho.length }})</span>
        </div>
        
        <!-- Pilha de Descarte -->
        <div class="discard-area">
          <div class="discard-container">
            <CartaSvg v-if="gameState.pilha.length > 0" 
                     :valor="mapValorSvg(gameState.pilha[gameState.pilha.length-1].nome)" 
                     :naipe="mapNaipeSvg(gameState.pilha[gameState.pilha.length-1].naipe)" 
                     :width="60" :height="90" 
                     class="top-discard-card" />
            <div v-else class="empty-discard">Vazio</div>
          </div>
          <span class="discard-label">Descarte ({{ gameState.pilha.length }})</span>
        </div>
        
        <!-- Info do Jogo -->
        <div class="game-info">
          <div class="turn-indicator">
            <span class="turn-text">Turno {{ gameState.turnoAtual || 1 }}</span>
            <div v-if="gameState.fimDeclarado" class="endgame-warning">
              <span class="warning-text">Fim declarado! {{ gameState.turnosRestantesFim }} {{ gameState.turnosRestantesFim === 1 ? 'turno restante' : 'turnos restantes' }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Banner de reação -->
      <div v-if="gameState.reacaoAtiva" class="reaction-banner">
        <span class="reaction-text">Reação: descarte cartas de valor "{{ gameState.valorReacao }}"!</span>
      </div>
    </div>
    
    <!-- Players ao redor da mesa -->
    <div class="players-container">
      <slot name="players"></slot>
    </div>
  </div>
</template>

<script>
import CartaSvg from '../../CartaSvg.vue'

export default {
  name: 'PokerTable',
  components: {
    CartaSvg
  },
  props: {
    gameState: {
      type: Object,
      required: true
    }
  },
  methods: {
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
/* Container da mesa de poker */
.poker-table-container {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #0a4d3a 0%, #1a5f4a 50%, #0d3d2e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 2rem;
  box-sizing: border-box;
}

/* Mesa quadrada de poker */
.poker-table {
  position: relative;
  width: 600px;
  height: 400px;
  background: linear-gradient(135deg, #2d5016 0%, #1a3009 70%, #0d1a05 100%);
  border: 8px solid #d4af37;
  border-radius: 20px;
  box-shadow: 
    inset 0 0 50px rgba(0, 0, 0, 0.5),
    0 0 30px #d4af37,
    0 10px 30px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

/* Container dos jogadores */
.players-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  pointer-events: none;
}

/* Posicionamento dos jogadores ao redor da mesa */
[data-player-count="2"] .players-container {
  display: grid;
  grid-template-areas:
    ". . ."
    ". . ."
    ". player-0 ."
    ". . ."
    ". player-1 ."
    ". . .";
  grid-template-rows: 1fr 1fr 1fr 1fr 1fr 1fr;
  grid-template-columns: 1fr 1fr 1fr;
}

[data-player-count="3"] .players-container {
  display: grid;
  grid-template-areas:
    ". player-1 ."
    ". . ."
    "player-2 . player-0"
    ". . ."
    ". . ."
    ". . .";
  grid-template-rows: 1fr 1fr 1fr 1fr 1fr 1fr;
  grid-template-columns: 1fr 1fr 1fr;
}

[data-player-count="4"] .players-container {
  display: grid;
  grid-template-areas:
    ". player-1 ."
    ". . ."
    "player-2 . player-0"
    ". . ."
    ". player-3 ."
    ". . .";
  grid-template-rows: 1fr 1fr 1fr 1fr 1fr 1fr;
  grid-template-columns: 1fr 1fr 1fr;
}

[data-player-count="5"] .players-container {
  display: grid;
  grid-template-areas:
    "player-1 . player-2"
    ". . ."
    "player-3 . player-0"
    ". . ."
    ". player-4 ."
    ". . .";
  grid-template-rows: 1fr 1fr 1fr 1fr 1fr 1fr;
  grid-template-columns: 1fr 1fr 1fr;
}

[data-player-count="6"] .players-container {
  display: grid;
  grid-template-areas:
    "player-1 . player-2"
    ". . ."
    "player-3 . player-0"
    ". . ."
    "player-4 . player-5"
    ". . .";
  grid-template-rows: 1fr 1fr 1fr 1fr 1fr 1fr;
  grid-template-columns: 1fr 1fr 1fr;
}

/* Efeitos de fundo da mesa */
.table-background-effects {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

.table-particles {
  position: absolute;
  width: 100%;
  height: 100%;
  background: 
    radial-gradient(circle at 20% 20%, rgba(212, 175, 55, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(255, 215, 0, 0.1) 0%, transparent 50%);
  animation: table-particles 6s ease-in-out infinite;
}

.table-glow {
  position: absolute;
  top: -20%;
  left: -20%;
  width: 140%;
  height: 140%;
  background: radial-gradient(ellipse, rgba(212, 175, 55, 0.1) 0%, transparent 60%);
  animation: table-glow 4s ease-in-out infinite;
}

@keyframes table-particles {
  0%, 100% { opacity: 0.3; transform: translateY(0) rotate(0deg); }
  50% { opacity: 0.6; transform: translateY(-10px) rotate(180deg); }
}

@keyframes table-glow {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.1); }
}

/* Centro da mesa */
.table-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  width: 100%;
  height: 100%;
}

/* Área do baralho */
.deck-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.deck-stack {
  position: relative;
  width: 60px;
  height: 90px;
}

.card-back {
  position: absolute;
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

.card-symbol {
  font-size: 24px;
  color: #d4af37;
}

.deck-label, .discard-label {
  font-size: 12px;
  color: #d4af37;
  text-align: center;
  font-weight: bold;
}

.empty-deck, .empty-discard {
  width: 60px;
  height: 90px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px dashed #d4af37;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #d4af37;
}

/* Área de descarte */
.discard-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.discard-container {
  position: relative;
  width: 60px;
  height: 90px;
}

.top-discard-card {
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

/* Info do jogo */
.game-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.turn-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.turn-text {
  font-size: 16px;
  color: #d4af37;
  font-weight: bold;
}

.endgame-warning {
  background: rgba(220, 38, 38, 0.2);
  border: 2px solid #dc2626;
  border-radius: 8px;
  padding: 0.5rem;
}

.warning-text {
  font-size: 12px;
  color: #fca5a5;
  text-align: center;
}

/* Banner de reação */
.reaction-banner {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  border: 2px solid #fca5a5;
  border-radius: 20px;
  padding: 0.5rem 1rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.reaction-text {
  font-size: 14px;
  color: #fca5a5;
  font-weight: bold;
}
</style>