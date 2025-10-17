<template>
  <div v-if="isActive" class="tutorial-overlay" @click="handleOverlayClick">
    <div class="tutorial-content" :style="contentStyle">
      <!-- Spotlight effect -->
      <div 
        class="tutorial-spotlight" 
        :style="spotlightStyle"
        v-if="currentStep.spotlight"
      ></div>
      
      <!-- Tutorial card -->
      <div class="tutorial-card" :class="{ 'tutorial-card-flash': flashStyle }">
        <div class="tutorial-header">
          <div class="tutorial-step">
            Passo {{ currentStepIndex + 1 }} de {{ totalSteps }}
          </div>
          <button 
            class="tutorial-close" 
            @click="skipTutorial"
            title="Pular tutorial (ESC)"
          >
            ✕
          </button>
        </div>
        
        <div class="tutorial-body">
          <div v-if="currentStep.icon" class="tutorial-icon">
            {{ currentStep.icon }}
          </div>
          
          <h3 class="tutorial-title">{{ currentStep.title }}</h3>
          
          <div class="tutorial-description" v-html="currentStep.description"></div>
          
          <div v-if="currentStep.hint" class="tutorial-hint">
            💡 {{ currentStep.hint }}
          </div>
        </div>
        
        <div class="tutorial-footer">
          <div class="tutorial-progress">
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: `${progressPercentage}%` }"
              ></div>
            </div>
            <span class="progress-text">{{ progressPercentage }}%</span>
          </div>
          
          <div class="tutorial-actions">
            <button 
              v-if="currentStepIndex > 0"
              @click="previousStep"
              class="tutorial-btn tutorial-btn-secondary"
            >
              ← Anterior
            </button>
            
            <button 
              v-if="currentStepIndex < totalSteps - 1"
              @click="nextStep"
              class="tutorial-btn tutorial-btn-primary"
            >
              Próximo →
            </button>
            
            <button 
              v-else
              @click="completeTutorial"
              class="tutorial-btn tutorial-btn-success"
            >
              Concluir 🎉
            </button>
          </div>
        </div>
      </div>
      
      <!-- Navigation dots -->
      <div class="tutorial-dots">
        <button
          v-for="(step, index) in steps"
          :key="index"
          @click="goToStep(index)"
          class="tutorial-dot"
          :class="{ 
            'active': index === currentStepIndex,
            'completed': index < currentStepIndex 
          }"
          :title="step.title"
        ></button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useTooltips } from '../composables/useTooltips.js'

