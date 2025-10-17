<template>
  <div class="discard-interface">
    <div class="discard-panel">
      <h4>🎯 Selecionar Segunda Carta</h4>
      <p>Selecione outra carta que você acredita ter o mesmo valor para descartar junto:</p>
      <div class="hand-selection">
        <button v-for="(carta, idx) in filteredHand" :key="`discard-${idx.originalIndex}`" 
                class="hand-card" @click="$emit('confirm-discard', idx.originalIndex)">
          <div class="card-back">
            <span>🂠</span>
          </div>
          <span class="card-number">{{ idx.originalIndex + 1 }}</span>
        </button>
      </div>
      <button class="action-btn cancel" @click="$emit('cancel-discard')">Cancelar</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DiscardInterface',
  props: {
    playerHand: {
      type: Array,
      required: true
    },
    excludeIndex: {
      type: Number,
      required: true
    }
  },
  emits: ['confirm-discard', 'cancel-discard'],
  computed: {
    filteredHand() {
      return this.playerHand
        .map((carta, index) => ({ carta, originalIndex: index }))
        .filter(item => item.originalIndex !== this.excludeIndex)
    }
  }
}
</script>

<style scoped>
.discard-interface {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 150;
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
}

.discard-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.discard-panel h4 {
  color: #ffd700;
  margin: 0;
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.discard-panel p {
  color: #ccc;
  text-align: center;
  margin: 0;
  max-width: 400px;
}

.hand-selection {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 600px;
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
}

.hand-card:hover {
  transform: translateY(-8px);
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

.card-back span {
  font-size: 2rem;
  color: #eebbc3;
}

.card-number {
  background: #d4af37;
  color: #0f3d2e;
  padding: 0.3rem 0.6rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: bold;
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

@media (max-width: 768px) {
  .discard-interface {
    padding: 1.5rem;
  }
  
  .hand-selection {
    gap: 0.5rem;
  }
  
  .card-back {
    width: 50px;
    height: 75px;
  }
  
  .card-back span {
    font-size: 1.5rem;
  }
  
  .action-btn {
    padding: 0.8rem 1.5rem;
    font-size: 0.9rem;
  }
}
</style>
