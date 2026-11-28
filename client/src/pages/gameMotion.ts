import { GameState, Card } from "@shared/schema";
import { audioManager } from "@/utils/audioManager";
import { addMatchToHistory, historyEntryFromState } from "@/lib/matchHistory";
import { vibrate } from "@/lib/haptics";
import {
  hasRecordedMatchStats,
  markMatchStatsRecorded,
  recordMatchResult,
} from "@/lib/playerProfile";
import { isRankLoggedIn, reportRankMatchResult, countsForGlobalRank } from "@/lib/rankAuth";

type Difficulty = "easy" | "medium" | "hard";
type DiscardKind = "from_hand" | "matched" | "drawn";

type MotionApi = {
  animateDraw: (card: Card, source: "deck" | "discard", playerId: string) => void;
  animateDiscard: (card: Card, kind: DiscardKind, playerId: string, cardIndex?: number, isMatch?: boolean) => void;
  animateReplace: (drawn: Card, discarded: Card, handIndex: number, playerId: string) => void;
  animatePenalty: (cards: Card[], playerId: string, startingIndex: number) => void;
  animateDeal: () => void;
};

type ToastFn = (opts: { title: string; description?: string; variant?: "destructive"; duration?: number }) => void;
type Translate = (key: string, vars?: Record<string, string>) => string;

function remember(triggered: Set<string>, key: string, ms: number, run: () => void) {
  if (triggered.has(key)) return;
  triggered.add(key);
  run();
  setTimeout(() => triggered.delete(key), ms);
}

function playDraw(prev: GameState, current: GameState, triggered: Set<string>, animateDraw: MotionApi["animateDraw"]) {
  if (prev.drawnCard || !current.drawnCard) return;
  const player = current.players[current.currentPlayerIndex];
  if (!player) return;
  const cameFromDiscard = prev.discardPile.length > current.discardPile.length;
  const source: "deck" | "discard" = cameFromDiscard ? "discard" : "deck";
  const card = current.drawnCard;
  remember(triggered, `draw_${player.id}_${card.id}`, 2000, () => {
    animateDraw(card, source, player.id);
    audioManager.playCardSlide();
  });
}

/**
 * Quem jogou é quem tinha a vez no estado anterior: quando a jogada chega,
 * a vez já pode ter passado para o próximo jogador.
 */
function actorOf(prev: GameState, current: GameState) {
  const index = prev.currentPlayerIndex;
  return { index, before: prev.players[index], after: current.players[index] };
}

function playReplace(
  prev: GameState,
  current: GameState,
  triggered: Set<string>,
  animateReplace: MotionApi["animateReplace"],
) {
  const { before, after } = actorOf(prev, current);
  if (!before || after?.hand.length !== before.hand.length) return false;
  const drawnCard = prev.drawnCard;
  const discardedCard = current.discardPile.at(-1);
  const handIndex = before.hand.findIndex((c) => c.id === discardedCard?.id);
  if (!drawnCard || !discardedCard || handIndex < 0) return false;
  remember(triggered, `replace_${after.id}_${discardedCard.id}`, 2000, () => {
    audioManager.playCardFlip();
    animateReplace(drawnCard, discardedCard, handIndex, after.id);
  });
  return true;
}

function playDiscardDrawn(
  prev: GameState,
  current: GameState,
  triggered: Set<string>,
  animateDiscard: MotionApi["animateDiscard"],
) {
  const { after } = actorOf(prev, current);
  // A carta descartada fica aberta na pilha: a face que vale é a do topo do descarte
  const discardedCard = current.discardPile.at(-1) ?? prev.drawnCard;
  if (!discardedCard || !after) return;
  remember(triggered, `discard_drawn_${after.id}_${discardedCard.id}`, 2000, () => {
    audioManager.playCardSlide();
    animateDiscard(discardedCard, "drawn", after.id);
  });
}

function playReplaceOrDiscard(
  prev: GameState,
  current: GameState,
  triggered: Set<string>,
  api: Pick<MotionApi, "animateReplace" | "animateDiscard">,
) {
  const drewThenCleared = prev.drawnCard && !current.drawnCard && prev.discardPile.length < current.discardPile.length;
  if (!drewThenCleared) return;
  const replaced = playReplace(prev, current, triggered, api.animateReplace);
  if (replaced) return;
  playDiscardDrawn(prev, current, triggered, api.animateDiscard);
}

