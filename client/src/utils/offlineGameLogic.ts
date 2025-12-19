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

