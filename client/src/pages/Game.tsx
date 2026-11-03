import { useEffect, useState, useRef, useCallback, useSyncExternalStore } from "react";
import { useRoute, useLocation } from "wouter";
import { useGameSocket } from "@/hooks/use-game-socket";
import { useOfflineGame } from "@/hooks/use-offline-game";
import { GameState, Card } from "@shared/schema";
import { WIND_EFFECT_ID, type EmoteId } from "@shared/emotes";
import { JOKER_REVEAL_MS, KING_REVEAL_MS, revealCards, type CardReveal } from "@shared/cardPowers";
import { START_COUNTDOWN_MS } from "@shared/matchQueue";
import { useGameAnimations, OpponentActionType } from "@/components/animations";
import { useToast } from "@/hooks/use-toast";
import { audioManager } from "@/utils/audioManager";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/contexts/i18n-context";
import { AbilityAction } from "@/components/game/helpers";
import { useIsPortrait, lockLandscape, unlockOrientation, useIsCompactGame } from "@/hooks/use-landscape";
import { getLanJoinUrl, getNetworkMode } from "@/lib/gameServer";
import { clearActiveSession, saveActiveSession } from "@/lib/activeSession";
import { buildInviteUrl } from "@/lib/inviteLink";
import { loadTableTheme, subscribeTableTheme } from "@/lib/tableTheme";
import { copyToClipboard } from "@/lib/clipboard";
import type { SwapHighlight } from "@/components/game/swapHighlight";
import { ActiveTable, ConnectingScreen, renderPregame } from "@/pages/gameTable";
import { applyOfflineSession, isOpeningDeal, leftWaitingRoom, matchInProgress, playTableAnimations, syncFinishedMatch } from "@/pages/gameMotion";

