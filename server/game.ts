import { Card, GameState, Player, Rank, Suit, RANKS, SUITS } from "@shared/schema";
import { randomUUID } from "crypto";

export class GameLogic {
  static createInitialState(players: Player[]): GameState {
    const deck = this.createDeck();
    
    // Deal 4 cards to each player
    players.forEach(p => {
      p.hand = [];
      for (let i = 0; i < 4; i++) {
        const card = deck.pop();
        if (card) {
          card.ownerId = p.id;
          p.hand.push(card);
        }
      }
      // Rule: "Cartas sempre do lado aveso para ninguem ver" - todas as cartas começam viradas
      p.knownCards = {}; 
    });

    return {
      deck,
      discardPile: [deck.pop()!], // Start with one discarded
      players,
      currentPlayerIndex: 0,
      turnPhase: "draw",
      drawnCard: null,
      drawnFromDiscard: false,
      round: 1,
      winnerId: null,
      logs: ["Game started!"],
      finalRoundDeclarerId: null,
      isFinalRound: false
    };
  }

  static createDeck(): Card[] {
    const deck: Card[] = [];
    SUITS.forEach(suit => {
      RANKS.forEach(rank => {
        if (rank === "Joker") return; // Handle jokers separately if needed (usually 2)
        deck.push({
          id: randomUUID(),
          suit,
          rank,
          value: this.getCardValue(rank),
          isFaceUp: false
        });
      });
    });
    // Add 2 Jokers
    deck.push({ id: randomUUID(), suit: "spades", rank: "Joker", value: -1, isFaceUp: false });
    deck.push({ id: randomUUID(), suit: "hearts", rank: "Joker", value: -1, isFaceUp: false });

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  static getCardValue(rank: Rank): number {
    if (rank === "Joker") return -1;
    if (rank === "K") return 0;
    if (rank === "A") return 1;
    if (rank === "J") return 11;
    if (rank === "Q") return 12;
    return parseInt(rank) || 0;
  }

  static handleAbility(
    state: GameState, 
    rank: Rank, 
    sourceId: string, 
    targetId?: string, 
    cardIdx?: number,
    targetCardIdx?: number,
    targetPlayerId2?: string,
    targetCardIdx2?: number
  ): { success: boolean; message: string; privateInfo?: { card: Card; playerName: string }; swapInfo?: { player1Name: string; player1CardIndex: number; player2Name: string; player2CardIndex: number } } {
    const sourcePlayer = state.players.find(p => p.id === sourceId);
    if (!sourcePlayer) return { success: false, message: "Source player not found" };

    // 7,8: See own card
    if (rank === "7" || rank === "8") {
      if (!targetId || targetId !== sourceId || cardIdx === undefined) {
        return { success: false, message: "Invalid target for peek own card" };
      }
      if (cardIdx < 0 || cardIdx >= sourcePlayer.hand.length) {
        return { success: false, message: "Invalid card index" };
      }
      sourcePlayer.knownCards[cardIdx.toString()] = true;
      return { success: true, message: `You peeked at your card: ${sourcePlayer.hand[cardIdx].rank} of ${sourcePlayer.hand[cardIdx].suit}` };
    }
    
    // 5,6: See opponent card
    if (rank === "5" || rank === "6") {
      if (!targetId || targetId === sourceId || cardIdx === undefined) {
        return { success: false, message: "Invalid target for peek opponent card" };
      }
      const targetPlayer = state.players.find(p => p.id === targetId);
      if (!targetPlayer) {
        return { success: false, message: "Target player not found" };
      }
      if (cardIdx < 0 || cardIdx >= targetPlayer.hand.length) {
        return { success: false, message: "Invalid card index" };
      }
      const peekedCard = targetPlayer.hand[cardIdx];
      return { 
        success: true, 
        message: `You peeked at ${targetPlayer.name}'s card`,
        privateInfo: { card: peekedCard, playerName: targetPlayer.name }
      };
    }

    // 9,10: Swap cards between 2 players (pode ser entre próprio jogador e outro, ou entre dois jogadores)
    if (rank === "9" || rank === "10") {
      // Se targetId é o próprio jogador, precisa de dois jogadores diferentes
      // Caso contrário, troca entre sourceId e targetId
      // Se targetPlayerId2 está definido, troca entre dois jogadores (pode incluir o próprio)
      if (targetPlayerId2) {
        const player1 = state.players.find(p => p.id === targetId);
        const player2 = state.players.find(p => p.id === targetPlayerId2);
        if (!player1 || !player2 || player1.id === player2.id) {
          return { success: false, message: "Must select two different players to swap" };
        }
        
        const cardIdx1 = cardIdx !== undefined ? cardIdx : Math.floor(Math.random() * player1.hand.length);
        const cardIdx2 = targetCardIdx2 !== undefined ? targetCardIdx2 : Math.floor(Math.random() * player2.hand.length);
        
        if (cardIdx1 < 0 || cardIdx1 >= player1.hand.length ||
            cardIdx2 < 0 || cardIdx2 >= player2.hand.length) {
          return { success: false, message: "Invalid card indices for swap" };
        }
        
        const card1 = player1.hand[cardIdx1];
        const card2 = player2.hand[cardIdx2];
        
        player1.hand[cardIdx1] = card2;
        player2.hand[cardIdx2] = card1;
        
        delete player1.knownCards[cardIdx1.toString()];
        delete player2.knownCards[cardIdx2.toString()];
        
        // Retorna mensagem detalhada para log
        return { 
          success: true, 
          message: `${sourcePlayer.name} swapped card ${cardIdx1 + 1} of ${player1.name} with card ${cardIdx2 + 1} of ${player2.name}`,
          swapInfo: {
            player1Name: player1.name,
            player1CardIndex: cardIdx1 + 1,
            player2Name: player2.name,
            player2CardIndex: cardIdx2 + 1
          }
        };
      } else if (targetId && targetId !== sourceId) {
        // Troca entre sourceId e targetId
        const targetPlayer = state.players.find(p => p.id === targetId);
        if (!targetPlayer) {
          return { success: false, message: "Target player not found" };
        }
        
        const sourceCardIdx = cardIdx !== undefined ? cardIdx : Math.floor(Math.random() * sourcePlayer.hand.length);
        const finalTargetCardIdx = targetCardIdx !== undefined ? targetCardIdx : Math.floor(Math.random() * targetPlayer.hand.length);
        
        if (sourceCardIdx < 0 || sourceCardIdx >= sourcePlayer.hand.length ||
            finalTargetCardIdx < 0 || finalTargetCardIdx >= targetPlayer.hand.length) {
          return { success: false, message: "Invalid card indices for swap" };
        }

        const sourceCard = sourcePlayer.hand[sourceCardIdx];
        const targetCard = targetPlayer.hand[finalTargetCardIdx];
        
        sourcePlayer.hand[sourceCardIdx] = targetCard;
        targetPlayer.hand[finalTargetCardIdx] = sourceCard;
        
        delete sourcePlayer.knownCards[sourceCardIdx.toString()];
        delete targetPlayer.knownCards[finalTargetCardIdx.toString()];
        
        // Retorna mensagem detalhada para log
        return { 
          success: true, 
          message: `${sourcePlayer.name} swapped card ${sourceCardIdx + 1} with card ${finalTargetCardIdx + 1} of ${targetPlayer.name}`,
          swapInfo: {
            player1Name: sourcePlayer.name,
            player1CardIndex: sourceCardIdx + 1,
            player2Name: targetPlayer.name,
            player2CardIndex: finalTargetCardIdx + 1
          }
        };
      }
    }

    return { success: false, message: "No ability for this card" };
  }

  static processAction(state: GameState, action: any, playerId: string): { 
    newState: GameState; 
    privateMessage?: { playerId: string; message: string; card?: Card; playerName?: string; targetPlayerId?: string; targetCardIndex?: number } 
  } {
    const newState = JSON.parse(JSON.stringify(state)); // Deep copy
    const playerIndex = newState.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      return { newState: state };
    }

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
          newState.logs.push("Baralho reciclado e embaralhado");
        }
        const drawnCard = newState.deck.pop();
        if (drawnCard) {
          newState.drawnCard = drawnCard;
          newState.drawnFromDiscard = false; // Puxou do deck, pode usar habilidades
          newState.turnPhase = "action";
          newState.logs.push(`${newState.players[playerIndex].name} comprou uma carta do baralho`);
        }
        break;

