import { useEffect, useState, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useGameSocket } from "@/hooks/use-game-socket";
import { useOfflineGame } from "@/hooks/use-offline-game";
import { PlayingCard } from "@/components/PlayingCard";
import { Button } from "@/components/Button";
import { GameState, Card } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGameAnimations,
  AnimationRenderer,
  OpponentActionNotification,
  OpponentActionType,
} from "@/components/animations";
import { ArrowLeft, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { audioManager } from "@/utils/audioManager";
import { useIsMobile } from "@/hooks/use-mobile";
import { VolumeControl } from "@/components/VolumeControl";
import { useI18n } from "@/contexts/i18n-context";
import { PlayerSeat } from "@/components/game/PlayerSeat";
import { CenterPile } from "@/components/game/CenterPile";
import { MyArea } from "@/components/game/MyArea";
import { WaitingRoom } from "@/components/game/WaitingRoom";
import { GameOverModal } from "@/components/game/GameOverModal";
import { AbilityModal } from "@/components/game/AbilityModal";
import { AbilityAction, hasSpecialAbility, getAbilityDescription } from "@/components/game/helpers";
import { getSeatPositions } from "@/components/game/seatPositions";
import { LandscapePrompt } from "@/components/game/LandscapePrompt";
import { useIsPortrait, lockLandscape, unlockOrientation, useIsCompactGame } from "@/hooks/use-landscape";
import { getLanJoinUrl, getNetworkMode } from "@/lib/gameServer";
import { copyToClipboard } from "@/lib/clipboard";
import {
  hasRecordedMatchStats,
  markMatchStatsRecorded,
  recordMatchResult,
} from "@/lib/playerProfile";
import { isRankLoggedIn, reportRankMatchResult, countsForGlobalRank } from "@/lib/rankAuth";

export default function Game() {
  const [, params] = useRoute("/game/:code");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isCompact = useIsCompactGame();
  const isPortrait = useIsPortrait();
  const { t } = useI18n();
  const roomCode = params?.code || "";

  const searchParams = new URLSearchParams(window.location.search);
  const playerId = searchParams.get("player") || "";
  const isOffline = searchParams.get("mode") === "offline" || roomCode === "offline";

  // Modo offline: carrega estado do sessionStorage
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
          if (parsedState && parsedState.players && parsedState.players.length > 0) {
            setOfflineGameState(parsedState);
            if (savedDifficulty) {
              setBotDifficulty(savedDifficulty as "easy" | "medium" | "hard");
            }
          } else {
            toast({
              title: t("error.generic"),
              description: t("game.errorInvalidState"),
              variant: "destructive",
            });
          }
        } catch (e) {
          toast({
            title: t("error.generic"),
            description: t("game.errorFailedToLoad"),
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: t("error.generic"),
          description: t("game.errorNotFound"),
          variant: "destructive",
        });
      }
      setIsLoadingOffline(false);
    } else if (!isOffline) {
      setIsLoadingOffline(false);
    }
  }, [isOffline, playerId, toast]);

  const { gameState: offlineGameStateFromHook, sendAction: sendOfflineAction } = useOfflineGame(
    offlineGameState,
    playerId,
    botDifficulty
  );

  const {
    gameState: onlineGameState,
    sendAction: sendOnlineAction,
    socketRef,
    revealedCard: onlineRevealedCard,
    setRevealedCard: setOnlineRevealedCard,
    swapInfo: onlineSwapInfo,
    setSwapInfo: setOnlineSwapInfo,
  } = useGameSocket(isOffline ? "" : roomCode, isOffline ? "" : playerId);

  // Posições das cartas na tela (para animações)
  const cardRefs = useRef<Map<string, { x: number; y: number; card?: Card }>>(new Map());
  // Estado anterior do jogo (para pegar cartas antes de uma troca)
  const previousGameState = useRef<GameState | null>(null);

  const [abilityModalOpen, setAbilityModalOpen] = useState(false);
  const peekTimersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const [revealedOpponentCard, setRevealedOpponentCard] = useState<{
    card: Card;
    playerName: string;
    timer?: NodeJS.Timeout;
  } | null>(null);
  // Cartas de oponentes reveladas temporariamente: chave = `${playerId}_${cardId}`
  const [revealedOpponentCardsInHand, setRevealedOpponentCardsInHand] = useState<string[]>([]);
  const revealedCardTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [gameOverModalOpen, setGameOverModalOpen] = useState(false);
  const [opponentActionNotification, setOpponentActionNotification] = useState<{
    playerName: string;
    actionType: OpponentActionType;
  } | null>(null);

  const gameState = isOffline ? offlineGameStateFromHook : onlineGameState;
  const sendAction = isOffline ? sendOfflineAction : sendOnlineAction;

  const {
    deckRef,
    discardRef,
    registerCardRef,
    currentAnimation,
    animateDraw,
    animateDiscard,
    animateReplace,
    animateSwap,
    animatePenalty,
    animateDeal,
    completeCurrentAnimation,
  } = useGameAnimations({
    gameState,
    playerId,
    cardRefs,
  });

  // Detecta mudanças de estado e dispara animações/sons
  const prevGameStateRef = useRef<GameState | null>(null);
  const animationTriggeredRef = useRef<Set<string>>(new Set());
  const hasDealtRef = useRef(false);

  useEffect(() => {
    if (!gameState) return;

    // Primeira renderização do jogo: dispara a distribuição inicial de cartas
    if (!prevGameStateRef.current) {
      prevGameStateRef.current = JSON.parse(JSON.stringify(gameState));
      const isFreshGame =
        gameState.turnPhase !== "waiting" &&
        gameState.round === 1 &&
        !gameState.drawnCard &&
        gameState.discardPile.length <= 1;
      if (isFreshGame && !hasDealtRef.current) {
        hasDealtRef.current = true;
        // Aguarda os assentos renderizarem para capturar as posições das cartas
        setTimeout(() => {
          animateDeal();
          audioManager.playCardSlide();
        }, 450);
      }
      return;
    }

    const prevState = prevGameStateRef.current;
    const currentState = gameState;

    // Transição sala de espera -> jogo (online): distribuição inicial
    if (prevState.turnPhase === "waiting" && currentState.turnPhase !== "waiting" && !hasDealtRef.current) {
      hasDealtRef.current = true;
      setTimeout(() => {
        animateDeal();
        audioManager.playCardSlide();
      }, 450);
    }

    const timeoutId = setTimeout(() => {
      // Compra de carta (do baralho ou do descarte)
      if (!prevState.drawnCard && currentState.drawnCard) {
        const currentPlayer = currentState.players[currentState.currentPlayerIndex];
        if (currentPlayer) {
          const cameFromDiscard = prevState.discardPile.length > currentState.discardPile.length;
          const source: "deck" | "discard" = cameFromDiscard ? "discard" : "deck";
          const animKey = `draw_${currentPlayer.id}_${currentState.drawnCard.rank}_${currentState.drawnCard.suit}`;

          if (!animationTriggeredRef.current.has(animKey)) {
            animationTriggeredRef.current.add(animKey);
            animateDraw(currentState.drawnCard, source, currentPlayer.id);
            audioManager.playCardSlide();
            setTimeout(() => animationTriggeredRef.current.delete(animKey), 2000);
          }
        }
      }

      // Substituição ou descarte da carta comprada
      if (prevState.drawnCard && !currentState.drawnCard && prevState.discardPile.length < currentState.discardPile.length) {
        const currentPlayer = currentState.players[currentState.currentPlayerIndex];
        const prevPlayer = prevState.players[prevState.currentPlayerIndex];
        const drawnCard = prevState.drawnCard;
        const topDiscard = currentState.discardPile[currentState.discardPile.length - 1];
        const isOpponent = currentPlayer.id !== playerId;

        if (currentPlayer && prevPlayer && currentPlayer.hand.length === prevPlayer.hand.length) {
          // Substituição: carta da mão trocada pela comprada
          const discardedCard = topDiscard;
          const handIndex = prevPlayer.hand.findIndex(
            (c) => c.rank === discardedCard.rank && c.suit === discardedCard.suit
          );

          if (drawnCard && discardedCard && handIndex >= 0) {
            const animKey = `replace_${currentPlayer.id}_${handIndex}_${Date.now()}`;
            if (!animationTriggeredRef.current.has(animKey)) {
              animationTriggeredRef.current.add(animKey);
              audioManager.playCardFlip();
              if (isOpponent) {
                setOpponentActionNotification({ playerName: currentPlayer.name, actionType: "replace" });
              } else {
                animateReplace(drawnCard, discardedCard, handIndex, currentPlayer.id);
              }
              setTimeout(() => animationTriggeredRef.current.delete(animKey), 2000);
            }
          }
        } else {
          // Descarte simples da carta comprada
          const discardedCard = drawnCard;
          if (discardedCard && currentPlayer) {
            const animKey = `discard_drawn_${currentPlayer.id}_${discardedCard.rank}_${discardedCard.suit}`;
            if (!animationTriggeredRef.current.has(animKey)) {
              animationTriggeredRef.current.add(animKey);
              audioManager.playCardSlide();
              if (isOpponent) {
                setOpponentActionNotification({ playerName: currentPlayer.name, actionType: "discard" });
              } else {
                animateDiscard(discardedCard, "drawn", currentPlayer.id);
              }
              setTimeout(() => animationTriggeredRef.current.delete(animKey), 2000);
            }
          }
        }
      }

      // Descarte direto da mão (discard_from_hand ou matched_discard)
      if (!(prevState.drawnCard && !currentState.drawnCard)) {
        currentState.players.forEach((player, playerIndex) => {
          const prevPlayer = prevState.players[playerIndex];
          if (!prevPlayer) return;

          if (player.hand.length < prevPlayer.hand.length) {
            const removedCard = prevPlayer.hand.find(
              (prevCard) =>
                !player.hand.some((currCard) => currCard.rank === prevCard.rank && currCard.suit === prevCard.suit)
            );

            if (removedCard && currentState.discardPile.length > prevState.discardPile.length) {
              const topDiscard = currentState.discardPile[currentState.discardPile.length - 1];
              const isMatch = topDiscard.rank === removedCard.rank && topDiscard.suit === removedCard.suit;
              const discardType: "from_hand" | "matched" =
                prevState.currentPlayerIndex === playerIndex && prevState.turnPhase === "draw"
                  ? "from_hand"
                  : "matched";
              const cardIndex = prevPlayer.hand.findIndex(
                (c) => c.rank === removedCard.rank && c.suit === removedCard.suit
              );

              const animKey = `discard_hand_${player.id}_${removedCard.rank}_${removedCard.suit}_${Date.now()}`;
              const isOpponent = player.id !== playerId;

              if (!animationTriggeredRef.current.has(animKey)) {
                animationTriggeredRef.current.add(animKey);
                audioManager.playCardSlide();
                if (isOpponent) {
                  setOpponentActionNotification({ playerName: player.name, actionType: "discard" });
                } else {
                  animateDiscard(removedCard, discardType, player.id, cardIndex, isMatch);
                }
                setTimeout(() => animationTriggeredRef.current.delete(animKey), 2000);
              }
            }
          }
        });
      }

      // Penalidade (jogador ganhou 2 cartas fora do próprio turno)
      currentState.players.forEach((player, playerIndex) => {
        const prevPlayer = prevState.players[playerIndex];
        if (!prevPlayer) return;

        if (player.hand.length > prevPlayer.hand.length) {
          const cardsAdded = player.hand.length - prevPlayer.hand.length;
          if (cardsAdded === 2 && currentState.currentPlayerIndex !== playerIndex) {
            const newCards = player.hand.slice(-2);
            const startingIndex = prevPlayer.hand.length;
            const animKey = `penalty_${player.id}_${newCards[0]?.rank}_${newCards[1]?.rank}_${Date.now()}`;
            if (!animationTriggeredRef.current.has(animKey)) {
              animationTriggeredRef.current.add(animKey);
              animatePenalty(newCards, player.id, startingIndex);
              audioManager.playPenalty();
              setTimeout(() => animationTriggeredRef.current.delete(animKey), 3000);
            }
          }
        }
      });

      prevGameStateRef.current = JSON.parse(JSON.stringify(currentState));
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [gameState, animateDraw, animateDiscard, animateReplace, animatePenalty, animateDeal, playerId]);

  // Guarda estado anterior para pegar cartas antes de uma troca
  useEffect(() => {
    if (gameState) {
      previousGameState.current = JSON.parse(JSON.stringify(gameState));
    }
  }, [gameState]);

  // Detecta troca de cartas (online) e anima
  useEffect(() => {
    if (onlineSwapInfo && gameState && previousGameState.current) {
      const prevState = previousGameState.current;
      const player1Prev = prevState.players.find((p) => p.id === onlineSwapInfo.player1Id);
      const player2Prev = prevState.players.find((p) => p.id === onlineSwapInfo.player2Id);

      if (player1Prev && player2Prev) {
        // swapInfo usa índices baseados em 1
        const card1Index = onlineSwapInfo.player1CardIndex - 1;
        const card2Index = onlineSwapInfo.player2CardIndex - 1;
        const player1Card = player1Prev.hand[card1Index];
        const player2Card = player2Prev.hand[card2Index];

        if (player1Card && player2Card) {
          animateSwap(
            onlineSwapInfo.player1Id,
            card1Index,
            onlineSwapInfo.player2Id,
            card2Index,
            player1Card,
            player2Card
          );
          audioManager.playSwap();
        }
      }

      setTimeout(() => {
        if (!isOffline) setOnlineSwapInfo(null);
      }, 3000);
    }
  }, [onlineSwapInfo, gameState, animateSwap, isOffline, setOnlineSwapInfo]);

  // Cleanup de timers ao desmontar
  useEffect(() => {
    return () => {
      peekTimersRef.current.forEach((timer) => clearTimeout(timer));
      peekTimersRef.current.clear();
      revealedCardTimersRef.current.forEach((timer) => clearTimeout(timer));
      revealedCardTimersRef.current.clear();
    };
  }, []);

  // Marca temporariamente uma carta de oponente como revelada (20 segundos)
  const revealOpponentCardInHand = useCallback((targetPlayerId: string, targetCard: Card) => {
    const cardKey = `${targetPlayerId}_${targetCard.id}`;

    const existingTimer = revealedCardTimersRef.current.get(cardKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      revealedCardTimersRef.current.delete(cardKey);
    }

    setRevealedOpponentCardsInHand((prev) => (prev.includes(cardKey) ? prev : [...prev, cardKey]));

    const handTimer = setTimeout(() => {
      setRevealedOpponentCardsInHand((current) => current.filter((key) => key !== cardKey));
      revealedCardTimersRef.current.delete(cardKey);
    }, 20000);

    revealedCardTimersRef.current.set(cardKey, handTimer);
  }, []);

  // Carta revelada pelo servidor (online): mostra por 20 segundos
  useEffect(() => {
    if (!isOffline && onlineRevealedCard) {
      if (revealedOpponentCard?.timer) {
        clearTimeout(revealedOpponentCard.timer);
      }

      const overlayTimer = setTimeout(() => {
        setOnlineRevealedCard(null);
        setRevealedOpponentCard(null);
      }, 20000);

      setRevealedOpponentCard({
        card: onlineRevealedCard.card,
        playerName: onlineRevealedCard.playerName,
        timer: overlayTimer,
      });
      audioManager.playCardFlip();

      const targetPlayerId = (onlineRevealedCard as any).targetPlayerId;
      const targetCardIndex = (onlineRevealedCard as any).targetCardIndex;

      if (targetPlayerId !== undefined && targetCardIndex !== undefined) {
        const targetPlayer = gameState?.players.find((p) => p.id === targetPlayerId);
        if (targetPlayer && targetPlayer.hand[targetCardIndex]) {
          revealOpponentCardInHand(targetPlayerId, targetPlayer.hand[targetCardIndex]);
        }
      }

      return () => clearTimeout(overlayTimer);
    }
  }, [onlineRevealedCard, isOffline, setOnlineRevealedCard, revealOpponentCardInHand]);

  // Trava landscape só com a partida em andamento (menu/espera ficam livres)
  const isMatchInProgress =
    !!gameState &&
    !((gameState.players.length < 2 || gameState.turnPhase === "waiting") && !gameState.winnerId);

  useEffect(() => {
    if (!isMatchInProgress) {
      void unlockOrientation();
      return;
    }
    let unlock: (() => void) | undefined;
    lockLandscape().then((fn) => {
      unlock = fn;
    });
    return () => {
      unlock?.();
      void unlockOrientation();
    };
  }, [isMatchInProgress]);

  // Detecta declaração de Cunoku (offline)
  const prevFinalRound = useRef(false);
  useEffect(() => {
    if (isOffline && gameState) {
      if (gameState.isFinalRound && !prevFinalRound.current) {
        const declarer = gameState.players.find((p) => p.id === gameState.finalRoundDeclarerId);
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

  const me = gameState?.players.find((p) => p.id === playerId);
  const isMyTurn = gameState?.players[gameState.currentPlayerIndex]?.id === playerId;
  const phase = gameState?.turnPhase;

  // Som suave quando o turno passa a ser meu
  const prevIsMyTurn = useRef(false);
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurn.current && !gameState?.winnerId) {
      audioManager.playYourTurn();
    }
    prevIsMyTurn.current = !!isMyTurn;
  }, [isMyTurn, gameState?.winnerId]);

  // Música da partida
  useEffect(() => {
    if (gameState && !gameState.winnerId) {
      audioManager.playGameMusic();
    }
    return () => {
      audioManager.stopAllMusic();
    };
  }, [gameState?.winnerId]);

  // Fim de jogo: modal + som de vitória/derrota + estatísticas locais
  useEffect(() => {
    if (gameState?.winnerId && me && playerId) {
      setGameOverModalOpen(true);
      if (gameState.winnerId === playerId) {
        audioManager.playGameWon();
      } else {
        audioManager.playGameLost();
      }

      const matchId = roomCode || playerId;
      if (!hasRecordedMatchStats(matchId)) {
        recordMatchResult({
          won: gameState.winnerId === playerId,
          finalScore: me.score,
        });
        markMatchStatsRecorded(matchId);
        if (
          isRankLoggedIn() &&
          countsForGlobalRank(isOffline, gameState.players, playerId)
        ) {
          void reportRankMatchResult({
            won: gameState.winnerId === playerId,
            finalScore: me.score,
          }).catch((err) => {
            console.warn("Rank match sync failed:", err);
          });
        }
      }
    }
  }, [gameState?.winnerId, playerId, me, roomCode, isOffline, gameState?.players]);

  // Early returns APÓS todos os hooks
  if (!playerId || (!isOffline && !roomCode)) {
    return <div className="h-screen flex items-center justify-center">{t("game.invalidUrl")}</div>;
  }

  if (isOffline && (isLoadingOffline || !offlineGameStateFromHook)) {
    // Carregamento terminou mas não há estado salvo (ex.: aba recriada perdeu a
    // sessão) — mostra erro com saída em vez de carregamento infinito
    if (!isLoadingOffline && !offlineGameState) {
      return (
        <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center text-white gap-6 p-8">
          <div className="text-2xl font-display text-center">{t("game.errorNotFound")}</div>
          <div className="text-white/50 text-center max-w-sm">{t("error.generic")}</div>
          <Button variant="primary" onClick={() => setLocation("/")}>
            {t("game.backToHome")}
          </Button>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center text-white">
        <div className="animate-pulse text-2xl font-display mb-4">{t("game.loading")}</div>
        <div className="text-white/50">{t("game.settingUp")}</div>
      </div>
    );
  }

  const handleCopyCode = async () => {
    const ok = await copyToClipboard(roomCode);
    toast({
      title: ok ? t("game.copied") : t("error.generic"),
      description: ok ? t("game.copiedDesc") : roomCode,
    });
  };

  const handleCopyLanUrl = async () => {
    const url = getLanJoinUrl() || window.location.origin;
    const ok = await copyToClipboard(url);
    toast({
      title: ok ? t("game.copied") : t("error.generic"),
      description: ok ? t("waiting.lanUrlCopied") : url,
    });
  };

  // Resolve a ação escolhida no modal de habilidade
  const confirmAbility = (action: AbilityAction) => {
    if (!gameState || !me) return;

    if (action.kind === "peek_own") {
      const cardIndex = action.cardIndex;
      sendAction({
        type: "use_ability",
        ability: "peek_own",
        targetPlayerId: playerId,
        targetCardIndex: cardIndex,
      });
      audioManager.playCardFlip();

      // A carta volta a ficar oculta após 20 segundos (apenas visual)
      const timer = setTimeout(() => {
        const currentMe = gameState.players.find((p) => p.id === playerId);
        if (currentMe && currentMe.knownCards[cardIndex.toString()]) {
          const updatedKnownCards = { ...currentMe.knownCards };
          delete updatedKnownCards[cardIndex.toString()];
          currentMe.knownCards = updatedKnownCards;
        }
        peekTimersRef.current.delete(cardIndex);
      }, 20000);
      peekTimersRef.current.set(cardIndex, timer);
    }

    if (action.kind === "peek_opponent") {
      const targetPlayer = gameState.players.find((p) => p.id === action.targetPlayerId);
      if (targetPlayer && targetPlayer.hand[action.targetCardIndex]) {
        const peekedCard = targetPlayer.hand[action.targetCardIndex];

        if (revealedOpponentCard?.timer) {
          clearTimeout(revealedOpponentCard.timer);
        }
        const overlayTimer = setTimeout(() => setRevealedOpponentCard(null), 20000);
        setRevealedOpponentCard({ card: peekedCard, playerName: targetPlayer.name, timer: overlayTimer });
        revealOpponentCardInHand(action.targetPlayerId, peekedCard);
        audioManager.playCardFlip();
      }

      sendAction({
        type: "use_ability",
        ability: "peek_opponent",
        targetPlayerId: action.targetPlayerId,
        targetCardIndex: action.targetCardIndex,
      });
    }

    if (action.kind === "swap_me") {
      sendAction({
        type: "use_ability",
        ability: "swap",
        targetPlayerId: playerId,
        targetCardIndex: action.myCardIndex,
        targetPlayerId2: action.targetPlayerId,
        targetCardIndex3: action.targetCardIndex,
      });
      audioManager.playSwap();
    }

    if (action.kind === "swap_others") {
      sendAction({
        type: "use_ability",
        ability: "swap",
        targetPlayerId: action.player1Id,
        targetCardIndex: action.card1Index,
        targetPlayerId2: action.player2Id,
        targetCardIndex2: action.card2Index,
      });
      audioManager.playSwap();
    }
  };

  // Loading
  if (!gameState) {
    return (
      <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center text-white">
        <div className="animate-pulse text-2xl font-display mb-4">Connecting to Table...</div>
        <div className="text-white/50">Room: {roomCode}</div>
      </div>
    );
  }

  // Sala de espera
  if ((gameState.players.length < 2 || gameState.turnPhase === "waiting") && !gameState.winnerId) {
    const storedHostId = sessionStorage.getItem(`hostId_${roomCode}`);
    const isHost = storedHostId === playerId;

    return (
      <WaitingRoom
        roomCode={roomCode}
        players={gameState.players}
        playerId={playerId}
        isHost={isHost}
        onCopyCode={handleCopyCode}
        onCopyLanUrl={handleCopyLanUrl}
        networkMode={getNetworkMode()}
        lanJoinUrl={getLanJoinUrl()}
        onStart={() => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: "start_game" }));
          } else {
            toast({
              title: "Connection Error",
              description: "Not connected to server",
              variant: "destructive",
            });
          }
        }}
      />
    );
  }

  const opponents = gameState.players.filter((p) => p.id !== playerId);
  const seatPositions = getSeatPositions(opponents.length);
  const currentTurnPlayerId = gameState.players[gameState.currentPlayerIndex]?.id;
  // Em paisagem (incl. celular deitado) usa assentos em arco; em retrato o overlay impede jogar
  const useArcSeats = !isPortrait;

  return (
    <div className="min-h-[100dvh] bg-neutral-900 text-white relative overflow-hidden flex flex-col pwa-safe game-landscape">
      {isPortrait && <LandscapePrompt />}

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

      {/* Barra superior */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-50 pointer-events-none flex justify-between items-start",
          isCompact ? "p-1.5 gap-1" : "p-4"
        )}
      >
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "bg-black/20 text-white border-white/20 backdrop-blur-sm",
              isCompact ? "text-[10px] px-1.5 py-0.5 h-7" : ""
            )}
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className={cn("w-3.5 h-3.5", isCompact ? "mr-0" : "mr-2")} />
            {isCompact ? "" : t("game.exit")}
          </Button>
          <div
            className={cn(
              "[&_button]:bg-black/20 [&_button]:text-white [&_button]:border-white/20 [&_button]:backdrop-blur-sm [&_button]:hover:bg-black/30",
              isCompact && "[&_button]:h-7 [&_button]:w-7 [&_button]:p-0 scale-90 origin-left"
            )}
          >
            <VolumeControl />
          </div>
        </div>

        <div
          className={cn(
            "bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex flex-col items-center pointer-events-auto cursor-pointer",
            isCompact ? "px-2.5 py-1" : "px-6 py-2"
          )}
          onClick={handleCopyCode}
        >
          <div className={cn("text-white/60 font-mono", isCompact ? "text-[8px] leading-tight" : "text-xs")}>
            {t("game.roomCode")}
          </div>
          <div
            className={cn(
              "font-bold tracking-widest font-mono flex items-center gap-1",
              isCompact ? "text-[11px]" : "text-xl"
            )}
          >
            {roomCode} <Copy className={cn(isCompact ? "w-2.5 h-2.5" : "w-3 h-3")} />
          </div>
        </div>
      </div>

      {/* Banner "Sua vez" */}
      {isMyTurn && (
        <div
          className={cn(
            "absolute z-40 pointer-events-none left-1/2 -translate-x-1/2",
            isCompact ? "top-8 max-w-[min(58vw,16rem)]" : "top-20"
          )}
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className={cn(
              "bg-gradient-to-r from-yellow-500/90 to-yellow-600/90 backdrop-blur-md rounded-full border-2 border-yellow-400 shadow-xl flex items-center justify-center",
              isCompact ? "px-3 py-1 gap-1.5" : "px-8 py-3 gap-4"
            )}
          >
            <span className={cn("text-yellow-900 font-bold whitespace-nowrap", isCompact ? "text-[10px]" : "text-lg")}>
              {t("game.yourTurn")}
            </span>
            {phase === "draw" && (
              <span className={cn("text-yellow-100 text-center", isCompact ? "text-[9px] truncate" : "text-sm")}>
                {isCompact ? t("game.drawFromDeckShort") : t("game.drawFromDeck")}
              </span>
            )}
            {phase === "action" && (
              <span className={cn("text-yellow-100 text-center", isCompact ? "text-[9px] truncate" : "text-sm")}>
                {isCompact ? t("game.replaceOrDiscardShort") : t("game.replaceOrDiscard")}
              </span>
            )}
          </motion.div>
        </div>
      )}

      {/* Info da rodada */}
      <div
        className={cn(
          "absolute z-40 pointer-events-none",
          isCompact ? "top-9 left-1.5" : "top-20 left-8"
        )}
      >
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={cn(
            "bg-black/60 backdrop-blur-md rounded-lg border border-yellow-500/50 shadow-lg",
            isCompact ? "px-2 py-1" : "px-6 py-3 border-2 rounded-xl"
          )}
        >
          <div className="text-center">
            <div className={cn("font-bold text-yellow-400", isCompact ? "text-[10px] leading-tight" : "text-lg mb-1")}>
              {t("game.round")} {gameState.round}
              {gameState.round < 5 ? "/5" : ""}
            </div>
            {!isCompact &&
              (gameState.round < 5 ? (
                <div className="text-white/80 text-xs">{t("game.cunokuAfterRound5")}</div>
              ) : (
                <div className="text-white/80 text-xs">
                  {t("game.turn")}: {gameState.players[gameState.currentPlayerIndex]?.name || "Unknown"}
                </div>
              ))}
          </div>
        </motion.div>
      </div>

      {/* Dica de habilidade (esquerda) — só desktop amplo */}
      {isMyTurn && phase === "action" && gameState.drawnCard && hasSpecialAbility(gameState.drawnCard) && !gameState.drawnFromDiscard && !isCompact && (
        <div className="absolute left-8 bottom-32 z-40 pointer-events-none">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="bg-gradient-to-br from-yellow-500/95 to-yellow-600/95 backdrop-blur-md px-6 py-4 rounded-2xl border-2 border-yellow-400 shadow-2xl max-w-[280px]"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚡</div>
              <div className="flex-1">
                <div className="text-yellow-900 font-bold text-sm mb-1">{t("game.abilityCard")}</div>
                <div className="text-yellow-950 font-semibold text-base leading-tight">
                  {getAbilityDescription(gameState.drawnCard.rank, t)}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-yellow-400/30">
              <div className="text-yellow-900 text-xs font-medium">{t("game.abilityClickToUse")}</div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dica de substituição (direita) — só desktop amplo */}
      {isMyTurn && phase === "action" && gameState.drawnCard && !isCompact && (
        <div className="absolute right-8 bottom-32 z-40 pointer-events-none">
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            className="bg-gradient-to-br from-green-600/95 to-green-700/95 backdrop-blur-md px-6 py-4 rounded-2xl border-2 border-green-400 shadow-2xl max-w-[280px]"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">✨</div>
              <div className="flex-1">
                <div className="text-green-100 font-bold text-sm mb-1">{t("game.hintTitle")}</div>
                <div className="text-white font-semibold text-base leading-tight">{t("game.hintReplace")}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-400/30">
              <div className="text-green-200 text-xs">{t("game.hintHighlighted")}</div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mesa de jogo — zonas: oponentes (arco) | centro elevado | mão inferior */}
      <div
        className={cn(
          "flex-1 flex items-center justify-center relative min-h-0",
          isCompact ? "p-1" : "p-4 md:p-6"
        )}
      >
        <div
          className={cn(
            "w-full relative felt-table shadow-2xl",
            isCompact
              ? "max-w-none max-h-[calc(100dvh-0.5rem)] h-[calc(100dvh-0.5rem)] aspect-auto rounded-xl"
              : "max-w-6xl max-h-[min(100%,calc(100dvh-1rem))] aspect-[16/9] rounded-[100px]"
          )}
        >
          {/* Oponentes no arco externo (sempre em paisagem) */}
          {useArcSeats ? (
            opponents.map((p, i) => {
              const pos = seatPositions[i] ?? seatPositions[seatPositions.length - 1];
              return (
                <PlayerSeat
                  key={p.id}
                  player={p}
                  isActive={currentTurnPlayerId === p.id}
                  showAllCards={!!gameState.winnerId}
                  revealedCardKeys={revealedOpponentCardsInHand}
                  registerCardPosition={registerCardRef}
                  opponentCount={opponents.length}
                  side={pos.side}
                  compact={opponents.length >= 3 || isCompact}
                  className="absolute z-20"
                  style={{
                    left: `${pos.left}%`,
                    top: `${pos.top}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              );
            })
          ) : (
            <div
              className={cn(
                "absolute top-0 left-0 right-0 flex justify-center items-start pt-2 px-1 z-20",
                opponents.length >= 4 ? "gap-1 flex-wrap" : "gap-2"
              )}
            >
              {opponents.map((p) => (
                <PlayerSeat
                  key={p.id}
                  player={p}
                  isActive={currentTurnPlayerId === p.id}
                  showAllCards={!!gameState.winnerId}
                  revealedCardKeys={revealedOpponentCardsInHand}
                  registerCardPosition={registerCardRef}
                  opponentCount={opponents.length}
                  side="top"
                  compact
                />
              ))}
            </div>
          )}

          {/* Centro da mesa — baralho e descarte */}
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto",
              isCompact ? "top-[44%]" : "top-[48%]"
            )}
          >
            <CenterPile
              gameState={gameState}
              isMyTurn={!!isMyTurn}
              phase={phase}
              deckRef={deckRef}
              discardRef={discardRef}
              onDrawDeck={() => sendAction({ type: "draw_deck" })}
              onDiscardDrawn={() => sendAction({ type: "discard_drawn" })}
              onUseAbility={() => setAbilityModalOpen(true)}
            />
          </div>

          {/* Minha área — faixa inferior reservada */}
          {me && (
            <MyArea
              gameState={gameState}
              me={me}
              isMyTurn={!!isMyTurn}
              phase={phase}
              sendAction={sendAction}
              registerCardPosition={registerCardRef}
            />
          )}
        </div>
      </div>

      {/* Modal de habilidade */}
      <AbilityModal
        open={abilityModalOpen}
        onOpenChange={setAbilityModalOpen}
        drawnCard={gameState.drawnCard ?? null}
        players={gameState.players}
        playerId={playerId}
        myHand={me?.hand ?? []}
        onConfirm={confirmAbility}
      />

      {/* Overlay de carta revelada (habilidades 5 e 6) */}
      <AnimatePresence>
        {revealedOpponentCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => {
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
                <h3 className={cn("font-bold text-yellow-400 mb-2", isMobile ? "text-lg" : "text-2xl")}>
                  {t("game.cardRevealed")}
                </h3>
                <p className={cn("text-white/80", isMobile ? "text-sm" : "text-base")}>
                  {t("game.playerHas").replace("{player}", revealedOpponentCard.playerName)}
                </p>
              </div>

              <div className={cn("transform transition-transform", isMobile ? "scale-90" : "scale-110")}>
                <PlayingCard
                  card={revealedOpponentCard.card}
                  hidden={false}
                  animate={true}
                  className={isMobile ? "w-32 h-48" : "w-40 h-60"}
                />
              </div>

              <div className="text-center">
                <p className={cn("text-white/60 font-mono", isMobile ? "text-xs" : "text-sm")}>
                  {t("game.visibleFor20s")}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de fim de jogo */}
      {gameState.winnerId && (
        <GameOverModal
          open={gameOverModalOpen}
          onOpenChange={setGameOverModalOpen}
          players={gameState.players}
          winnerId={gameState.winnerId}
          localPlayerId={playerId}
          onBackHome={() => setLocation("/")}
        />
      )}
    </div>
  );
}
