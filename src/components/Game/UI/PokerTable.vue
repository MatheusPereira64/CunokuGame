<template>
  <div class="poker-table-container" :data-player-count="gameState.players.length">
    <!-- Mesa de Poker Oval -->
    <div class="poker-table">
      <!-- Centro da mesa com baralho e descarte -->
      <div class="table-center">
        <!-- Baralho -->
        <div class="center-deck">
          <div class="deck-area">
            <div class="deck-stack" v-if="gameState.baralho.length > 0">
              <div class="card-back" v-for="n in Math.min(3, gameState.baralho.length)" :key="n" 
                   :style="{ transform: `translate(${(n-1)*2}px, ${(n-1)*-2}px)`, zIndex: n }">
                <span>🂠</span>
              </div>
            </div>
            <div v-else class="empty-deck">Vazio</div>
            <span class="deck-label">Baralho ({{ gameState.baralho.length }})</span>
          </div>
        </div>
        
        <!-- Pilha de Descarte -->
        <div class="center-discard">
          <div class="discard-area">
            <CartaSvg v-if="gameState.pilha.length > 0" 
                     :valor="mapValorSvg(gameState.pilha[gameState.pilha.length-1].nome)" 
                     :naipe="mapNaipeSvg(gameState.pilha[gameState.pilha.length-1].naipe)" 
                     :width="80" :height="120" 
                     class="top-discard-card" />
            <div v-else class="empty-discard">Vazio</div>
            <span class="discard-label">Descarte ({{ gameState.pilha.length }})</span>
          </div>
        </div>
        
        <!-- Info do Jogo -->
        <div class="game-info">
          <div class="turn-indicator">
            <span class="turn-text">Turno {{ gameState.turnoAtual || 1 }}</span>
            <div v-if="gameState.fimDeclarado" class="endgame-warning">
              ⚠️ Fim declarado! {{ gameState.turnosRestantesFim }} {{ gameState.turnosRestantesFim === 1 ? 'turno completo restante' : 'turnos completos restantes' }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Players ao redor da mesa -->
      <slot name="players"></slot>
    </div>
  </div>
</template>

<script>
import CartaSvg from '../../CartaSvg.vue'

export default {
  name: 'PokerTable',
  components: { CartaSvg },
  props: {
    gameState: {
      type: Object,
      required: true
    }
  },
  methods: {
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
/* Variáveis CSS para o tema de poker luxuoso */
:root {
  --poker-green: #1a4d3a;
  --poker-green-light: #2d5a47;
  --felt-green: #0f3d2e;
  --gold-accent: #d4af37;
  --gold-light: #ffd700;
  --poker-red: #8b0000;
  --poker-blue: #1e3a8a;
  --table-shadow: 0 0 50px rgba(0, 0, 0, 0.8);
}

/* Container da mesa de poker */
.poker-table-container {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 4rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
  overflow-y: auto;
}

/* Mesa oval de poker - tamanho adaptativo */
.poker-table {
  position: relative;
  width: clamp(600px, 70vw, 900px);
  height: clamp(400px, 50vh, 600px);
  background: 
    radial-gradient(ellipse, var(--poker-green-light) 0%, var(--poker-green) 50%, var(--felt-green) 100%);
  border-radius: 50%;
  border: 6px solid var(--gold-accent);
  box-shadow: 
    var(--table-shadow),
    inset 0 0 100px rgba(0, 0, 0, 0.3),
    0 0 0 3px rgba(212, 175, 55, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 2rem auto;
}

/* Tamanhos específicos baseados no número de jogadores */
[data-player-count="2"] .poker-table {
  width: clamp(500px, 60vw, 700px);
  height: clamp(350px, 40vh, 500px);
}

[data-player-count="3"] .poker-table {
  width: clamp(550px, 65vw, 800px);
  height: clamp(375px, 45vh, 550px);
}

[data-player-count="4"] .poker-table {
  width: clamp(600px, 70vw, 850px);
  height: clamp(400px, 50vh, 575px);
}

[data-player-count="5"] .poker-table {
  width: clamp(650px, 75vw, 900px);
  height: clamp(425px, 52vh, 600px);
}

[data-player-count="6"] .poker-table {
  width: clamp(700px, 80vw, 950px);
  height: clamp(450px, 55vh, 625px);
}

/* Padrão de feltro na mesa */
.poker-table::after {
  content: '';
  position: absolute;
  top: 10%;
  left: 10%;
  right: 10%;
  bottom: 10%;
  background: 
    repeating-conic-gradient(
      from 0deg at center,
      transparent 0deg,
      rgba(212, 175, 55, 0.05) 15deg,
      transparent 30deg
    );
  border-radius: 50%;
  pointer-events: none;
}

/* Centro da mesa */
.table-center {
  position: absolute;
  width: 240px;
  height: 160px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  background: 
    linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  border-radius: 15px;
  border: 2px solid rgba(212, 175, 55, 0.4);
  gap: 1rem;
  z-index: 2;
  padding: 1rem;
}

/* Área do baralho */
.center-deck {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.deck-area {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
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
  background: 
    linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border: 2px solid var(--gold-accent);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.card-back span {
  font-size: 1.8rem;
  color: #eebbc3;
}

.empty-deck, .empty-discard {
  width: 60px;
  height: 90px;
  border: 2px dashed rgba(212, 175, 55, 0.5);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gold-accent);
  font-size: 0.8rem;
  font-weight: bold;
}

.deck-label, .discard-label {
  font-size: 0.7rem;
  color: var(--gold-light);
  text-align: center;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Área de descarte */
.center-discard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.discard-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.top-discard-card {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
  border-radius: 8px;
}

/* Info do jogo */
.game-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.turn-indicator {
  text-align: center;
}

.turn-text {
  color: var(--gold-light);
  font-weight: bold;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.endgame-warning {
  color: #ff6b6b;
  font-size: 0.8rem;
  font-weight: bold;
  margin-top: 0.3rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Responsividade baseada no número de jogadores */
@media (max-width: 1024px) {
  .poker-table {
    width: clamp(450px, 80vw, 650px);
    height: clamp(300px, 45vh, 450px);
  }
  
  [data-player-count="5"] .poker-table,
  [data-player-count="6"] .poker-table {
    width: clamp(500px, 85vw, 700px);
    height: clamp(325px, 48vh, 475px);
  }
  
  .table-center {
    width: 180px;
    height: 120px;
    gap: 0.8rem;
  }
}

@media (max-width: 768px) {
  .poker-table {
    width: clamp(350px, 85vw, 500px);
    height: clamp(250px, 40vh, 350px);
    border: 4px solid var(--gold-accent);
  }
  
  [data-player-count="4"] .poker-table,
  [data-player-count="5"] .poker-table,
  [data-player-count="6"] .poker-table {
    width: clamp(380px, 90vw, 520px);
    height: clamp(270px, 42vh, 370px);
  }
  
  .table-center {
    width: 140px;
    height: 90px;
    gap: 0.5rem;
    padding: 0.6rem;
  }
}

@media (max-width: 480px) {
  [data-player-count="5"] .poker-table,
  [data-player-count="6"] .poker-table {
    width: clamp(320px, 95vw, 450px);
    height: clamp(220px, 38vh, 320px);
  }
}
</style>