const props = defineProps({
  autoStart: {
    type: Boolean,
    default: false
  },
  flashStyle: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['start', 'complete', 'skip', 'step-change'])

const { showHelpTooltip } = useTooltips()

const isActive = ref(false)
const currentStepIndex = ref(0)
const isInitialized = ref(false)

// Tutorial steps
const steps = ref([
  {
    id: 'welcome',
    title: 'Bem-vindo ao Cunoku!',
    description: 'Cunoku é um jogo de cartas estratégico onde o objetivo é descartar todas as suas cartas antes dos outros jogadores.',
    icon: '🎮',
    hint: 'Vamos aprender as regras básicas!',
    spotlight: null
  },
  {
    id: 'objective',
    title: 'Objetivo do Jogo',
    description: 'O objetivo é simples: <strong>descarte todas as suas cartas</strong> antes dos outros jogadores. O primeiro a ficar sem cartas vence!',
    icon: '🏆',
    hint: 'Estratégia é fundamental para vencer',
    spotlight: null
  },
  {
    id: 'cardRules',
    title: 'Regras das Cartas',
    description: 'Descarte cartas em <strong>ordem crescente</strong>:<br>• Coringa (-1) é a mais baixa<br>• Rei (0) é a mais alta<br>• Cartas normais: 1, 2, 3... até 12',
    icon: '🃏',
    hint: 'Rei e Coringa podem ser descartados a qualquer momento',
    spotlight: null
  },
  {
    id: 'gameplay',
    title: 'Como Jogar',
    description: '1. <strong>Clique em uma carta</strong> para descartá-la<br>2. A carta deve ser <strong>maior</strong> que a última descartada<br>3. Se não puder descartar, use uma <strong>habilidade especial</strong>',
    icon: '🎯',
    hint: 'Observe a carta no topo da pilha de descarte',
    spotlight: null
  },
  {
    id: 'abilities',
    title: 'Habilidades Especiais',
    description: 'Cada jogador tem habilidades únicas:<br>• <strong>Ver Carta</strong>: Revela uma carta de outro jogador<br>• <strong>Trocar Cartas</strong>: Troca uma carta sua por uma de outro jogador<br>• <strong>Pular Turno</strong>: Pula seu turno sem descartar',
    icon: '✨',
    hint: 'Use as habilidades estrategicamente!',
    spotlight: null
  },
  {
    id: 'interface',
    title: 'Interface do Jogo',
    description: 'Conheça os elementos da tela:<br>• <strong>Suas cartas</strong>: Na parte inferior<br>• <strong>Pilha de descarte</strong>: No centro<br>• <strong>Habilidades</strong>: No canto superior<br>• <strong>Outros jogadores</strong>: Nas laterais',
    icon: '🖥️',
    hint: 'Tudo está organizado para facilitar o jogo',
    spotlight: null
  },
  {
    id: 'tips',
    title: 'Dicas Estratégicas',
    description: '• <strong>Planeje suas jogadas</strong> com antecedência<br>• <strong>Use as habilidades</strong> no momento certo<br>• <strong>Observe os outros jogadores</strong> para entender suas estratégias<br>• <strong>Não desperdice cartas altas</strong> desnecessariamente',
    icon: '🧠',
    hint: 'A prática leva à perfeição!',
    spotlight: null
  },
  {
    id: 'ready',
    title: 'Pronto para Jogar!',
    description: 'Agora você conhece o básico do Cunoku!<br><br>Lembre-se: o jogo é sobre <strong>estratégia</strong> e <strong>timing</strong>. Divirta-se e boa sorte!',
    icon: '🚀',
    hint: 'Que comece a diversão!',
    spotlight: null
  }
])

// Computed properties
const currentStep = computed(() => steps.value[currentStepIndex.value])
const totalSteps = computed(() => steps.value.length)
const progressPercentage = computed(() => 
  Math.round(((currentStepIndex.value + 1) / totalSteps.value) * 100)
)

const contentStyle = computed(() => {
  if (!currentStep.value.spotlight) return {}
  
  const spotlight = currentStep.value.spotlight
  return {
    '--spotlight-x': `${spotlight.x}px`,
    '--spotlight-y': `${spotlight.y}px`,
    '--spotlight-width': `${spotlight.width}px`,
    '--spotlight-height': `${spotlight.height}px`
  }
})

const spotlightStyle = computed(() => {
  if (!currentStep.value.spotlight) return {}
  
  const spotlight = currentStep.value.spotlight
  return {
    left: `${spotlight.x}px`,
    top: `${spotlight.y}px`,
    width: `${spotlight.width}px`,
    height: `${spotlight.height}px`
  }
})

// Métodos
const startTutorial = () => {
  if (isActive.value) return
  
  isActive.value = true
  currentStepIndex.value = 0
  emit('start')
  
  // Salvar que o tutorial foi iniciado
  localStorage.setItem('cunoku_tutorial_started', 'true')
}

const nextStep = () => {
  if (currentStepIndex.value < totalSteps.value - 1) {
    currentStepIndex.value++
    emit('step-change', currentStepIndex.value)
  }
}

const previousStep = () => {
  if (currentStepIndex.value > 0) {
    currentStepIndex.value--
    emit('step-change', currentStepIndex.value)
  }
}

const goToStep = (index) => {
  if (index >= 0 && index < totalSteps.value) {
    currentStepIndex.value = index
    emit('step-change', index)
  }
}

const completeTutorial = () => {
  isActive.value = false
  emit('complete')
  
  // Marcar tutorial como concluído
  localStorage.setItem('cunoku_tutorial_completed', 'true')
  localStorage.setItem('cunoku_tutorial_completed_date', Date.now().toString())
}

const skipTutorial = () => {
  isActive.value = false
  emit('skip')
  
  // Marcar como pulado
  localStorage.setItem('cunoku_tutorial_skipped', 'true')
}

const handleOverlayClick = (event) => {
  // Não fechar ao clicar no overlay se estiver no spotlight
  if (currentStep.value.spotlight) {
    event.stopPropagation()
  }
}

// Verificar se deve mostrar tutorial
const shouldShowTutorial = () => {
  const completed = localStorage.getItem('cunoku_tutorial_completed')
  const skipped = localStorage.getItem('cunoku_tutorial_skipped')
  const started = localStorage.getItem('cunoku_tutorial_started')
  
  return !completed && !skipped && !started
}

// Inicialização
onMounted(() => {
  if (props.autoStart && shouldShowTutorial()) {
    nextTick(() => {
      startTutorial()
    })
  }
  isInitialized.value = true
})

// Handlers de teclado
const handleKeydown = (event) => {
  if (!isActive.value) return
  
  switch (event.key) {
    case 'Escape':
      skipTutorial()
      break
    case 'ArrowRight':
    case ' ':
      event.preventDefault()
      nextStep()
      break
    case 'ArrowLeft':
      event.preventDefault()
      previousStep()
      break
    case 'Enter':
      event.preventDefault()
      if (currentStepIndex.value < totalSteps.value - 1) {
        nextStep()
      } else {
        completeTutorial()
      }
      break
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// Expor métodos para uso externo
defineExpose({
  startTutorial,
  completeTutorial,
  skipTutorial,
  goToStep,
  nextStep,
  previousStep
})
</script>

<style scoped>
.tutorial-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  animation: tutorial-fade-in 0.3s ease-out;
}

.tutorial-content {
  position: relative;
  max-width: 500px;
  width: 100%;
  animation: tutorial-slide-up 0.4s ease-out;
}

.tutorial-spotlight {
  position: absolute;
  background: radial-gradient(
    circle,
    transparent 0%,
    transparent 30%,
    rgba(0, 0, 0, 0.3) 70%,
    rgba(0, 0, 0, 0.8) 100%
  );
  pointer-events: none;
  z-index: 1;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.tutorial-card {
  background: var(--card-gradient);
  border: 2px solid var(--primary-gold);
  border-radius: 15px;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(212, 175, 55, 0.3);
  overflow: hidden;
  position: relative;
  z-index: 2;
}

.tutorial-card-flash {
  animation: tutorial-glow 2s ease-in-out infinite alternate;
}

.tutorial-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: rgba(212, 175, 55, 0.1);
  border-bottom: 1px solid rgba(212, 175, 55, 0.3);
}

.tutorial-step {
  font-size: 0.9rem;
  color: var(--secondary-gold);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tutorial-close {
  background: none;
  border: none;
  color: rgba(248, 248, 255, 0.6);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.2s ease;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tutorial-close:hover {
  background: rgba(220, 20, 60, 0.8);
  color: white;
  transform: scale(1.1);
}

.tutorial-body {
  padding: 2rem 1.5rem;
  text-align: center;
}

.tutorial-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  animation: tutorial-bounce 2s ease-in-out infinite;
}

.tutorial-title {
  font-family: 'Cinzel', serif;
  font-size: 1.5rem;
  color: var(--pearl-white);
  margin-bottom: 1rem;
  font-weight: 700;
}

.tutorial-description {
  font-size: 1rem;
  color: rgba(248, 248, 255, 0.9);
  line-height: 1.6;
  margin-bottom: 1rem;
}

.tutorial-hint {
  font-size: 0.9rem;
  color: var(--secondary-gold);
  font-style: italic;
  background: rgba(212, 175, 55, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  display: inline-block;
}

.tutorial-footer {
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(212, 175, 55, 0.3);
}

.tutorial-progress {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--gold-gradient);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: var(--secondary-gold);
  font-weight: 600;
  min-width: 35px;
  text-align: right;
}

.tutorial-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.tutorial-btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid var(--primary-gold);
  border-radius: 8px;
  background: var(--gold-gradient);
  color: var(--japanese-black);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.tutorial-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4);
}

.tutorial-btn-secondary {
  background: transparent;
  color: var(--pearl-white);
  border-color: rgba(248, 248, 255, 0.3);
}

.tutorial-btn-secondary:hover {
  background: rgba(248, 248, 255, 0.1);
  border-color: var(--pearl-white);
}

.tutorial-btn-success {
  background: linear-gradient(135deg, #00FF00 0%, #00CC00 100%);
  border-color: #00FF00;
  color: white;
}

.tutorial-btn-success:hover {
  box-shadow: 0 4px 15px rgba(0, 255, 0, 0.4);
}

.tutorial-dots {
  position: absolute;
  bottom: -2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.5rem;
  z-index: 3;
}

.tutorial-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(212, 175, 55, 0.3);
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tutorial-dot:hover {
  border-color: var(--primary-gold);
  background: rgba(212, 175, 55, 0.3);
}

.tutorial-dot.active {
  background: var(--primary-gold);
  border-color: var(--primary-gold);
}

.tutorial-dot.completed {
  background: var(--secondary-gold);
  border-color: var(--secondary-gold);
}

/* Animações */
@keyframes tutorial-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes tutorial-slide-up {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes tutorial-bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes tutorial-glow {
  0% {
    box-shadow: 
      0 20px 60px rgba(0, 0, 0, 0.8),
      0 0 0 1px rgba(212, 175, 55, 0.3);
  }
  100% {
    box-shadow: 
      0 20px 60px rgba(0, 0, 0, 0.8),
      0 0 0 2px rgba(212, 175, 55, 0.6),
      0 0 30px rgba(212, 175, 55, 0.3);
  }
}

/* Responsividade */
@media (max-width: 768px) {
  .tutorial-overlay {
    padding: 1rem;
  }
  
  .tutorial-content {
    max-width: 100%;
  }
  
  .tutorial-body {
    padding: 1.5rem 1rem;
  }
  
  .tutorial-title {
    font-size: 1.3rem;
  }
  
  .tutorial-description {
    font-size: 0.9rem;
  }
  
  .tutorial-actions {
    flex-direction: column;
  }
  
  .tutorial-btn {
    width: 100%;
  }
}
</style>
