<template>
  <div class="cunoku-game poker-hud">
    <!-- Camada de efeitos Phaser -->
    <PhaserGame 
      ref="phaserRef"
      :gameState="estado"
      :currentPlayerIndex="meuIndice"
      @effect-complete="onEffectComplete"
      @menu-action="handleMenuAction"
    />
    
    <!-- Notificação pop-up -->
    <transition name="fade">
      <div v-if="mensagemStatus" class="popup-notificacao">
        {{ mensagemStatus }}
      </div>
    </transition>
    
    <div v-if="!estado">
      <p>{{ t('waitingPlayers') }}</p>
    </div>
    
    <div v-else class="game-content">
      <!-- Botão para abrir menu Phaser -->
      <button 
        v-if="estado.jogadorDaVez === meuIndice" 
        class="menu-toggle-btn"
        @click="togglePhaserMenu"
        title="Abrir Menu de Ações"
      >
        ☰ Menu
      </button>
      
      <!-- Mesa de Poker -->
      <div class="table-wrapper">
        <PokerTable :gameState="estado">
          <template #players>
            <PlayerPosition
              v-for="(player, idx) in estado.players"
              :key="idx"
              :player="{
                ...player,
                icone: getPlayerIcon(idx, player.nome)
              }"
              :position="getPlayerPosition(idx)"
              :playerIndex="idx"
              :totalPlayers="estado.players.length"
              :isActivePlayer="idx === estado.jogadorDaVez"
              :isCurrentUser="idx === meuIndice"
              :playerHand="idx === meuIndice ? maoReal : []"
              :revealedCards="cartasReveladas"
              :canDiscard="indiceDescarteTentativa === null"
              :reactionActive="estado.reacaoAtiva"
              :reactionValue="estado.valorReacao"
              :cartaEstaReveladaTemporariamente="cartaEstaReveladaTemporariamente"
              @try-discard="tentarDescarte"
              @react-discard="reagirDescartar"
            />
          </template>
        </PokerTable>
      </div>
      
      <!-- Área de Ações -->
      <ActionArea
        :isCurrentPlayerTurn="estado.jogadorDaVez === meuIndice"
        :choosingAction="escolhendoAcao"
        :pendingAction="acaoPendente"
        :drawnCard="cartaComprada"
        :substituteIndex="indiceSubstituir"
        :playerHand="estado.players[meuIndice]?.mao || []"
        :currentPlayerName="estado.players[estado.jogadorDaVez]?.nome"
        :canDeclareEndGame="podeDeclararFim"
        @draw-card="comprarCarta"
        @toggle-substitute="toggleSubstitute"
        @discard-drawn-card="descartarCartaComprada"
        @use-ability="usarHabilidade"
        @substitute-card="substituirCarta"
        @cancel-substitute="cancelarSubstituicao"
        @declare-end-game="declararFimDeJogo"
      />
      
      <!-- Interfaces especiais -->
      <DiscardInterface
        v-if="indiceDescarteTentativa !== null"
        :playerHand="maoReal"
        :excludeIndex="indiceDescarteTentativa"
        @confirm-discard="confirmarDescarte"
        @cancel-discard="cancelarDescarte"
      />
      
      <AbilityInterface
        v-if="escolhendoCartaPropria || escolhendoCartaOponente || escolhendoTroca"
        :type="getAbilityType()"
        :gameState="estado"
        :currentPlayerIndex="meuIndice"
        @ability-action="handleAbilityAction"
        @cancel-ability="cancelarHabilidade"
      />
      
      <EndGameDisplay
        v-if="fimDeJogo"
        :results="resultadoFinal"
        @new-game="$emit('novo-jogo')"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent, watch, onMounted, onBeforeUnmount, ref } from 'vue'
import { t } from '../../i18n/index.js'
import { useGameLogic } from './Logic/useGameLogic.js'
import { useAudioManager } from '../../composables/useAudioManager.js'
import PokerTable from './UI/PokerTable.vue'
import PlayerPosition from './UI/PlayerPosition.vue'
import ActionArea from './UI/ActionArea.vue'
import DiscardInterface from './UI/DiscardInterface.vue'
import AbilityInterface from './UI/AbilityInterface.vue'
import EndGameDisplay from './UI/EndGameDisplay.vue'
import PhaserGame from './Phaser/PhaserGame.vue'

