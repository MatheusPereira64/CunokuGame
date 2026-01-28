import { useEffect, useState, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useGameSocket } from "@/hooks/use-game-socket";
import { useOfflineGame } from "@/hooks/use-offline-game";
import { PlayingCard } from "@/components/PlayingCard";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { GameState, Card, Player } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { CardSwapAnimation } from "@/components/CardSwapAnimation";
import { CardFlipAnimation } from "@/components/CardFlipAnimation";
import { 
  useGameAnimations, 
  AnimationRenderer,
  OpponentActionNotification,
  OpponentActionType
} from "@/components/animations";
import { ArrowLeft, Copy, Eye, RefreshCw, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { audioManager } from "@/utils/audioManager";
import { useIsMobile } from "@/hooks/use-mobile";
import { VolumeControl } from "@/components/VolumeControl";
import { useI18n } from "@/contexts/i18n-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Game() {
  const [match, params] = useRoute("/game/:code");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const roomCode = params?.code || "";
  
  // Extract player ID and mode from query string
  const searchParams = new URLSearchParams(window.location.search);
  const playerId = searchParams.get("player") || "";
  const isOffline = searchParams.get("mode") === "offline" || roomCode === "offline";

  // Para modo offline, carrega estado do sessionStorage
  const [offlineGameState, setOfflineGameState] = useState<GameState | null>(null);
  const [botDifficulty, setBotDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [isLoadingOffline, setIsLoadingOffline] = useState(true);
  
  useEffect(() => {
    if (isOffline && playerId) {
      setIsLoadingOffline(true);
      const savedState = sessionStorage.getItem(`offline_game_${playerId}`);
      const savedDifficulty = sessionStorage.getItem(`offline_difficulty_${playerId}`);
      
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState) as GameState;
          
          // Valida que o estado está completo
          if (parsedState && parsedState.players && parsedState.players.length > 0) {
            setOfflineGameState(parsedState);
            if (savedDifficulty) {
              setBotDifficulty(savedDifficulty as "easy" | "medium" | "hard");
            }
            console.log("Offline game state loaded:", { 
              players: parsedState.players.length,
              currentPlayer: parsedState.currentPlayerIndex,
              state: parsedState
            });
            setIsLoadingOffline(false);
          } else {
            console.error("Invalid game state structure:", parsedState);
            toast({ 
              title: t("error.generic"), 
              description: t("game.errorInvalidState"), 
              variant: "destructive" 
            });
            setIsLoadingOffline(false);
          }
        } catch (e) {
          console.error("Failed to parse offline game state:", e);
          toast({ 
            title: t("error.generic"), 
            description: t("game.errorFailedToLoad"), 
            variant: "destructive" 
          });
          setIsLoadingOffline(false);
        }
      } else {
        console.error("No saved game state found for player:", playerId);
        console.log("Available sessionStorage keys:", Object.keys(sessionStorage));
        toast({ 
          title: t("error.generic"), 
          description: t("game.errorNotFound"), 
          variant: "destructive" 
        });
        setIsLoadingOffline(false);
      }
    } else if (!isOffline) {
      setIsLoadingOffline(false);
    }
  }, [isOffline, playerId, toast]);

  // Hook para jogo offline
  const { gameState: offlineGameStateFromHook, sendAction: sendOfflineAction } = useOfflineGame(
    offlineGameState,
    playerId,
    botDifficulty
  );

  // Hook para jogo online
  const { gameState: onlineGameState, connected, sendAction: sendOnlineAction, socketRef, revealedCard: onlineRevealedCard, setRevealedCard: setOnlineRevealedCard, swapInfo: onlineSwapInfo, setSwapInfo: setOnlineSwapInfo } = useGameSocket(
    isOffline ? "" : roomCode, 
    isOffline ? "" : playerId
  );
  
  // Estado para animação de troca de cartas
  const [activeSwapAnimation, setActiveSwapAnimation] = useState<{
    swapInfo: { player1Id: string; player1Name: string; player1CardIndex: number; player2Id: string; player2Name: string; player2CardIndex: number };
    player1Card?: Card;
    player2Card?: Card;
    player1Position: { x: number; y: number };
    player2Position: { x: number; y: number };
  } | null>(null);
  
  // Refs para calcular posições das cartas
  const cardRefs = useRef<Map<string, { x: number; y: number; card?: Card }>>(new Map());
  // Ref para rastrear estado anterior de revelação das cartas (para animação de flip)
  const previousRevealedState = useRef<Map<string, boolean>>(new Map());
  // Ref para guardar estado anterior do jogo (para pegar cartas antes da troca)
  const previousGameState = useRef<GameState | null>(null);

  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);
  const [abilityModalOpen, setAbilityModalOpen] = useState(false);
  const [selectedTargetPlayer, setSelectedTargetPlayer] = useState<string | null>(null);
  const [selectedTargetCard, setSelectedTargetCard] = useState<number | null>(null);
  const [selectedTargetCard2, setSelectedTargetCard2] = useState<number | null>(null);
  const [selectedTargetPlayer2, setSelectedTargetPlayer2] = useState<string | null>(null);
  const [swapMode, setSwapMode] = useState<"me_and_other" | "two_others">("me_and_other");
  const [swapStep, setSwapStep] = useState<1 | 2>(1); // Para controlar o passo da seleção no modo "two_others"
  const [firstPlayerSelection, setFirstPlayerSelection] = useState<{ playerId: string; cardIndex: number } | null>(null);
  const [privateCardInfo, setPrivateCardInfo] = useState<{ card: Card; playerName: string } | null>(null);
  const [peekTimers, setPeekTimers] = useState<Map<number, NodeJS.Timeout>>(new Map());
  const [revealedOpponentCard, setRevealedOpponentCard] = useState<{ card: Card; playerName: string; timer?: NodeJS.Timeout } | null>(null);
  // Rastreia cartas de oponentes reveladas temporariamente: chave = `${playerId}_${cardIndex}`
  // Usa array em vez de Set para facilitar detecção de mudanças pelo React
  const [revealedOpponentCardsInHand, setRevealedOpponentCardsInHand] = useState<string[]>([]);
  // Usa ref para armazenar timers sem causar re-renders
  const revealedCardTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  // Estado para controlar se o modal de fim de jogo está aberto
  const [gameOverModalOpen, setGameOverModalOpen] = useState(false);
  
  // Estado para notificações de ações de oponentes
  const [opponentActionNotification, setOpponentActionNotification] = useState<{
    playerName: string;
    actionType: OpponentActionType;
  } | null>(null);
  
  // Usa estado offline se estiver em modo offline, senão usa online
  const gameState = isOffline ? offlineGameStateFromHook : onlineGameState;
  const sendAction = isOffline ? sendOfflineAction : sendOnlineAction;
  
  // Sistema de animações de cartas
  const {
    deckRef,
    discardRef,
    registerCardRef,
    currentAnimation,
    isPlaying: isAnimationPlaying,
    animateDraw,
    animateDiscard,
    animateReplace,
    animateSwap,
    animatePeek,
    animatePenalty,
    completeCurrentAnimation,
  } = useGameAnimations({
    gameState,
    playerId,
    cardRefs, // Passa o cardRefs existente
    onAnimationComplete: (type) => {
      console.log(`[Game] Animação ${type} concluída`);
    },
  });
  
  // Guarda estado anterior para detectar mudanças e disparar animações
  const prevGameStateRef = useRef<GameState | null>(null);
  const animationTriggeredRef = useRef<Set<string>>(new Set()); // Evita disparar animações duplicadas
  
  useEffect(() => {
    if (!gameState) {
      return;
    }

    // Inicializa estado anterior na primeira vez
    if (!prevGameStateRef.current) {
      prevGameStateRef.current = JSON.parse(JSON.stringify(gameState));
      return;
    }

    const prevState = prevGameStateRef.current;
    const currentState = gameState;

    // Cria uma chave única para esta mudança de estado
    const stateChangeKey = `${prevState.currentPlayerIndex}_${currentState.currentPlayerIndex}_${Date.now()}`;
    
    // Aguarda um frame para garantir que os elementos estão renderizados
    const timeoutId = setTimeout(() => {
      // Detecta compra de carta (draw_deck ou draw_discard)
      if (!prevState.drawnCard && currentState.drawnCard) {
        const currentPlayer = currentState.players[currentState.currentPlayerIndex];
        if (currentPlayer) {
          // Determina se veio do deck ou descarte comparando tamanhos
          const cameFromDeck = prevState.deck.length > currentState.deck.length;
          const cameFromDiscard = prevState.discardPile.length > currentState.discardPile.length;
          
          const source: 'deck' | 'discard' = cameFromDiscard ? 'discard' : 'deck';
          const animKey = `draw_${currentPlayer.id}_${currentState.drawnCard.rank}_${currentState.drawnCard.suit}`;
          
          if (!animationTriggeredRef.current.has(animKey)) {
            console.log('[Game] Animando compra de carta:', {
              card: currentState.drawnCard,
              source,
              player: currentPlayer.name
            });
            
            animationTriggeredRef.current.add(animKey);
            animateDraw(currentState.drawnCard, source, currentPlayer.id);
            
            // Remove da lista após um tempo para permitir nova animação
            setTimeout(() => animationTriggeredRef.current.delete(animKey), 2000);
          }
        }
      }

      // Detecta substituição ou descarte de carta comprada
      if (prevState.drawnCard && !currentState.drawnCard && prevState.discardPile.length < currentState.discardPile.length) {
        const currentPlayer = currentState.players[currentState.currentPlayerIndex];
        const prevPlayer = prevState.players[prevState.currentPlayerIndex];
        const drawnCard = prevState.drawnCard;
        const topDiscard = currentState.discardPile[currentState.discardPile.length - 1];
        
        const isOpponent = currentPlayer.id !== playerId;
        
        // Verifica se houve substituição (mão mantém mesmo tamanho)
        if (currentPlayer && prevPlayer && currentPlayer.hand.length === prevPlayer.hand.length) {
          // Substituição: carta da mão foi trocada pela comprada
          const discardedCard = topDiscard;
          const handIndex = prevPlayer.hand.findIndex(c => 
            c.rank === discardedCard.rank && c.suit === discardedCard.suit
          );
          
          if (drawnCard && discardedCard && handIndex >= 0) {
            const animKey = `replace_${currentPlayer.id}_${handIndex}_${Date.now()}`;
            if (!animationTriggeredRef.current.has(animKey)) {
              console.log('[Game] Animando substituição de carta:', {
                drawnCard,
                discardedCard,
                handIndex,
                player: currentPlayer.name,
                isOpponent
              });
              
              animationTriggeredRef.current.add(animKey);
              
              // Se for oponente, mostra notificação
              if (isOpponent) {
                setOpponentActionNotification({
                  playerName: currentPlayer.name,
                  actionType: 'replace'
                });
              } else {
                animateReplace(drawnCard, discardedCard, handIndex, currentPlayer.id);
              }
              
              setTimeout(() => animationTriggeredRef.current.delete(animKey), 2000);
            }
          }
        } else {
          // Descarte simples: carta comprada foi descartada sem substituir
          const discardedCard = drawnCard;
          if (discardedCard && currentPlayer) {
            const animKey = `discard_drawn_${currentPlayer.id}_${discardedCard.rank}_${discardedCard.suit}`;
            if (!animationTriggeredRef.current.has(animKey)) {
              console.log('[Game] Animando descarte de carta comprada:', {
                card: discardedCard,
                player: currentPlayer.name,
                isOpponent
              });
              
              animationTriggeredRef.current.add(animKey);
              
              // Se for oponente, mostra notificação
              if (isOpponent) {
                setOpponentActionNotification({
                  playerName: currentPlayer.name,
                  actionType: 'discard'
                });
              } else {
                animateDiscard(discardedCard, 'drawn', currentPlayer.id);
              }
              
              setTimeout(() => animationTriggeredRef.current.delete(animKey), 2000);
            }
          }
        }
      }

      // Detecta descarte da mão (discard_from_hand ou matched_discard)
      // Só detecta se NÃO foi substituição (já tratada acima)
      if (!(prevState.drawnCard && !currentState.drawnCard)) {
        currentState.players.forEach((player, playerIndex) => {
          const prevPlayer = prevState.players[playerIndex];
          if (!prevPlayer) return;

          // Verifica se o jogador perdeu uma carta da mão
          if (player.hand.length < prevPlayer.hand.length) {
            // Encontra qual carta foi removida comparando as mãos
            const removedCard = prevPlayer.hand.find(prevCard => 
              !player.hand.some(currCard => 
                currCard.rank === prevCard.rank && currCard.suit === prevCard.suit
              )
            );

            if (removedCard && currentState.discardPile.length > prevState.discardPile.length) {
              // Verifica se a carta descartada corresponde ao topo da pilha
              const topDiscard = currentState.discardPile[currentState.discardPile.length - 1];
              const isMatch = topDiscard.rank === removedCard.rank && topDiscard.suit === removedCard.suit;
              
              // Determina o tipo de descarte
              const discardType: 'from_hand' | 'matched' = 
                (prevState.currentPlayerIndex === playerIndex && prevState.turnPhase === 'draw') 
                  ? 'from_hand' 
                  : 'matched';
              
              const cardIndex = prevPlayer.hand.findIndex(c => 
                c.rank === removedCard.rank && c.suit === removedCard.suit
              );
              
              const animKey = `discard_hand_${player.id}_${removedCard.rank}_${removedCard.suit}_${Date.now()}`;
              const isOpponent = player.id !== playerId;
              
              if (!animationTriggeredRef.current.has(animKey)) {
                console.log('[Game] Animando descarte da mão:', {
                  card: removedCard,
                  discardType,
                  isMatch,
                  player: player.name,
                  cardIndex,
                  isOpponent
                });
                
                animationTriggeredRef.current.add(animKey);
                
                // Se for oponente, mostra notificação
                if (isOpponent) {
                  setOpponentActionNotification({
                    playerName: player.name,
                    actionType: 'discard'
                  });
                } else {
                  animateDiscard(removedCard, discardType, player.id, cardIndex, isMatch);
                }
                
                setTimeout(() => animationTriggeredRef.current.delete(animKey), 2000);
              }
            }
          }
        });
      }

      // Detecta penalidade (jogador ganhou 2 cartas)
      currentState.players.forEach((player, playerIndex) => {
        const prevPlayer = prevState.players[playerIndex];
        if (!prevPlayer) return;

        if (player.hand.length > prevPlayer.hand.length) {
          const cardsAdded = player.hand.length - prevPlayer.hand.length;
          
          // Se adicionou exatamente 2 cartas e não é o turno do jogador, pode ser penalidade
          if (cardsAdded === 2 && currentState.currentPlayerIndex !== playerIndex) {
            const newCards = player.hand.slice(-2);
            const startingIndex = prevPlayer.hand.length;
            
            const animKey = `penalty_${player.id}_${newCards[0]?.rank}_${newCards[1]?.rank}_${Date.now()}`;
            if (!animationTriggeredRef.current.has(animKey)) {
              console.log('[Game] Animando penalidade:', {
                cards: newCards,
                player: player.name,
                startingIndex
              });
              
              animationTriggeredRef.current.add(animKey);
              animatePenalty(newCards, player.id, startingIndex);
              setTimeout(() => animationTriggeredRef.current.delete(animKey), 3000);
            }
          }
        }
      });

      // Atualiza estado anterior
      prevGameStateRef.current = JSON.parse(JSON.stringify(currentState));
    }, 100); // Aumentado para 100ms para dar tempo dos elementos renderizarem
    
    return () => clearTimeout(timeoutId);
  }, [gameState, animateDraw, animateDiscard, animateReplace, animatePenalty]);

  // Guarda estado anterior para pegar cartas antes da troca (mantido para compatibilidade)
  useEffect(() => {
    if (gameState) {
      previousGameState.current = JSON.parse(JSON.stringify(gameState));
    }
  }, [gameState]);

  // Detecta quando uma troca acontece e prepara animação
  useEffect(() => {
    if (onlineSwapInfo && gameState && previousGameState.current) {
      console.log("[Game] Troca detectada:", onlineSwapInfo);
      
      const prevState = previousGameState.current;
      const player1Prev = prevState.players.find(p => p.id === onlineSwapInfo.player1Id);
      const player2Prev = prevState.players.find(p => p.id === onlineSwapInfo.player2Id);
      
      if (player1Prev && player2Prev) {
        // Ajusta índices (swapInfo usa índices baseados em 1, mas arrays são baseados em 0)
        const card1Index = onlineSwapInfo.player1CardIndex - 1;
        const card2Index = onlineSwapInfo.player2CardIndex - 1;
        
        // Pega as cartas do estado ANTERIOR (antes da troca)
        const player1Card = player1Prev.hand[card1Index];
        const player2Card = player2Prev.hand[card2Index];
        
        if (player1Card && player2Card) {
          console.log("[Game] Animando troca de cartas:", {
            player1: onlineSwapInfo.player1Name,
            player2: onlineSwapInfo.player2Name,
            card1: player1Card.rank,
            card2: player2Card.rank
          });
          
          // Usa o novo sistema de animações
          animateSwap(
            onlineSwapInfo.player1Id,
            card1Index,
            onlineSwapInfo.player2Id,
            card2Index,
            player1Card,
            player2Card
          );
        }
      }
      
      // Limpa swapInfo após um tempo
      setTimeout(() => {
        if (!isOffline) {
          setOnlineSwapInfo(null);
        }
      }, 3000);
    }
  }, [onlineSwapInfo, gameState, animateSwap, isOffline, setOnlineSwapInfo]);

  // Cleanup timers ao desmontar
  useEffect(() => {
    return () => {
      peekTimers.forEach(timer => clearTimeout(timer));
      if (revealedOpponentCard?.timer) {
        clearTimeout(revealedOpponentCard.timer);
      }
      revealedCardTimersRef.current.forEach(timer => clearTimeout(timer));
      revealedCardTimersRef.current.clear();
      setRevealedOpponentCardsInHand([]);
    };
  }, [revealedOpponentCard, peekTimers]);
  
  // Quando recebe carta revelada do servidor (online), exibe por 20 segundos
  useEffect(() => {
    if (!isOffline && onlineRevealedCard) {
      // Limpa qualquer timer anterior do overlay
      if (revealedOpponentCard?.timer) {
        clearTimeout(revealedOpponentCard.timer);
      }
      
      // Mostra a carta no overlay por 20 segundos
      const overlayTimer = setTimeout(() => {
        setOnlineRevealedCard(null);
        setRevealedOpponentCard(null);
      }, 20000);
      
      setRevealedOpponentCard({ 
        card: onlineRevealedCard.card, 
        playerName: onlineRevealedCard.playerName,
        timer: overlayTimer
      });
      
      // Para a carta na mão, usa as informações do servidor se disponíveis
      const targetPlayerId = (onlineRevealedCard as any).targetPlayerId;
      const targetCardIndex = (onlineRevealedCard as any).targetCardIndex;
      
      if (targetPlayerId !== undefined && targetCardIndex !== undefined) {
        // IMPORTANTE: Usa o ID da carta em vez do índice para rastrear mesmo quando os índices mudam
        // Precisamos encontrar a carta no gameState atual para obter seu ID
        const targetPlayer = gameState?.players.find(p => p.id === targetPlayerId);
        if (targetPlayer && targetPlayer.hand[targetCardIndex]) {
          const targetCard = targetPlayer.hand[targetCardIndex];
          const cardKey = `${targetPlayerId}_${targetCard.id}`;
          
          // Limpa timer anterior se existir
          const existingTimer = revealedCardTimersRef.current.get(cardKey);
          if (existingTimer) {
            clearTimeout(existingTimer);
            revealedCardTimersRef.current.delete(cardKey);
          }
          
          // Adiciona a carta ao array de cartas reveladas
          setRevealedOpponentCardsInHand(prev => {
            if (prev.includes(cardKey)) return prev; // Já está no array
            console.log(`[Online] Adicionando carta ${cardKey} (${targetCard.rank} de ${targetCard.suit}) ao array de reveladas`);
            return [...prev, cardKey];
          });
          
          // Cria novo timer para ocultar a carta após 20 segundos
          const handTimer = setTimeout(() => {
            console.log(`[Online] Timer executado, removendo carta ${cardKey}`);
            setRevealedOpponentCardsInHand(current => {
              const filtered = current.filter(key => key !== cardKey);
              console.log(`[Online] Array após remoção:`, filtered);
              return filtered;
            });
            revealedCardTimersRef.current.delete(cardKey);
          }, 20000);
          
          revealedCardTimersRef.current.set(cardKey, handTimer);
        }
      }
      
      // Cleanup: limpa timers quando o componente desmonta ou quando onlineRevealedCard muda
      return () => {
        clearTimeout(overlayTimer);
        if (targetPlayerId !== undefined && targetCardIndex !== undefined) {
          // Precisamos encontrar a carta no gameState atual para obter seu ID
          const targetPlayer = gameState?.players.find(p => p.id === targetPlayerId);
          if (targetPlayer && targetPlayer.hand[targetCardIndex]) {
            const targetCard = targetPlayer.hand[targetCardIndex];
            const cardKey = `${targetPlayerId}_${targetCard.id}`;
            const timer = revealedCardTimersRef.current.get(cardKey);
            if (timer) {
              clearTimeout(timer);
              revealedCardTimersRef.current.delete(cardKey);
            }
            setRevealedOpponentCardsInHand(prev => prev.filter(key => key !== cardKey));
          }
        }
      };
    }
  }, [onlineRevealedCard, isOffline, setOnlineRevealedCard]);

  // Detecta quando alguém declara Cunoku (para jogo offline)
  const prevFinalRound = useRef(false);
  useEffect(() => {
    if (isOffline && gameState) {
      // Se acabou de entrar em rodada final e antes não estava
      if (gameState.isFinalRound && !prevFinalRound.current) {
        const declarer = gameState.players.find(p => p.id === gameState.finalRoundDeclarerId);
        if (declarer) {
          toast({
            title: t("game.cunokuDeclared"),
            description: t("game.cunokuDeclaredDesc").replace("{player}", declarer.name),
            duration: 5000,
          });
        }
      }
      prevFinalRound.current = gameState.isFinalRound || false;
    }
  }, [gameState?.isFinalRound, gameState?.finalRoundDeclarerId, isOffline, toast]);

  const me = gameState?.players.find(p => p.id === playerId);
  const isMyTurn = gameState?.players[gameState.currentPlayerIndex]?.id === playerId;
  const phase = gameState?.turnPhase;

  // Toca música da partida quando o jogo começa
  useEffect(() => {
    if (gameState && !gameState.winnerId) {
      audioManager.playGameMusic();
    }
    
    // Cleanup ao sair da partida
    return () => {
      audioManager.stopAllMusic();
    };
  }, [gameState?.winnerId]);

  // Detecta quando o jogo termina e toca som de vitória/derrota
  useEffect(() => {
    if (gameState?.winnerId && me) {
      // Abre o modal de fim de jogo quando há um vencedor
      setGameOverModalOpen(true);
      
      if (gameState.winnerId === playerId) {
        audioManager.playGameWon();
      } else {
        audioManager.playGameLost();
      }
    }
  }, [gameState?.winnerId, playerId, me]);

  // Early returns APÓS todos os hooks
  if (!playerId || (!isOffline && !roomCode)) {
    return <div className="h-screen flex items-center justify-center">{t("game.invalidUrl")}</div>;
  }

  if (isOffline && (isLoadingOffline || !offlineGameStateFromHook)) {
    return (
      <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center text-white">
        <div className="animate-pulse text-2xl font-display mb-4">{t("game.loading")}</div>
        <div className="text-white/50">{t("game.settingUp")}</div>
      </div>
    );
  }

  // Helpers
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast({ title: t("game.copied"), description: t("game.copiedDesc") });
  };

  const handleCardClick = (cardIndex: number, isMyHand: boolean) => {
    if (!isMyHand) return;

    // Descarte reativo: se não é meu turno mas posso descartar carta igual
    if (!isMyTurn && gameState && me) {
      const matchInfo = canMatchDiscard();
      if (matchInfo.canMatch && matchInfo.matchingCards.includes(cardIndex)) {
        sendAction({ type: 'matched_discard', cardIndex });
        return;
      }
    }

    if (!isMyTurn) return;

    // Descarte direto da mão: se é meu turno e a carta é conhecida, pode tentar descartar
    // Se corresponder ao topo da pilha, descarta normalmente; se não, recebe punição
    if (phase === 'draw' && gameState && me) {
      const discardInfo = canDiscardFromHand();
      if (discardInfo.canDiscard && discardInfo.allKnownCards.includes(cardIndex)) {
        sendAction({ type: 'discard_from_hand', cardIndex });
        return;
      }
    }

    if (phase === 'action' && gameState?.drawnCard) {
      // Replace phase
      sendAction({ type: 'replace_card', handIndex: cardIndex });
      return;
    }
    
    // Potentially handle peek/swap logic here if abilities are active
    setSelectedHandIndex(cardIndex === selectedHandIndex ? null : cardIndex);
  };

  // Verifica se a carta comprada tem habilidade especial
  const hasSpecialAbility = (card: Card | null): boolean => {
    if (!card) return false;
    return ["5", "6", "7", "8", "9", "10"].includes(card.rank);
  };

  // Verifica se o jogador pode descartar uma carta igual à última descartada (reativo)
  const canMatchDiscard = (): { canMatch: boolean; matchingCards: number[] } => {
    if (!gameState || !me || gameState.discardPile.length === 0) {
      return { canMatch: false, matchingCards: [] };
    }
    
    const lastDiscarded = gameState.discardPile[gameState.discardPile.length - 1];
    const matchingCards: number[] = [];
    
    me.hand.forEach((card, index) => {
      if (card.rank === lastDiscarded.rank && me.knownCards[index.toString()]) {
        matchingCards.push(index);
      }
    });
    
    return { canMatch: matchingCards.length > 0, matchingCards };
  };

  // Verifica se o jogador pode descartar carta da mão diretamente (durante seu turno)
  // Permite descartar qualquer carta conhecida - se corresponder, descarta; se não, recebe punição
  const canDiscardFromHand = (): { canDiscard: boolean; matchingCards: number[]; allKnownCards: number[] } => {
    if (!gameState || !me || !isMyTurn || phase !== 'draw' || gameState.discardPile.length === 0) {
      return { canDiscard: false, matchingCards: [], allKnownCards: [] };
    }
    
    const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
    const matchingCards: number[] = [];
    const allKnownCards: number[] = [];
    
    me.hand.forEach((card, index) => {
      // Se a carta é conhecida, pode tentar descartar
      if (me.knownCards[index.toString()]) {
        allKnownCards.push(index);
        // Se corresponde ao topo da pilha, é um descarte seguro
        if (card.rank === topDiscard.rank) {
          matchingCards.push(index);
        }
      }
    });
    
    return { canDiscard: allKnownCards.length > 0, matchingCards, allKnownCards };
  };

  const getAbilityDescription = (rank: string): string => {
    switch (rank) {
      case "5":
      case "6":
        return t("game.abilityPeekOpponent");
      case "7":
      case "8":
        return t("game.abilityPeekOwn");
      case "9":
      case "10":
        return t("game.abilitySwap");
      default:
        return "";
    }
  };

  const handleUseAbility = () => {
    if (!gameState?.drawnCard || !me) return;
    
    const rank = gameState.drawnCard.rank;
    
    // Cartas 7 e 8: ver própria carta - abre modal para selecionar
    if (rank === "7" || rank === "8") {
      setAbilityModalOpen(true);
      return;
    }
    
    // Cartas 5, 6, 9, 10: precisam de alvo
    setAbilityModalOpen(true);
  };

  const confirmAbilityUse = () => {
    if (!gameState?.drawnCard || !me) return;
    
    const rank = gameState.drawnCard.rank;
    
    // Cartas 7 e 8: ver própria carta (fica visível por 20 segundos)
    if (rank === "7" || rank === "8") {
      if (selectedHandIndex === null) {
        toast({ 
          title: t("game.selectCard"), 
          description: t("game.selectCardDesc"),
          variant: "destructive" 
        });
        return;
      }
      
      sendAction({ 
        type: 'use_ability', 
        ability: rank === "7" ? "peek_own" : "peek_own",
        targetPlayerId: playerId,
        targetCardIndex: selectedHandIndex
      });
      
      // Timer de 20 segundos para virar a carta novamente
      const timer = setTimeout(() => {
        if (me && me.knownCards[selectedHandIndex.toString()]) {
          // Remove do knownCards após 20 segundos
          const updatedKnownCards = { ...me.knownCards };
          delete updatedKnownCards[selectedHandIndex.toString()];
          // Atualiza o estado local (o servidor não precisa saber, é apenas visual)
          if (gameState) {
            const playerIndex = gameState.players.findIndex(p => p.id === playerId);
            if (playerIndex !== -1) {
              gameState.players[playerIndex].knownCards = updatedKnownCards;
            }
          }
          setPeekTimers(prev => {
            const newMap = new Map(prev);
            newMap.delete(selectedHandIndex);
            return newMap;
          });
        }
      }, 20000);
      
      setPeekTimers(prev => {
        const newMap = new Map(prev);
        newMap.set(selectedHandIndex, timer);
        return newMap;
      });
    }
    
    // Cartas 5 e 6: ver carta de oponente
    if (rank === "5" || rank === "6") {
      if (!selectedTargetPlayer || selectedTargetCard === null) {
        toast({ 
          title: t("game.selectTarget"), 
          description: t("game.selectTargetDesc"),
          variant: "destructive" 
        });
        return;
      }
      
      const targetPlayer = gameState.players.find(p => p.id === selectedTargetPlayer);
      if (targetPlayer && targetPlayer.hand[selectedTargetCard]) {
        const peekedCard = targetPlayer.hand[selectedTargetCard];
        setPrivateCardInfo({ card: peekedCard, playerName: targetPlayer.name });
        
        // Limpa qualquer timer anterior do overlay
        if (revealedOpponentCard?.timer) {
          clearTimeout(revealedOpponentCard.timer);
        }
        
        // Mostra a carta no overlay por 20 segundos
        const overlayTimer = setTimeout(() => {
          setRevealedOpponentCard(null);
        }, 20000);
        
        setRevealedOpponentCard({ 
          card: peekedCard, 
          playerName: targetPlayer.name,
          timer: overlayTimer
        });
        
        // Marca a carta na mão do oponente como revelada por 20 segundos
        // IMPORTANTE: Usa o ID da carta em vez do índice para rastrear mesmo quando os índices mudam
        const targetCard = targetPlayer.hand[selectedTargetCard];
        const cardKey = `${selectedTargetPlayer}_${targetCard.id}`;
        
        // Limpa timer anterior se existir
        const existingTimer = revealedCardTimersRef.current.get(cardKey);
        if (existingTimer) {
          clearTimeout(existingTimer);
          revealedCardTimersRef.current.delete(cardKey);
        }
        
        // Adiciona a carta ao array de cartas reveladas
        console.log(`[Offline] Adicionando carta ${cardKey} (${targetCard.rank} de ${targetCard.suit}) ao array, targetPlayer: ${selectedTargetPlayer}, targetCardIndex: ${selectedTargetCard}`);
        setRevealedOpponentCardsInHand(prev => {
          if (prev.includes(cardKey)) {
            console.log(`[Offline] Carta ${cardKey} já está no array`);
            return prev; // Já está no array
          }
          console.log(`[Offline] Array antes:`, prev, `Array depois:`, [...prev, cardKey]);
          return [...prev, cardKey];
        });
        
        // Cria novo timer para ocultar a carta após 20 segundos
        const handTimer = setTimeout(() => {
          console.log(`[Offline Timer] Executando timer para ocultar carta ${cardKey} após 20 segundos`);
          setRevealedOpponentCardsInHand(prev => {
            const filtered = prev.filter(key => key !== cardKey);
            console.log(`[Offline Timer] Array antes:`, prev, `Array depois:`, filtered);
            return filtered;
          });
          revealedCardTimersRef.current.delete(cardKey);
          console.log(`[Offline Timer] Timer removido do ref para ${cardKey}`);
        }, 20000);
        
        revealedCardTimersRef.current.set(cardKey, handTimer);
        console.log(`[Offline] Timer criado para carta ${cardKey}, será executado em 20 segundos`);
      }
      
      sendAction({ 
        type: 'use_ability', 
        ability: rank === "5" ? "peek_opponent" : "peek_opponent",
        targetPlayerId: selectedTargetPlayer,
        targetCardIndex: selectedTargetCard
      });
    }
    
    // Cartas 9 e 10: trocar cartas
    if (rank === "9" || rank === "10") {
      if (swapMode === "me_and_other") {
        // Troca entre próprio jogador e outro
        if (!selectedTargetPlayer || selectedHandIndex === null || selectedTargetCard === null) {
          toast({ 
            title: "Selecione cartas", 
            description: "Selecione sua carta, o jogador alvo e a carta dele",
            variant: "destructive" 
          });
          return;
        }
        
        sendAction({ 
          type: 'use_ability', 
          ability: "swap",
          targetPlayerId: playerId,
          targetCardIndex: selectedHandIndex,
          targetPlayerId2: selectedTargetPlayer,
          targetCardIndex3: selectedTargetCard
        });
      } else {
        // Troca entre dois outros jogadores
        if (!firstPlayerSelection || !selectedTargetPlayer2 || selectedTargetCard2 === null) {
          toast({ 
            title: "Selecione cartas", 
            description: "Selecione dois jogadores e suas cartas",
            variant: "destructive" 
          });
          return;
        }
        
        sendAction({ 
          type: 'use_ability', 
          ability: "swap",
          targetPlayerId: firstPlayerSelection.playerId,
          targetCardIndex: firstPlayerSelection.cardIndex,
          targetPlayerId2: selectedTargetPlayer2,
          targetCardIndex2: selectedTargetCard2
        });
      }
    }
    
    setAbilityModalOpen(false);
    setSelectedTargetPlayer(null);
    setSelectedTargetPlayer2(null);
    setSelectedTargetCard(null);
    setSelectedTargetCard2(null);
    setSelectedHandIndex(null);
    setSwapMode("me_and_other");
    setSwapStep(1);
    setFirstPlayerSelection(null);
  };

  const renderPlayer = (player: Player, index: number, totalPlayers: number) => {
    // Calculate position around the table
    // Bottom is me (always index 0 in relative view), others distributed
    // This is a simplified positioning logic
    
    // In a real app, you'd rotate the array so 'me' is always at bottom
    
    const isMe = player.id === playerId;
    
    // Only for debugging visual layout - real logic needs to rotate based on my seat
    // For now, simple list or grid
    
    return (
      <div key={player.id} className={cn(
        "flex flex-col items-center rounded-xl transition-all",
        isMobile ? "gap-1 p-1" : "gap-2 p-2"
      )}>
        <div className={cn(
          "flex justify-center",
          isMobile ? "gap-0.5 mb-1" : "gap-1 mb-2"
        )}>
          {player.hand.map((card, i) => {
            // Verifica se esta carta foi revelada temporariamente (cartas 5 e 6)
            // IMPORTANTE: Usa o ID da carta em vez do índice para rastrear mesmo quando os índices mudam
            const cardKey = `${player.id}_${card.id}`;
            const isTemporarilyRevealed = revealedOpponentCardsInHand.includes(cardKey);
            
            // Verifica se a carta está em knownCards (para cartas próprias)
            const isKnownCard = isMe && (player.knownCards[i] || player.knownCards[i.toString()]);
            
            // Debug: log quando a carta deveria estar revelada
            if (isTemporarilyRevealed && !isMe) {
              console.log(`[Render] Carta ${cardKey} (${card.rank} de ${card.suit}) está temporariamente revelada para ${player.name}`);
            }
            
            // Mostra a carta se: jogo terminou, é minha carta e eu conheço, ou foi revelada temporariamente
            // IMPORTANTE: Para oponentes, só mostra se isTemporarilyRevealed for true (não verifica knownCards)
            const shouldShowCard = gameState?.winnerId || 
                                   isKnownCard || 
                                   (!isMe && isTemporarilyRevealed);
            
            // Calcula posição da carta para animação de troca
            const cardPositionKey = `${player.id}_${i}`;
            const cardRef = (el: HTMLDivElement | null) => {
              if (el) {
                const rect = el.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                cardRefs.current.set(cardPositionKey, {
                  x: centerX,
                  y: centerY,
                  card: card
                });
              } else {
                cardRefs.current.delete(cardPositionKey);
              }
            };
            
            // Verifica se esta carta está sendo animada em uma troca
            // Durante a animação, esconde temporariamente as cartas que estão sendo trocadas
            const isSwapping = activeSwapAnimation && (
              (activeSwapAnimation.swapInfo.player1Id === player.id && activeSwapAnimation.swapInfo.player1CardIndex - 1 === i) ||
              (activeSwapAnimation.swapInfo.player2Id === player.id && activeSwapAnimation.swapInfo.player2CardIndex - 1 === i)
            );
            
            // Verifica se a carta acabou de ser revelada (para animação de flip)
            const cardStateKey = `${player.id}_${card.id}`;
            const wasPreviouslyHidden = previousRevealedState.current.get(cardStateKey) === false;
            const isNowRevealed = shouldShowCard;
            const wasJustRevealed = wasPreviouslyHidden && isNowRevealed;
            
            // Atualiza estado anterior
            previousRevealedState.current.set(cardStateKey, isNowRevealed);
            
            return (
              <div 
                key={i} 
                className="relative"
                ref={cardRef}
              >
                {shouldShowCard && !isSwapping ? (
                  <motion.div
                    initial={wasJustRevealed ? { rotateY: 180 } : false}
                    animate={{ rotateY: 0 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <PlayingCard 
                      card={card} 
                      hidden={false}
                      className={cn(
                        isMobile ? "w-8 h-12" : "w-12 h-16 md:w-16 md:h-24",
                        isTemporarilyRevealed && !isMe && "ring-2 ring-yellow-400 ring-offset-2"
                      )}
                      animate={false}
                    />
                  </motion.div>
                ) : isSwapping ? (
                  // Durante a animação de troca, esconde completamente a carta original
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      isMobile ? "w-8 h-12" : "w-12 h-16 md:w-16 md:h-24"
                    )}
                    style={{ pointerEvents: 'none' }}
                  >
                    <PlayingCard 
                      card={card} 
                      hidden={!shouldShowCard}
                      className={cn(
                        isMobile ? "w-8 h-12" : "w-12 h-16 md:w-16 md:h-24",
                        isTemporarilyRevealed && !isMe && "ring-2 ring-yellow-400 ring-offset-2"
                      )}
                      animate={false}
                    />
                  </motion.div>
                ) : (
                  <PlayingCard 
                    card={card} 
                    hidden={!shouldShowCard}
                    className={cn(
                      isMobile ? "w-8 h-12" : "w-12 h-16 md:w-16 md:h-24",
                      isTemporarilyRevealed && !isMe && "ring-2 ring-yellow-400 ring-offset-2"
                    )}
                    animate={false}
                  />
                )}
                {/* Eye icon marker if I know this card */}
                {isMe && player.knownCards[i] && (
                  <div className={cn(
                    "absolute bg-yellow-400 rounded-full shadow",
                    isMobile ? "-top-1 -right-1 p-0.5" : "-top-2 -right-2 p-1"
                  )}>
                    <Eye className={cn("text-yellow-900", isMobile ? "w-2 h-2" : "w-3 h-3")} />
                  </div>
                )}
                {/* Indicador visual para carta revelada temporariamente */}
                {!isMe && isTemporarilyRevealed && (
                  <div className={cn(
                    "absolute bg-yellow-400 rounded-full shadow animate-pulse",
                    isMobile ? "-top-1 -right-1 p-0.5" : "-top-2 -right-2 p-1"
                  )}>
                    <Eye className={cn("text-yellow-900", isMobile ? "w-2 h-2" : "w-3 h-3")} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Avatar 
          name={player.name} 
          isBot={player.isBot} 
          score={player.score} 
          isActive={gameState?.players[gameState.currentPlayerIndex]?.id === player.id}
          className={isMobile ? "scale-75" : ""}
        />
      </div>
    );
  };

  // Loading State
  if (!gameState) {
    return (
      <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center text-white">
        <div className="animate-pulse text-2xl font-display mb-4">Connecting to Table...</div>
        <div className="text-white/50">Room: {roomCode}</div>
      </div>
    );
  }

  // Waiting Room State
  if ((gameState.players.length < 2 || gameState.turnPhase === "waiting") && !gameState.winnerId) {
    // Busca hostId do sessionStorage
    const storedHostId = sessionStorage.getItem(`hostId_${roomCode}`);
    const isHost = storedHostId === playerId;
    const canStart = gameState.players.length >= 2;
    
    console.log("Waiting room state:", {
      players: gameState.players.length,
      playerId,
      storedHostId,
      isHost,
      canStart,
      turnPhase: gameState.turnPhase,
      roomCode,
      allSessionStorage: Object.keys(sessionStorage).filter(k => k.includes(roomCode))
    });
    
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-8 relative">
        {/* Volume Control - Top Right */}
        <div className="absolute top-4 right-4 z-20">
          <div className="[&_button]:bg-white/90 [&_button]:text-indigo-900 [&_button]:border-indigo-200 [&_button]:hover:bg-white [&_button]:shadow-md">
            <VolumeControl />
          </div>
        </div>
        
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-bold text-indigo-900">Waiting for Players</h2>
            <p className="text-gray-500 mt-2">Share this code with your friends</p>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-100 p-4 rounded-xl mb-8 cursor-pointer hover:bg-gray-200 transition-colors" onClick={handleCopyCode}>
            <div className="flex-1 font-mono text-3xl font-bold text-center tracking-widest text-indigo-900">
              {roomCode}
            </div>
            <Copy className="w-5 h-5 text-gray-500" />
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
              Current Players ({gameState.players.length}/{gameState.players.length >= 2 ? "Ready" : "2+"})
            </h3>
            <div className="space-y-2">
              {gameState.players.map(p => (
                <div 
                  key={p.id} 
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl transition-all",
                    p.id === playerId 
                      ? "bg-gradient-to-r from-indigo-100 to-purple-100 border-2 border-indigo-300 shadow-md" 
                      : "bg-gray-50 border border-gray-200"
                  )}
                >
                  <Avatar name={p.name} className={cn("scale-90", p.id === playerId && "ring-2 ring-indigo-400")} />
                  <div className="flex-1">
                    <div className="font-bold text-indigo-900 flex items-center gap-2">
                      {p.name}
                      {p.id === playerId && (
                        <span className="text-xs font-normal text-indigo-600 bg-indigo-200 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                      {p.id === playerId && isHost && (
                        <span className="text-xs font-semibold text-purple-700 bg-purple-200 px-2 py-0.5 rounded-full">
                          Host
                        </span>
                      )}
                    </div>
                    {p.id === playerId && (
                      <div className="text-xs text-gray-500 mt-1">Score: {p.score}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {canStart && isHost && (
             <Button 
               variant="primary"
               size="lg"
               className="w-full mt-6 text-lg py-6 font-bold shadow-lg hover:shadow-xl transition-all" 
               onClick={() => {
                 console.log("Start game clicked - socket state:", socketRef.current?.readyState);
                 console.log("Current room:", roomCode, "Player:", playerId);
                 if (socketRef.current?.readyState === WebSocket.OPEN) {
                   console.log("Sending start_game message");
                   socketRef.current.send(JSON.stringify({ type: "start_game" }));
                 } else {
                   console.error("Socket not open, state:", socketRef.current?.readyState);
                   toast({ 
                     title: "Connection Error", 
                     description: "Not connected to server",
                     variant: "destructive" 
                   });
                 }
               }}
             >
               Start Game ({gameState.players.length} players)
             </Button>
          )}
          
          {canStart && !isHost && (
             <div className="w-full mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-200 text-center">
               <div className="text-indigo-700 font-semibold mb-1">Waiting for host to start...</div>
               <div className="text-sm text-indigo-500">The game will begin shortly</div>
             </div>
          )}
          
          {!canStart && (
             <div className="w-full mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200 text-center">
               <div className="text-amber-700 font-semibold">Need at least 2 players to start</div>
               <div className="text-sm text-amber-600 mt-1">Share the room code with a friend!</div>
             </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white relative overflow-hidden flex flex-col">
      {/* Animação de troca de cartas (legado) */}
      {activeSwapAnimation && (
        <CardSwapAnimation
          swapInfo={activeSwapAnimation.swapInfo}
          player1Card={activeSwapAnimation.player1Card}
          player2Card={activeSwapAnimation.player2Card}
          player1Position={activeSwapAnimation.player1Position}
          player2Position={activeSwapAnimation.player2Position}
          onComplete={() => setActiveSwapAnimation(null)}
        />
      )}
      
      {/* Sistema de animações de cartas */}
      <AnimationRenderer
        currentAnimation={currentAnimation}
        onComplete={completeCurrentAnimation}
        playerId={playerId}
      />
      
      {/* Notificação de ações de oponentes */}
      {opponentActionNotification && (
        <OpponentActionNotification
          playerName={opponentActionNotification.playerName}
          actionType={opponentActionNotification.actionType}
          onComplete={() => setOpponentActionNotification(null)}
          duration={2000}
        />
      )}
      
      {/* Top Bar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 z-50 pointer-events-none",
        isMobile ? "p-2 flex flex-col gap-2" : "p-4 flex justify-between items-start"
      )}>
        <div className="flex items-center gap-2 pointer-events-auto">
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "bg-black/20 text-white border-white/20 backdrop-blur-sm",
              isMobile ? "text-xs px-2 py-1" : ""
            )}
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className={cn("w-4 h-4", isMobile ? "mr-1" : "mr-2")} /> 
            {isMobile ? "" : t("game.exit")}
          </Button>
          <div className="[&_button]:bg-black/20 [&_button]:text-white [&_button]:border-white/20 [&_button]:backdrop-blur-sm [&_button]:hover:bg-black/30">
            <VolumeControl />
          </div>
        </div>
        
        <div className={cn(
          "bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex flex-col items-center pointer-events-auto cursor-pointer",
          isMobile ? "px-3 py-1.5" : "px-6 py-2"
        )} onClick={handleCopyCode}>
          <div className={cn("text-white/60 font-mono", isMobile ? "text-[10px]" : "text-xs")}>{t("game.roomCode")}</div>
          <div className={cn(
            "font-bold tracking-widest font-mono flex items-center gap-2",
            isMobile ? "text-sm" : "text-xl"
          )}>
            {roomCode} <Copy className={cn(isMobile ? "w-2.5 h-2.5" : "w-3 h-3")} />
          </div>
        </div>
      </div>

      {/* Your Turn Banner - Top Center */}
      {isMyTurn && (
        <div className={cn(
          "absolute z-40 pointer-events-none",
          isMobile ? "top-16 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)]" : "top-20 left-1/2 transform -translate-x-1/2"
        )}>
          <motion.div 
            initial={{ y: -20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className={cn(
              "bg-gradient-to-r from-yellow-500/90 to-yellow-600/90 backdrop-blur-md rounded-full border-2 border-yellow-400 shadow-2xl flex items-center",
              isMobile ? "px-3 py-2 gap-2 flex-col" : "px-8 py-3 gap-4"
            )}
          >
            <span className={cn("text-yellow-900 font-bold", isMobile ? "text-xs" : "text-lg")}>{t("game.yourTurn")}</span>
            {phase === 'draw' && (
              <span className={cn("text-yellow-100 text-center", isMobile ? "text-[10px]" : "text-sm")}>
                {isMobile ? t("game.drawFromDeckShort") : t("game.drawFromDeck")}
              </span>
            )}
            {phase === 'action' && (
              <span className={cn("text-yellow-100 text-center", isMobile ? "text-[10px]" : "text-sm")}>
                {isMobile ? t("game.replaceOrDiscardShort") : t("game.replaceOrDiscard")}
              </span>
            )}
          </motion.div>
        </div>
      )}

      {/* Round Info - Top Left */}
      {gameState && (
        <div className={cn(
          "absolute z-40 pointer-events-none",
          isMobile ? "top-28 left-2" : "top-20 left-8"
        )}>
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className={cn(
              "bg-black/60 backdrop-blur-md rounded-xl border-2 border-yellow-500/50 shadow-xl",
              isMobile ? "px-3 py-2" : "px-6 py-3"
            )}
          >
            <div className="text-center">
              <div className={cn("font-bold text-yellow-400 mb-1", isMobile ? "text-sm" : "text-lg")}>
                {t("game.round")} {gameState.round}{gameState.round < 5 ? '/5' : ''}
              </div>
              {gameState.round < 5 ? (
                <div className={cn("text-white/80", isMobile ? "text-[10px]" : "text-xs")}>
                  {isMobile ? t("game.cunokuAfterRound5Short") : t("game.cunokuAfterRound5")}
                </div>
              ) : (
                <div className={cn("text-white/80", isMobile ? "text-[10px]" : "text-xs")}>
                  {t("game.turn")}: {gameState.players[gameState.currentPlayerIndex]?.name || 'Unknown'}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Ability Hint - Left Side */}
      {isMyTurn && phase === 'action' && gameState.drawnCard && hasSpecialAbility(gameState.drawnCard) && !gameState.drawnFromDiscard && !isMobile && (
        <div className="absolute left-8 top-1/2 transform -translate-y-1/2 z-40 pointer-events-none">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="bg-gradient-to-br from-yellow-500/95 to-yellow-600/95 backdrop-blur-md px-6 py-4 rounded-2xl border-2 border-yellow-400 shadow-2xl max-w-[280px]"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚡</div>
              <div className="flex-1">
                <div className="text-yellow-900 font-bold text-sm mb-1">
                  {t("game.abilityCard")}
                </div>
                <div className="text-yellow-950 font-semibold text-base leading-tight">
                  {getAbilityDescription(gameState.drawnCard!.rank)}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-yellow-400/30">
              <div className="text-yellow-900 text-xs font-medium">
                {t("game.abilityClickToUse")}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Replace Card Hint - Right Side */}
      {isMyTurn && phase === 'action' && gameState.drawnCard && !isMobile && (
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2 z-40 pointer-events-none">
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            className="bg-gradient-to-br from-green-600/95 to-green-700/95 backdrop-blur-md px-6 py-4 rounded-2xl border-2 border-green-400 shadow-2xl max-w-[280px]"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">✨</div>
              <div className="flex-1">
                <div className="text-green-100 font-bold text-sm mb-1">
                  {t("game.hintTitle")}
                </div>
                <div className="text-white font-semibold text-base leading-tight">
                  {t("game.hintReplace")}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-400/30">
              <div className="text-green-200 text-xs">
                {t("game.hintHighlighted")}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Game Table */}
      <div className={cn(
        "flex-1 flex items-center justify-center relative",
        isMobile ? "p-2" : "p-4 md:p-8"
      )}>
        <div className={cn(
          "w-full relative felt-table shadow-2xl flex items-center justify-center",
          isMobile ? "rounded-3xl min-h-[calc(100vh-200px)]" : "max-w-6xl aspect-[16/9] rounded-[100px]"
        )}>
          
          {/* Opponents (Top) */}
          <div className={cn(
            "absolute top-0 left-0 right-0 flex justify-center items-start",
            isMobile ? "h-auto pt-4 gap-2 flex-wrap" : "h-1/3 pt-8 gap-12"
          )}>
            {gameState.players.filter(p => p.id !== playerId).map((p, i) => renderPlayer(p, i, gameState.players.length))}
          </div>

          {/* Center Area: Deck & Discard */}
          <div className={cn(
            "flex items-center z-10",
            isMobile ? "gap-3" : "gap-12"
          )}>
            {/* Deck */}
            <div className="relative group" ref={deckRef}>
              {gameState.deck.length > 0 ? (
                <div 
                  onClick={() => isMyTurn && phase === 'draw' && sendAction({ type: 'draw_deck' })}
                  className={isMyTurn && phase === 'draw' ? "cursor-pointer" : ""}
                >
                  <PlayingCard 
                    hidden 
                    className={cn(
                      "transition-all",
                      isMobile ? "w-16 h-24" : "",
                      isMyTurn && phase === 'draw' 
                        ? "cursor-pointer hover:ring-4 ring-white/50 hover:scale-105" 
                        : "opacity-80"
                    )} 
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className={cn(
                      "font-bold transition-all",
                      isMobile ? "text-xs" : "",
                      isMyTurn && phase === 'draw' ? "text-white text-lg" : "text-white/80"
                    )}>
                      {t("game.deck")}
                    </span>
                  </div>
                  {isMyTurn && phase === 'draw' && !isMobile && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center">
                      <div className="text-xs text-yellow-400 font-bold animate-pulse">
                        {t("game.clickToDraw")}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={cn(
                  "border-2 border-white/10 rounded-xl flex items-center justify-center opacity-50",
                  isMobile ? "w-16 h-24" : "w-24 h-36"
                )}>
                  <span className={cn("text-white/20", isMobile ? "text-[10px]" : "text-xs")}>EMPTY</span>
                </div>
              )}
            </div>

            {/* Drawn Card (Floating) - Só mostra se for o turno do jogador */}
            <AnimatePresence>
              {gameState.drawnCard && isMyTurn && (
                <motion.div
                  initial={{ scale: 0, y: -50 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="relative z-20"
                >
                   {!isMobile && (
                     <div className="absolute -top-12 left-0 right-0 text-center font-bold text-yellow-400 drop-shadow-md whitespace-nowrap text-sm">
                       {t("game.drawnCard")}
                     </div>
                   )}
                   <PlayingCard 
                     card={gameState.drawnCard} 
                     className={cn(isMobile && "w-16 h-24")}
                   />
                   
                   {isMyTurn && phase === 'action' && (
                     <div className={cn(
                       "absolute flex flex-col gap-2 items-center",
                       isMobile ? "-bottom-16 left-1/2 -translate-x-1/2 w-full" : "-bottom-20 left-1/2 -translate-x-1/2"
                     )}>
                       <div className={cn(
                         "flex flex-wrap justify-center",
                         isMobile ? "gap-1" : "gap-2"
                       )}>
                         {hasSpecialAbility(gameState.drawnCard) && !gameState.drawnFromDiscard && (
                           <Button 
                             size={isMobile ? "sm" : "sm"}
                             variant="primary" 
                             onClick={handleUseAbility}
                             className={cn(
                               "bg-yellow-500 hover:bg-yellow-600 text-black font-bold",
                               isMobile && "text-xs px-2 py-1"
                             )}
                           >
                             {isMobile ? t("game.ability") : t("game.useAbility")}
                           </Button>
                         )}
                         <Button 
                           size={isMobile ? "sm" : "sm"}
                           variant="destructive" 
                           onClick={() => sendAction({ type: 'discard_drawn' })}
                           className={isMobile ? "text-xs px-2 py-1" : ""}
                         >
                           {t("game.discard")}
                         </Button>
                       </div>
                       {gameState.drawnFromDiscard && (
                         <div className={cn(
                           "text-orange-400 text-center",
                           isMobile ? "text-[10px] max-w-[150px]" : "text-xs max-w-[200px]"
                         )}>
                           {isMobile ? t("game.fromDiscardNoAbilityShort") : t("game.fromDiscardNoAbility")}
                         </div>
                       )}
                     </div>
                   )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Discard Pile */}
            <div className="relative" ref={discardRef}>
              {gameState.discardPile.length > 0 ? (
                <div>
                  <PlayingCard 
                    card={gameState.discardPile[gameState.discardPile.length - 1]} 
                    className={cn("brightness-90", isMobile && "w-16 h-24")}
                  />
                  {!isMobile && (
                    <div className="absolute -bottom-8 w-full text-center text-xs font-bold text-white/50 uppercase tracking-widest">
                      {t("game.discardPile")}
                    </div>
                  )}
                </div>
              ) : (
                <div className={cn(
                  "border-2 border-white/10 rounded-xl flex items-center justify-center",
                  isMobile ? "w-16 h-24" : "w-24 h-36"
                )}>
                  <span className={cn("text-white/20", isMobile ? "text-[10px]" : "text-xs")}>EMPTY</span>
                </div>
              )}
            </div>
          </div>

          {/* My Area (Bottom) */}
          {me && (
            <div className={cn(
              "absolute left-0 right-0 flex flex-col items-center",
              isMobile ? "bottom-2" : "bottom-8"
            )}>
              
              {/* My Hand */}
              <div className={cn(
                "flex items-start",
                isMobile ? "gap-1 overflow-x-auto pb-2 w-full px-2" : "gap-4"
              )}>
                {me.hand.map((card, i) => {
                  const matchInfo = canMatchDiscard();
                  const discardInfo = canDiscardFromHand();
                  const canMatchThisCard = !isMyTurn && matchInfo.canMatch && matchInfo.matchingCards.includes(i);
                  const isKnownCard = me.knownCards[i.toString()] || me.knownCards[i];
                  // Botões aparecem para TODAS as cartas durante o turno na fase draw (mesmo desconhecidas)
                  const canQuickDiscard = isMyTurn && phase === 'draw' && gameState.discardPile.length > 0;
                  const isSafeDiscard = canQuickDiscard && discardInfo.matchingCards.includes(i);
                  
                  return (
                    <motion.div 
                      key={card.id || i}
                      className={cn(
                        "flex flex-col items-center",
                        isMobile ? "min-w-[80px] flex-shrink-0" : "min-w-[120px]"
                      )}
                      whileHover={(isMyTurn || canMatchThisCard || canQuickDiscard) && !isMobile ? { y: -20 } : {}}
                    >
                      <div onClick={() => handleCardClick(i, true)} className="w-full">
                        <PlayingCard 
                          card={card}
                          // Show if peeked, or if it's the end game, or if I just drew it (though drew logic handled differently usually)
                          hidden={!gameState.winnerId && !isKnownCard}
                          selected={selectedHandIndex === i}
                          className={cn(
                             "transition-all mx-auto",
                             isMobile ? "w-16 h-24" : "w-24 h-36 md:w-32 md:h-48",
                             isMyTurn && phase === 'action' && gameState.drawnCard ? "cursor-pointer hover:ring-4 ring-green-400 ring-4 ring-green-400/50" : "",
                             canMatchThisCard ? "cursor-pointer hover:ring-4 ring-orange-400" : "",
                             canQuickDiscard ? "cursor-pointer hover:ring-4 ring-blue-400" : ""
                          )}
                        />
                      </div>
                      
                      {/* Labels acima da carta */}
                      {isKnownCard && (
                         <div className={cn(
                           "text-center mt-1 font-bold text-yellow-400 uppercase tracking-wider",
                           isMobile ? "text-[10px]" : "text-xs mt-2"
                         )}>{t("game.known")}</div>
                      )}
                      {canMatchThisCard && (
                         <div className={cn(
                           "text-center mt-1 font-bold text-orange-400 uppercase tracking-wider animate-pulse",
                           isMobile ? "text-[10px]" : "text-xs"
                         )}>
                           {t("game.match")}
                         </div>
                      )}
                      
                      {/* Botão de Descarte Rápido abaixo da carta */}
                      {canQuickDiscard && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn("mt-2 w-full", isMobile ? "px-1" : "mt-3 px-2")}
                        >
                          <Button
                            size="sm"
                            variant="primary"
                            className={cn(
                              "w-full h-auto rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white border-red-800 shadow-lg",
                              isMobile ? "text-[10px] px-1 py-1" : "text-xs px-2 py-2"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              sendAction({ type: 'discard_from_hand', cardIndex: i });
                            }}
                          >
                            {isMobile 
                              ? (isSafeDiscard ? "✓" : "⚠") 
                              : (isSafeDiscard ? t("game.discardSafe") : t("game.discardRisk"))
                            }
                          </Button>
                          {!isSafeDiscard && !isMobile && (
                            <div className="text-center mt-1 text-xs text-red-400 font-semibold">
                              {t("game.punishmentRisk")}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              
              {/* Indicador de descarte reativo */}
              {!isMyTurn && canMatchDiscard().canMatch && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2 bg-orange-500/90 backdrop-blur rounded-full border-2 border-orange-400",
                    isMobile ? "-top-10 px-2 py-1" : "-top-12 px-4 py-2"
                  )}
                >
                  <span className={cn(
                    "text-white font-bold",
                    isMobile ? "text-[10px]" : "text-sm"
                  )}>
                    {isMobile ? t("game.canDiscardMatchShort") : t("game.canDiscardMatch")}
                  </span>
                </motion.div>
              )}

              {/* My Avatar */}
              {!isMobile && (
                <div className="absolute bottom-4 right-12 hidden md:block">
                  <Avatar name={me.name} score={me.score} isActive={isMyTurn} position="left" />
                </div>
              )}

              {/* Cunoku Button */}
              {isMyTurn && phase === 'draw' && gameState.round >= 5 && (
                <div className={cn(
                  "absolute",
                  isMobile ? "right-2 bottom-20" : "right-12 bottom-32"
                )}>
                  <Button 
                    variant="destructive" 
                    className={cn(
                      "rounded-full shadow-xl shadow-red-900/50 font-black border-4 border-red-400",
                      isMobile ? "w-16 h-16 text-sm" : "w-24 h-24 text-xl"
                    )}
                    onClick={() => sendAction({ type: 'declare_finish' })}
                  >
                    {isMobile ? t("game.cunokuShort") : t("game.cunoku")}
                  </Button>
                  {!isMobile && (
                    <div className="text-center mt-2 text-xs text-white/60">
                      {t("game.round")} {gameState.round}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ability Modal */}
      <Dialog open={abilityModalOpen} onOpenChange={setAbilityModalOpen}>
        <DialogContent className={cn(
          "bg-white",
          isMobile ? "max-w-[95vw] max-h-[90vh] overflow-y-auto" : "sm:max-w-md"
        )}>
          <DialogHeader>
            <DialogTitle className={cn(
              "font-display text-indigo-900",
              isMobile ? "text-lg" : "text-2xl"
            )}>
              {t("game.abilityTitle")}
            </DialogTitle>
            <DialogDescription className={isMobile ? "text-sm" : ""}>
              {gameState?.drawnCard && getAbilityDescription(gameState.drawnCard.rank)}
            </DialogDescription>
          </DialogHeader>
          
          {gameState?.drawnCard && (
            <div className={cn("space-y-4", isMobile ? "py-2" : "py-4")}>
              {/* Cartas 5 e 6: Ver carta de oponente */}
              {(gameState.drawnCard.rank === "5" || gameState.drawnCard.rank === "6") && (
                <>
                  <div className="space-y-2">
                    <label className={cn("font-bold text-gray-700", isMobile ? "text-xs" : "text-sm")}>
                      {t("game.selectPlayer")}
                    </label>
                    <div className={cn(
                      "grid gap-2",
                      isMobile ? "grid-cols-1" : "grid-cols-2"
                    )}>
                      {gameState.players
                        .filter(p => p.id !== playerId)
                        .map(p => (
                          <Button
                            key={p.id}
                            variant={selectedTargetPlayer === p.id ? "primary" : "outline"}
                            onClick={() => {
                              setSelectedTargetPlayer(p.id);
                              setSelectedTargetCard(null);
                            }}
                            className={cn("h-auto", isMobile ? "py-2" : "py-3")}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Avatar name={p.name} className={isMobile ? "scale-50" : "scale-75"} />
                              <span className={cn(isMobile ? "text-[10px]" : "text-xs")}>{p.name}</span>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </div>
                  
                  {selectedTargetPlayer && (
                    <div className="space-y-2">
                      <label className={cn("font-bold text-gray-700", isMobile ? "text-xs" : "text-sm")}>
                        {t("game.selectCardNumber")}
                      </label>
                      <div className={cn("grid gap-2", isMobile ? "grid-cols-4" : "grid-cols-4")}>
                        {[0, 1, 2, 3].map(idx => (
                          <Button
                            key={idx}
                            variant={selectedTargetCard === idx ? "primary" : "outline"}
                            onClick={() => setSelectedTargetCard(idx)}
                            className={cn(isMobile ? "h-12 text-xs" : "h-16")}
                          >
                            {idx + 1}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Cartas 7 e 8: Ver própria carta */}
              {(gameState.drawnCard.rank === "7" || gameState.drawnCard.rank === "8") && (
                <div className="space-y-2">
                  <label className={cn("font-bold text-gray-700", isMobile ? "text-xs" : "text-sm")}>
                    {t("game.selectYourCard")}
                  </label>
                  <div className={cn(
                    "flex gap-2 justify-center",
                    isMobile ? "flex-wrap" : ""
                  )}>
                    {me?.hand.map((card, idx) => (
                      <Button
                        key={idx}
                        variant={selectedHandIndex === idx ? "primary" : "outline"}
                        onClick={() => setSelectedHandIndex(idx)}
                        className={cn(
                          isMobile ? "h-12 w-12 text-xs" : "h-20 w-16"
                        )}
                      >
                        {idx + 1}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Cartas 9 e 10: Trocar cartas */}
              {(gameState.drawnCard.rank === "9" || gameState.drawnCard.rank === "10") && (
                <>
                  <div className="space-y-2">
                    <label className={cn("font-bold text-gray-700", isMobile ? "text-xs" : "text-sm")}>
                      {t("game.swapMode")}
                    </label>
                    <div className={cn(
                      "flex gap-2",
                      isMobile ? "flex-col" : ""
                    )}>
                      <Button
                        variant={swapMode === "me_and_other" ? "primary" : "outline"}
                        onClick={() => {
                          setSwapMode("me_and_other");
                          setSelectedTargetPlayer(null);
                          setSelectedTargetPlayer2(null);
                          setSelectedTargetCard(null);
                          setSelectedTargetCard2(null);
                          setSelectedHandIndex(null);
                        }}
                        className={cn("flex-1", isMobile && "text-xs py-2")}
                      >
                        {isMobile ? t("game.swapMeAndOtherShort") : t("game.swapMeAndOther")}
                      </Button>
                      <Button
                        variant={swapMode === "two_others" ? "primary" : "outline"}
                        onClick={() => {
                          setSwapMode("two_others");
                          setSelectedTargetPlayer(null);
                          setSelectedTargetPlayer2(null);
                          setSelectedTargetCard(null);
                          setSelectedTargetCard2(null);
                          setSelectedHandIndex(null);
                          setSwapStep(1);
                          setFirstPlayerSelection(null);
                        }}
                        className={cn("flex-1", isMobile && "text-xs py-2")}
                      >
                        {isMobile ? t("game.swapTwoOthersShort") : t("game.swapTwoOthers")}
                      </Button>
                    </div>
                  </div>
                  
                  {swapMode === "me_and_other" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">{t("game.yourCard")}</label>
                        <div className="flex gap-2 justify-center">
                          {me?.hand.map((card, idx) => (
                            <Button
                              key={idx}
                              variant={selectedHandIndex === idx ? "primary" : "outline"}
                              onClick={() => setSelectedHandIndex(idx)}
                              className="h-20 w-16"
                            >
                              {idx + 1}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">{t("game.otherPlayer")}</label>
                        <div className="grid grid-cols-2 gap-2">
                          {gameState.players
                            .filter(p => p.id !== playerId)
                            .map(p => (
                              <Button
                                key={p.id}
                                variant={selectedTargetPlayer === p.id ? "primary" : "outline"}
                                onClick={() => {
                                  setSelectedTargetPlayer(p.id);
                                  setSelectedTargetCard(null);
                                }}
                                className="h-auto py-3"
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <Avatar name={p.name} className="scale-75" />
                                  <span className="text-xs">{p.name}</span>
                                </div>
                              </Button>
                            ))}
                        </div>
                      </div>
                      
                      {selectedTargetPlayer && selectedTargetPlayer !== playerId && (
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">{t("game.otherPlayerCard")}</label>
                          <div className="grid grid-cols-4 gap-2">
                            {[0, 1, 2, 3].map(idx => (
                              <Button
                                key={idx}
                                variant={selectedTargetCard === idx ? "primary" : "outline"}
                                onClick={() => setSelectedTargetCard(idx)}
                                className="h-16"
                              >
                                {idx + 1}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  {swapMode === "two_others" && (
                    <>
                      {swapStep === 1 ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">{t("game.firstPlayer")}</label>
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                              {gameState.players.map(p => (
                                <Button
                                  key={p.id}
                                  variant={selectedTargetPlayer === p.id ? "primary" : "outline"}
                                  onClick={() => {
                                    setSelectedTargetPlayer(p.id);
                                    setSelectedTargetCard(null);
                                  }}
                                  className="h-auto py-2"
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    <Avatar name={p.name} className="scale-75" />
                                    <span className="text-xs">{p.name}</span>
                                  </div>
                                </Button>
                              ))}
                            </div>
                          </div>
                          
                          {selectedTargetPlayer && (
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-gray-700">{t("game.firstPlayerCard")}</label>
                              <div className="grid grid-cols-4 gap-2">
                                {[0, 1, 2, 3].map(idx => (
                                  <Button
                                    key={idx}
                                    variant={selectedTargetCard === idx ? "primary" : "outline"}
                                    onClick={() => setSelectedTargetCard(idx)}
                                    className="h-12"
                                  >
                                    {idx + 1}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {selectedTargetPlayer && selectedTargetCard !== null && (
                            <Button
                              variant="primary"
                              onClick={() => {
                                setFirstPlayerSelection({ playerId: selectedTargetPlayer, cardIndex: selectedTargetCard });
                                setSwapStep(2);
                                setSelectedTargetPlayer(null);
                                setSelectedTargetCard(null);
                                setSelectedTargetPlayer2(null);
                                setSelectedTargetCard2(null);
                              }}
                              className="w-full"
                            >
                              {t("game.confirmFirstPlayer")}
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          {firstPlayerSelection && (
                            <div className="bg-gray-100 p-2 rounded mb-2">
                              <div className="text-xs text-gray-600">
                                {t("game.firstPlayerSelected")
                                  .replace("{name}", gameState.players.find(p => p.id === firstPlayerSelection.playerId)?.name || "")
                                  .replace("{card}", (firstPlayerSelection.cardIndex + 1).toString())}
                              </div>
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">{t("game.secondPlayer")}</label>
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                              {gameState.players
                                .filter(p => p.id !== firstPlayerSelection?.playerId)
                                .map(p => (
                                  <Button
                                    key={p.id}
                                    variant={selectedTargetPlayer2 === p.id ? "primary" : "outline"}
                                    onClick={() => {
                                      setSelectedTargetPlayer2(p.id);
                                      setSelectedTargetCard2(null);
                                    }}
                                    className="h-auto py-2"
                                  >
                                    <div className="flex flex-col items-center gap-1">
                                      <Avatar name={p.name} className="scale-75" />
                                      <span className="text-xs">{p.name}</span>
                                    </div>
                                  </Button>
                                ))}
                            </div>
                          </div>
                          
                          {selectedTargetPlayer2 && (
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-gray-700">{t("game.secondPlayerCard")}</label>
                              <div className="grid grid-cols-4 gap-2">
                                {[0, 1, 2, 3].map(idx => (
                                  <Button
                                    key={idx}
                                    variant={selectedTargetCard2 === idx ? "primary" : "outline"}
                                    onClick={() => setSelectedTargetCard2(idx)}
                                    className="h-12"
                                  >
                                    {idx + 1}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSwapStep(1);
                                setFirstPlayerSelection(null);
                                setSelectedTargetPlayer2(null);
                                setSelectedTargetCard2(null);
                              }}
                              className="flex-1"
                            >
                              {t("game.back")}
                            </Button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
              
              <div className={cn(
                "flex gap-2",
                isMobile ? "pt-2" : "pt-4"
              )}>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setAbilityModalOpen(false);
                    setSelectedTargetPlayer(null);
                    setSelectedTargetPlayer2(null);
                    setSelectedTargetCard(null);
                    setSelectedTargetCard2(null);
                    setSelectedHandIndex(null);
                    setSwapMode("me_and_other");
                    setSwapStep(1);
                    setFirstPlayerSelection(null);
                  }}
                  className={cn("flex-1", isMobile && "text-xs py-2")}
                >
                  {t("game.cancel")}
                </Button>
                <Button 
                  variant="primary" 
                  onClick={confirmAbilityUse}
                  className={cn("flex-1", isMobile && "text-xs py-2")}
                  disabled={
                    ((gameState.drawnCard.rank === "5" || gameState.drawnCard.rank === "6") && 
                    (!selectedTargetPlayer || selectedTargetCard === null)) ||
                    ((gameState.drawnCard.rank === "7" || gameState.drawnCard.rank === "8") && 
                    selectedHandIndex === null) ||
                    ((gameState.drawnCard.rank === "9" || gameState.drawnCard.rank === "10") && 
                    swapMode === "me_and_other" && (!selectedTargetPlayer || selectedHandIndex === null || selectedTargetCard === null)) ||
                    ((gameState.drawnCard.rank === "9" || gameState.drawnCard.rank === "10") && 
                    swapMode === "two_others" && (!firstPlayerSelection || !selectedTargetPlayer2 || selectedTargetCard2 === null))
                  }
                >
                  {t("game.confirm")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Overlay para carta revelada (cartas 5 e 6) */}
      <AnimatePresence>
        {revealedOpponentCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => {
              // Permite fechar clicando fora
              if (revealedOpponentCard?.timer) {
                clearTimeout(revealedOpponentCard.timer);
              }
              setRevealedOpponentCard(null);
              if (!isOffline) {
                setOnlineRevealedCard(null);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className={cn(
                "bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl border-4 border-yellow-400 shadow-2xl p-8 flex flex-col items-center gap-6",
                isMobile ? "mx-4 max-w-[90vw]" : "max-w-md"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <h3 className={cn(
                  "font-bold text-yellow-400 mb-2",
                  isMobile ? "text-lg" : "text-2xl"
                )}>
                  {t("game.cardRevealed")}
                </h3>
                <p className={cn(
                  "text-white/80",
                  isMobile ? "text-sm" : "text-base"
                )}>
                  {t("game.playerHas").replace("{player}", revealedOpponentCard.playerName)}
                </p>
              </div>
              
              <div className={cn(
                "transform transition-transform",
                isMobile ? "scale-90" : "scale-110"
              )}>
                <PlayingCard 
                  card={revealedOpponentCard.card} 
                  hidden={false}
                  animate={true}
                  className={isMobile ? "w-32 h-48" : "w-40 h-60"}
                />
              </div>
              
              <div className="text-center">
                <p className={cn(
                  "text-white/60 font-mono",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  {t("game.visibleFor20s")}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      {gameState.winnerId && (
        <Dialog open={gameOverModalOpen} onOpenChange={setGameOverModalOpen}>
          <DialogContent className={cn(
            "bg-white text-center",
            isMobile ? "max-w-[95vw] max-h-[90vh] overflow-y-auto" : "sm:max-w-md"
          )}>
            <DialogHeader>
              <DialogTitle className={cn(
                "font-display text-indigo-900 flex items-center justify-center gap-3",
                isMobile ? "text-2xl mb-2" : "text-4xl mb-4"
              )}>
                <Trophy className={cn("text-yellow-500", isMobile ? "w-6 h-6" : "w-10 h-10")} />
                {t("game.gameOver")}
              </DialogTitle>
              <DialogDescription className={cn(isMobile ? "text-sm" : "text-lg")}>
                {t("game.winnerIs").replace("{player}", gameState.players.find(p => p.id === gameState.winnerId)?.name || "")}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6 space-y-4">
              {gameState.players
                .sort((a, b) => a.score - b.score) // Assuming lower is better in Cunoku
                .map((p, i) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-400 w-6">#{i + 1}</span>
                    <Avatar name={p.name} className="scale-50 w-8 h-8" />
                    <span className="font-bold text-gray-900">{p.name}</span>
                  </div>
                    <span className="font-mono font-bold text-xl">{p.score} {t("game.points")}</span>
                </div>
              ))}
            </div>

            <Button onClick={() => setLocation("/")} className="w-full">
              {t("game.backToHome")}
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
