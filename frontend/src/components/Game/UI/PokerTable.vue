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
            <span class="reaction-text">⚡ Reação: descarte cartas de valor "{{ gameState.valorReacao }}"!</span>
          </div>

          <!-- Banner de fim declarado -->
          <div v-if="gameState.fimDeclarado" class="endgame-banner">
            <span class="endgame-text">
              🏁 Fim declarado por {{ gameState.jogadorDeclarouFim }}! 
              {{ gameState.turnosRestantesFim }} {{ gameState.turnosRestantesFim === 1 ? 'turno restante' : 'turnos restantes' }}
            </span>
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
/* Container da mesa de poker - RESPONSIVO */
.poker-table-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0a4d3a 0%, #1a5f4a 50%, #0d3d2e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  padding: clamp(0.5rem, 2vw, 1.5rem);
  box-sizing: border-box;
  margin: 0 auto;
}

/* Mesa de poker - TAMANHO COMPACTO PARA CABER JOGADORES */
.poker-table {
  position: relative;
  width: clamp(200px, 35vw, 380px);
  height: clamp(130px, 22vh, 260px);
  background: linear-gradient(135deg, #2d5016 0%, #1a3009 70%, #0d1a05 100%);
  border: clamp(3px, 0.4vw, 6px) solid #d4af37;
  border-radius: clamp(10px, 1.5vw, 16px);
  box-shadow: 
    inset 0 0 clamp(15px, 3vw, 35px) rgba(0, 0, 0, 0.5),
    0 0 clamp(10px, 1.5vw, 20px) #d4af37,
    0 clamp(3px, 0.8vw, 8px) clamp(10px, 1.5vw, 20px) rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  margin: 0 auto;
  flex-shrink: 0;
}

/* Container dos jogadores - POSICIONAMENTO RESPONSIVO */
.players-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: clamp(300px, 95vw, 1100px);
  height: clamp(250px, 85vh, 650px);
  z-index: 3;
  pointer-events: none;
  display: grid;
  padding: clamp(0.25rem, 0.5vw, 0.5rem);
}

/* Posicionamento dos jogadores - GRID RESPONSIVO */
[data-player-count="2"] .players-container {
  display: grid;
  grid-template-areas:
    ". player-1 ."
    ". . ."
    ". player-0 .";
  grid-template-rows: auto 1fr auto;
  grid-template-columns: 1fr 1fr 1fr;
  gap: clamp(0.25rem, 1vh, 0.5rem);
  align-items: center;
  justify-items: center;
}

[data-player-count="3"] .players-container {
  display: grid;
  grid-template-areas:
    ". player-1 ."
    "player-2 . player-0"
    ". . .";
  grid-template-rows: auto 1fr auto;
  grid-template-columns: 1fr 1fr 1fr;
  gap: clamp(0.25rem, 1vh, 0.5rem);
  align-items: center;
  justify-items: center;
}

[data-player-count="4"] .players-container {
  display: grid;
  grid-template-areas:
    ". player-1 ."
    "player-2 . player-0"
    ". player-3 .";
  grid-template-rows: auto 1fr auto;
  grid-template-columns: 1fr 1fr 1fr;
  gap: clamp(0.25rem, 1vh, 0.5rem);
  align-items: center;
  justify-items: center;
}

[data-player-count="5"] .players-container {
  display: grid;
  grid-template-areas:
    "player-1 . player-2"
    "player-3 . player-0"
    ". player-4 .";
  grid-template-rows: auto 1fr auto;
  grid-template-columns: 1fr 1fr 1fr;
  gap: clamp(0.25rem, 1vh, 0.5rem);
  align-items: center;
  justify-items: center;
}

[data-player-count="6"] .players-container {
  display: grid;
  grid-template-areas:
    "player-1 . player-2"
    "player-3 . player-0"
    "player-4 . player-5";
  grid-template-rows: auto 1fr auto;
  grid-template-columns: 1fr 1fr 1fr;
  gap: clamp(0.25rem, 1vh, 0.5rem);
  align-items: center;
  justify-items: center;
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
  gap: clamp(0.5rem, 2vw, 1.2rem);
  width: 100%;
  height: 100%;
  padding: clamp(0.15rem, 0.5vw, 0.35rem);
}

/* Área do baralho */
.deck-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.1rem, 0.3vh, 0.25rem);
}

.deck-stack {
  position: relative;
  width: clamp(28px, 4.5vw, 42px);
  height: clamp(40px, 7vw, 60px);
}

.card-back {
  position: absolute;
  width: clamp(28px, 4.5vw, 42px);
  height: clamp(40px, 7vw, 60px);
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #1d4ed8 100%);
  border: clamp(1px, 0.15vw, 2px) solid #d4af37;
  border-radius: clamp(3px, 0.6vw, 6px);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 clamp(1px, 0.3vw, 3px) clamp(2px, 0.6vw, 5px) rgba(0, 0, 0, 0.3);
}

.card-symbol {
  font-size: clamp(10px, 2vw, 16px);
  color: #d4af37;
}