const QUEUE_START_RETRY_MS = 2000;
const SWAP_HIGHLIGHT_MS = 6000;

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
  const fromQueue = searchParams.get("queue") === "1";
  const tableTheme = useSyncExternalStore(subscribeTableTheme, loadTableTheme, loadTableTheme);
  const queueLastStartRef = useRef(0);
  const queueStartAtRef = useRef<number | null>(null);
  const [queueCountdown, setQueueCountdown] = useState<number | null>(null);

  // Modo offline: carrega estado do sessionStorage
  const [offlineGameState, setOfflineGameState] = useState<GameState | null>(null);
  const [botDifficulty, setBotDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [isLoadingOffline, setIsLoadingOffline] = useState(true);

  useEffect(() => {
    if (isOffline && playerId) {
      setIsLoadingOffline(true);
      applyOfflineSession(playerId, setOfflineGameState, setBotDifficulty, (description) => {
        toast({ title: t("error.generic"), description: t(description), variant: "destructive" });
      });
      setIsLoadingOffline(false);
      return;
    }
    if (!isOffline) setIsLoadingOffline(false);
  }, [isOffline, playerId, toast, t]);

  useEffect(() => {
    if (isOffline || !roomCode || !playerId) return;
    const name = sessionStorage.getItem(`playerName_${roomCode}`) || "";
    saveActiveSession({ code: roomCode, playerId, name, savedAt: Date.now() });
  }, [isOffline, roomCode, playerId]);

  const { gameState: offlineGameStateFromHook, sendAction: sendOfflineAction } = useOfflineGame(
    offlineGameState,
    playerId,
    botDifficulty
  );

  const {
    gameState: onlineGameState,
    connected,
    sendAction: sendOnlineAction,
    socketRef,
    revealedCard: onlineRevealedCard,
    setRevealedCard: setOnlineRevealedCard,
    sendEmote: sendOnlineEmote,
    incomingEmote,
    matchReward,
    privateReveal,
  } = useGameSocket(isOffline ? "" : roomCode, isOffline ? "" : playerId);

  // Posições das cartas na tela (para animações)
  const cardRefs = useRef<Map<string, { x: number; y: number; card?: Card; element?: HTMLElement }>>(new Map());

  const [abilityModalOpen, setAbilityModalOpen] = useState(false);
  const peekTimersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const opponentRevealTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [revealedOpponentCard, setRevealedOpponentCard] = useState<{
    card: Card;
    playerName: string;
    timer?: NodeJS.Timeout;
  } | null>(null);
  // Cartas de oponentes reveladas só neste cliente (habilidade 5/6): chave → face real
  const [revealedOpponentCardsInHand, setRevealedOpponentCardsInHand] = useState<Record<string, Card>>({});
  const [gameOverModalOpen, setGameOverModalOpen] = useState(false);
  const [opponentActionNotification, setOpponentActionNotification] = useState<{
    playerName: string;
    actionType: OpponentActionType;
  } | null>(null);

  // Emote visível por jogador; some sozinho depois de alguns segundos
  const [activeEmotes, setActiveEmotes] = useState<Record<string, string>>({});
  const emoteTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const showEmote = useCallback((emotePlayerId: string, emoteId: string) => {
    const timers = emoteTimersRef.current;
    const previous = timers.get(emotePlayerId);
    if (previous) clearTimeout(previous);
    setActiveEmotes((current) => ({ ...current, [emotePlayerId]: emoteId }));
    timers.set(
      emotePlayerId,
      setTimeout(() => {
        setActiveEmotes(({ [emotePlayerId]: _removed, ...rest }) => rest);
        timers.delete(emotePlayerId);
      }, 2500),
    );
  }, []);

  useEffect(() => {
    if (incomingEmote) showEmote(incomingEmote.playerId, incomingEmote.emoteId);
  }, [incomingEmote, showEmote]);

  useEffect(() => {
    const timers = emoteTimersRef.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  const handleSendEmote = (emoteId: EmoteId) => {
    // Online o emote volta pelo servidor; contra bots só existe nesta tela
    if (isOffline) showEmote(playerId, emoteId);
    else sendOnlineEmote(emoteId);
  };

  const gameState = isOffline ? offlineGameStateFromHook : onlineGameState;

  // O desafio diário é retomado pela própria tela dele, não pelo atalho de reentrar na sala
  const isDailyMatch = !!gameState?.dailyDay;
  useEffect(() => {
    if (isDailyMatch) clearActiveSession();
  }, [isDailyMatch]);
  const [, setReconnectTick] = useState(0);

  useEffect(() => {
    if (!gameState?.reconnectDeadline) return;
    setReconnectTick((n) => n + 1);
    const id = window.setInterval(() => setReconnectTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [gameState?.reconnectDeadline]);

  useEffect(() => {
    if (!fromQueue || isOffline) return;
    if (!gameState || gameState.turnPhase !== "waiting" || gameState.players.length < 2) {
      if (gameState?.turnPhase === "waiting") {
        queueStartAtRef.current = null;
        setQueueCountdown(null);
      }
      return;
    }
    if (queueStartAtRef.current == null) {
      queueStartAtRef.current = Date.now() + START_COUNTDOWN_MS;
    }
    const tick = () => {
      const startAt = queueStartAtRef.current;
      if (startAt == null) return;
      const left = Math.max(0, Math.ceil((startAt - Date.now()) / 1000));
      setQueueCountdown(left);
      if (left > 0) return;
      if (Date.now() - queueLastStartRef.current < QUEUE_START_RETRY_MS) return;
      if (socketRef.current?.readyState !== WebSocket.OPEN) return;
      queueLastStartRef.current = Date.now();
      socketRef.current.send(JSON.stringify({ type: "start_game" }));
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [fromQueue, isOffline, gameState, socketRef]);
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

    if (!prevGameStateRef.current) {
      prevGameStateRef.current = JSON.parse(JSON.stringify(gameState));
      if (isOpeningDeal(gameState) && !hasDealtRef.current) {
        hasDealtRef.current = true;
        setTimeout(() => {
          animateDeal();
          audioManager.playCardSlide();
        }, 450);
      }
      return;
    }

    const prevState = prevGameStateRef.current;
    if (leftWaitingRoom(prevState, gameState) && !hasDealtRef.current) {
      hasDealtRef.current = true;
      setTimeout(() => {
        animateDeal();
        audioManager.playCardSlide();
      }, 450);
    }

    const timeoutId = setTimeout(() => {
      playTableAnimations(
        prevState,
        gameState,
        playerId,
        animationTriggeredRef.current,
        { animateDraw, animateDiscard, animateReplace, animatePenalty, animateDeal },
        (notice) => setOpponentActionNotification(notice),
      );
      prevGameStateRef.current = JSON.parse(JSON.stringify(gameState));
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [gameState, animateDraw, animateDiscard, animateReplace, animatePenalty, animateDeal, playerId]);

  // Cleanup de timers ao desmontar
  useEffect(() => {
    const ownTimers = peekTimersRef.current;
    const opponentTimers = opponentRevealTimers.current;
    return () => {
      ownTimers.forEach((timer) => clearTimeout(timer));
      ownTimers.clear();
      opponentTimers.forEach((timer) => clearTimeout(timer));
      opponentTimers.clear();
    };
  }, []);

  /** Carta do oponente fica virada só para quem espiou, e volta ao verso em 20s. */
  const revealOpponentCardInHand = useCallback((targetPlayerId: string, targetCard: Card, durationMs = 20000) => {
    const cardKey = `${targetPlayerId}_${targetCard.id}`;
    setRevealedOpponentCardsInHand((prev) => ({ ...prev, [cardKey]: targetCard }));
    const previous = opponentRevealTimers.current.get(cardKey);
    if (previous) clearTimeout(previous);
    const timer = setTimeout(() => {
      opponentRevealTimers.current.delete(cardKey);
      setRevealedOpponentCardsInHand((prev) => {
        if (!prev[cardKey]) return prev;
        const next = { ...prev };
        delete next[cardKey];
        return next;
      });
    }, durationMs);
    opponentRevealTimers.current.set(cardKey, timer);
  }, []);

  /** Rei e Coringa: mostra as faces só neste cliente, pelo tempo do poder. */
  const showReveals = useCallback(
    (reveals: CardReveal[], durationMs: number) => {
      reveals.forEach(({ playerId: owner, cards }) => {
        cards.forEach((card) => revealOpponentCardInHand(owner, card, durationMs));
      });
      audioManager.playCardFlip();
      toast({
        title: t("game.cardsRevealed"),
        description: t("game.cardsRevealedDesc", { seconds: String(Math.round(durationMs / 1000)) }),
        duration: 4000,
      });
    },
    [revealOpponentCardInHand, toast, t],
  );

  useEffect(() => {
    if (privateReveal) showReveals(privateReveal.reveals, privateReveal.durationMs);
    // showReveals muda com o idioma, e isso não pode repetir a revelação
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privateReveal]);

  // Remove revelações locais quando a carta não está mais na mão do oponente
  useEffect(() => {
    if (!gameState) return;
    setRevealedOpponentCardsInHand((prev) => {
      const keys = Object.keys(prev);
      if (keys.length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      for (const key of keys) {
        const player = gameState.players.find((p) => key.startsWith(`${p.id}_`));
        if (!player) {
          delete next[key];
          changed = true;
          continue;
        }
        const revealedCardId = key.slice(player.id.length + 1);
        if (!player.hand.some((c) => c.id === revealedCardId)) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [gameState]);

  // Carta revelada pelo servidor (online): popup 3s; mesa fica revelada só neste cliente
  useEffect(() => {
    if (!isOffline && onlineRevealedCard) {
      if (revealedOpponentCard?.timer) {
        clearTimeout(revealedOpponentCard.timer);
      }

      const overlayTimer = setTimeout(() => {
        setOnlineRevealedCard(null);
        setRevealedOpponentCard(null);
      }, 3000);

      setRevealedOpponentCard({
        card: onlineRevealedCard.card,
        playerName: onlineRevealedCard.playerName,
        timer: overlayTimer,
      });
      audioManager.playCardFlip();

      const targetPlayerId = (onlineRevealedCard as any).targetPlayerId as string | undefined;
      if (targetPlayerId && onlineRevealedCard.card) {
        revealOpponentCardInHand(targetPlayerId, onlineRevealedCard.card);
      }

      return () => clearTimeout(overlayTimer);
    }
  }, [onlineRevealedCard, isOffline, setOnlineRevealedCard, revealOpponentCardInHand]);

  // Trava landscape só com a partida em andamento (menu/espera ficam livres)
  const isMatchInProgress = matchInProgress(gameState);

  useEffect(() => {
    if (!isMatchInProgress) {
      void unlockOrientation();
      return;
    }
    let unlock: (() => void) | undefined;
    let cancelled = false;
    void lockLandscape()
      .then((fn) => {
        if (cancelled) {
          fn();
          return;
        }
        unlock = fn;
      })
      .catch(() => {
        // Screen Orientation API indisponível neste dispositivo
      });
    return () => {
      cancelled = true;
      unlock?.();
      void unlockOrientation();
    };
  }, [isMatchInProgress]);

  // Troca: as cartas voam para o destino e ficam destacadas por alguns segundos
  const lastSwapCount = useRef<number | null>(null);
  const swapHighlightTimer = useRef<ReturnType<typeof setTimeout>>();
  const [swapHighlights, setSwapHighlights] = useState<Record<string, SwapHighlight>>({});
  useEffect(() => {
    if (!gameState) return;
    const swap = gameState.lastSwap;
    const count = swap?.count ?? 0;
    const previous = lastSwapCount.current;
    lastSwapCount.current = count;
    if (previous === null || !swap || count === previous) return;
    animateSwap(swap.player1Id, swap.player1CardIndex, swap.player2Id, swap.player2CardIndex);
    audioManager.playSwap();
    clearTimeout(swapHighlightTimer.current);
    setSwapHighlights({ [swap.player2CardId]: "toSecond", [swap.player1CardId]: "toFirst" });
    swapHighlightTimer.current = setTimeout(() => setSwapHighlights({}), SWAP_HIGHLIGHT_MS);
  }, [gameState, animateSwap]);
  useEffect(() => () => clearTimeout(swapHighlightTimer.current), []);

  // Vento: todos veem quem foi atingido. O anúncio de bots já vem pelo aviso da jogada deles.
  const lastWindCount = useRef<number | null>(null);
  useEffect(() => {
    if (!gameState) return;
    const wind = gameState.lastWind;
    const count = wind?.count ?? 0;
    const previous = lastWindCount.current;
    lastWindCount.current = count;
    if (previous === null || !wind || count === previous) return;
    showEmote(wind.targetId, WIND_EFFECT_ID);
    const by = gameState.players.find((p) => p.id === wind.byId);
    const target = gameState.players.find((p) => p.id === wind.targetId);
    if (by && target && !by.isBot) {
      toast({
        title: t("game.windTitle"),
        description:
          wind.targetId === playerId
            ? t("game.windOnYou", { player: by.name })
            : t("game.windOnPlayer", { player: by.name, target: target.name }),
        duration: 4000,
      });
    }
  }, [gameState, playerId, showEmote, toast, t]);

  // Detecta declaração de Cunoku; null até o primeiro estado, para não repetir o anúncio ao reconectar
  const prevFinalRound = useRef<boolean | null>(null);
  const [cunokuCaller, setCunokuCaller] = useState<string | null>(null);
  const finishCunokuCall = useCallback(() => setCunokuCaller(null), []);
  useEffect(() => {
    if (!gameState) return;
    if (gameState.isFinalRound && prevFinalRound.current === false) {
      const declarer = gameState.players.find((p) => p.id === gameState.finalRoundDeclarerId);
      if (declarer) {
        setCunokuCaller(declarer.name);
        audioManager.playCunokuCall();
      }
    }
    prevFinalRound.current = gameState.isFinalRound || false;
  }, [gameState?.isFinalRound, gameState?.finalRoundDeclarerId]);

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

  useEffect(() => {
    syncFinishedMatch({
      winnerId: gameState?.winnerId,
      me,
      playerId,
      roomCode,
      isOffline,
      players: gameState?.players,
      botDifficulty,
      setGameOverModalOpen,
      toast,
      t,
    });
  }, [gameState?.winnerId, playerId, me, roomCode, isOffline, gameState?.players, botDifficulty, toast, t]);


  const handleCopyCode = async () => {
    const ok = await copyToClipboard(roomCode);
    toast({
      title: ok ? t("game.copied") : t("error.generic"),
      description: ok ? t("game.copiedDesc") : roomCode,
    });
  };

  const handleShareInvite = async () => {
    const url = buildInviteUrl(roomCode);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Cunoku", text: roomCode, url });
        return;
      } catch {
        // usuário cancelou ou o WebView não completou — cai no clipboard
      }
    }
    const ok = await copyToClipboard(url);
    toast({
      title: ok ? t("invite.copied") : t("error.generic"),
      description: ok ? t("invite.copiedDesc") : url,
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
      // Offline: feedback imediato. Online: private_info do servidor (só quem peekou recebe).
      if (isOffline) {
        const targetPlayer = gameState.players.find((p) => p.id === action.targetPlayerId);
        if (targetPlayer && targetPlayer.hand[action.targetCardIndex]) {
          const peekedCard = targetPlayer.hand[action.targetCardIndex];

          if (revealedOpponentCard?.timer) {
            clearTimeout(revealedOpponentCard.timer);
          }
          const overlayTimer = setTimeout(() => setRevealedOpponentCard(null), 3000);
          setRevealedOpponentCard({ card: peekedCard, playerName: targetPlayer.name, timer: overlayTimer });
          revealOpponentCardInHand(action.targetPlayerId, peekedCard);
          audioManager.playCardFlip();
        }
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
    }

    if (action.kind === "jack") {
      sendAction({ type: "use_ability", ability: "jack" });
    }

    if (action.kind === "queen") {
      sendAction({ type: "use_ability", ability: "queen", targetPlayerId: action.targetPlayerId });
    }

    if (action.kind === "seal") {
      sendAction({
        type: "use_ability",
        ability: "seal",
        targetPlayerId: action.targetPlayerId,
        targetCardIndex: action.cardIndex,
      });
    }

    if (action.kind === "king") {
      // Offline não há servidor: as faces vêm do estado local
      if (isOffline) showReveals(revealCards(gameState, [action.targetPlayerId]), KING_REVEAL_MS);
      sendAction({ type: "use_ability", ability: "king", targetPlayerId: action.targetPlayerId });
    }

    if (action.kind === "joker_reveal") {
      if (isOffline) showReveals(revealCards(gameState, gameState.players.map((p) => p.id)), JOKER_REVEAL_MS);
      sendAction({ type: "use_ability", ability: "joker_reveal" });
    }

    if (action.kind === "joker_force") {
      sendAction({
        type: "use_ability",
        ability: "joker_force",
        targetPlayerId: action.targetPlayerId,
        targetCardIndex: action.cardIndex,
      });
    }

    if (action.kind === "wind") {
      sendAction({ type: "use_ability", ability: "wind", targetPlayerId: action.targetPlayerId });
      audioManager.playSwap();
    }

    if (action.kind === "swap_others") {
      sendAction({
        type: "use_ability",
        ability: "swap",
        targetPlayerId: action.player1Id,
        targetCardIndex: action.card1Index,
        targetPlayerId2: action.player2Id,
        targetCardIndex3: action.card2Index,
      });
    }
  };


  const startTable = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "start_game" }));
      return;
    }
    toast({ title: "Connection Error", description: "Not connected to server", variant: "destructive" });
  };

  const closeReveal = () => {
    if (revealedOpponentCard?.timer) clearTimeout(revealedOpponentCard.timer);
    setRevealedOpponentCard(null);
    if (!isOffline) setOnlineRevealedCard(null);
  };

  const storedHostId = sessionStorage.getItem(`hostId_${roomCode}`);
  const pregame = renderPregame({
    playerId,
    isOffline,
    roomCode,
    t,
    isLoadingOffline,
    offlineHook: offlineGameStateFromHook,
    offlineSaved: offlineGameState,
    onHome: () => setLocation("/"),
    gameState,
    fromQueue,
    queueCountdown,
    isHost: storedHostId === playerId,
    onCopyCode: handleCopyCode,
    onShareInvite: handleShareInvite,
    onCopyLanUrl: handleCopyLanUrl,
    networkMode: getNetworkMode(),
    lanJoinUrl: getLanJoinUrl(),
    onStart: startTable,
  });
  if (pregame) return pregame;
  if (!gameState) return <ConnectingScreen roomCode={roomCode} />;

  return (
    <ActiveTable
      isPortrait={isPortrait}
      isCompact={isCompact}
      isMobile={isMobile}
      isOffline={isOffline}
      connected={connected}
      roomCode={roomCode}
      playerId={playerId}
      tableMat={tableTheme.mat}
      gameState={gameState}
      me={me}
      isMyTurn={!!isMyTurn}
      phase={phase}
      t={t}
      onExit={() => setLocation("/")}
      onCopyCode={handleCopyCode}
      onBackHome={() => {
        clearActiveSession();
        setLocation("/");
      }}
      currentAnimation={currentAnimation}
      onAnimationComplete={completeCurrentAnimation}
      opponentNotice={opponentActionNotification}
      onNoticeDone={() => setOpponentActionNotification(null)}
      cunokuCaller={cunokuCaller}
      onCunokuCallDone={finishCunokuCall}
      revealedCards={revealedOpponentCardsInHand}
      registerCardPosition={registerCardRef}
      deckRef={deckRef}
      discardRef={discardRef}
      sendAction={sendAction}
      abilityOpen={abilityModalOpen}
      onAbilityOpenChange={setAbilityModalOpen}
      onConfirmAbility={confirmAbility}
      revealedOpponentCard={revealedOpponentCard}
      onCloseReveal={closeReveal}
      gameOverOpen={gameOverModalOpen}
      onGameOverOpenChange={setGameOverModalOpen}
      activeEmotes={activeEmotes}
      onEmote={handleSendEmote}
      matchReward={matchReward}
      swapHighlights={swapHighlights}
    />
  );
}
