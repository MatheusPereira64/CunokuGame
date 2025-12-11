<template>
  <div ref="gameContainer" class="phaser-overlay">
    <!-- Canvas do Phaser será inserido aqui -->
  </div>
</template>

<script>
import Phaser from 'phaser'
import { ref, onMounted, onUnmounted, watch, defineExpose } from 'vue'
import CardEffectsScene from './scenes/CardEffectsScene'
import ParticleScene from './scenes/ParticleScene'
import GameMenuScene from './scenes/GameMenuScene'

export default {
  name: 'PhaserGame',
  props: {
    gameState: {
      type: Object,
      default: () => ({})
    },
    currentPlayerIndex: {
      type: Number,
      default: 0
    }
  },
  emits: ['effect-complete', 'menu-action'],
  setup(props, { emit, expose }) {
    const gameContainer = ref(null)
    let game = null
    
    // Configuração do Phaser
    const createGame = () => {
      const config = {
        type: Phaser.AUTO,
        parent: gameContainer.value,
        width: window.innerWidth,
        height: window.innerHeight,
        transparent: true,
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 0 },
            debug: false
          }
        },
        scene: [CardEffectsScene, ParticleScene, GameMenuScene],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        render: {
          pixelArt: false,
          antialias: false, // Desabilitar antialiasing para melhor performance
          powerPreference: 'high-performance' // Priorizar performance
        },
        fps: {
          target: 60,
          forceSetTimeOut: true
        }
      }
      
      game = new Phaser.Game(config)
      
      // Passar referências para as cenas
      game.registry.set('emit', emit)
      game.registry.set('gameState', props.gameState)
      
      // Iniciar menu scene (mas não mostrar ainda)
      game.scene.start('GameMenuScene')
      
      // Listener para ações do menu
      game.events.on('menu-action', (action) => {
        emit('menu-action', action)
      })
    }
    
    // Métodos expostos para uso externo
    const playCardDrawEffect = (fromX, fromY, toX, toY) => {
      if (game && game.scene.isActive('CardEffectsScene')) {
        game.scene.getScene('CardEffectsScene').playDrawCard(fromX, fromY, toX, toY)
      }
    }
    
    const playCardDiscardEffect = (fromX, fromY, toX, toY) => {
      if (game && game.scene.isActive('CardEffectsScene')) {
        game.scene.getScene('CardEffectsScene').playDiscardCard(fromX, fromY, toX, toY)
      }
    }
    
    const playSwapEffect = (card1Pos, card2Pos) => {
      if (game && game.scene.isActive('CardEffectsScene')) {
        game.scene.getScene('CardEffectsScene').playSwapCards(card1Pos, card2Pos)
      }
    }
    
    const playRevealEffect = (x, y, cardValue, cardSuit) => {
      if (game && game.scene.isActive('CardEffectsScene')) {
        game.scene.getScene('CardEffectsScene').playRevealCard(x, y, cardValue, cardSuit)
      }
    }
    
    const playCunokuEffect = (x, y) => {
      if (game && game.scene.isActive('ParticleScene')) {
        game.scene.getScene('ParticleScene').playCunokuCelebration(x, y)
      }
    }
    
    const playTurnChangeEffect = (playerName) => {
      if (game && game.scene.isActive('CardEffectsScene')) {
        game.scene.getScene('CardEffectsScene').playTurnChange(playerName)
      }
    }
    
    const playGoldenParticles = (x, y) => {
      if (game && game.scene.isActive('ParticleScene')) {
        game.scene.getScene('ParticleScene').playGoldenBurst(x, y)
      }
    }
    
    const playAbilityEffect = (abilityType, x, y) => {
      if (game && game.scene.isActive('ParticleScene')) {
        game.scene.getScene('ParticleScene').playAbilityEffect(abilityType, x, y)
      }
    }
    
    // Métodos do menu
    const showMenu = () => {
      if (game && game.scene.isActive('GameMenuScene')) {
        game.scene.getScene('GameMenuScene').show()
      }
    }
    
    const hideMenu = () => {
      if (game && game.scene.isActive('GameMenuScene')) {
        game.scene.getScene('GameMenuScene').hide()
      }
    }
    
    const toggleMenu = () => {
      if (game && game.scene.isActive('GameMenuScene')) {
        game.scene.getScene('GameMenuScene').toggle()
      }
    }
    
    // Expor métodos para o componente pai
    expose({
      playCardDrawEffect,
      playCardDiscardEffect,
      playSwapEffect,
      playRevealEffect,
      playCunokuEffect,
      playTurnChangeEffect,
      playGoldenParticles,
      playAbilityEffect,
      showMenu,
      hideMenu,
      toggleMenu
    })
    
    // Debounce para resize (otimização)
    let resizeTimeout = null
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        if (game) {
          game.scale.resize(window.innerWidth, window.innerHeight)
        }
      }, 150)
    }
    
    onMounted(() => {
      createGame()
      
      // Resize listener com debounce
      window.addEventListener('resize', handleResize, { passive: true })
    })
    
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimeout) clearTimeout(resizeTimeout)
      if (game) {
        game.destroy(true)
        game = null
      }
    })
    
    // Watch para mudanças no gameState (otimizado - não deep watch)
    watch(() => props.gameState?.jogadorDaVez, (newTurn) => {
      if (game && newTurn !== undefined) {
        game.registry.set('gameState', props.gameState)
      }
    })
    
    // Watch apenas para propriedades críticas
    watch(() => props.gameState?.players?.length, () => {
      if (game) {
        game.registry.set('gameState', props.gameState)
      }
    })
    
    return {
      gameContainer,
      playCardDrawEffect,
      playCardDiscardEffect,
      playSwapEffect,
      playRevealEffect,
      playCunokuEffect,
      playTurnChangeEffect,
      playGoldenParticles,
      playAbilityEffect,
      showMenu,
      hideMenu,
      toggleMenu
    }
  }
}
</script>

<style scoped>
.phaser-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 1000;
  overflow: hidden;
}

.phaser-overlay canvas {
  pointer-events: none;
}

/* Permitir interação quando menu estiver ativo - sempre permitir para menu */
.phaser-overlay canvas {
  pointer-events: auto;
}
</style>