      case "draw_discard":
        const discardCard = newState.discardPile.pop();
        if (discardCard) {
          newState.drawnCard = discardCard;
          newState.drawnFromDiscard = true; // Puxou da pilha de descarte, NÃO pode usar habilidades
          newState.turnPhase = "action";
          newState.logs.push(`${newState.players[playerIndex].name} comprou a carta ${discardCard.rank} de ${discardCard.suit} da pilha de descarte`);
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
          newState.logs.push(`${newState.players[playerIndex].name} descartou a carta ${discardedCard.rank} de ${discardedCard.suit}`);
          
          // Avança turno e incrementa round se necessário
          const nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
          if (nextPlayerIndex === 0) {
            newState.round++;
          }
          
          // Verifica se é rodada final e voltou ao declarante
          if (newState.isFinalRound && newState.finalRoundDeclarerId === playerId) {
            newState.turnPhase = "finished";
            this.calculateFinalScores(newState);
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
            newState.logs.push(`${newState.players[playerIndex].name} substituiu a carta ${action.handIndex + 1} da mão`);
          }
          newState.drawnCard = null;
          newState.drawnFromDiscard = false;
          newState.turnPhase = "draw";
          
          // Avança turno e incrementa round se necessário
          const nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
          if (nextPlayerIndex === 0) {
            newState.round++;
          }
          
          // Verifica se é rodada final e voltou ao declarante
          if (newState.isFinalRound && newState.finalRoundDeclarerId === playerId) {
            newState.turnPhase = "finished";
            this.calculateFinalScores(newState);
          } else {
            newState.currentPlayerIndex = nextPlayerIndex;
          }
        }
        break;