export default defineComponent({
  name: 'CunokuGame',
  components: {
    PokerTable,
    PlayerPosition,
    ActionArea,
    DiscardInterface,
    AbilityInterface,
    EndGameDisplay,
    PhaserGame
  },
  props: {
    socket: Object,
    roomId: String,
    numJogadores: { type: Number, default: 2 },
    jogador: { type: Object, default: null },
    sala: { type: String, default: '' },
    estadoInicial: { type: Object, default: null },
    modoBots: { type: Boolean, default: false }
  },
  emits: ['fim-de-jogo', 'novo-jogo'],
  setup(props, { emit }) {
    // Referência para o componente Phaser
    const phaserRef = ref(null)
    
    // Sistema de áudio
    const { playMusic, initAudioContext } = useAudioManager()
    
    // Usar a lógica do jogo
    const gameLogic = useGameLogic()
    
    // Helper para disparar efeitos Phaser
    const triggerEffect = (effectName, ...args) => {
      if (phaserRef.value && typeof phaserRef.value[effectName] === 'function') {
        phaserRef.value[effectName](...args)
      }
    }
    
    // Callback quando efeito termina
    const onEffectComplete = (effectData) => {
      console.log('Efeito completado:', effectData)
    }
    
    // Controlar menu Phaser
    const togglePhaserMenu = () => {
      if (phaserRef.value && typeof phaserRef.value.toggleMenu === 'function') {
        phaserRef.value.toggleMenu()
      }
    }
    
    // Handler para ações do menu
    const handleMenuAction = (action) => {
      switch (action) {
        case 'draw-card':
          comprarCarta()
          break
        case 'discard':
          if (cartaComprada.value) {
            descartarCartaComprada()
          }
          break
        case 'substitute':
          toggleSubstitute()
          break
        case 'ability':
          if (cartaComprada.value) {
            usarHabilidade()
          }
          break
        case 'declare-end':
          declararFimDeJogo()
          break
      }
    }
    
    // Inicializar modo offline se for modo bots
    if (props.modoBots && props.estadoInicial) {
      gameLogic.modoOffline.value = true
      gameLogic.estado.value = props.estadoInicial
      gameLogic.meuIndice.value = 0 // Assumindo que o jogador humano é sempre o primeiro
      
      // Iniciar verificação de bots se o jogo já começou
      if (props.estadoInicial.jogoIniciado) {
        setTimeout(() => {
          gameLogic.checarBotEVez()
        }, 1000)
      }
    }

    // Sincronizar estado vindo do pai/servidor (online)
    watch(() => props.estadoInicial, (novo) => {
      if (novo) {
        gameLogic.estado.value = novo
        // Calcula meuIndice com base no nome do jogador atual
        if (props.jogador?.nome && Array.isArray(novo.players)) {
          const idx = novo.players.findIndex(p => p?.nome === props.jogador.nome)
          if (idx !== -1) gameLogic.meuIndice.value = idx
        }
      }
    }, { immediate: true })

    // Inicializar música quando o jogo começar
    const iniciarMusicaJogo = async () => {
      try {
        await initAudioContext()
        await playMusic('BACKGROUND_MUSIC', { volume: 0.3 })
        console.log('Música do jogo iniciada')
      } catch (error) {
        console.warn('Erro ao iniciar música do jogo:', error)
      }
    }
    
    // Listeners de socket (modo online) para fluxos guiados pelo servidor
    onMounted(() => {
      // Iniciar música quando o componente montar
      iniciarMusicaJogo()
      
      if (props.socket) {
        const s = props.socket
        s.on('mensagem', (msg) => {
          if (msg?.tipo === 'fim_declarado') {
            gameLogic.showMessage(`Fim declarado por ${msg.jogador}`)
          } else if (msg?.tipo === 'descarte_correto') {
            gameLogic.showMessage(`${msg.jogador} descartou ${msg.carta}`)
          } else if (msg?.tipo === 'descarte_errado') {
            gameLogic.showMessage(`${msg.jogador} errou o descarte e comprou 2 cartas`)
          } else if (msg?.tipo === 'troca_cartas') {
            gameLogic.showMessage(`${msg.jogador} trocou carta ${msg.cartaA} de ${msg.jogadorA} com carta ${msg.cartaB} de ${msg.jogadorB}`)
          }
        })
        s.on('escolher_carta_propria', ({ max }) => {
          gameLogic.escolhendoCartaPropria.value = true
          gameLogic.escolhendoCartaOponente.value = false
          gameLogic.escolhendoTroca.value = false
        })
        s.on('escolher_carta_oponente', ({ oponentes }) => {
          gameLogic.escolhendoCartaPropria.value = false
          gameLogic.escolhendoCartaOponente.value = true
          gameLogic.escolhendoTroca.value = false
        })
        s.on('escolher_jogadores_troca', ({ jogadores }) => {
          gameLogic.escolhendoCartaPropria.value = false
          gameLogic.escolhendoCartaOponente.value = false
          gameLogic.escolhendoTroca.value = true
        })
        s.on('carta_revelada', ({ carta, indice, oponente }) => {
          if (typeof indice === 'number') {
            // Revela temporariamente carta própria
            gameLogic.cartasReveladas.value.push({ idx: indice, carta })
            setTimeout(() => {
              gameLogic.cartasReveladas.value = gameLogic.cartasReveladas.value.filter(c => c.idx !== indice)
            }, 5000)
          }
          if (oponente) {
            gameLogic.showMessage(`Carta de ${oponente}: ${carta?.nome ?? ''}`)
          }
        })
      }
    })
    onBeforeUnmount(() => {
      if (props.socket) {
        const s = props.socket
        s.off('mensagem')
        s.off('escolher_carta_propria')
        s.off('escolher_carta_oponente')
        s.off('escolher_jogadores_troca')
        s.off('carta_revelada')
      }
    })
    
    // Métodos principais do jogo
    const comprarCarta = () => {
      if (!gameLogic.podeComprarCarta.value) return
      
      // Efeito visual de comprar carta (do centro para o jogador)
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2 - 50
      const playerY = window.innerHeight - 150
      triggerEffect('playCardDrawEffect', centerX, centerY, centerX, playerY)
      triggerEffect('playGoldenParticles', centerX, centerY)
      
      if (gameLogic.modoOffline.value) {
        // Lógica offline
        const carta = gameLogic.estado.value.baralho.pop()
        gameLogic.cartaComprada.value = carta
        gameLogic.escolhendoAcao.value = true
      } else {
        // Lógica online
        props.socket?.emit('comprar_carta', { sala: props.sala, jogador: props.jogador?.nome })
      }
    }
    
    const tentarDescarte = (idx) => {
      if (gameLogic.indiceDescarteTentativa.value !== null) return
      gameLogic.indiceDescarteTentativa.value = idx
    }
    
    const confirmarDescarte = (idx2) => {
      const carta1 = gameLogic.maoReal.value[gameLogic.indiceDescarteTentativa.value]
      const carta2 = gameLogic.maoReal.value[idx2]
      
      if (carta1.valor === carta2.valor) {
        // Descarte bem-sucedido
        if (gameLogic.modoOffline.value) {
          // Lógica offline
          const player = gameLogic.estado.value.players[gameLogic.meuIndice.value]
          const cartasDescartadas = [
            player.mao.splice(Math.max(gameLogic.indiceDescarteTentativa.value, idx2), 1)[0],
            player.mao.splice(Math.min(gameLogic.indiceDescarteTentativa.value, idx2), 1)[0]
          ]
          gameLogic.estado.value.pilha.push(...cartasDescartadas)
          
          // Ativar reação para a primeira carta descartada
          gameLogic.ativarReacao(cartasDescartadas[0])
          
          gameLogic.showMessage('Descarte realizado com sucesso!')
          gameLogic.avancarTurnoComFim()
        } else {
          // Lógica online
          props.socket?.emit('tentar_descarte', {
            sala: props.sala,
            jogador: props.jogador?.nome,
            indice1: gameLogic.indiceDescarteTentativa.value,
            indice2: idx2
          })
        }
      } else {
        gameLogic.showMessage('As cartas não têm o mesmo valor!')
      }
      
      gameLogic.indiceDescarteTentativa.value = null
    }
    
    const cancelarDescarte = () => {
      gameLogic.indiceDescarteTentativa.value = null
    }
    
    const toggleSubstitute = () => {
      gameLogic.indiceSubstituir.value = gameLogic.indiceSubstituir.value === null ? 0 : null
    }
    
    const substituirCarta = (idx) => {
      if (gameLogic.modoOffline.value) {
        // Lógica offline
        const player = gameLogic.estado.value.players[gameLogic.meuIndice.value]
        player.mao[idx] = gameLogic.cartaComprada.value
        gameLogic.showMessage('Carta substituída!')
        gameLogic.resetGameState()
        gameLogic.avancarTurnoLocal()
      } else {
        // Lógica online
        props.socket?.emit('substituir_carta', {
          sala: props.sala,
          jogador: props.jogador?.nome,
          indice: idx
        })
        gameLogic.resetGameState()
      }
    }
    
    const cancelarSubstituicao = () => {
      gameLogic.indiceSubstituir.value = null
    }
    
    const descartarCartaComprada = () => {
      // Efeito visual de descarte
      const centerX = window.innerWidth / 2
      const fromY = window.innerHeight - 150
      const toY = window.innerHeight / 2 - 50
      triggerEffect('playCardDiscardEffect', centerX, fromY, centerX + 50, toY)
      
      if (gameLogic.modoOffline.value) {
        // Lógica offline
        const carta = gameLogic.cartaComprada.value
        gameLogic.estado.value.pilha.push(carta)
        
        // Ativar reação para outros jogadores
        gameLogic.ativarReacao(carta)
        
        gameLogic.showMessage('Carta descartada!')
        gameLogic.resetGameState()
        gameLogic.avancarTurnoComFim()
      } else {
        // Lógica online
        props.socket?.emit('descartar_carta', { sala: props.sala, jogador: props.jogador?.nome })
        gameLogic.resetGameState()
      }
    }
    
    const usarHabilidade = () => {
      const carta = gameLogic.cartaComprada.value
      if (!carta) return
      
      // Determinar tipo de habilidade
      let abilityType = null
      if (['Cinco', 'Seis'].includes(carta.nome)) {
        gameLogic.escolhendoCartaOponente.value = true
        abilityType = 'opponent-card'
      } else if (['Sete', 'Oito'].includes(carta.nome)) {
        gameLogic.escolhendoCartaPropria.value = true
        abilityType = 'own-card'
      } else if (['Nove', 'Dez'].includes(carta.nome)) {
        gameLogic.escolhendoTroca.value = true
        abilityType = 'swap-cards'
      }
      
      // Efeito visual de habilidade
      if (abilityType) {
        const centerX = window.innerWidth / 2
        const centerY = window.innerHeight / 2
        triggerEffect('playAbilityEffect', abilityType, centerX, centerY)
      }
      
      gameLogic.escolhendoAcao.value = false
    }
    
    const declararFimDeJogo = () => {
      // Efeito de CUNOKU!
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      triggerEffect('playCunokuCelebration', centerX, centerY)
      
      if (gameLogic.modoOffline.value) {
        // Lógica offline
        gameLogic.declararFimDeJogo(gameLogic.meuIndice.value)
      } else {
        // Lógica online
        props.socket?.emit('declarar_fim_de_jogo', { sala: props.sala, jogador: props.jogador?.nome })
      }
    }
    
    const getAbilityType = () => {
      if (gameLogic.escolhendoCartaPropria.value) return 'own-card'
      if (gameLogic.escolhendoCartaOponente.value) return 'opponent-card'
      if (gameLogic.escolhendoTroca.value) return 'swap-cards'
      return null
    }
    
    const handleAbilityAction = (action) => {
      const carta = gameLogic.cartaComprada.value
      if (!carta) return
      
      if (gameLogic.modoOffline.value) {
        // Lógica offline para habilidades
        if (action.type === 'own-card') {
          // Ver carta própria (cartas 7 e 8)
          const player = gameLogic.estado.value.players[gameLogic.meuIndice.value]
          const cartaVista = player.mao[action.cardIndex]
          
          // Usar o novo sistema de revelação temporária
          gameLogic.revelarCartaTemporariamente(gameLogic.meuIndice.value, action.cardIndex, 5000)
          gameLogic.showMessage(`Carta revelada: ${cartaVista.nome} de ${cartaVista.naipe}`, 5000)
          
          gameLogic.estado.value.pilha.push(carta)
          gameLogic.resetGameState()
          gameLogic.avancarTurnoLocal()
          
        } else if (action.type === 'opponent-card') {
          // Ver carta de oponente (cartas 5 e 6)
          const player = gameLogic.estado.value.players[action.playerIndex]
          const cartaVista = player.mao[action.cardIndex]
          
          // Usar o novo sistema de revelação temporária
          gameLogic.revelarCartaTemporariamente(action.playerIndex, action.cardIndex, 5000)
          gameLogic.showMessage(`Carta do ${player.nome}: ${cartaVista.nome} de ${cartaVista.naipe}`, 5000)
          
          gameLogic.estado.value.pilha.push(carta)
          gameLogic.resetGameState()
          gameLogic.avancarTurnoLocal()
          
        } else if (action.type === 'swap-cards') {
          // Trocar cartas (cartas 9 e 10)
          const player1 = gameLogic.estado.value.players[action.player1]
          const player2 = gameLogic.estado.value.players[action.player2]
          
          const cartaA = player1.mao[action.card1]
          const cartaB = player2.mao[action.card2]
          
          // Efetua a troca
          player1.mao[action.card1] = cartaB
          player2.mao[action.card2] = cartaA
          
          gameLogic.showMessage(`Trocou carta ${action.card1 + 1} de ${player1.nome} com carta ${action.card2 + 1} de ${player2.nome}`, 4000)
          
          gameLogic.estado.value.pilha.push(carta)
          gameLogic.resetGameState()
          gameLogic.avancarTurnoLocal()
        }
      } else {
        // Lógica online - emitir eventos para o servidor
        if (action.type === 'own-card') {
          props.socket?.emit('usar_habilidade', {
            sala: props.sala,
            jogador: props.jogador.nome,
            carta: carta,
            indiceAlvo: action.cardIndex
          })
        } else if (action.type === 'opponent-card') {
          props.socket?.emit('usar_habilidade', {
            sala: props.sala,
            jogador: props.jogador.nome,
            carta: carta,
            alvo: action.playerIndex,
            indiceAlvo: action.cardIndex
          })
        } else if (action.type === 'swap-cards') {
          props.socket?.emit('usar_habilidade', {
            sala: props.sala,
            jogador: props.jogador.nome,
            carta: carta,
            alvos: [action.player1, action.player2],
            indicesAlvo: [action.card1, action.card2]
          })
        }
        gameLogic.resetGameState()
      }
    }
    
    const cancelarHabilidade = () => {
      gameLogic.resetGameState()
    }

    const reagirDescartar = (idx) => {
      if (gameLogic.modoOffline.value) {
        // Lógica offline
        const carta = gameLogic.maoReal.value[idx]
        if (carta && gameLogic.reacaoAtiva.value) {
          const sucesso = gameLogic.processarDescarteReacao(gameLogic.meuIndice.value, carta)
          if (sucesso) {
            gameLogic.estado.value.players[gameLogic.meuIndice.value].mao.splice(idx, 1)
          }
        }
      } else {
        // Lógica online
        if (props.socket && props.sala && typeof idx === 'number') {
          props.socket.emit('reagir_descartar_mesmo_valor', { sala: props.sala, jogador: props.jogador?.nome, indice: idx })
        }
      }
    }
    
    // Watch para mudança de turno - disparar efeito visual
    watch(() => gameLogic.estado.value?.jogadorDaVez, (novoJogador, antigoJogador) => {
      if (novoJogador !== undefined && novoJogador !== antigoJogador && gameLogic.estado.value?.players) {
        const playerName = gameLogic.estado.value.players[novoJogador]?.nome || 'Jogador'
        triggerEffect('playTurnChangeEffect', playerName)
      }
    })
    
    return {
      // Refs
      phaserRef,
      
      // Estado
      ...gameLogic,
      
      // Métodos
      t,
      comprarCarta,
      tentarDescarte,
      confirmarDescarte,
      cancelarDescarte,
      toggleSubstitute,
      substituirCarta,
      cancelarSubstituicao,
      descartarCartaComprada,
      usarHabilidade,
      declararFimDeJogo,
      getAbilityType,
      handleAbilityAction,
      cancelarHabilidade,
      reagirDescartar,
      onEffectComplete,
      triggerEffect,
      togglePhaserMenu,
      handleMenuAction
    }
  }
})
</script>

