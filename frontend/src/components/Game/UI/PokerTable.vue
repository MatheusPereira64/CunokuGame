<template>
  <div class="flash-poker-table-container" :data-player-count="gameState.players.length">
    <!-- Efeitos de fundo da mesa -->
    <div class="table-background-effects">
      <div class="table-particles"></div>
      <div class="table-glow"></div>
      <div class="table-ambient-light"></div>
    </div>
    
    <!-- Mesa de Poker Flash -->
    <div class="flash-poker-table">
      <!-- Centro da mesa com baralho e descarte -->
      <div class="table-center">
        <!-- Baralho -->
        <div class="center-deck">
          <div class="deck-area flash-card">
            <div class="deck-stack" v-if="gameState.baralho.length > 0">
              <div class="card-back-flash" v-for="n in Math.min(3, gameState.baralho.length)" :key="n" 
                   :style="{ transform: `translate(${(n-1)*3}px, ${(n-1)*-3}px)`, zIndex: n }">
                <span class="card-symbol">🂠</span>
                <div class="card-shine"></div>
              </div>
              <div class="deck-glow-effect"></div>
            </div>
            <div v-else class="empty-deck flash-text-glow">Vazio</div>
            <span class="deck-label flash-text-glow">Baralho ({{ gameState.baralho.length }})</span>
          </div>
        </div>
        
        <!-- Pilha de Descarte -->
        <div class="center-discard">
          <div class="discard-area flash-card">
            <div class="discard-container">
              <CartaSvg v-if="gameState.pilha.length > 0" 
                       :valor="mapValorSvg(gameState.pilha[gameState.pilha.length-1].nome)" 
                       :naipe="mapNaipeSvg(gameState.pilha[gameState.pilha.length-1].naipe)" 
                       :width="90" :height="130" 
                       class="top-discard-card-flash" />
              <div v-else class="empty-discard flash-text-glow">Vazio</div>
              <div class="discard-particles" v-if="gameState.pilha.length > 0"></div>
            </div>
            <span class="discard-label flash-text-glow">Descarte ({{ gameState.pilha.length }})</span>
          </div>
        </div>
        
        <!-- Info do Jogo -->
        <div class="game-info flash-card">
          <div class="turn-indicator">
            <div class="turn-display">
              <span class="turn-icon">🎯</span>
              <span class="turn-text flash-text-glow">Turno {{ gameState.turnoAtual || 1 }}</span>
            </div>
            <div v-if="gameState.fimDeclarado" class="endgame-warning flash-glow-pulse">
              <span class="warning-icon">⚠️</span>
              <span class="warning-text">Fim declarado! {{ gameState.turnosRestantesFim }} {{ gameState.turnosRestantesFim === 1 ? 'turno completo restante' : 'turnos completos restantes' }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Players ao redor da mesa -->
      <slot name="players"></slot>
      
      <!-- Banner de reação -->
      <div v-if="gameState.reacaoAtiva" class="reaction-banner flash-glow-pulse">
        <div class="reaction-content">
          <span class="reaction-icon">🃏</span>
          <span class="reaction-text">Reação aberta: descarte cartas de valor "{{ gameState.valorReacao }}"!</span>
        </div>
        <div class="reaction-glow"></div>
      </div>
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
/* Container da mesa de poker Flash */
.flash-poker-table-container {
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
    radial-gradient(circle at 20% 20%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(0, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(255, 20, 147, 0.05) 0%, transparent 70%);
  animation: flash-table-particles 6s ease-in-out infinite;
}

.table-glow {
  position: absolute;
  top: -20%;
  left: -20%;
  width: 140%;
  height: 140%;
  background: radial-gradient(ellipse, rgba(255, 215, 0, 0.1) 0%, transparent 60%);
  animation: flash-table-glow 4s ease-in-out infinite;
}

.table-ambient-light {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(ellipse at 30% 30%, rgba(255, 215, 0, 0.05) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 70%, rgba(0, 255, 255, 0.05) 0%, transparent 50%);
  animation: flash-ambient-light 8s ease-in-out infinite;
}

@keyframes flash-table-particles {
  0%, 100% { opacity: 0.3; transform: translateY(0) rotate(0deg); }
  50% { opacity: 0.6; transform: translateY(-10px) rotate(180deg); }
}

@keyframes flash-table-glow {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.1); }
}

@keyframes flash-ambient-light {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

/* Mesa oval de poker Flash - tamanho adaptativo */
.flash-poker-table {
  position: relative;
  width: clamp(600px, 70vw, 900px);
  height: clamp(400px, 50vh, 600px);
  background: 
    radial-gradient(ellipse at center, #2d5016 0%, #1a3009 70%, #0d1a05 100%);
  border-radius: 50%;
  border: 8px solid var(--flash-gold);
  box-shadow: 
    inset 0 0 50px rgba(0, 0, 0, 0.5),
    0 0 30px var(--flash-gold),
    var(--flash-shadow-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 2rem auto;
  overflow: hidden;
  z-index: 2;
}

.flash-poker-table::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 30% 30%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 70% 70%, rgba(0, 255, 255, 0.1) 0%, transparent 50%);
  animation: flash-table-glow 4s ease-in-out infinite;
}
/* Tamanhos específicos baseados no número de jogadores */
[data-player-count="2"] .flash-poker-table {
  width: clamp(500px, 60vw, 700px);
  height: clamp(350px, 40vh, 500px);
}

[data-player-count="3"] .flash-poker-table {
  width: clamp(550px, 65vw, 800px);
  height: clamp(375px, 45vh, 550px);
}

[data-player-count="4"] .flash-poker-table {
  width: clamp(600px, 70vw, 850px);
  height: clamp(400px, 50vh, 575px);
}

[data-player-count="5"] .flash-poker-table {
  width: clamp(650px, 75vw, 900px);
  height: clamp(425px, 52vh, 600px);
}

[data-player-count="6"] .flash-poker-table {
  width: clamp(700px, 80vw, 950px);
  height: clamp(450px, 55vh, 625px);
}

/* Centro da mesa Flash */
.table-center {
  position: absolute;
  width: 280px;
  height: 180px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  background: var(--flash-dark-gradient);
  border-radius: 20px;
  border: 3px solid var(--flash-gold);
  gap: 1.5rem;
  z-index: 3;
  padding: 1.5rem;
  box-shadow: var(--flash-glow), var(--flash-shadow-strong);
  position: relative;
  overflow: hidden;
}

.table-center::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.1), transparent);
  animation: flash-center-sweep 3s ease-in-out infinite;
}

