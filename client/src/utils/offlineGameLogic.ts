import { GameState, GameAction, Card, Player } from "@shared/schema";
import { BotPlayer } from "@/utils/botPlayer";

/**
 * Processa uma ação do jogador no jogo offline
 */
export function processOfflineAction(
  gameState: GameState,
  action: GameAction,
  playerId: string
): GameState {
  const newState = { ...gameState };
  const playerIndex = newState.players.findIndex(p => p.id === playerId);
  
  if (playerIndex === -1) return gameState;
  
  const player = newState.players[playerIndex];
  
  switch (action.type) {
    case "draw_deck":
      if (newState.deck.length === 0) {
        // Recicla pilha de descarte se baralho vazio
        const topDiscard = newState.discardPile.pop();
        newState.deck = [...newState.discardPile];
        newState.discardPile = topDiscard ? [topDiscard] : [];
        // Embaralha
        for (let i = newState.deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newState.deck[i], newState.deck[j]] = [newState.deck[j], newState.deck[i]];
        }
      }
      const drawnCard = newState.deck.pop();
      if (drawnCard) {
        newState.drawnCard = drawnCard;
        newState.turnPhase = "action";
      }
      break;
      
    case "draw_discard":
      const discardCard = newState.discardPile.pop();
      if (discardCard) {
        newState.drawnCard = discardCard;
        newState.turnPhase = "action";
      }
      break;
      
    case "discard_drawn":
      if (newState.drawnCard) {
        newState.discardPile.push(newState.drawnCard);
        newState.drawnCard = null;
        newState.turnPhase = "draw";
        // Próximo jogador
        newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
      }
      break;
      
    case "replace_card":
      if (newState.drawnCard && action.handIndex !== undefined) {
        const oldCard = player.hand[action.handIndex];
        player.hand[action.handIndex] = newState.drawnCard;
        if (oldCard) {
          newState.discardPile.push(oldCard);
        }
        newState.drawnCard = null;
        newState.turnPhase = "draw";
        // Próximo jogador
        newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
      }
      break;
      
    case "use_ability":
      if (!newState.drawnCard) break;
      
      const drawnCardForAbility = newState.drawnCard;
      const rank = drawnCardForAbility.rank;
      
      // 7,8: See own card
      if (rank === "7" || rank === "8") {
        if (action.targetCardIndex !== undefined && action.targetPlayerId === playerId) {
          const cardIdx = action.targetCardIndex;
          if (cardIdx >= 0 && cardIdx < player.hand.length) {
            player.knownCards[cardIdx.toString()] = true;
          }
        }
      }
      
      // 5,6: See opponent card (informação privada - será tratada no frontend)
      if (rank === "5" || rank === "6") {
        if (action.targetPlayerId && action.targetPlayerId !== playerId && action.targetCardIndex !== undefined) {
          const targetPlayer = newState.players.find(p => p.id === action.targetPlayerId);
          if (targetPlayer && action.targetCardIndex >= 0 && action.targetCardIndex < targetPlayer.hand.length) {
            // A informação privada será mostrada via toast no frontend
            // Não modificamos o estado global, apenas processamos a ação
          }
        }
      }
      
      // 9,10: Swap cards between 2 players
      if (rank === "9" || rank === "10") {
        if (action.targetPlayerId && action.targetPlayerId !== playerId) {
          const targetPlayer = newState.players.find(p => p.id === action.targetPlayerId);
          if (targetPlayer) {
            const sourceCardIdx = action.targetCardIndex !== undefined ? action.targetCardIndex : Math.floor(Math.random() * player.hand.length);
            const targetCardIdx = action.targetCardIndex2 !== undefined ? action.targetCardIndex2 : Math.floor(Math.random() * targetPlayer.hand.length);
            
            if (sourceCardIdx >= 0 && sourceCardIdx < player.hand.length &&
                targetCardIdx >= 0 && targetCardIdx < targetPlayer.hand.length) {
              // Troca as cartas
              const sourceCard = player.hand[sourceCardIdx];
              const targetCard = targetPlayer.hand[targetCardIdx];
              
              player.hand[sourceCardIdx] = targetCard;
              targetPlayer.hand[targetCardIdx] = sourceCard;
              
              // Reset knownCards para as cartas trocadas
              delete player.knownCards[sourceCardIdx.toString()];
              delete targetPlayer.knownCards[targetCardIdx.toString()];
            }
          }
        }
      }
      
      // Descarta a carta após usar habilidade
      newState.discardPile.push(newState.drawnCard);
      newState.drawnCard = null;
      newState.turnPhase = "draw";
      newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
      break;
      
    case "declare_finish":
      // Implementar lógica de fim de jogo
      newState.turnPhase = "finished";
      break;
  }
  
  return newState;
}

/**
 * Processa turno de um bot
 */
export function processBotTurn(
  gameState: GameState,
  botPlayer: BotPlayer,
  playerIndex: number
): GameState {
  const action = botPlayer.decideTurn(gameState, playerIndex);
  return processOfflineAction(gameState, action, gameState.players[playerIndex].id);
}

