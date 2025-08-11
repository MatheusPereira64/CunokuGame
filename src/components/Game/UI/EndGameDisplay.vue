<template>
  <div class="endgame-display">
    <div class="endgame-panel">
      <h2>🏆 Fim de Jogo!</h2>
      
      <div class="results-section">
        <h3>Resultados Finais:</h3>
        <div class="results-table">
          <div v-for="(result, idx) in sortedResults" :key="idx" 
               class="result-row" :class="{ 'winner': isWinner(result) }">
            <div class="player-rank">
              {{ idx + 1 }}º
            </div>
            <div class="player-name">
              {{ result.nome }}
            </div>
            <div class="player-score">
              {{ result.soma }} pontos
            </div>
            <div v-if="isWinner(result)" class="winner-badge">
              👑 Vencedor!
            </div>
          </div>
        </div>
      </div>
      
      <div class="winners-section" v-if="results.vencedores.length > 0">
        <h3>🎉 Parabéns!</h3>
        <div class="winners-list">
          <span v-for="(winner, idx) in results.vencedores" :key="idx" class="winner-name">
            {{ winner }}{{ idx < results.vencedores.length - 1 ? ', ' : '' }}
          </span>
        </div>
        <p class="winner-message">
          {{ results.vencedores.length === 1 ? 'Venceu' : 'Venceram' }} com a menor pontuação!
        </p>
      </div>
      
      <div class="player-cards-section">
        <h4>Cartas Finais dos Jogadores:</h4>
        <div class="players-cards">
          <div v-for="(player, idx) in results.jogadores" :key="idx" class="player-cards-display">
            <h5>{{ player.nome }}</h5>
            <div class="final-hand">
              <CartaSvg v-for="(carta, cardIdx) in player.mao" :key="cardIdx"
                       :valor="mapValorSvg(carta.nome)" 
                       :naipe="mapNaipeSvg(carta.naipe)" 
                       :width="50" :height="75" />
            </div>
            <div class="hand-total">
              Total: {{ calculateHandSum(player.mao) }} pontos
            </div>
          </div>
        </div>
      </div>
      
      <div class="endgame-actions">
        <button class="action-btn primary" @click="$emit('new-game')">
          🎮 Novo Jogo
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import CartaSvg from '../../CartaSvg.vue'

export default {
  name: 'EndGameDisplay',
  components: { CartaSvg },
  props: {
    results: {
      type: Object,
      required: true
    }
  },
  emits: ['new-game'],
  computed: {
    sortedResults() {
      if (!this.results.somas) return []
      return [...this.results.somas].sort((a, b) => a.soma - b.soma)
    }
  },
  methods: {
    isWinner(result) {
      return this.results.vencedores.includes(result.nome)
    },
    calculateHandSum(hand) {
      return hand.reduce((sum, carta) => {
        return sum + (typeof carta.valor === 'number' ? carta.valor : 0)
      }, 0)
    },
    mapValorSvg(nome) {
      switch (nome) {
        case 'Ás': return 'A'
        case 'Às': return 'A'
        case 'Dois': return '2'
        case 'Três': return '3'
        case 'Quatro': return '4'
        case 'Cinco': return '5'
        case 'Seis': return '6'
        case 'Sete': return '7'
        case 'Oito': return '8'
        case 'Nove': return '9'
        case 'Dez': return '10'
        case 'Valete': return 'J'
        case 'Rainha': return 'Q'
        case 'Rei': return 'K'
        case 'Coringa': return 'C'
        default: return null
      }
    },
    mapNaipeSvg(naipe) {
      switch (naipe) {
        case '♠': return 'S'
        case '♥': return 'H'
        case '♦': return 'D'
        case '♣': return 'C'
        default: return null
      }
    }
  }
}
</script>

<style scoped>
.endgame-display {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 300;
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
  min-width: 600px;
}

.endgame-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.endgame-panel h2 {
  color: #ffd700;
  margin: 0;
  font-size: 2rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-align: center;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.results-section {
  width: 100%;
}

.results-section h3 {
  color: #ffd700;
  text-align: center;
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.results-table {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 15px;
  padding: 1rem;
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.result-row {
  display: grid;
  grid-template-columns: 60px 1fr 120px 120px;
  align-items: center;
  padding: 0.8rem;
  border-bottom: 1px solid rgba(212, 175, 55, 0.2);
  transition: all 0.3s ease;
}

.result-row:last-child {
  border-bottom: none;
}

.result-row.winner {
  background: 
    linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.1) 100%);
  border: 1px solid rgba(255, 215, 0, 0.5);
  border-radius: 10px;
  margin: 0.2rem 0;
}

.player-rank {
  font-size: 1.2rem;
  font-weight: bold;
  color: #d4af37;
  text-align: center;
}

.player-name {
  font-weight: bold;
  color: #ffd700;
  font-size: 1.1rem;
}

.player-score {
  color: #ccc;
  text-align: center;
  font-size: 1rem;
}

.winner-badge {
  color: #ffd700;
  font-weight: bold;
  text-align: center;
  animation: glow 2s ease-in-out infinite alternate;
}

@keyframes glow {
  0% { text-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
  100% { text-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
}

.winners-section {
  text-align: center;
  background: 
    linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%);
  padding: 1.5rem;
  border-radius: 15px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.winners-section h3 {
  color: #ffd700;
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.winners-list {
  margin-bottom: 1rem;
}

.winner-name {
  color: #ffd700;
  font-weight: bold;
  font-size: 1.2rem;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.winner-message {
  color: #ccc;
  font-style: italic;
}

.player-cards-section {
  width: 100%;
}

.player-cards-section h4 {
  color: #ffd700;
  text-align: center;
  margin-bottom: 1rem;
}

.players-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.player-cards-display {
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.player-cards-display h5 {
  color: #ffd700;
  margin: 0 0 0.5rem 0;
  text-align: center;
}

.final-hand {
  display: flex;
  gap: 0.3rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.hand-total {
  text-align: center;
  color: #ccc;
  font-weight: bold;
}

.endgame-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.action-btn {
  background: 
    linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
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

@media (max-width: 768px) {
  .endgame-display {
    min-width: auto;
    max-width: 95vw;
    padding: 1.5rem;
  }
  
  .result-row {
    grid-template-columns: 50px 1fr 100px;
    gap: 0.5rem;
  }
  
  .winner-badge {
    grid-column: 1 / -1;
    text-align: center;
    margin-top: 0.5rem;
  }
  
  .players-cards {
    grid-template-columns: 1fr;
  }
  
  .final-hand {
    gap: 0.2rem;
  }
}
</style>