<style scoped>
/* Container principal do jogo - TELA CHEIA E RESPONSIVO */
.cunoku-game.poker-hud {
  width: 100vw;
  height: 100vh;
  max-width: 100vw;
  max-height: 100vh;
  min-width: 100vw;
  min-height: 100vh;
  background: 
    radial-gradient(ellipse at center, #0f3d2e 0%, #1a4d3a 70%, #0a1f1a 100%);
  color: #ffd700;
  font-family: 'Noto Sans JP', 'Cinzel', serif;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: clamp(0.25rem, 1vw, 0.75rem);
  margin: 0;
}

/* Efeito de padrão tradicional japonês */
.cunoku-game.poker-hud::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 25% 25%, rgba(212, 175, 55, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(220, 20, 60, 0.03) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

/* Popup de notificação luxuoso */
.popup-notificacao {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: 
    linear-gradient(135deg, #d4af37 0%, #ffd700 100%);
  color: #0f3d2e;
  padding: clamp(1rem, 3vw, 2rem) clamp(1.5rem, 4vw, 3rem);
  border-radius: 20px;
  box-shadow: 
    0 15px 50px rgba(0, 0, 0, 0.8),
    0 0 0 3px #d4af37,
    inset 0 2px 0 rgba(255, 255, 255, 0.3);
  font-size: clamp(0.9rem, 2vw, 1.3rem);
  font-weight: 700;
  font-family: 'Cinzel', serif;
  z-index: 9999;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
  animation: popup-entrada 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  max-width: 90vw;
}

@keyframes popup-entrada {
  0% { 
    opacity: 0; 
    transform: translate(-50%, -60%) scale(0.8);
  }
  100% { 
    opacity: 1; 
    transform: translate(-50%, -50%) scale(1);
  }
}

/* Transições suaves */
.fade-enter-active, .fade-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* Container do conteúdo do jogo - LAYOUT FLEXÍVEL TELA CHEIA */
.game-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  gap: clamp(0.25rem, 1vh, 0.5rem);
}

/* Wrapper da mesa - OCUPA ESPAÇO DISPONÍVEL RESPONSIVO */
.table-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 0;
  max-height: 100%;
  overflow: visible;
}

/* Responsividade */
@media (max-width: 1024px) {
  .cunoku-game.poker-hud {
    padding: clamp(0.2rem, 0.8vw, 0.5rem);
  }
  
  .table-wrapper {
    max-height: calc(100vh - 180px);
  }
}

@media (max-width: 768px) {
  .cunoku-game.poker-hud {
    padding: 0.25rem;
  }
  
  .game-content {
    gap: 0.25rem;
  }
  
  .table-wrapper {
    max-height: calc(100vh - 160px);
  }
}

@media (max-width: 480px) {
  .table-wrapper {
    max-height: calc(100vh - 140px);
  }
}

/* Botão de menu toggle */
.menu-toggle-btn {
  position: fixed;
  top: clamp(1rem, 2vh, 1.5rem);
  right: clamp(1rem, 2vw, 1.5rem);
  z-index: 500;
  background: linear-gradient(135deg, #d4af37 0%, #ffd700 100%);
  color: #0f3d2e;
  border: 2px solid #d4af37;
  border-radius: 12px;
  padding: clamp(0.5rem, 1vh, 0.75rem) clamp(1rem, 2vw, 1.5rem);
  font-size: clamp(0.9rem, 1.5vw, 1.1rem);
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 10px rgba(212, 175, 55, 0.5);
  transition: all 0.3s ease;
}

.menu-toggle-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(212, 175, 55, 0.7);
}

.menu-toggle-btn:active {
  transform: scale(0.95);
}

/* Landscape mode em dispositivos móveis */
@media (max-height: 500px) and (orientation: landscape) {
  .cunoku-game.poker-hud {
    padding: 0.15rem;
  }
  
  .game-content {
    flex-direction: row;
    gap: 0.5rem;
  }
  
  .table-wrapper {
    flex: 2;
    max-height: calc(100vh - 20px);
  }
  
  .menu-toggle-btn {
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
}
</style>