      case "use_ability":
        if (!newState.drawnCard) {
          return { newState };
        }
        // Não pode usar habilidades se a carta foi puxada da pilha de descarte
        if (newState.drawnFromDiscard) {
          return { newState };
        }
        const abilityResult = this.handleAbility(
          newState,
          newState.drawnCard.rank,
          playerId,
          action.targetPlayerId,
          action.targetCardIndex,
          action.targetCardIndex2,
          action.targetPlayerId2,
          action.targetCardIndex3
        );
        
        if (abilityResult.success) {
          // Adiciona log detalhado baseado no tipo de habilidade
          if (abilityResult.swapInfo) {
            // Troca de cartas - log público detalhado
            newState.logs.push(`${newState.players[playerIndex].name} trocou a carta ${abilityResult.swapInfo.player1CardIndex} de ${abilityResult.swapInfo.player1Name} com a carta ${abilityResult.swapInfo.player2CardIndex} de ${abilityResult.swapInfo.player2Name}`);
          } else if (rank === "7" || rank === "8") {
            // Ver própria carta - log simples
            newState.logs.push(`${newState.players[playerIndex].name} usou habilidade para ver uma de suas cartas`);
          } else if (rank === "5" || rank === "6") {
            // Ver carta de oponente - log simples (detalhes são privados)
            const targetPlayer = newState.players.find(p => p.id === action.targetPlayerId);
            if (targetPlayer) {
              newState.logs.push(`${newState.players[playerIndex].name} usou habilidade para ver uma carta de ${targetPlayer.name}`);
            }
          }
          
          // Descarta a carta após usar habilidade
          newState.discardPile.push(newState.drawnCard);
          newState.drawnCard = null;
          newState.drawnFromDiscard = false;
          newState.turnPhase = "draw";
          
          // Avança turno e incrementa round se necessário
          const nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
          if (nextPlayerIndex === 0) {
            newState.round++;
          }
          
          // Verifica se é rodada final e voltou ao declarante
          if (newState.isFinalRound && newState.finalRoundDeclarerId === playerId) {
            newState.turnPhase = "finished";
            this.calculateFinalScores(newState);
          } else {
            newState.currentPlayerIndex = nextPlayerIndex;
          }
          
          // Se há informação privada (cartas 5 e 6), retorna para enviar mensagem privada
          if (abilityResult.privateInfo) {
            return {
              newState,
              privateMessage: {
                playerId,
                message: abilityResult.message,
                card: abilityResult.privateInfo.card,
                playerName: abilityResult.privateInfo.playerName,
                targetPlayerId: action.targetPlayerId,
                targetCardIndex: action.targetCardIndex
              }
            };
          }
        }
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
              newState.logs.push(`${player.name} descartou a carta ${cardToDiscard.rank} de ${cardToDiscard.suit} (corresponde ao descarte)`);
            }
          }
        }
        break;

      case "declare_finish":
        // Verifica se já passaram 5 turnos (round >= 5)
        if (newState.round < 5) {
          newState.logs.push(`${newState.players[playerIndex].name} cannot declare finish yet. Need at least 5 rounds.`);
          return { newState };
        }
        
        // Inicia rodada final
        newState.finalRoundDeclarerId = playerId;
        newState.isFinalRound = true;
        newState.turnPhase = "draw";
        newState.logs.push(`${newState.players[playerIndex].name} declarou CUNOKU! Rodada final iniciada.`);
        // Não avança turno ainda - o declarante ainda pode jogar
        break;
      
      case "discard_from_hand":
        // Regra: descartar carta da mão se for igual ao topo da pilha de descarte
        // Se não for igual, aplica punição: compra 2 cartas
        if (action.cardIndex !== undefined && newState.discardPile.length > 0) {
          const cardToDiscard = player.hand[action.cardIndex];
          const topDiscard = newState.discardPile[newState.discardPile.length - 1];
          
          if (!cardToDiscard || !topDiscard) {
            return { newState };
          }
          
          if (cardToDiscard.rank === topDiscard.rank) {
            // Carta corresponde - descarta normalmente
            player.hand.splice(action.cardIndex, 1);
            newState.discardPile.push(cardToDiscard);
            // Remove do knownCards e reindexa
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
            newState.logs.push(`${newState.players[playerIndex].name} descartou a carta ${cardToDiscard.rank} de ${cardToDiscard.suit} da mão`);
            
            // Avança turno e incrementa round se necessário
            const nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
            if (nextPlayerIndex === 0) {
              newState.round++;
            }
            
            // Verifica se é rodada final e voltou ao declarante
            if (newState.isFinalRound && newState.finalRoundDeclarerId === playerId) {
              newState.turnPhase = "finished";
              this.calculateFinalScores(newState);
            } else {
              newState.currentPlayerIndex = nextPlayerIndex;
            }
          } else {
            // Carta NÃO corresponde - APLICA PUNIÇÃO
            // Regra especial: Se jogador tem 6 cartas, apenas perde a vez (não compra 2 cartas)
            if (player.hand.length >= 6) {
              // Apenas perde a vez - avança turno
              newState.logs.push(`${newState.players[playerIndex].name} tentou descartar carta errada! Perde a vez (tem 6 cartas).`);
              
              // Avança turno e incrementa round se necessário
              const nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
              if (nextPlayerIndex === 0) {
                newState.round++;
              }
              
              // Verifica se é rodada final e voltou ao declarante
              if (newState.isFinalRound && newState.finalRoundDeclarerId === playerId) {
                newState.turnPhase = "finished";
                this.calculateFinalScores(newState);
              } else {
                newState.currentPlayerIndex = nextPlayerIndex;
              }
            } else {
              // Punição normal: compra 2 cartas
              for (let i = 0; i < 2; i++) {
                if (newState.deck.length === 0) {
                  // Recicla pilha de descarte se baralho vazio
                  const topDiscardCard = newState.discardPile.pop();
                  newState.deck = [...newState.discardPile];
                  newState.discardPile = topDiscardCard ? [topDiscardCard] : [];
                  // Embaralha
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
              newState.logs.push(`${newState.players[playerIndex].name} tentou descartar carta errada! Compra 2 cartas como punição.`);
              // NÃO descarta a carta, NÃO avança turno - jogador mantém a carta e recebe punição
            }
          }
        }
        break;
    }

    return { newState };
  }

  static calculateFinalScores(state: GameState): void {
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
}
