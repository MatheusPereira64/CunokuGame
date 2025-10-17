<template>
  <Transition name="achievement-notification" appear>
    <div 
      v-if="notification"
      class="achievement-notification"
      :class="[
        `rarity-${notification.achievement.rarity}`,
        { 'clickable': clickable }
      ]"
      @click="handleClick"
    >
      <div class="achievement-icon">
        {{ notification.achievement.icon }}
      </div>
      
      <div class="achievement-content">
        <div class="achievement-title">
          🏆 Conquista Desbloqueada!
        </div>
        <div class="achievement-name">
          {{ notification.achievement.name }}
        </div>
        <div class="achievement-description">
          {{ notification.achievement.description }}
        </div>
        
        <div v-if="notification.achievement.reward" class="achievement-reward">
          <span v-if="notification.achievement.reward.xp" class="xp-reward">
            +{{ notification.achievement.reward.xp }} XP
          </span>
          <span v-if="notification.achievement.reward.title" class="title-reward">
            {{ notification.achievement.reward.title }}
          </span>
        </div>
      </div>
      
      <div class="achievement-close" @click.stop="close">
        ✕
      </div>
      
      <div class="achievement-progress">
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  notification: {
    type: Object,
    required: true
  },
  clickable: {
    type: Boolean,
    default: true
  },
  autoClose: {
    type: Boolean,
    default: true
  },
  duration: {
    type: Number,
    default: 5000
  }
})

const emit = defineEmits(['close', 'click'])

let closeTimeout = null

const handleClick = () => {
  if (props.clickable) {
    emit('click', props.notification)
  }
}

const close = () => {
  emit('close', props.notification.id)
}

onMounted(() => {
  if (props.autoClose) {
    closeTimeout = setTimeout(() => {
      close()
    }, props.duration)
  }
})

onUnmounted(() => {
  if (closeTimeout) {
    clearTimeout(closeTimeout)
  }
})
</script>

<style scoped>
.achievement-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 350px;
  min-height: 100px;
  background: linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 100%);
  border: 2px solid #D4AF37;
  border-radius: 15px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(212, 175, 55, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  z-index: 10000;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}

.achievement-notification::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(212, 175, 55, 0.1),
    transparent
  );
  animation: achievement-shine 2s ease-in-out;
}

.achievement-notification:hover {
  transform: translateX(-5px) scale(1.02);
  box-shadow: 
    0 12px 40px rgba(212, 175, 55, 0.4),
    0 0 0 2px rgba(212, 175, 55, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.achievement-icon {
  font-size: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: var(--gold-gradient);
  border-radius: 50%;
  box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
  animation: achievement-bounce 0.6s ease-out;
}

.achievement-content {
  flex: 1;
  color: var(--pearl-white);
}

.achievement-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--secondary-gold);
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.achievement-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--pearl-white);
  margin-bottom: 5px;
  font-family: 'Cinzel', serif;
}

.achievement-description {
  font-size: 0.85rem;
  color: rgba(248, 248, 255, 0.8);
  line-height: 1.4;
  margin-bottom: 8px;
}

.achievement-reward {
  display: flex;
  gap: 10px;
  align-items: center;
}

.xp-reward {
  background: var(--gold-gradient);
  color: var(--japanese-black);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
}

.title-reward {
  background: rgba(212, 175, 55, 0.2);
  color: var(--secondary-gold);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.achievement-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  color: rgba(248, 248, 255, 0.6);
  border-radius: 50%;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.achievement-close:hover {
  background: rgba(220, 20, 60, 0.8);
  color: white;
  transform: scale(1.1);
}

.achievement-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.progress-bar {
  width: 100%;
  height: 100%;
  position: relative;
}

.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--gold-gradient);
  width: 100%;
  animation: achievement-progress 5s linear;
}

/* Raridades */
.achievement-notification.rarity-common {
  border-color: #808080;
}

.achievement-notification.rarity-uncommon {
  border-color: #00FF00;
  box-shadow: 
    0 8px 32px rgba(0, 255, 0, 0.3),
    0 0 0 1px rgba(0, 255, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.achievement-notification.rarity-rare {
  border-color: #0080FF;
  box-shadow: 
    0 8px 32px rgba(0, 128, 255, 0.3),
    0 0 0 1px rgba(0, 128, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.achievement-notification.rarity-epic {
  border-color: #8000FF;
  box-shadow: 
    0 8px 32px rgba(128, 0, 255, 0.3),
    0 0 0 1px rgba(128, 0, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.achievement-notification.rarity-legendary {
  border-color: #FF8000;
  box-shadow: 
    0 8px 32px rgba(255, 128, 0, 0.3),
    0 0 0 1px rgba(255, 128, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: achievement-glow 2s ease-in-out infinite alternate;
}

/* Animações */
@keyframes achievement-bounce {
  0% {
    transform: scale(0) rotate(180deg);
  }
  50% {
    transform: scale(1.2) rotate(0deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

@keyframes achievement-shine {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

@keyframes achievement-progress {
  0% {
    width: 100%;
  }
  100% {
    width: 0%;
  }
}

@keyframes achievement-glow {
  0% {
    box-shadow: 
      0 8px 32px rgba(255, 128, 0, 0.3),
      0 0 0 1px rgba(255, 128, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
  100% {
    box-shadow: 
      0 8px 32px rgba(255, 128, 0, 0.6),
      0 0 0 2px rgba(255, 128, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
}

/* Transições */
.achievement-notification-enter-active {
  animation: achievement-slide-in 0.5s ease-out;
}

.achievement-notification-leave-active {
  animation: achievement-slide-out 0.3s ease-in;
}

@keyframes achievement-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes achievement-slide-out {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* Responsividade */
@media (max-width: 768px) {
  .achievement-notification {
    width: calc(100vw - 40px);
    right: 20px;
    left: 20px;
  }
}
</style>