function playOneHandDiscard(
  prev: GameState,
  current: GameState,
  player: GameState["players"][number],
  playerIndex: number,
  triggered: Set<string>,
  animateDiscard: MotionApi["animateDiscard"],
) {
  const prevPlayer = prev.players[playerIndex];
  const removedCard = prevPlayer.hand.find(
    (prevCard) => !player.hand.some((currCard) => currCard.id === prevCard.id),
  );
  const topDiscard = current.discardPile.at(-1);
  if (!removedCard || !topDiscard || current.discardPile.length <= prev.discardPile.length) return;
  const isMatch = topDiscard.id === removedCard.id;
  const discardType: "from_hand" | "matched" =
    prev.currentPlayerIndex === playerIndex && prev.turnPhase === "draw" ? "from_hand" : "matched";
  const cardIndex = prevPlayer.hand.findIndex((c) => c.id === removedCard.id);
  remember(triggered, `discard_hand_${player.id}_${removedCard.id}`, 2000, () => {
    audioManager.playCardSlide();
    animateDiscard(topDiscard, discardType, player.id, cardIndex, isMatch);
  });
}

function playHandDiscards(
  prev: GameState,
  current: GameState,
  triggered: Set<string>,
  animateDiscard: MotionApi["animateDiscard"],
) {
  if (prev.drawnCard && !current.drawnCard) return;
  current.players.forEach((player, playerIndex) => {
    const prevPlayer = prev.players[playerIndex];
    if (!prevPlayer || player.hand.length >= prevPlayer.hand.length) return;
    playOneHandDiscard(prev, current, player, playerIndex, triggered, animateDiscard);
  });
}

function playPenalties(
  prev: GameState,
  current: GameState,
  playerId: string,
  triggered: Set<string>,
  animatePenalty: MotionApi["animatePenalty"],
) {
  current.players.forEach((player, playerIndex) => {
    const prevPlayer = prev.players[playerIndex];
    if (!prevPlayer || player.hand.length <= prevPlayer.hand.length) return;
    const cardsAdded = player.hand.length - prevPlayer.hand.length;
    if (cardsAdded !== 2) return;
    const newCards = player.hand.slice(-2);
    remember(triggered, `penalty_${player.id}_${newCards[0]?.id}_${newCards[1]?.id}_${Date.now()}`, 3000, () => {
      animatePenalty(newCards, player.id, prevPlayer.hand.length);
      audioManager.playPenalty();
      if (player.id === playerId) vibrate("penalty");
    });
  });
}

/**
 * Lugares da mesa que devem esperar a animação: cada carta nova na pilha de descarte
 * (identificada pelo id) e a posição da mão que recebeu a carta comprada.
 * Usa as mesmas regras de playTableAnimations para não segurar o que não vai animar.
 */
export function pendingTableHolds(prev: GameState, current: GameState): { pileCardIds: string[]; slots: string[] } {
  const grew = current.discardPile.length > prev.discardPile.length;
  if (!grew) return { pileCardIds: [], slots: [] };
  const top = current.discardPile.at(-1);
  const drewThenCleared = !!prev.drawnCard && !current.drawnCard;
  if (drewThenCleared) {
    const { before, after } = actorOf(prev, current);
    const handIndex = before?.hand.findIndex((c) => c.id === top?.id) ?? -1;
    const replaced = !!before && !!after && after.hand.length === before.hand.length && handIndex >= 0;
    return { pileCardIds: top ? [top.id] : [], slots: replaced && after ? [`${after.id}_${handIndex}`] : [] };
  }
  const shrank = current.players.some((p, i) => prev.players[i] && p.hand.length < prev.players[i].hand.length);
  return { pileCardIds: shrank && top ? [top.id] : [], slots: [] };
}

export function isOpeningDeal(state: GameState) {
  return state.turnPhase !== "waiting" && state.round === 1 && !state.drawnCard && state.discardPile.length <= 1;
}

export function leftWaitingRoom(prev: GameState, current: GameState) {
  return prev.turnPhase === "waiting" && current.turnPhase !== "waiting";
}

