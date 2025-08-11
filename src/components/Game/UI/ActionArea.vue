<template>
  <div class="action-area">
    <div v-if="isCurrentPlayerTurn" class="current-player-actions">
      <button class="action-btn primary" @click="$emit('draw-card')" 
              v-if="!choosingAction && !pendingAction">
        🃏 Comprar Carta
      </button>
      
      <!-- Ações após comprar carta -->
      <div v-if="choosingAction && drawnCard" class="card-action-panel">
        <div class="bought-card-display">
          <h4>🎯 Carta Comprada:</h4>
          <CartaSvg :valor="mapValorSvg(drawnCard.nome)" 
                   :naipe="mapNaipeSvg(drawnCard.naipe)" 
                   :width="80" :height="120" />
        </div>
        <div class="action-buttons">
          <button class="action-btn" @click="$emit('toggle-substitute')" 
                  :disabled="substituteIndex !== null">
            🔄 Substituir carta da mão
          </button>
          <button class="action-btn" @click="$emit('discard-drawn-card')">
            🗑️ Descartar carta comprada
          </button>
          <button class="action-btn ability" @click="$emit('use-ability')">
            ✨ Usar habilidade da carta
          </button>
        </div>
        
        <!-- Interface de substituição -->
        <div v-if="substituteIndex !== null" class="substitute-interface">
          <span class="instruction">Selecione a carta da mão para substituir:</span>
          <div class="hand-selection">
            <button v-for="(carta, idx) in playerHand" 
                    :key="`sub-${idx}`" class="hand-card" @click="$emit('substitute-card', idx)">
              <div class="card-back">
                <span>🂠</span>
              </div>
              <span class="card-number">{{ idx + 1 }}</span>
            </button>
          </div>
          <button class="action-btn cancel" @click="$emit('cancel-substitute')">Cancelar</button>
        </div>
      </div>
    </div>
    
    <div v-else class="waiting-turn">
      <p>⏳ Aguarde sua vez...</p>
      <div class="current-player-indicator">
        Vez de: <strong>{{ currentPlayerName }}</strong>
      </div>
    </div>
    
    <!-- Botão de fim de jogo -->
    <div v-if="canDeclareEndGame" class="endgame-section">
      <button class="action-btn endgame" @click="$emit('declare-end-game')">
        🏁 Declarar Fim de Jogo
      </button>
    </div>
  </div>
</template>

<script>
import CartaSvg from '../../CartaSvg.vue'

export default {
  name: 'ActionArea',
  components: { CartaSvg },
  props: {
    isCurrentPlayerTurn: {
      type: Boolean,
      default: false
    },
    choosingAction: {
      type: Boolean,
      default: false
    },
    pendingAction: {
      type: Boolean,
      default: false
    },
    drawnCard: {
      type: Object,
      default: null
    },
    substituteIndex: {
      type: Number,
      default: null
    },
    playerHand: {
      type: Array,
      default: () => []
    },
    currentPlayerName: {
      type: String,
      default: ''
    },
    canDeclareEndGame: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'draw-card',
    'toggle-substitute',
    'discard-drawn-card',
    'use-ability',
    'substitute-card',
    'cancel-substitute',
    'declare-end-game'
  ],
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
/* Área de ações */
.action-area {
  position: fixed;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  z-index: 50;
  max-width: 95vw;
  background: 
    linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.85) 100%);
  padding: 0.8rem 1.2rem;
  border-radius: 15px;
  border: 2px solid #d4af37;
  backdrop-filter: blur(15px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.8);
}

.current-player-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
}

.action-btn {
  background: 
    linear-gradient(135deg, #d4af37 0%, #ffd700 100%);
  color: #0f3d2e;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-family: 'Cinzel', serif;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
}

.action-btn.primary {
  background: 
    linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
  color: white;
}

.action-btn.ability {
  background: 
    linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
  color: white;
}

.action-btn.cancel {
  background: 
    linear-gradient(135deg, #8b0000 0%, #dc2626 100%);
  color: white;
}

.action-btn.endgame {
  background: 
    linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0%, 100% { 
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4); 
  }
  50% { 
    box-shadow: 0 6px 25px rgba(245, 158, 11, 0.6); 
  }
}

/* Interface de ação de compra */
.card-action-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  background: 
    linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.7) 100%);
  padding: 1.5rem;
  border-radius: 15px;
  border: 2px solid #d4af37;
  backdrop-filter: blur(15px);
  max-width: 90vw;
}

.bought-card-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
}

.bought-card-display h4 {
  color: #ffd700;
  margin: 0;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.action-buttons {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  justify-content: center;
}

.action-buttons .action-btn {
  padding: 0.6rem 1.2rem;
  font-size: 0.8rem;
}

/* Interface de substituição */
.substitute-interface {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.5);
  padding: 1.5rem;
  border-radius: 15px;
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.instruction {
  color: #ffd700;
  font-weight: bold;
  text-align: center;
}

.hand-selection {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 600px;
}

.hand-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: none;
  border: none;
}

.hand-card:hover {
  transform: translateY(-5px);
}

.card-back {
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

.card-back span {
  font-size: 1.5rem;
  color: #eebbc3;
}

.card-number {
  background: #d4af37;
  color: #0f3d2e;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: bold;
}

/* Waiting turn */
.waiting-turn {
  text-align: center;
  color: #ccc;
}

.current-player-indicator {
  margin-top: 0.5rem;
  color: #ffd700;
  font-weight: bold;
}

/* Responsividade */
@media (max-width: 768px) {
  .action-area {
    padding: 0.7rem 0.9rem;
    gap: 0.5rem;
    bottom: 0.3rem;
    max-width: 98vw;
  }
  
  .action-btn {
    padding: 0.6rem 1rem;
    font-size: 0.75rem;
    letter-spacing: 0.4px;
  }
  
  .card-action-panel {
    padding: 0.9rem;
    gap: 0.7rem;
  }
  
  .action-buttons {
    gap: 0.5rem;
  }
  
  .action-buttons .action-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.65rem;
  }
}
</style>
