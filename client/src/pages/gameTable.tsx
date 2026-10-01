import { RefObject } from "react";
import { GameState, Card, Player, GameAction } from "@shared/schema";
import { PlayingCard } from "@/components/PlayingCard";
import { Button } from "@/components/Button";
import { motion, AnimatePresence } from "framer-motion";
import { AnimationRenderer, OpponentActionNotification, OpponentActionType } from "@/components/animations";
import { ArrowLeft, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { VolumeControl } from "@/components/VolumeControl";
import { TableThemeButton } from "@/components/TableThemePicker";
import { PlayerSeat } from "@/components/game/PlayerSeat";
import { CenterPile } from "@/components/game/CenterPile";
import { MyArea } from "@/components/game/MyArea";
import { GameOverModal } from "@/components/game/GameOverModal";
import { AbilityModal } from "@/components/game/AbilityModal";
import { AbilityAction, hasSpecialAbility, getAbilityDescription } from "@/components/game/helpers";
import { getSeatPositions } from "@/components/game/seatPositions";
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
  onExit,
  onCopyCode,
  t,
}: {
  isCompact: boolean;
  isOffline: boolean;
  connected: boolean;
  roomCode: string;
  onExit: () => void;
  onCopyCode: () => void;
  t: Translate;
}) {
  return (
    <div
      className={cn(
        "absolute top-0 left-0 right-0 z-50 pointer-events-none flex justify-between items-start",
        cx(isCompact, "p-1.5 gap-1", "p-4"),
      )}
    >
      <div className="flex items-center gap-1.5 pointer-events-auto">
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
        {isOffline || connected ? null : <ReconnectBanner t={t} />}
      </div>
      <button
        type="button"
        className={cn(
          "bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex flex-col items-center pointer-events-auto cursor-pointer",
          cx(isCompact, "px-2.5 py-1", "px-6 py-2"),
        )}
        onClick={onCopyCode}
      >
        <div className={cn("text-white/60 font-mono", cx(isCompact, "text-[8px] leading-tight", "text-xs"))}>
          {t("game.roomCode")}
        </div>
        <div className={cn("font-bold tracking-widest font-mono flex items-center gap-1", cx(isCompact, "text-[11px]", "text-xl"))}>
          {roomCode} <Copy className={cn(cx(isCompact, "w-2.5 h-2.5", "w-3 h-3"))} />
        </div>
      </button>
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

function GraceBanner({ isCompact, text }: { isCompact: boolean; text: string }) {
  return (
    <div className={cn("absolute z-40 pointer-events-none left-1/2 -translate-x-1/2", cx(isCompact, "top-8 max-w-[min(92vw,22rem)]", "top-20 max-w-xl"))}>
      <div className="rounded-full border-2 border-amber-300 bg-amber-500/95 px-4 py-2 text-center text-amber-950 shadow-xl">
        <span className={cn("font-bold", cx(isCompact, "text-[10px]", "text-sm"))}>{text}</span>
      </div>
    </div>
  );
}

function PhaseHint({ isCompact, phase, t }: { isCompact: boolean; phase: string | undefined; t: Translate }) {
  if (phase !== "draw" && phase !== "action") return null;
  const short = phase === "draw" ? t("game.drawFromDeckShort") : t("game.replaceOrDiscardShort");
  const full = phase === "draw" ? t("game.drawFromDeck") : t("game.replaceOrDiscard");
  return (
    <span className={cn("text-yellow-100 text-center", cx(isCompact, "text-[9px] truncate", "text-sm"))}>
      {cx(isCompact, short, full)}
    </span>
  );
}

function YourTurnBanner({ isCompact, phase, t }: { isCompact: boolean; phase: string | undefined; t: Translate }) {
  return (
    <div className={cn("absolute z-40 pointer-events-none left-1/2 -translate-x-1/2", cx(isCompact, "top-8 max-w-[min(58vw,16rem)]", "top-20"))}>
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className={cn(
          "bg-gradient-to-r from-yellow-500/90 to-yellow-600/90 backdrop-blur-md rounded-full border-2 border-yellow-400 shadow-xl flex items-center justify-center",
          cx(isCompact, "px-3 py-1 gap-1.5", "px-8 py-3 gap-4"),
        )}
      >
        <span className={cn("text-yellow-900 font-bold whitespace-nowrap", cx(isCompact, "text-[10px]", "text-lg"))}>
          {t("game.yourTurn")}
        </span>
        <PhaseHint isCompact={isCompact} phase={phase} t={t} />
      </motion.div>
    </div>
  );
}

function TurnBanner({
  isCompact,
  graceSeconds,
  graceName,
  isMyTurn,
  phase,
  t,
}: {
  isCompact: boolean;
  graceSeconds: number | null;
  graceName: string;
  isMyTurn: boolean;
  phase: string | undefined;
  t: Translate;
}) {
  if (graceSeconds != null && graceName) {
    return <GraceBanner isCompact={isCompact} text={t("reconnect.turn", { name: graceName, seconds: String(graceSeconds) })} />;
  }
  if (!isMyTurn) return null;
  return <YourTurnBanner isCompact={isCompact} phase={phase} t={t} />;
}

function RoundDetail({ gameState, t }: { gameState: GameState; t: Translate }) {
  if (gameState.round < 5) return <div className="text-white/80 text-xs">{t("game.cunokuAfterRound5")}</div>;
  const name = gameState.players[gameState.currentPlayerIndex]?.name || "Unknown";
  return (
    <div className="text-white/80 text-xs">
      {t("game.turn")}: {name}
    </div>
  );
}

function RoundBadge({ isCompact, gameState, t }: { isCompact: boolean; gameState: GameState; t: Translate }) {
  return (
    <div className={cn("absolute z-40 pointer-events-none", cx(isCompact, "top-9 left-1.5", "top-20 left-8"))}>
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={cn("bg-black/60 backdrop-blur-md rounded-lg border border-yellow-500/50 shadow-lg", cx(isCompact, "px-2 py-1", "px-6 py-3 border-2 rounded-xl"))}
      >
        <div className="text-center">
          <div className={cn("font-bold text-yellow-400", cx(isCompact, "text-[10px] leading-tight", "text-lg mb-1"))}>
            {t("game.round")} {gameState.round}
            {roundSuffix(gameState.round)}
          </div>
          {desktopRoundDetail(isCompact, gameState, t)}
        </div>
      </motion.div>
    </div>
  );
}

function roundSuffix(round: number) {
  return round < 5 ? "/5" : "";
}

function desktopRoundDetail(isCompact: boolean, gameState: GameState, t: Translate) {
  if (isCompact) return null;
  return <RoundDetail gameState={gameState} t={t} />;
}

function abilityHintVisible(isMyTurn: boolean, phase: string | undefined, card: Card | null, fromDiscard: boolean, isCompact: boolean) {
  if (!isMyTurn || phase !== "action" || !card || fromDiscard || isCompact) return false;
  return hasSpecialAbility(card);
}

function AbilityHint({ card, t }: { card: Card; t: Translate }) {
  return (
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
            <div className="text-yellow-950 font-semibold text-base leading-tight">{getAbilityDescription(card.rank, t)}</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-yellow-400/30">
          <div className="text-yellow-900 text-xs font-medium">{t("game.abilityClickToUse")}</div>
        </div>
      </motion.div>
    </div>
  );
}

function ReplaceHint({ t }: { t: Translate }) {
  return (
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
  );
}

function SideHints({
  isMyTurn,
  phase,
  card,
  fromDiscard,
  isCompact,
  t,
}: {
  isMyTurn: boolean;
  phase: string | undefined;
  card: Card | null;
  fromDiscard: boolean;
  isCompact: boolean;
  t: Translate;
}) {
  return (
    <>
      {abilityHintVisible(isMyTurn, phase, card, fromDiscard, isCompact) ? <AbilityHint card={card as Card} t={t} /> : null}
      {replaceHintVisible(isMyTurn, phase, card, isCompact) ? <ReplaceHint t={t} /> : null}
    </>
  );
}

function replaceHintVisible(isMyTurn: boolean, phase: string | undefined, card: Card | null, isCompact: boolean) {
  if (!isMyTurn || phase !== "action" || !card || isCompact) return false;
  return true;
}

function ArcSeats({
  opponents,
  gameState,
  currentTurnPlayerId,
  revealed,
  registerCardPosition,
  isCompact,
}: {
  opponents: Player[];
  gameState: GameState;
  currentTurnPlayerId: string | undefined;
  revealed: Record<string, Card>;
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
      className="absolute z-20"
      style={{ left: `${pos.left}%`, top: `${pos.top}%`, transform: "translate(-50%, -50%)" }}
    />
  );
}

function RowSeats(props: Omit<Parameters<typeof ArcSeats>[0], "isCompact">) {
  const { opponents, gameState, currentTurnPlayerId, revealed, registerCardPosition } = props;
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
        />
      ))}
    </div>
  );
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
  registerCardPosition: RegisterCard;
  isMyTurn: boolean;
  phase: string | undefined;
  deckRef: RefObject<HTMLDivElement>;
  discardRef: RefObject<HTMLDivElement>;
  sendAction: SendAction;
  onUseAbility: () => void;
  me: Player | undefined;
}) {
  const seats = { opponents, gameState, currentTurnPlayerId, revealed, registerCardPosition };
  return (
    <div className={cn("flex-1 flex items-center justify-center relative min-h-0", cx(isCompact, "p-1", "p-4 md:p-6"))}>
      <div
        className={cn(
          "w-full relative felt-table shadow-2xl",
          `felt-${mat}`,
          cx(isCompact, "max-w-none max-h-[calc(100dvh-0.5rem)] h-[calc(100dvh-0.5rem)] aspect-auto rounded-xl", "max-w-6xl max-h-[min(100%,calc(100dvh-1rem))] aspect-[16/9] rounded-[100px]"),
        )}
      >
        {useArcSeats ? <ArcSeats {...seats} isCompact={isCompact} /> : <RowSeats {...seats} />}
        <div className={cn("absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto", cx(isCompact, "top-[44%]", "top-[48%]"))}>
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
          <MyArea gameState={gameState} me={me} isMyTurn={isMyTurn} phase={phase} sendAction={sendAction} registerCardPosition={registerCardPosition} />
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
}) {
  const { gameState, isCompact, t } = props;
  const opponents = gameState.players.filter((p) => p.id !== props.playerId);
  const graceSeconds = graceLeft(gameState.reconnectDeadline);
  const graceName = gameState.players.find((p) => p.id === gameState.reconnectPlayerId)?.name ?? "";
  const currentTurnPlayerId = gameState.players[gameState.currentPlayerIndex]?.id;
  return (
    <div className="min-h-[100dvh] bg-neutral-900 text-white relative overflow-hidden flex flex-col pwa-safe game-landscape">
      {props.isPortrait ? <LandscapePrompt /> : null}
      <AnimationRenderer currentAnimation={props.currentAnimation} onComplete={props.onAnimationComplete} playerId={props.playerId} />
      {props.opponentNotice ? (
        <OpponentActionNotification playerName={props.opponentNotice.playerName} actionType={props.opponentNotice.actionType} onComplete={props.onNoticeDone} duration={2000} />
      ) : null}
      <GameTopBar isCompact={isCompact} isOffline={props.isOffline} connected={props.connected} roomCode={props.roomCode} onExit={props.onExit} onCopyCode={props.onCopyCode} t={t} />
      <TurnBanner isCompact={isCompact} graceSeconds={graceSeconds} graceName={graceName} isMyTurn={props.isMyTurn} phase={props.phase} t={t} />
      <RoundBadge isCompact={isCompact} gameState={gameState} t={t} />
      <SideHints isMyTurn={props.isMyTurn} phase={props.phase} card={gameState.drawnCard} fromDiscard={gameState.drawnFromDiscard} isCompact={isCompact} t={t} />
      <FeltTable
        isCompact={isCompact}
        mat={props.tableMat}
        useArcSeats={!props.isPortrait}
        opponents={opponents}
        gameState={gameState}
        currentTurnPlayerId={currentTurnPlayerId}
        revealed={props.revealedCards}
        registerCardPosition={props.registerCardPosition}
        isMyTurn={props.isMyTurn}
        phase={props.phase}
        deckRef={props.deckRef}
        discardRef={props.discardRef}
        sendAction={props.sendAction}
        onUseAbility={() => props.onAbilityOpenChange(true)}
        me={props.me}
      />
      <AbilityModal
        open={props.abilityOpen}
        onOpenChange={props.onAbilityOpenChange}
        drawnCard={gameState.drawnCard ?? null}
        players={gameState.players}
        playerId={props.playerId}
        myHand={props.me?.hand ?? []}
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