export function matchInProgress(gameState: GameState | null | undefined) {
  if (!gameState) return false;
  const stillWaiting = gameState.players.length < 2 || gameState.turnPhase === "waiting";
  return !(stillWaiting && !gameState.winnerId);
}

export function playTableAnimations(
  prev: GameState,
  current: GameState,
  playerId: string,
  triggered: Set<string>,
  api: MotionApi,
) {
  playDraw(prev, current, triggered, api.animateDraw);
  playReplaceOrDiscard(prev, current, triggered, api);
  playHandDiscards(prev, current, triggered, api.animateDiscard);
  playPenalties(prev, current, playerId, triggered, api.animatePenalty);
}

export function applyOfflineSession(
  playerId: string,
  setState: (state: GameState) => void,
  setDifficulty: (difficulty: Difficulty) => void,
  onError: (descriptionKey: string) => void,
) {
  const savedState = sessionStorage.getItem(`offline_game_${playerId}`);
  const savedDifficulty = sessionStorage.getItem(`offline_difficulty_${playerId}`);
  if (!savedState) {
    onError("game.errorNotFound");
    return;
  }
  try {
    const parsedState = JSON.parse(savedState) as GameState;
    if (!parsedState?.players?.length) {
      onError("game.errorInvalidState");
      return;
    }
    setState(parsedState);
    if (savedDifficulty) setDifficulty(savedDifficulty as Difficulty);
  } catch {
    onError("game.errorFailedToLoad");
  }
}

export function syncFinishedMatch(args: {
  winnerId: string | null | undefined;
  me: { score: number } | undefined;
  playerId: string;
  roomCode: string;
  isOffline: boolean;
  players: GameState["players"] | undefined;
  /** Estado final, para o histórico de partidas */
  state?: GameState | null;
  botDifficulty: Difficulty;
  setGameOverModalOpen: (open: boolean) => void;
  toast: ToastFn;
  t: Translate;
}) {
  const { winnerId, me, playerId } = args;
  if (!winnerId || !me || !playerId) return;
  args.setGameOverModalOpen(true);
  if (winnerId === playerId) audioManager.playGameWon();
  else audioManager.playGameLost();
  // Toda partida offline usa a rota /game/offline: o id único dela é o playerId
  const matchId = args.isOffline ? playerId : args.roomCode;
  // Histórico: a revanche na mesma sala é outra partida, então o id inclui o placar final
  const entry = args.state
    ? historyEntryFromState({
        id: `${matchId}:${winnerId}:${args.state.players.map((p) => p.score).join(",")}`,
        state: args.state,
        playerId,
        isOffline: args.isOffline,
      })
    : null;
  if (entry) addMatchToHistory(entry);
  if (hasRecordedMatchStats(matchId)) return;
  const won = winnerId === playerId;
  recordMatchResult({ won, finalScore: me.score });
  markMatchStatsRecorded(matchId);
  if (!isRankLoggedIn()) return;
  reportRankOutcome(args, won);
}

function reportRankOutcome(
  args: {
    me: { score: number } | undefined;
    playerId: string;
    isOffline: boolean;
    players: GameState["players"] | undefined;
    botDifficulty: Difficulty;
    toast: ToastFn;
    t: Translate;
  },
  won: boolean,
) {
  const me = args.me;
  const players = args.players;
  if (!me || !players) return;
  const isPvp = countsForGlobalRank(args.isOffline, players, args.playerId);
  const mode = isPvp ? "pvp" : args.isOffline ? "offline" : "bots";
  const stored = sessionStorage.getItem(`offline_difficulty_${args.playerId}`) as Difficulty | null;
  const difficulty = args.botDifficulty || stored || "medium";
  reportRankMatchResult({
    won,
    finalScore: me.score,
    mode,
    botDifficulty: mode === "pvp" ? undefined : difficulty,
  })
    .then((profile) => {
      if (!profile?.newlyUnlocked?.length) return;
      args.toast({
        title: args.t("achieve.unlockedToast"),
        description: profile.newlyUnlocked.map((id) => args.t(`achieve.${id}.title`)).join(", "),
        duration: 4500,
      });
    })
    .catch((err) => {
      console.warn("Rank match sync failed:", err);
    });
}