@keyframes flash-center-sweep {
  0% { left: -100%; }
  50% { left: 100%; }
  100% { left: 100%; }
}

/* Área do baralho Flash */
.center-deck {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
}

.deck-area {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: var(--flash-dark-gradient);
  padding: 1rem;
  border-radius: 15px;
  border: 2px solid var(--flash-gold);
  box-shadow: var(--flash-glow);
}

.deck-stack {
  position: relative;
  width: 70px;
  height: 100px;
}

.card-back-flash {
  position: absolute;
  width: 70px;
  height: 100px;
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

.deck-glow-effect {
  position: absolute;
  top: -10px;
  left: -10px;
  right: -10px;
  bottom: -10px;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, transparent 70%);
  border-radius: 15px;
  animation: flash-deck-glow 2s ease-in-out infinite;
}

@keyframes flash-deck-glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

.empty-deck, .empty-discard {
  width: 70px;
  height: 100px;
  border: 3px dashed var(--flash-gold);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--flash-gold);
  font-size: 0.9rem;
  font-weight: bold;
  text-shadow: 0 0 5px currentColor;
}

.deck-label, .discard-label {
  font-size: 0.8rem;
  color: var(--flash-gold);
  text-align: center;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-shadow: 0 0 5px currentColor;
}

/* Área de descarte Flash */
.center-discard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
}

.discard-area {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: var(--flash-dark-gradient);
  padding: 1rem;
  border-radius: 15px;
  border: 2px solid var(--flash-gold);
  box-shadow: var(--flash-glow);
}

.discard-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.top-discard-card-flash {
  box-shadow: var(--flash-glow-strong), var(--flash-shadow-strong);
  border-radius: 12px;
  animation: flash-discard-card 0.5s var(--flash-bounce);
}

@keyframes flash-discard-card {
  from { 
    transform: scale(0.5) rotate(-180deg);
    opacity: 0;
  }
  to { 
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.discard-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 50%);
  border-radius: 50%;
  animation: flash-particles-pulse 2s ease-in-out infinite;
}

/* Info do jogo Flash */
.game-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  background: var(--flash-dark-gradient);
  padding: 1rem;
  border-radius: 15px;
  border: 2px solid var(--flash-gold);
  box-shadow: var(--flash-glow);
}

.turn-indicator {
  text-align: center;
}

.turn-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.turn-icon {
  font-size: 1.5rem;
  animation: flash-icon-spin 2s linear infinite;
}

@keyframes flash-icon-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.turn-text {
  color: var(--flash-gold);
  font-weight: bold;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-shadow: 0 0 10px currentColor;
}

.endgame-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--flash-neon-pink);
  font-size: 0.9rem;
  font-weight: bold;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: rgba(255, 20, 147, 0.1);
  border-radius: 10px;
  border: 1px solid var(--flash-neon-pink);
  text-shadow: 0 0 5px currentColor;
}

.warning-icon {
  font-size: 1.2rem;
  animation: flash-warning-bounce 1s ease-in-out infinite;
}

@keyframes flash-warning-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

/* Banner de reação Flash */
.reaction-banner {
  position: absolute;
  bottom: -60px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--flash-gold-gradient);
  color: var(--japanese-black);
  padding: 1rem 2rem;
  border-radius: 20px;
  font-weight: bold;
  letter-spacing: 1px;
  box-shadow: var(--flash-glow-strong), var(--flash-shadow-strong);
  border: 3px solid var(--flash-gold);
  z-index: 4;
  position: relative;
  overflow: hidden;
}

.reaction-content {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  position: relative;
  z-index: 2;
}

.reaction-icon {
  font-size: 1.5rem;
  animation: flash-reaction-spin 2s linear infinite;
}

@keyframes flash-reaction-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.reaction-text {
  font-size: 1rem;
  font-weight: bold;
  text-transform: uppercase;
}

.reaction-glow {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: flash-reaction-shine 2s ease-in-out infinite;
}

@keyframes flash-reaction-shine {
  0% { left: -100%; }
  50% { left: 100%; }
  100% { left: 100%; }
}

/* Responsividade baseada no número de jogadores */
@media (max-width: 1024px) {
  .flash-poker-table {
    width: clamp(450px, 80vw, 650px);
    height: clamp(300px, 45vh, 450px);
  }
  
  [data-player-count="5"] .flash-poker-table,
  [data-player-count="6"] .flash-poker-table {
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
  .flash-poker-table {
    width: clamp(350px, 85vw, 500px);
    height: clamp(250px, 40vh, 350px);
    border: 4px solid var(--gold-accent);
  }
  
  [data-player-count="4"] .flash-poker-table,
  [data-player-count="5"] .flash-poker-table,
  [data-player-count="6"] .flash-poker-table {
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
  [data-player-count="5"] .flash-poker-table,
  [data-player-count="6"] .flash-poker-table {
    width: clamp(320px, 95vw, 450px);
    height: clamp(220px, 38vh, 320px);
  }
}
</style>
