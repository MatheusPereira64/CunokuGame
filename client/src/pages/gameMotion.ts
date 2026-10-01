import { GameState, Card } from "@shared/schema";
import { audioManager } from "@/utils/audioManager";
import { OpponentActionType } from "@/components/animations";
import {
  hasRecordedMatchStats,
  markMatchStatsRecorded,
  recordMatchResult,
} from "@/lib/playerProfile";
import { isRankLoggedIn, reportRankMatchResult, countsForGlobalRank } from "@/lib/rankAuth";

type Difficulty = "easy" | "medium" | "hard";
type DiscardKind = "from_hand" | "matched" | "drawn";
type Notify = (notice: { playerName: string; actionType: OpponentActionType }) => void;

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
  remember(triggered, `draw_${player.id}_${card.rank}_${card.suit}`, 2000, () => {
    animateDraw(card, source, player.id);
    audioManager.playCardSlide();
  });
}

function playReplace(
  prev: GameState,
  current: GameState,
  playerId: string,
  triggered: Set<string>,
  animateReplace: MotionApi["animateReplace"],
  notify: Notify,
) {
  const currentPlayer = current.players[current.currentPlayerIndex];
  const prevPlayer = prev.players[prev.currentPlayerIndex];
  if (!currentPlayer || !prevPlayer || currentPlayer.hand.length !== prevPlayer.hand.length) return false;
  const drawnCard = prev.drawnCard;
  const discardedCard = current.discardPile[current.discardPile.length - 1];
  const handIndex = prevPlayer.hand.findIndex((c) => c.rank === discardedCard?.rank && c.suit === discardedCard?.suit);
  if (!drawnCard || !discardedCard || handIndex < 0) return true;
  const isOpponent = currentPlayer.id !== playerId;
  remember(triggered, `replace_${currentPlayer.id}_${handIndex}_${Date.now()}`, 2000, () => {
    audioManager.playCardFlip();
    if (isOpponent) notify({ playerName: currentPlayer.name, actionType: "replace" });
    else animateReplace(drawnCard, discardedCard, handIndex, currentPlayer.id);
  });
  return true;
}

function playDiscardDrawn(
  prev: GameState,
  current: GameState,
  playerId: string,
  triggered: Set<string>,
  animateDiscard: MotionApi["animateDiscard"],
  notify: Notify,
) {
  const currentPlayer = current.players[current.currentPlayerIndex];
  const discardedCard = prev.drawnCard;
  if (!discardedCard || !currentPlayer) return;
  const isOpponent = currentPlayer.id !== playerId;
  remember(triggered, `discard_drawn_${currentPlayer.id}_${discardedCard.rank}_${discardedCard.suit}`, 2000, () => {
    audioManager.playCardSlide();
    if (isOpponent) notify({ playerName: currentPlayer.name, actionType: "discard" });
    else animateDiscard(discardedCard, "drawn", currentPlayer.id);
  });
}

function playReplaceOrDiscard(
  prev: GameState,
  current: GameState,
  playerId: string,
  triggered: Set<string>,
  api: Pick<MotionApi, "animateReplace" | "animateDiscard">,
  notify: Notify,
) {
  const drewThenCleared = prev.drawnCard && !current.drawnCard && prev.discardPile.length < current.discardPile.length;
  if (!drewThenCleared) return;
  const replaced = playReplace(prev, current, playerId, triggered, api.animateReplace, notify);
  if (replaced) return;
  playDiscardDrawn(prev, current, playerId, triggered, api.animateDiscard, notify);
}

function playOneHandDiscard(
  prev: GameState,
  current: GameState,
  player: GameState["players"][number],
  playerIndex: number,
  playerId: string,
  triggered: Set<string>,
  animateDiscard: MotionApi["animateDiscard"],
  notify: Notify,
) {
  const prevPlayer = prev.players[playerIndex];
  const removedCard = prevPlayer.hand.find(
    (prevCard) => !player.hand.some((currCard) => currCard.rank === prevCard.rank && currCard.suit === prevCard.suit),
  );
  if (!removedCard || current.discardPile.length <= prev.discardPile.length) return;
  const topDiscard = current.discardPile[current.discardPile.length - 1];
  const isMatch = topDiscard.rank === removedCard.rank && topDiscard.suit === removedCard.suit;
  const discardType: "from_hand" | "matched" =
    prev.currentPlayerIndex === playerIndex && prev.turnPhase === "draw" ? "from_hand" : "matched";
  const cardIndex = prevPlayer.hand.findIndex((c) => c.rank === removedCard.rank && c.suit === removedCard.suit);
  const isOpponent = player.id !== playerId;
  remember(triggered, `discard_hand_${player.id}_${removedCard.rank}_${removedCard.suit}_${Date.now()}`, 2000, () => {
    audioManager.playCardSlide();
    if (isOpponent) notify({ playerName: player.name, actionType: "discard" });
    else animateDiscard(removedCard, discardType, player.id, cardIndex, isMatch);
  });
}

function playHandDiscards(
  prev: GameState,
  current: GameState,
  playerId: string,
  triggered: Set<string>,
  animateDiscard: MotionApi["animateDiscard"],
  notify: Notify,
) {
  if (prev.drawnCard && !current.drawnCard) return;
  current.players.forEach((player, playerIndex) => {
    const prevPlayer = prev.players[playerIndex];
    if (!prevPlayer || player.hand.length >= prevPlayer.hand.length) return;
    playOneHandDiscard(prev, current, player, playerIndex, playerId, triggered, animateDiscard, notify);
  });
}

function playPenalties(prev: GameState, current: GameState, triggered: Set<string>, animatePenalty: MotionApi["animatePenalty"]) {
  current.players.forEach((player, playerIndex) => {
    const prevPlayer = prev.players[playerIndex];
    if (!prevPlayer || player.hand.length <= prevPlayer.hand.length) return;
    const cardsAdded = player.hand.length - prevPlayer.hand.length;
    if (cardsAdded !== 2 || current.currentPlayerIndex === playerIndex) return;
    const newCards = player.hand.slice(-2);
    remember(triggered, `penalty_${player.id}_${newCards[0]?.rank}_${newCards[1]?.rank}_${Date.now()}`, 3000, () => {
      animatePenalty(newCards, player.id, prevPlayer.hand.length);
      audioManager.playPenalty();
    });
  });
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
  notify: Notify,
) {
  playDraw(prev, current, triggered, api.animateDraw);
  playReplaceOrDiscard(prev, current, playerId, triggered, api, notify);
  playHandDiscards(prev, current, playerId, triggered, api.animateDiscard, notify);
  playPenalties(prev, current, triggered, api.animatePenalty);
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
  const matchId = args.roomCode || playerId;
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
