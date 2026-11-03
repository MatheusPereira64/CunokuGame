import { ReactNode, RefObject } from "react";
import { GameState, Card, Player, GameAction, MatchReward } from "@shared/schema";
import type { EmoteId } from "@shared/emotes";
import { PlayingCard } from "@/components/PlayingCard";
import { Button } from "@/components/Button";
import { motion, AnimatePresence } from "framer-motion";
import { AnimationRenderer, CunokuCallOverlay, OpponentActionNotification, OpponentActionType } from "@/components/animations";
import { ArrowLeft, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { VolumeControl } from "@/components/VolumeControl";
import { TableThemeButton } from "@/components/TableThemePicker";
import { PlayerSeat } from "@/components/game/PlayerSeat";
import { CenterPile } from "@/components/game/CenterPile";
import { MyArea } from "@/components/game/MyArea";
import { GameOverModal } from "@/components/game/GameOverModal";
import { EmotePicker } from "@/components/game/EmotePicker";
import { RulesCheatSheet } from "@/components/game/RulesCheatSheet";
import { AbilityModal } from "@/components/game/AbilityModal";
import { AbilityAction, hasSpecialAbility, getAbilityDescription } from "@/components/game/helpers";
import { getSeatPositions, opponentsInTurnOrder, seatStyle } from "@/components/game/seatPositions";
import { SwapHighlight, SwapHighlightContext } from "@/components/game/swapHighlight";
import { LandscapePrompt } from "@/components/game/LandscapePrompt";
import { GameTutorial } from "@/components/game/GameTutorial";
import { WaitingRoom } from "@/components/game/WaitingRoom";
import { TableMatId } from "@/lib/tableTheme";
import { AnimationEvent } from "@/components/animations/types";

type Translate = (key: string, vars?: Record<string, string>) => string;
type SendAction = (action: GameAction) => void;
type RegisterCard = (key: string, el: HTMLElement | null, card?: Card) => void;
type RevealedCard = { card: Card; playerName: string; timer?: ReturnType<typeof setTimeout> } | null;

function cx(flag: boolean, whenTrue: string, whenFalse: string) {
  return flag ? whenTrue : whenFalse;
}

export function OfflineBoot({
  isLoading,
  hasSaved,
  onHome,
  t,
}: {
  isLoading: boolean;
  hasSaved: boolean;
  onHome: () => void;
  t: Translate;
}) {
  if (!isLoading && !hasSaved) {
    return (
      <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center text-white gap-6 p-8">
        <div className="text-2xl font-display text-center">{t("game.errorNotFound")}</div>
        <div className="text-white/50 text-center max-w-sm">{t("error.generic")}</div>
        <Button variant="primary" onClick={onHome}>
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

export function ConnectingScreen({ roomCode }: { roomCode: string }) {
  return (
    <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center text-white">
      <div className="animate-pulse text-2xl font-display mb-4">Connecting to Table...</div>
      <div className="text-white/50">Room: {roomCode}</div>
    </div>
  );
}

function GameTopBar({
  isCompact,
  isOffline,
  connected,
  roomCode,
  isDaily,
  canEmote,
  onEmote,
  onExit,
  onCopyCode,
  status,
  t,
}: {
  status: ReactNode;
  isCompact: boolean;
  isOffline: boolean;
  connected: boolean;
  roomCode: string;
  isDaily: boolean;
  canEmote: boolean;
  onEmote: (emoteId: EmoteId) => void;
  onExit: () => void;
  onCopyCode: () => void;
  t: Translate;
}) {
  return (
    <div
      className={cn(
        "relative z-50 shrink-0 flex justify-between items-center",
        cx(isCompact, "px-1.5 pt-1 gap-1.5", "px-4 pt-2 gap-3"),
      )}
    >
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "bg-black/20 text-white border-white/20 backdrop-blur-sm",
            cx(isCompact, "text-[10px] px-1.5 py-0.5 h-7", ""),
          )}
          onClick={onExit}
        >
          <ArrowLeft className={cn("w-3.5 h-3.5", cx(isCompact, "mr-0", "mr-2"))} />
          {cx(isCompact, "", t("game.exit"))}
        </Button>
        <div
          className={cn(
            "flex items-center [&_button]:bg-black/20 [&_button]:text-white [&_button]:border-white/20 [&_button]:backdrop-blur-sm [&_button]:hover:bg-black/30",
            cx(isCompact, "gap-1.5 [&_button]:h-7 [&_button]:w-7 [&_button]:p-0", "gap-2"),
          )}
        >
          <VolumeControl />
          <TableThemeButton />
        </div>
        <RulesCheatSheet compact={isCompact} />
        {canEmote ? <EmotePicker compact={isCompact} onSelect={onEmote} /> : null}
        {isOffline || connected ? null : <ReconnectBanner t={t} />}
      </div>
      <div className="flex min-w-0 flex-1 justify-center">{status}</div>
      {isDaily ? (
        <div className={cn("shrink-0 bg-black/40 backdrop-blur-md rounded-full border border-white/10 font-bold", cx(isCompact, "px-2.5 py-1 text-[11px]", "px-4 py-1.5 text-base"))}>
          {t("daily.title")}
        </div>
      ) : (
        <button
          type="button"
          className={cn(
            "shrink-0 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex flex-col items-center cursor-pointer",
            cx(isCompact, "px-2.5 py-1", "px-4 py-1"),
          )}
          onClick={onCopyCode}
        >
          {isCompact ? null : <div className="text-white/60 font-mono text-[10px] leading-tight">{t("game.roomCode")}</div>}
          <div className={cn("font-bold tracking-widest font-mono flex items-center gap-1", cx(isCompact, "text-[11px]", "text-base leading-tight"))}>
            {roomCode} <Copy className={cn(cx(isCompact, "w-2.5 h-2.5", "w-3 h-3"))} />
          </div>
        </button>
      )}
    </div>
  );
}

function ReconnectBanner({ t }: { t: Translate }) {
  return (
    <div className="pointer-events-none rounded-full bg-amber-500/90 text-amber-950 text-xs font-semibold px-3 py-1">
      {t("reconnect.banner")}
    </div>
  );
}

function RoundStatus({ isCompact, gameState, t }: { isCompact: boolean; gameState: GameState; t: Translate }) {
  const left = gameState.finalRoundsLeft ?? 1;
  const inFinalRounds = gameState.isFinalRound && !gameState.winnerId;
  return (
    <div className="shrink-0 text-center leading-tight">
      <div className={cn("font-bold text-yellow-400", cx(isCompact, "text-[10px]", "text-sm"))}>
        {t("game.round")} {gameState.round}
        {gameState.round < 5 ? "/5" : ""}
      </div>
      {inFinalRounds ? (
        <div className={cn("font-bold text-red-300", cx(isCompact, "text-[9px]", "text-[11px]"))}>
          {left <= 1 ? t("game.lastRound") : t("game.finalRoundsLeft", { count: String(left) })}
        </div>
      ) : gameState.round < 5 && !isCompact ? (
        <div className="text-[10px] text-white/60">{t("game.cunokuAfterRound5")}</div>
      ) : null}
    </div>
  );
}

function myTurnHint(gameState: GameState, phase: string | undefined, isCompact: boolean, t: Translate) {
  const card = gameState.drawnCard;
  const canUsePower = phase === "action" && card && !gameState.drawnFromDiscard && !gameState.forcedReplace && !gameState.jokerRevealed && hasSpecialAbility(card);
  if (canUsePower && !isCompact) return getAbilityDescription(card.rank, t);
  if (phase === "draw") return cx(isCompact, t("game.drawFromDeckShort"), t("game.drawFromDeck"));
  if (phase === "action") return cx(isCompact, t("game.replaceOrDiscardShort"), t("game.replaceOrDiscard"));
  return "";
}

/** Linha única de avisos: rodada, de quem é a vez e o que fazer. Fica sempre no mesmo lugar. */
function StatusLine({
  isCompact,
  gameState,
  graceSeconds,
  graceName,
  isMyTurn,
  phase,
  t,
}: {
  isCompact: boolean;
  gameState: GameState;
  graceSeconds: number | null;
  graceName: string;
  isMyTurn: boolean;
  phase: string | undefined;
  t: Translate;
}) {
  const currentName = gameState.players[gameState.currentPlayerIndex]?.name ?? "";
  const textSize = cx(isCompact, "text-[10px]", "text-sm");
  const message =
    graceSeconds != null && graceName ? (
      <span className={cn("truncate font-bold text-amber-300", textSize)}>
        {t("reconnect.turn", { name: graceName, seconds: String(graceSeconds) })}
      </span>
    ) : isMyTurn ? (
      <>
        <span className={cn("shrink-0 rounded-full bg-yellow-400 px-2 py-0.5 font-bold text-yellow-950", textSize)}>{t("game.yourTurn")}</span>
        <span className={cn("truncate text-yellow-100", textSize)}>{myTurnHint(gameState, phase, isCompact, t)}</span>
      </>
    ) : (
      <span className={cn("truncate text-white/80", textSize)}>
        {t("game.turn")}: <strong className="text-white">{currentName}</strong>
      </span>
    );
  return (
    <div
      className={cn(
        "flex min-w-0 items-center rounded-full border border-yellow-500/40 bg-black/50",
        cx(isCompact, "gap-1.5 px-2 py-0.5", "gap-3 px-4 py-1")
      )}
    >
      <RoundStatus isCompact={isCompact} gameState={gameState} t={t} />
      <span className="h-4 w-px shrink-0 bg-white/20" />
      {message}
    </div>
  );
}

function ArcSeats({
  opponents,
  gameState,
  currentTurnPlayerId,
  revealed,
  activeEmotes,
  registerCardPosition,
  isCompact,
}: {
  opponents: Player[];
  gameState: GameState;
  currentTurnPlayerId: string | undefined;
  revealed: Record<string, Card>;
  activeEmotes: Record<string, string>;
  registerCardPosition: RegisterCard;
  isCompact: boolean;
}) {
  const seatPositions = getSeatPositions(opponents.length);
  return (
    <>
      {opponents.map((p, i) => (
        <ArcSeat
          key={p.id}
          player={p}
          index={i}
          opponents={opponents}
          seatPositions={seatPositions}
          gameState={gameState}
          currentTurnPlayerId={currentTurnPlayerId}
          revealed={revealed}
          emoteId={activeEmotes[p.id]}
          registerCardPosition={registerCardPosition}
          isCompact={isCompact}
        />
      ))}
    </>
  );
}

function ArcSeat({
  player,
  index,
  opponents,
  seatPositions,
  gameState,
  currentTurnPlayerId,
  revealed,
  emoteId,
  registerCardPosition,
  isCompact,
}: {
  player: Player;
  index: number;
  opponents: Player[];
  seatPositions: ReturnType<typeof getSeatPositions>;
  gameState: GameState;
  currentTurnPlayerId: string | undefined;
  revealed: Record<string, Card>;
  emoteId?: string;
  registerCardPosition: RegisterCard;
  isCompact: boolean;
}) {
  const pos = seatPositions[index] ?? seatPositions[seatPositions.length - 1];
  return (
    <PlayerSeat
      player={player}
      isActive={currentTurnPlayerId === player.id}
      showAllCards={!!gameState.winnerId}
      revealedCardKeys={Object.keys(revealed)}
      revealedCardsByKey={revealed}
      registerCardPosition={registerCardPosition}
      opponentCount={opponents.length}
      side={pos.side}
      compact={opponents.length >= 3 || isCompact}
      emoteId={emoteId}
      sealedCardIds={sealedIds(gameState)}
      className="absolute z-20"
      style={seatStyle(pos)}
    />
  );
}

function RowSeats(props: Omit<Parameters<typeof ArcSeats>[0], "isCompact">) {
  const { opponents, gameState, currentTurnPlayerId, revealed, activeEmotes, registerCardPosition } = props;
  return (
    <div className={cn("absolute top-0 left-0 right-0 flex justify-center items-start pt-2 px-1 z-20", rowGap(opponents.length))}>
      {opponents.map((p) => (
        <PlayerSeat
          key={p.id}
          player={p}
          isActive={currentTurnPlayerId === p.id}
          showAllCards={!!gameState.winnerId}
          revealedCardKeys={Object.keys(revealed)}
          revealedCardsByKey={revealed}
          registerCardPosition={registerCardPosition}
          opponentCount={opponents.length}
          side="top"
          compact
          emoteId={activeEmotes[p.id]}
          sealedCardIds={sealedIds(gameState)}
        />
      ))}
    </div>
  );
}

function sealedIds(gameState: GameState) {
  return gameState.sealedCards?.map((s) => s.cardId) ?? [];
}

function rowGap(count: number) {
  return count >= 4 ? "gap-1 flex-wrap" : "gap-2";
}

function FeltTable({
  isCompact,
  mat,
  useArcSeats,
  opponents,
  gameState,
  currentTurnPlayerId,
  revealed,
  activeEmotes,
  playerId,
  registerCardPosition,
  isMyTurn,
  phase,
  deckRef,
  discardRef,
  sendAction,
  onUseAbility,
  me,
}: {
  isCompact: boolean;
  mat: TableMatId;
  useArcSeats: boolean;
  opponents: Player[];
  gameState: GameState;
  currentTurnPlayerId: string | undefined;
  revealed: Record<string, Card>;
  activeEmotes: Record<string, string>;
  playerId: string;
  registerCardPosition: RegisterCard;
  isMyTurn: boolean;
  phase: string | undefined;
  deckRef: RefObject<HTMLDivElement>;
  discardRef: RefObject<HTMLDivElement>;
  sendAction: SendAction;
  onUseAbility: () => void;
  me: Player | undefined;
}) {
  const seats = { opponents, gameState, currentTurnPlayerId, revealed, activeEmotes, registerCardPosition };
  return (
    <div className={cn("flex-1 flex items-center justify-center relative min-h-0", cx(isCompact, "p-1", "p-3 md:p-4"))}>
      <div
        className={cn(
          "w-full relative felt-table shadow-2xl",
          `felt-${mat}`,
          cx(isCompact, "max-w-none h-full rounded-xl", "max-w-6xl max-h-full aspect-[16/9] rounded-[100px]"),
        )}
      >
        {useArcSeats ? <ArcSeats {...seats} isCompact={isCompact} /> : <RowSeats {...seats} />}
        <div className={cn("absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto", cx(isCompact, "top-[47%]", "top-1/2"))}>
          <CenterPile
            gameState={gameState}
            isMyTurn={isMyTurn}
            phase={phase}
            deckRef={deckRef}
            discardRef={discardRef}
            onDrawDeck={() => sendAction({ type: "draw_deck" })}
            onDiscardDrawn={() => sendAction({ type: "discard_drawn" })}
            onUseAbility={onUseAbility}
          />
        </div>
        {me ? (
          <MyArea emoteId={activeEmotes[playerId]} revealedCards={revealed} gameState={gameState} me={me} isMyTurn={isMyTurn} phase={phase} sendAction={sendAction} registerCardPosition={registerCardPosition} />
        ) : null}
      </div>
    </div>
  );
}

function RevealOverlay({
  revealed,
  isCompact,
  isOffline,
  t,
  onClose,
}: {
  revealed: NonNullable<RevealedCard>;
  isCompact: boolean;
  isOffline: boolean;
  t: Translate;
  onClose: () => void;
}) {
  // Landscape phones often have width > 768 (isMobile=false) but short height —
  // always size the overlay for the viewport when compact.
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-[max(0.5rem,env(safe-area-inset-top,0px))] pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
    >
      <button type="button" className="absolute inset-0 cursor-pointer border-0 bg-black/80 p-0 backdrop-blur-sm" onClick={onClose}>
        <span className="sr-only">{t("game.cardRevealed")}</span>
      </button>
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 20 }}
        className={cn(
          "relative z-10 bg-gradient-to-br from-indigo-900 to-purple-900 border-yellow-400 shadow-2xl flex flex-col items-center overflow-y-auto overscroll-contain",
          cx(
            isCompact,
            "mx-2 max-h-[min(92dvh,100%)] w-[min(92vw,22rem)] gap-2 rounded-2xl border-2 px-3 py-2.5",
            "max-w-md gap-6 rounded-3xl border-4 p-8",
          ),
        )}
      >
        <div className="text-center shrink-0">
          <h3 className={cn("font-bold text-yellow-400", cx(isCompact, "text-base mb-0.5", "text-2xl mb-2"))}>
            {t("game.cardRevealed")}
          </h3>
          <p className={cn("text-white/80", cx(isCompact, "text-xs", "text-base"))}>
            {t("game.playerHas").replace("{player}", revealed.playerName)}
          </p>
        </div>
        <div className="shrink-0">
          <PlayingCard
            card={revealed.card}
            hidden={false}
            animate={true}
            className={cx(isCompact, "w-20 h-[7.5rem]", "w-40 h-60")}
          />
        </div>
        <div className="text-center shrink-0">
          <p className={cn("text-white/60 font-mono", cx(isCompact, "text-[10px] leading-tight", "text-sm"))}>
            {t("game.visibleFor20s")}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ActiveTable(props: {
  isPortrait: boolean;
  isCompact: boolean;
  isMobile: boolean;
  isOffline: boolean;
  connected: boolean;
  roomCode: string;
  playerId: string;
  tableMat: TableMatId;
  gameState: GameState;
  me: Player | undefined;
  isMyTurn: boolean;
  phase: string | undefined;
  t: Translate;
  onExit: () => void;
  onCopyCode: () => void;
  onBackHome: () => void;
  currentAnimation: AnimationEvent | null;
  onAnimationComplete: () => void;
  opponentNotice: { playerName: string; actionType: OpponentActionType } | null;
  onNoticeDone: () => void;
  cunokuCaller: string | null;
  onCunokuCallDone: () => void;
  revealedCards: Record<string, Card>;
  registerCardPosition: RegisterCard;
  deckRef: RefObject<HTMLDivElement>;
  discardRef: RefObject<HTMLDivElement>;
  sendAction: SendAction;
  abilityOpen: boolean;
  onAbilityOpenChange: (open: boolean) => void;
  onConfirmAbility: (action: AbilityAction) => void;
  revealedOpponentCard: RevealedCard;
  onCloseReveal: () => void;
  gameOverOpen: boolean;
  onGameOverOpenChange: (open: boolean) => void;
  activeEmotes: Record<string, string>;
  onEmote: (emoteId: EmoteId) => void;
  matchReward: MatchReward | null;
  swapHighlights: Record<string, SwapHighlight>;
}) {
  const { gameState, isCompact, t } = props;
  const opponents = opponentsInTurnOrder(gameState.players, props.playerId);
  const graceSeconds = graceLeft(gameState.reconnectDeadline);
  const graceName = gameState.players.find((p) => p.id === gameState.reconnectPlayerId)?.name ?? "";
  const currentTurnPlayerId = gameState.players[gameState.currentPlayerIndex]?.id;
  return (
    <div className={cn("min-h-[100dvh] bg-neutral-900 text-white relative overflow-hidden flex flex-col pwa-safe game-landscape", props.cunokuCaller && "cunoku-shake")}>
      {props.isPortrait ? <LandscapePrompt /> : null}
      {props.cunokuCaller ? <CunokuCallOverlay playerName={props.cunokuCaller} onComplete={props.onCunokuCallDone} /> : null}
      <AnimationRenderer currentAnimation={props.currentAnimation} onComplete={props.onAnimationComplete} playerId={props.playerId} />
      {props.opponentNotice ? (
        <OpponentActionNotification playerName={props.opponentNotice.playerName} actionType={props.opponentNotice.actionType} onComplete={props.onNoticeDone} duration={2000} />
      ) : null}
      <GameTopBar
        isDaily={!!gameState.dailyDay}
        canEmote={!gameState.winnerId}
        onEmote={props.onEmote}
        isCompact={isCompact}
        isOffline={props.isOffline}
        connected={props.connected}
        roomCode={props.roomCode}
        onExit={props.onExit}
        onCopyCode={props.onCopyCode}
        status={<StatusLine isCompact={isCompact} gameState={gameState} graceSeconds={graceSeconds} graceName={graceName} isMyTurn={props.isMyTurn} phase={props.phase} t={t} />}
        t={t}
      />
      <SwapHighlightContext.Provider value={props.swapHighlights}>
      <FeltTable
        isCompact={isCompact}
        mat={props.tableMat}
        useArcSeats={!props.isPortrait}
        opponents={opponents}
        gameState={gameState}
        currentTurnPlayerId={currentTurnPlayerId}
        revealed={props.revealedCards}
        activeEmotes={props.activeEmotes}
        playerId={props.playerId}
        registerCardPosition={props.registerCardPosition}
        isMyTurn={props.isMyTurn}
        phase={props.phase}
        deckRef={props.deckRef}
        discardRef={props.discardRef}
        sendAction={props.sendAction}
        onUseAbility={() => props.onAbilityOpenChange(true)}
        me={props.me}
      />
      </SwapHighlightContext.Provider>
      <AbilityModal
        open={props.abilityOpen}
        onOpenChange={props.onAbilityOpenChange}
        drawnCard={gameState.drawnCard ?? null}
        players={gameState.players}
        playerId={props.playerId}
        myHand={props.me?.hand ?? []}
        sealedCardIds={sealedIds(gameState)}
        jokerRevealed={!!gameState.jokerRevealed}
        onConfirm={props.onConfirmAbility}
      />
      <AnimatePresence>
        {props.revealedOpponentCard ? (
          <RevealOverlay revealed={props.revealedOpponentCard} isCompact={props.isCompact} isOffline={props.isOffline} t={t} onClose={props.onCloseReveal} />
        ) : null}
      </AnimatePresence>
      {showTutorial(gameState) ? <GameTutorial /> : null}
      {gameState.winnerId ? (
        <GameOverModal
          open={props.gameOverOpen}
          onOpenChange={props.onGameOverOpenChange}
          players={gameState.players}
          winnerId={gameState.winnerId}
          localPlayerId={props.playerId}
          isOffline={props.isOffline}
          reward={props.matchReward}
          onBackHome={props.onBackHome}
        />
      ) : null}
    </div>
  );
}

function graceLeft(deadline: number | null | undefined) {
  if (deadline == null) return null;
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

function showTutorial(gameState: GameState) {
  return !gameState.winnerId && gameState.turnPhase !== "waiting";
}

function roomStillWaiting(gameState: GameState) {
  const fewPlayers = gameState.players.length < 2;
  const waiting = gameState.turnPhase === "waiting";
  return (fewPlayers || waiting) && !gameState.winnerId;
}

export function renderPregame(args: {
  playerId: string;
  isOffline: boolean;
  roomCode: string;
  t: Translate;
  isLoadingOffline: boolean;
  offlineHook: GameState | null;
  offlineSaved: GameState | null;
  onHome: () => void;
  gameState: GameState | null;
  fromQueue: boolean;
  queueCountdown: number | null;
  isHost: boolean;
  hostId: string | null;
  maxPlayers: number | null;
  onCopyCode: () => void;
  onShareInvite: () => void;
  onCopyLanUrl: () => void;
  networkMode: "lan" | "server";
  lanJoinUrl: string | null;
  onStart: () => void;
}) {
  if (!args.playerId || (!args.isOffline && !args.roomCode)) {
    return <div className="h-screen flex items-center justify-center">{args.t("game.invalidUrl")}</div>;
  }
  if (args.isOffline && (args.isLoadingOffline || !args.offlineHook)) {
    return <OfflineBoot isLoading={args.isLoadingOffline} hasSaved={!!args.offlineSaved} onHome={args.onHome} t={args.t} />;
  }
  if (!args.gameState || !roomStillWaiting(args.gameState)) return null;
  return (
    <WaitingRoom
      roomCode={args.roomCode}
      players={args.gameState.players}
      playerId={args.playerId}
      isHost={args.isHost}
      hostId={args.hostId}
      maxPlayers={args.maxPlayers}
      onCopyCode={args.onCopyCode}
      onShareInvite={args.onShareInvite}
      onCopyLanUrl={args.onCopyLanUrl}
      networkMode={args.networkMode}
      lanJoinUrl={args.lanJoinUrl}
      quickMatch={args.fromQueue}
      startCountdown={args.fromQueue ? args.queueCountdown : null}
      onStart={args.onStart}
    />
  );
}
