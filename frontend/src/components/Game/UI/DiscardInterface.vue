<template>
  <div class="flash-discard-interface">
    <div class="discard-panel-flash flash-modal-content">
      <div class="discard-header-flash">
        <div class="discard-icon-flash flash-glow-pulse">🎯</div>
        <h4 class="discard-title-flash flash-text-glow">Selecionar Segunda Carta</h4>
        <div class="discard-glow-effect"></div>
      </div>
      <p class="discard-description-flash">Selecione outra carta que você acredita ter o mesmo valor para descartar junto:</p>
      <div class="hand-selection-flash">
        <button v-for="(carta, idx) in filteredHand" :key="`discard-${idx.originalIndex}`" 
                class="hand-card-flash flash-hover-scale" @click="$emit('confirm-discard', idx.originalIndex)">
          <div class="card-back-flash">
            <span class="card-symbol">🂠</span>
            <div class="card-shine"></div>
          </div>
          <span class="card-number-flash">{{ idx.originalIndex + 1 }}</span>
        </button>
      </div>
      <div class="discard-actions-flash">
        <button class="flash-action-btn cancel" @click="$emit('cancel-discard')">
          <span class="action-icon">❌</span>
          <span class="action-text">Cancelar</span>
        </button>
      </div>
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
/* Interface de descarte Flash */
.flash-discard-interface {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 150;
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

.flash-discard-interface::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.1), transparent);
  animation: flash-discard-sweep 4s ease-in-out infinite;
}

@keyframes flash-discard-sweep {
  0% { left: -100%; }
  50% { left: 100%; }
  100% { left: 100%; }
}

.discard-panel-flash {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  z-index: 2;
  position: relative;
}

.discard-header-flash {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1rem;
  z-index: 2;
  position: relative;
  padding: 1rem;
  background: var(--flash-dark-gradient);
  border-radius: 20px;
  border: 2px solid var(--flash-gold);
  box-shadow: var(--flash-glow-medium);
}

.discard-icon-flash {
  font-size: 3rem;
  animation: flash-discard-icon-pulse 2s ease-in-out infinite;
  text-shadow: 0 0 20px currentColor;
}

.discard-title-flash {
  color: var(--flash-gold);
  margin: 0;
  font-size: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: bold;
  text-shadow: 0 0 10px var(--flash-gold);
}

.discard-glow-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent, rgba(255, 215, 0, 0.1), transparent);
  border-radius: 20px;
  animation: flash-discard-glow 3s ease-in-out infinite;
}

@keyframes flash-discard-icon-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

@keyframes flash-discard-glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

.discard-description-flash {
  color: var(--flash-text-light);
  text-align: center;
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.6;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
  max-width: 500px;
}

.hand-selection-flash {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
  padding: 1.5rem;
  background: var(--flash-dark-gradient);
  border-radius: 20px;
  border: 2px solid var(--flash-gold);
  box-shadow: var(--flash-glow-medium);
  max-width: 700px;
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

.card-symbol {
  font-size: 2.5rem;
  color: var(--flash-gold);
  text-shadow: 0 0 10px var(--flash-gold);
  z-index: 2;
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

.discard-actions-flash {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1rem;
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

.action-icon {
  font-size: 1.5rem;
  text-shadow: 0 0 10px currentColor;
}

.action-text {
  font-size: 1rem;
  text-shadow: 0 0 5px currentColor;
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
