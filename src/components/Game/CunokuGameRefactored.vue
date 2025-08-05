<template>
  <div class="cunoku-game poker-hud">
    <!-- Notificação pop-up -->
    <transition name="fade">
      <div v-if="mensagemStatus" class="popup-notificacao">
        {{ mensagemStatus }}
      </div>
    </transition>
    
    <div v-if="!estado">
      <p>{{ t('waitingPlayers') }}</p>
    </div>
    
    <div v-else>
      <!-- Mesa de Poker -->
      <PokerTable :gameState="estado">
        <template #players>
          <PlayerPosition
            v-for="(player, idx) in estado.players"
            :key="idx"
            :player="player"
            :playerIndex="idx"
            :totalPlayers="estado.players.length"
            :isActivePlayer="idx === estado.jogadorDaVez"
            :isCurrentUser="idx === meuIndice"
            :playerHand="idx === meuIndice ? maoReal : []"
            :revealedCards="cartasReveladas"
            :canDiscard="indiceDescarteTentativa === null"
            @try-discard="tentarDescarte"
          />
        </template>
      </PokerTable>
      
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
import { defineComponent } from 'vue'
import { t } from '../../i18n/index.js'
import { useGameLogic } from './Logic/useGameLogic.js'
import PokerTable from './UI/PokerTable.vue'
import PlayerPosition from './UI/PlayerPosition.vue'
import ActionArea from './UI/ActionArea.vue'
import DiscardInterface from './UI/DiscardInterface.vue'
import AbilityInterface from './UI/AbilityInterface.vue'
import EndGameDisplay from './UI/EndGameDisplay.vue'

export default defineComponent({
  name: 'CunokuGame',
  components: {
    PokerTable,
    PlayerPosition,
    ActionArea,
    DiscardInterface,
    AbilityInterface,
    EndGameDisplay
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
    // Usar a lógica do jogo
    const gameLogic = useGameLogic()
    
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
    
    // Métodos principais do jogo
    const comprarCarta = () => {
      if (!gameLogic.podeComprarCarta.value) return
      
      if (gameLogic.modoOffline.value) {
        // Lógica offline
        const carta = gameLogic.estado.value.baralho.pop()
        gameLogic.cartaComprada.value = carta
        gameLogic.escolhendoAcao.value = true
      } else {
        // Lógica online
        props.socket?.emit('comprar-carta', { roomId: props.roomId })
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
          gameLogic.showMessage('Descarte realizado com sucesso!')
        } else {
          // Lógica online
          props.socket?.emit('tentar-descarte', {
            roomId: props.roomId,
            indices: [gameLogic.indiceDescarteTentativa.value, idx2]
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
        props.socket?.emit('substituir-carta', {
          roomId: props.roomId,
          indice: idx
        })
        gameLogic.resetGameState()
      }
    }
    
    const cancelarSubstituicao = () => {
      gameLogic.indiceSubstituir.value = null
    }
    
    const descartarCartaComprada = () => {
      if (gameLogic.modoOffline.value) {
        // Lógica offline
        gameLogic.estado.value.pilha.push(gameLogic.cartaComprada.value)
        gameLogic.showMessage('Carta descartada!')
        gameLogic.resetGameState()
        gameLogic.avancarTurnoLocal()
      } else {
        // Lógica online
        props.socket?.emit('descartar-carta-comprada', { roomId: props.roomId })
        gameLogic.resetGameState()
      }
    }
    
    const usarHabilidade = () => {
      const carta = gameLogic.cartaComprada.value
      if (!carta) return
      
      // Determinar tipo de habilidade
      if (['Cinco', 'Seis'].includes(carta.nome)) {
        gameLogic.escolhendoCartaOponente.value = true
      } else if (['Sete', 'Oito'].includes(carta.nome)) {
        gameLogic.escolhendoCartaPropria.value = true
      } else if (['Nove', 'Dez'].includes(carta.nome)) {
        gameLogic.escolhendoTroca.value = true
      }
      
      gameLogic.escolhendoAcao.value = false
    }
    
    const declararFimDeJogo = () => {
      if (gameLogic.modoOffline.value) {
        // Lógica offline
        gameLogic.estado.value.fimDeclarado = true
        gameLogic.estado.value.jogadorDeclarouFim = gameLogic.estado.value.players[gameLogic.meuIndice.value].nome
        gameLogic.estado.value.turnosRestantesFim = 2 * gameLogic.estado.value.players.length
        gameLogic.showMessage('Fim de jogo declarado!')
      } else {
        // Lógica online
        props.socket?.emit('declarar-fim', { roomId: props.roomId })
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
          gameLogic.cartasReveladas.value.push({ idx: action.cardIndex, carta: cartaVista })
          gameLogic.showMessage(`Carta revelada: ${cartaVista.nome} de ${cartaVista.naipe}`, 5000)
          
          // Remove após 5 segundos
          setTimeout(() => {
            gameLogic.cartasReveladas.value = gameLogic.cartasReveladas.value.filter(c => c.idx !== action.cardIndex)
          }, 5000)
          
          gameLogic.estado.value.pilha.push(carta)
          gameLogic.resetGameState()
          gameLogic.avancarTurnoLocal()
          
        } else if (action.type === 'opponent-card') {
          // Ver carta de oponente (cartas 5 e 6)
          const player = gameLogic.estado.value.players[action.playerIndex]
          const cartaVista = player.mao[action.cardIndex]
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
    
    return {
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
      cancelarHabilidade
    }
  }
})
</script>

<style scoped>
/* Container principal do jogo com tema cassino japonês */
.cunoku-game.poker-hud {
  width: 100%;
  height: 100vh;
  background: 
    radial-gradient(ellipse at center, #0f3d2e 0%, #1a4d3a 70%, #0a1f1a 100%);
  color: #ffd700;
  font-family: 'Noto Sans JP', 'Cinzel', serif;
  overflow: hidden;
  position: relative;
  z-index: 1;
  box-sizing: border-box;
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
  padding: 2rem 3rem;
  border-radius: 20px;
  box-shadow: 
    0 15px 50px rgba(0, 0, 0, 0.8),
    0 0 0 3px #d4af37,
    inset 0 2px 0 rgba(255, 255, 255, 0.3);
  font-size: clamp(1.1rem, 2.5vw, 1.5rem);
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
</style>
