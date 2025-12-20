import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useGameSocket } from "@/hooks/use-game-socket";
import { useOfflineGame } from "@/hooks/use-offline-game";
import { PlayingCard } from "@/components/PlayingCard";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { GameState, Card, Player } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Copy, Eye, RefreshCw, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { audioManager } from "@/utils/audioManager";
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
              title: "Error", 
              description: "Invalid game state. Please start a new game.", 
              variant: "destructive" 
            });
            setIsLoadingOffline(false);
          }
        } catch (e) {
          console.error("Failed to parse offline game state:", e);
          toast({ 
            title: "Error", 
            description: "Failed to load game. Please start a new game.", 
            variant: "destructive" 
          });
          setIsLoadingOffline(false);
        }
      } else {
        console.error("No saved game state found for player:", playerId);
        console.log("Available sessionStorage keys:", Object.keys(sessionStorage));
        toast({ 
          title: "Error", 
          description: "Game not found. Please start a new game.", 
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
  const { gameState: onlineGameState, connected, sendAction: sendOnlineAction } = useGameSocket(
    isOffline ? "" : roomCode, 
    isOffline ? "" : playerId
  );

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
  
  // Cleanup timers ao desmontar
  useEffect(() => {
    return () => {
      peekTimers.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Usa estado offline se estiver em modo offline, senão usa online
  const gameState = isOffline ? offlineGameStateFromHook : onlineGameState;
  const sendAction = isOffline ? sendOfflineAction : sendOnlineAction;

  // Detecta quando alguém declara Cunoku (para jogo offline)
  const prevFinalRound = useRef(false);
  useEffect(() => {
    if (isOffline && gameState) {
      // Se acabou de entrar em rodada final e antes não estava
      if (gameState.isFinalRound && !prevFinalRound.current) {
        const declarer = gameState.players.find(p => p.id === gameState.finalRoundDeclarerId);
        if (declarer) {
          toast({
            title: "🔥 CUNOKU Declarado!",
            description: `${declarer.name} declarou fim de jogo! Rodada final iniciada.`,
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
      if (gameState.winnerId === playerId) {
        audioManager.playGameWon();
      } else {
        audioManager.playGameLost();
      }
    }
  }, [gameState?.winnerId, playerId, me]);

  // Early returns APÓS todos os hooks
  if (!playerId || (!isOffline && !roomCode)) {
    return <div className="h-screen flex items-center justify-center">Invalid game URL</div>;
  }

  if (isOffline && (isLoadingOffline || !offlineGameStateFromHook)) {
    return (
      <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center text-white">
        <div className="animate-pulse text-2xl font-display mb-4">Loading Game...</div>
        <div className="text-white/50">Setting up offline match</div>
      </div>
    );
  }

  // Helpers
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast({ title: "Copied!", description: "Room code copied to clipboard." });
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
        return "Ver carta de um oponente";
      case "7":
      case "8":
        return "Ver uma de suas cartas";
      case "9":
      case "10":
        return "Trocar cartas entre 2 jogadores";
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
          title: "Selecione uma carta", 
          description: "Selecione uma carta da sua mão para ver",
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
          title: "Selecione alvo", 
          description: "Selecione um jogador e uma carta",
          variant: "destructive" 
        });
        return;
      }
      
      const targetPlayer = gameState.players.find(p => p.id === selectedTargetPlayer);
      if (targetPlayer && targetPlayer.hand[selectedTargetCard]) {
        const peekedCard = targetPlayer.hand[selectedTargetCard];
        setPrivateCardInfo({ card: peekedCard, playerName: targetPlayer.name });
        toast({
          title: "Carta revelada!",
          description: `${targetPlayer.name} tem ${peekedCard.rank} de ${peekedCard.suit}`,
        });
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
      <div key={player.id} className="flex flex-col items-center gap-2 p-2 rounded-xl transition-all">
        <div className="flex gap-1 justify-center mb-2">
          {player.hand.map((card, i) => (
            <div key={i} className="relative">
              <PlayingCard 
                card={card} 
                // Only show my cards if I know them (peeked) or if game ended
                // Default: hidden for everyone, including me, unless 'knownCards' is true
                hidden={!gameState?.winnerId && !(isMe && player.knownCards[i])} 
                className="w-12 h-16 md:w-16 md:h-24"
                animate={false}
              />
              {/* Eye icon marker if I know this card */}
              {isMe && player.knownCards[i] && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1 shadow">
                  <Eye className="w-3 h-3 text-yellow-900" />
                </div>
              )}
            </div>
          ))}
        </div>
        <Avatar 
          name={player.name} 
          isBot={player.isBot} 
          score={player.score} 
          isActive={gameState?.players[gameState.currentPlayerIndex]?.id === player.id}
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
  if (gameState.players.length < 2 && !gameState.winnerId) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-8">
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

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Current Players</h3>
            {gameState.players.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50">
                <Avatar name={p.name} className="scale-75" />
                <div className="font-bold text-indigo-900">{p.name} {p.id === playerId && "(You)"}</div>
              </div>
            ))}
          </div>

          {gameState.players.length > 1 && (
             <Button className="w-full mt-8" onClick={() => {
               // Assuming logic starts automatically or via a 'start' action I didn't add to schema yet
               // For now, let's assume players join and it starts
               toast({ title: "Waiting for host to start..." });
             }}>
               Wait for more...
             </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white relative overflow-hidden flex flex-col">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-50 pointer-events-none">
        <Button variant="outline" size="sm" className="pointer-events-auto bg-black/20 text-white border-white/20 backdrop-blur-sm" onClick={() => setLocation("/")}>
          <ArrowLeft className="mr-2 w-4 h-4" /> Exit
        </Button>
        
        <div className="bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 flex flex-col items-center">
          <div className="text-xs text-white/60 font-mono">ROOM CODE</div>
          <div className="text-xl font-bold tracking-widest font-mono flex items-center gap-2 pointer-events-auto cursor-pointer" onClick={handleCopyCode}>
            {roomCode} <Copy className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Your Turn Banner - Top Center */}
      {isMyTurn && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none">
          <motion.div 
            initial={{ y: -20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="bg-gradient-to-r from-yellow-500/90 to-yellow-600/90 backdrop-blur-md px-8 py-3 rounded-full border-2 border-yellow-400 shadow-2xl flex items-center gap-4"
          >
            <span className="text-yellow-900 font-bold text-lg">YOUR TURN</span>
            {phase === 'draw' && <span className="text-yellow-100 text-sm">Draw from Deck or Discard</span>}
            {phase === 'action' && <span className="text-yellow-100 text-sm">Select a card to replace or Discard drawn</span>}
          </motion.div>
        </div>
      )}

      {/* Round Info - Top Left */}
      {gameState && (
        <div className="absolute top-20 left-8 z-40 pointer-events-none">
          <motion.div 
            initial={{ x: -20, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }}
            className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-xl border-2 border-yellow-500/50 shadow-xl"
          >
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-400 mb-1">
                Round {gameState.round}{gameState.round < 5 ? '/5' : ''}
              </div>
              {gameState.round < 5 ? (
                <div className="text-xs text-white/80">
                  Cunoku available after round 5
                </div>
              ) : (
                <div className="text-xs text-white/80">
                  Turn: {gameState.players[gameState.currentPlayerIndex]?.name || 'Unknown'}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Ability Hint - Left Side */}
      {isMyTurn && phase === 'action' && gameState.drawnCard && hasSpecialAbility(gameState.drawnCard) && !gameState.drawnFromDiscard && (
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
                  Habilidade da Carta
                </div>
                <div className="text-yellow-950 font-semibold text-base leading-tight">
                  {getAbilityDescription(gameState.drawnCard!.rank)}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-yellow-400/30">
              <div className="text-yellow-900 text-xs font-medium">
                Clique no botão "Use Ability" para ativar
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Replace Card Hint - Right Side */}
      {isMyTurn && phase === 'action' && gameState.drawnCard && (
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
                  Dica de Jogada
                </div>
                <div className="text-white font-semibold text-base leading-tight">
                  Clique em uma carta da sua mão para substituir pela carta puxada
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-400/30">
              <div className="text-green-200 text-xs">
                As cartas da sua mão estão destacadas em verde
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Game Table */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative">
        <div className="w-full max-w-6xl aspect-[16/9] relative rounded-[100px] felt-table shadow-2xl flex items-center justify-center">
          
          {/* Opponents (Top) */}
          <div className="absolute top-0 left-0 right-0 h-1/3 flex justify-center items-start pt-8 gap-12">
            {gameState.players.filter(p => p.id !== playerId).map((p, i) => renderPlayer(p, i, gameState.players.length))}
          </div>

          {/* Center Area: Deck & Discard */}
          <div className="flex items-center gap-12 z-10">
            {/* Deck */}
            <div className="relative group">
              {gameState.deck.length > 0 ? (
                <div 
                  onClick={() => isMyTurn && phase === 'draw' && sendAction({ type: 'draw_deck' })}
                  className={isMyTurn && phase === 'draw' ? "cursor-pointer" : ""}
                >
                  <PlayingCard 
                    hidden 
                    className={cn(
                      "transition-all",
                      isMyTurn && phase === 'draw' 
                        ? "cursor-pointer hover:ring-4 ring-white/50 hover:scale-105" 
                        : "opacity-80"
                    )} 
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className={cn(
                      "font-bold transition-all",
                      isMyTurn && phase === 'draw' ? "text-white text-lg" : "text-white/80"
                    )}>
                      DECK
                    </span>
                  </div>
                  {isMyTurn && phase === 'draw' && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center">
                      <div className="text-xs text-yellow-400 font-bold animate-pulse">
                        Click to Draw
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-24 h-36 border-2 border-white/10 rounded-xl flex items-center justify-center opacity-50">
                  <span className="text-white/20 text-xs">EMPTY</span>
                </div>
              )}
            </div>

            {/* Drawn Card (Floating) */}
            <AnimatePresence>
              {gameState.drawnCard && (
                <motion.div
                  initial={{ scale: 0, y: -50 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="relative z-20"
                >
                   <div className="absolute -top-12 left-0 right-0 text-center font-bold text-yellow-400 drop-shadow-md whitespace-nowrap">
                     DRAWN CARD
                   </div>
                   <PlayingCard card={gameState.drawnCard} />
                   
                   {isMyTurn && phase === 'action' && (
                     <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center">
                       <div className="flex gap-2 flex-wrap justify-center">
                         {hasSpecialAbility(gameState.drawnCard) && !gameState.drawnFromDiscard && (
                           <Button 
                             size="sm" 
                             variant="primary" 
                             onClick={handleUseAbility}
                             className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                           >
                             Use Ability
                           </Button>
                         )}
                         <Button size="sm" variant="destructive" onClick={() => sendAction({ type: 'discard_drawn' })}>
                           Discard
                         </Button>
                       </div>
                       {gameState.drawnFromDiscard && (
                         <div className="text-xs text-orange-400 text-center max-w-[200px]">
                           Carta da pilha de descarte - não pode usar habilidade
                         </div>
                       )}
                     </div>
                   )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Discard Pile */}
            <div className="relative">
              {gameState.discardPile.length > 0 ? (
                <div>
                  <PlayingCard 
                    card={gameState.discardPile[gameState.discardPile.length - 1]} 
                    className="brightness-90"
                  />
                  <div className="absolute -bottom-8 w-full text-center text-xs font-bold text-white/50 uppercase tracking-widest">
                    Discard Pile
                  </div>
                </div>
              ) : (
                <div className="w-24 h-36 border-2 border-white/10 rounded-xl flex items-center justify-center">
                  <span className="text-white/20 text-xs">EMPTY</span>
                </div>
              )}
            </div>
          </div>

          {/* My Area (Bottom) */}
          {me && (
            <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center">
              
              {/* My Hand */}
              <div className="flex gap-4 items-start">
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
                      className="flex flex-col items-center min-w-[120px]"
                      whileHover={(isMyTurn || canMatchThisCard || canQuickDiscard) ? { y: -20 } : {}}
                    >
                      <div onClick={() => handleCardClick(i, true)} className="w-full">
                        <PlayingCard 
                          card={card}
                          // Show if peeked, or if it's the end game, or if I just drew it (though drew logic handled differently usually)
                          hidden={!gameState.winnerId && !isKnownCard}
                          selected={selectedHandIndex === i}
                          className={cn(
                             "w-24 h-36 md:w-32 md:h-48 transition-all mx-auto",
                             isMyTurn && phase === 'action' && gameState.drawnCard ? "cursor-pointer hover:ring-4 ring-green-400 ring-4 ring-green-400/50" : "",
                             canMatchThisCard ? "cursor-pointer hover:ring-4 ring-orange-400" : "",
                             canQuickDiscard ? "cursor-pointer hover:ring-4 ring-blue-400" : ""
                          )}
                        />
                      </div>
                      
                      {/* Labels acima da carta */}
                      {isKnownCard && (
                         <div className="text-center mt-2 text-xs font-bold text-yellow-400 uppercase tracking-wider">Known</div>
                      )}
                      {canMatchThisCard && (
                         <div className="text-center mt-1 text-xs font-bold text-orange-400 uppercase tracking-wider animate-pulse">
                           Match!
                         </div>
                      )}
                      
                      {/* Botão de Descarte Rápido abaixo da carta */}
                      {canQuickDiscard && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 w-full px-2"
                        >
                          <Button
                            size="sm"
                            variant="primary"
                            className="w-full text-xs px-2 py-2 h-auto rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white border-red-800 shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              sendAction({ type: 'discard_from_hand', cardIndex: i });
                            }}
                          >
                            {isSafeDiscard ? "✓ Descartar" : "⚠ Tentar Descartar"}
                          </Button>
                          {!isSafeDiscard && (
                            <div className="text-center mt-1 text-xs text-red-400 font-semibold">
                              Risco de punição!
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
                  className="absolute -top-12 left-1/2 -translate-x-1/2 bg-orange-500/90 backdrop-blur px-4 py-2 rounded-full border-2 border-orange-400"
                >
                  <span className="text-white font-bold text-sm">
                    Você pode descartar uma carta igual!
                  </span>
                </motion.div>
              )}

              {/* My Avatar */}
              <div className="absolute bottom-4 right-12 hidden md:block">
                <Avatar name={me.name} score={me.score} isActive={isMyTurn} position="left" />
              </div>

              {/* Cunoku Button */}
              {isMyTurn && phase === 'draw' && gameState.round >= 5 && (
                <div className="absolute right-12 bottom-32">
                  <Button 
                    variant="destructive" 
                    className="rounded-full w-24 h-24 text-xl shadow-xl shadow-red-900/50 font-black border-4 border-red-400"
                    onClick={() => sendAction({ type: 'declare_finish' })}
                  >
                    CUNOKU
                  </Button>
                  <div className="text-center mt-2 text-xs text-white/60">
                    Round {gameState.round}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ability Modal */}
      <Dialog open={abilityModalOpen} onOpenChange={setAbilityModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-indigo-900">
              Usar Habilidade
            </DialogTitle>
            <DialogDescription>
              {gameState?.drawnCard && getAbilityDescription(gameState.drawnCard.rank)}
            </DialogDescription>
          </DialogHeader>
          
          {gameState?.drawnCard && (
            <div className="py-4 space-y-4">
              {/* Cartas 5 e 6: Ver carta de oponente */}
              {(gameState.drawnCard.rank === "5" || gameState.drawnCard.rank === "6") && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Selecione o jogador:</label>
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
                  
                  {selectedTargetPlayer && (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Selecione a carta (1-4):</label>
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
              
              {/* Cartas 7 e 8: Ver própria carta */}
              {(gameState.drawnCard.rank === "7" || gameState.drawnCard.rank === "8") && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Selecione sua carta para ver:</label>
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
              )}
              
              {/* Cartas 9 e 10: Trocar cartas */}
              {(gameState.drawnCard.rank === "9" || gameState.drawnCard.rank === "10") && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Modo de troca:</label>
                    <div className="flex gap-2">
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
                        className="flex-1"
                      >
                        Entre você e outro
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
                        className="flex-1"
                      >
                        Entre dois outros
                      </Button>
                    </div>
                  </div>
                  
                  {swapMode === "me_and_other" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Sua carta:</label>
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
                        <label className="text-sm font-bold text-gray-700">Outro jogador:</label>
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
                          <label className="text-sm font-bold text-gray-700">Carta do outro jogador (1-4):</label>
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
                            <label className="text-sm font-bold text-gray-700">Primeiro jogador:</label>
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
                              <label className="text-sm font-bold text-gray-700">Carta do primeiro jogador (1-4):</label>
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
                              Confirmar Primeiro Jogador
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          {firstPlayerSelection && (
                            <div className="bg-gray-100 p-2 rounded mb-2">
                              <div className="text-xs text-gray-600">
                                Primeiro jogador: {gameState.players.find(p => p.id === firstPlayerSelection.playerId)?.name} - Carta {firstPlayerSelection.cardIndex + 1}
                              </div>
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Segundo jogador:</label>
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
                              <label className="text-sm font-bold text-gray-700">Carta do segundo jogador (1-4):</label>
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
                              Voltar
                            </Button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
              
              <div className="flex gap-2 pt-4">
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
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  variant="primary" 
                  onClick={confirmAbilityUse}
                  className="flex-1"
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
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Game Over Modal */}
      <Dialog open={!!gameState.winnerId}>
        <DialogContent className="sm:max-w-md bg-white text-center">
          <DialogHeader>
            <DialogTitle className="text-4xl font-display text-indigo-900 mb-4 flex items-center justify-center gap-3">
              <Trophy className="w-10 h-10 text-yellow-500" />
              Game Over
            </DialogTitle>
            <DialogDescription className="text-lg">
              The winner is <span className="font-bold text-indigo-900">{gameState.players.find(p => p.id === gameState.winnerId)?.name}</span>!
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
                <span className="font-mono font-bold text-xl">{p.score} pts</span>
              </div>
            ))}
          </div>

          <Button onClick={() => setLocation("/")} className="w-full">
            Back to Home
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