.deck-label, .discard-label {
  font-size: clamp(6px, 1vw, 9px);
  color: #d4af37;
  text-align: center;
  font-weight: bold;
  white-space: nowrap;
}

.empty-deck, .empty-discard {
  width: clamp(28px, 4.5vw, 42px);
  height: clamp(40px, 7vw, 60px);
  background: rgba(0, 0, 0, 0.3);
  border: clamp(1px, 0.15vw, 2px) dashed #d4af37;
  border-radius: clamp(3px, 0.6vw, 6px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(5px, 0.9vw, 7px);
  color: #d4af37;
}

/* Área de descarte */
.discard-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.1rem, 0.3vh, 0.25rem);
}

.discard-container {
  position: relative;
  width: clamp(28px, 4.5vw, 42px);
  height: clamp(40px, 7vw, 60px);
}

.top-discard-card {
  border-radius: clamp(4px, 0.8vw, 8px);
  box-shadow: 0 clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 8px) rgba(0, 0, 0, 0.3);
}

/* Info do jogo */
.game-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.15rem, 0.5vh, 0.4rem);
}

.turn-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.1rem, 0.3vh, 0.2rem);
}

.turn-text {
  font-size: clamp(8px, 1.5vw, 12px);
  color: #d4af37;
  font-weight: bold;
  white-space: nowrap;
}

.endgame-warning {
  background: rgba(220, 38, 38, 0.2);
  border: 1px solid #dc2626;
  border-radius: clamp(3px, 0.6vw, 6px);
  padding: clamp(0.1rem, 0.3vw, 0.25rem);
}

.warning-text {
  font-size: clamp(6px, 1vw, 9px);
  color: #fca5a5;
  text-align: center;
}

/* Banner de reação */
.reaction-banner {
  position: absolute;
  top: clamp(-30px, -5vh, -40px);
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  border: clamp(1px, 0.2vw, 2px) solid #fca5a5;
  border-radius: clamp(12px, 2vw, 20px);
  padding: clamp(0.25rem, 0.5vw, 0.5rem) clamp(0.5rem, 1vw, 1rem);
  box-shadow: 0 clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 8px) rgba(0, 0, 0, 0.3);
  animation: pulse-red 2s infinite;
  white-space: nowrap;
}

.reaction-text {
  font-size: clamp(9px, 1.5vw, 13px);
  color: #fca5a5;
  font-weight: bold;
}

/* Banner de fim de jogo */
.endgame-banner {
  position: absolute;
  top: clamp(-60px, -10vh, -80px);
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
  border: clamp(1px, 0.2vw, 2px) solid #c4b5fd;
  border-radius: clamp(12px, 2vw, 20px);
  padding: clamp(0.25rem, 0.5vw, 0.5rem) clamp(0.5rem, 1vw, 1rem);
  box-shadow: 0 clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 8px) rgba(0, 0, 0, 0.3);
  animation: pulse-purple 2s infinite;
  white-space: nowrap;
}

.endgame-text {
  font-size: clamp(9px, 1.5vw, 13px);
  color: #c4b5fd;
  font-weight: bold;
}

@keyframes pulse-red {
  0%, 100% { box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3); }
  50% { box-shadow: 0 4px 15px rgba(220, 38, 38, 0.5); }
}

@keyframes pulse-purple {
  0%, 100% { box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3); }
  50% { box-shadow: 0 4px 15px rgba(124, 58, 237, 0.5); }
}

/* Responsividade para tablets */
@media (max-width: 1024px) {
  .poker-table {
    width: clamp(250px, 55vw, 450px);
    height: clamp(160px, 28vh, 280px);
  }
  
  .players-container {
    width: clamp(300px, 90vw, 850px);
    height: clamp(260px, 65vh, 600px);
  }
}

/* Responsividade para celulares */
@media (max-width: 768px) {
  .poker-table-container {
    padding: clamp(0.25rem, 1vw, 0.75rem);
  }
  
  .poker-table {
    width: clamp(220px, 60vw, 380px);
    height: clamp(140px, 25vh, 240px);
    border-width: 3px;
  }
  
  .players-container {
    width: clamp(280px, 95vw, 700px);
    height: clamp(240px, 60vh, 500px);
  }
  
  .table-center {
    gap: clamp(0.5rem, 2vw, 1rem);
  }
}

/* Responsividade para celulares pequenos */
@media (max-width: 480px) {
  .poker-table {
    width: clamp(180px, 70vw, 300px);
    height: clamp(120px, 22vh, 200px);
    border-width: 2px;
  }
  
  .players-container {
    width: 98vw;
    height: clamp(220px, 55vh, 450px);
  }
}

/* Landscape em dispositivos móveis */
@media (max-height: 500px) and (orientation: landscape) {
  .poker-table {
    width: clamp(200px, 35vw, 350px);
    height: clamp(130px, 50vh, 250px);
  }
  
  .players-container {
    width: clamp(350px, 60vw, 700px);
    height: clamp(200px, 85vh, 400px);
  }
  
  .reaction-banner,
  .endgame-banner {
    top: auto;
    bottom: clamp(-25px, -3vh, -35px);
  }
}
</style>