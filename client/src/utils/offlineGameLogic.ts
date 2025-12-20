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
        newState.drawnFromDiscard = false; // Puxou do deck, pode usar habilidades
        newState.turnPhase = "action";
      }
      break;
      
    case "draw_discard":
      const discardCard = newState.discardPile.pop();
      if (discardCard) {
        newState.drawnCard = discardCard;
        newState.drawnFromDiscard = true; // Puxou da pilha de descarte, NÃO pode usar habilidades
        newState.turnPhase = "action";
      }
      break;
      
    case "discard_drawn":
      // Descarta a carta que acabou de puxar - SEM punição (pode descartar qualquer carta puxada)
      if (newState.drawnCard) {
        const discardedCard = newState.drawnCard;
        newState.discardPile.push(discardedCard);
        newState.drawnCard = null;
        newState.drawnFromDiscard = false;
        newState.turnPhase = "draw";
        newState.logs.push(`${player.name} discarded ${discardedCard.rank}`);
        
        // Avança turno e incrementa round se necessário
        const nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
        if (nextPlayerIndex === 0) {
          newState.round++;
        }
        
        // Verifica se é rodada final e voltou ao declarante
        if (newState.isFinalRound && newState.finalRoundDeclarerId === playerId) {
          newState.turnPhase = "finished";
          calculateFinalScores(newState);
        } else {
          newState.currentPlayerIndex = nextPlayerIndex;
        }
      }
      break;
      
    case "replace_card":
      if (newState.drawnCard && action.handIndex !== undefined) {
        const oldCard = player.hand[action.handIndex];
        player.hand[action.handIndex] = newState.drawnCard;
        if (oldCard) {
          newState.discardPile.push(oldCard);
          newState.logs.push(`${player.name} replaced a card`);
        }
        newState.drawnCard = null;
        newState.drawnFromDiscard = false;
        newState.turnPhase = "draw";
        // Próximo jogador
        newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
      }
      break;
      
    case "use_ability":
      if (!newState.drawnCard) break;
      
      // Não pode usar habilidades se a carta foi puxada da pilha de descarte
      if (newState.drawnFromDiscard) break;
      
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
      newState.drawnFromDiscard = false;
      newState.turnPhase = "draw";
      newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
      break;
    
    case "matched_discard":
      // Regra de descarte reativo: descartar carta igual que o jogador sabe que tem
      if (action.cardIndex !== undefined) {
        const cardToDiscard = player.hand[action.cardIndex];
        if (cardToDiscard && player.knownCards[action.cardIndex.toString()]) {
          // Verifica se a carta descartada anteriormente tem o mesmo rank
          const lastDiscarded = newState.discardPile[newState.discardPile.length - 1];
          if (lastDiscarded && lastDiscarded.rank === cardToDiscard.rank) {
            // Remove a carta da mão e adiciona à pilha de descarte
            player.hand.splice(action.cardIndex, 1);
            newState.discardPile.push(cardToDiscard);
            // Remove do knownCards
            delete player.knownCards[action.cardIndex.toString()];
            // Reindexa knownCards
            const newKnownCards: Record<string, boolean> = {};
            Object.keys(player.knownCards).forEach(key => {
              const idx = parseInt(key);
              if (idx < action.cardIndex!) {
                newKnownCards[key] = true;
              } else if (idx > action.cardIndex!) {
                newKnownCards[(idx - 1).toString()] = true;
              }
            });
            player.knownCards = newKnownCards;
            newState.logs.push(`${player.name} discarded matching ${cardToDiscard.rank}`);
          }
        }
      }
      break;
      
    case "declare_finish":
      // Verifica se já passaram 5 turnos (round >= 5)
      if (newState.round < 5) {
        newState.logs.push(`${player.name} cannot declare finish yet. Need at least 5 rounds.`);
        return newState;
      }
      
      // Inicia rodada final
      newState.finalRoundDeclarerId = playerId;
      newState.isFinalRound = true;
      newState.turnPhase = "draw";
      newState.logs.push(`${player.name} declared CUNOKU! Final round begins.`);
      break;
    
    case "discard_from_hand":
      // Regra: descartar carta da mão se for igual ao topo da pilha de descarte
      // Se não for igual, aplica punição: compra 2 cartas
      if (action.cardIndex !== undefined && newState.discardPile.length > 0) {
        const cardToDiscard = player.hand[action.cardIndex];
        const topDiscard = newState.discardPile[newState.discardPile.length - 1];
        
        if (!cardToDiscard || !topDiscard) {
          return newState;
        }
        
        if (cardToDiscard.rank === topDiscard.rank) {
          // Carta corresponde - descarta normalmente
          player.hand.splice(action.cardIndex, 1);
          newState.discardPile.push(cardToDiscard);
          delete player.knownCards[action.cardIndex.toString()];
          const newKnownCards: Record<string, boolean> = {};
          Object.keys(player.knownCards).forEach(key => {
            const idx = parseInt(key);
            if (idx < action.cardIndex!) {
              newKnownCards[key] = true;
            } else if (idx > action.cardIndex!) {
              newKnownCards[(idx - 1).toString()] = true;
            }
          });
          player.knownCards = newKnownCards;
          newState.logs.push(`${player.name} discarded ${cardToDiscard.rank} from hand`);
          
          // Avança turno e incrementa round se necessário
          const nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
          if (nextPlayerIndex === 0) {
            newState.round++;
          }
          
          // Verifica se é rodada final e voltou ao declarante
          if (newState.isFinalRound && newState.finalRoundDeclarerId === playerId) {
            newState.turnPhase = "finished";
            calculateFinalScores(newState);
          } else {
            newState.currentPlayerIndex = nextPlayerIndex;
          }
        } else {
          // Carta NÃO corresponde - APLICA PUNIÇÃO
          // Regra especial: Se jogador tem 6 cartas, apenas perde a vez (não compra 2 cartas)
          if (player.hand.length >= 6) {
            // Apenas perde a vez - avança turno
            newState.logs.push(`${player.name} tried to discard wrong card! Loses turn (has 6 cards).`);
            
            // Avança turno e incrementa round se necessário
            const nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
            if (nextPlayerIndex === 0) {
              newState.round++;
            }
            
            // Verifica se é rodada final e voltou ao declarante
            if (newState.isFinalRound && newState.finalRoundDeclarerId === playerId) {
              newState.turnPhase = "finished";
              calculateFinalScores(newState);
            } else {
              newState.currentPlayerIndex = nextPlayerIndex;
            }
          } else {
            // Punição normal: compra 2 cartas
            for (let i = 0; i < 2; i++) {
              if (newState.deck.length === 0) {
                const topDiscardCard = newState.discardPile.pop();
                newState.deck = [...newState.discardPile];
                newState.discardPile = topDiscardCard ? [topDiscardCard] : [];
                for (let j = newState.deck.length - 1; j > 0; j--) {
                  const k = Math.floor(Math.random() * (j + 1));
                  [newState.deck[j], newState.deck[k]] = [newState.deck[k], newState.deck[j]];
                }
              }
              const penaltyCard = newState.deck.pop();
              if (penaltyCard) {
                player.hand.push(penaltyCard);
              }
            }
            newState.logs.push(`${player.name} tried to discard wrong card! Draws 2 cards as penalty.`);
            // NÃO descarta a carta, NÃO avança turno - jogador mantém a carta e recebe punição
          }
        }
      }
      break;
  }
  
  return newState;
}

/**
 * Calcula pontuações finais e determina vencedor
 */
function calculateFinalScores(state: GameState): void {
  // Revela todas as cartas
  state.players.forEach(player => {
    // Marca todas as cartas como conhecidas para revelação
    player.hand.forEach((_, index) => {
      player.knownCards[index.toString()] = true;
    });
    
    // Calcula pontuação total
    player.score = player.hand.reduce((sum, card) => sum + card.value, 0);
  });
  
  // Encontra o vencedor (menor pontuação)
  const sortedPlayers = [...state.players].sort((a, b) => a.score - b.score);
  state.winnerId = sortedPlayers[0].id;
  
  state.logs.push(`Game finished! Winner: ${sortedPlayers[0].name} with ${sortedPlayers[0].score} points`);
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

