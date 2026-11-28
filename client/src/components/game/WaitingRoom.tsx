import { useEffect, useRef, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Player } from "@shared/schema";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { VolumeControl } from "@/components/VolumeControl";
import { TableThemeButton } from "@/components/TableThemePicker";
import { cn, fit } from "@/lib/utils";
import { Copy, Link2, MessageCircle, Wifi } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";
import { useIsCompactGame, useIsPortrait } from "@/hooks/use-landscape";
import { loadProfile, type ProfileAccent, type ProfileIconId } from "@/lib/playerProfile";
import { loadTableTheme, subscribeTableTheme } from "@/lib/tableTheme";
import { audioManager } from "@/utils/audioManager";
import { emptySeatCount } from "./helpers";
import { FriendsInvite } from "./FriendsInvite";

interface WaitingRoomProps {
  roomCode: string;
  players: Player[];
  playerId: string;
  isHost: boolean;
  /** Dono da sala, para marcar o assento dele; ausente em mesas sem host conhecido. */
  hostId?: string | null;
  /** Limite da sala; define quantos assentos vazios aparecem. */
  maxPlayers?: number | null;
  onCopyCode: () => void;
  onShareInvite?: () => void;
  /** Copia o convite já formatado para colar num canal do Discord */
  onCopyDiscordInvite?: () => void;
  /** Convida um amigo ou jogador recente pelo nome */
  onInviteFriend?: (name: string) => void;
  onCopyLanUrl?: () => void;
  onStart: () => void;
  networkMode?: "lan" | "server";
  lanJoinUrl?: string | null;
  /** Mesa montada pela fila rápida: sem código nem convite. */
  quickMatch?: boolean;
  /** Segundos até a partida rápida começar. null fora desse countdown. */
  startCountdown?: number | null;
}

function SeatTag({ children, tone }: { children: React.ReactNode; tone: "you" | "host" }) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
        tone === "you" ? "bg-white/20 text-white" : "bg-amber-300 text-amber-950"
      )}
    >
      {children}
    </span>
  );
}

function EmptySeat({ compact, label }: { compact: boolean; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 rounded-2xl p-2">
      <div
        className={cn(
          "rounded-full border-2 border-dashed border-white/30 motion-safe:animate-pulse",
          fit(compact, "h-10 w-10", "h-16 w-16")
        )}
      />
      <div className="w-full truncate text-center text-xs text-white/50">{label}</div>
    </div>
  );
}

type InviteOptionsProps = Pick<
  WaitingRoomProps,
  "roomCode" | "players" | "lanJoinUrl" | "onCopyCode" | "onShareInvite" | "onCopyDiscordInvite" | "onInviteFriend" | "onCopyLanUrl"
> & { isLan: boolean; isLandscape: boolean };

/** Código da sala e as formas de chamar gente (link, Discord, amigos, rede local). */
function InviteOptions({
  roomCode,
  players,
  isLan,
  isLandscape,
  lanJoinUrl,
  onCopyCode,
  onShareInvite,
  onCopyDiscordInvite,
  onInviteFriend,
  onCopyLanUrl,
}: InviteOptionsProps) {
  const { t } = useI18n();
  return (
    <>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-[#d4af37]/60 bg-black/30 text-left transition-colors hover:bg-black/50",
          fit(isLandscape, "p-2 mb-2", "p-4 mb-3")
        )}
        onClick={onCopyCode}
      >
        <div
          className={cn(
            "flex-1 pl-6 text-center font-mono font-bold tracking-[0.35em] text-amber-200",
            fit(isLandscape, "text-2xl", "text-4xl")
          )}
        >
          {roomCode}
        </div>
        <Copy className="h-5 w-5 shrink-0 text-amber-100/70" />
      </button>

      {onShareInvite && (
        <Button
          variant="outline"
          className={cn(
            "w-full border-[#d4af37]/60 text-amber-100 hover:bg-white/10",
            fit(isLandscape, "mb-0 h-9 text-sm", "mb-4")
          )}
          onClick={onShareInvite}
        >
          <Link2 className="mr-2 h-4 w-4" /> {t("invite.share")}
        </Button>
      )}

      {/* Link da LAN só funciona na mesma Wi-Fi: não faz sentido mandar no Discord */}
      {onCopyDiscordInvite && !isLan && (
        <Button
          variant="outline"
          className={cn(
            "w-full border-[#5865f2]/70 text-indigo-100 hover:bg-[#5865f2]/20",
            fit(isLandscape, "mb-0 mt-1 h-9 text-sm", "-mt-2 mb-4")
          )}
          onClick={onCopyDiscordInvite}
        >
          <MessageCircle className="mr-2 h-4 w-4" /> {t("invite.discord")}
        </Button>
      )}

      {onInviteFriend && (
        <FriendsInvite inRoom={players.map((p) => p.name)} compact={isLandscape} onInvite={onInviteFriend} />
      )}

      {isLan && lanJoinUrl && (
        <div className={cn("rounded-xl border border-white/20 bg-black/30", fit(isLandscape, "mt-2 p-2", "mb-4 p-3"))}>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-100">
            <Wifi className="h-4 w-4" />
            {t("waiting.lanUrl")}
          </div>
          <button
            type="button"
            className="w-full break-all text-left font-mono text-xs text-white/90 hover:underline"
            onClick={onCopyLanUrl}
          >
            {lanJoinUrl}
          </button>
          {!isLandscape && <p className="mt-2 text-xs text-white/60">{t("waiting.lanHint")}</p>}
        </div>
      )}
    </>
  );
}

function SeatCard({ player, isMe, isHost, compact }: { player: Player; isMe: boolean; isHost: boolean; compact: boolean }) {
  const { t } = useI18n();
  // O próprio jogador usa o visual salvo aqui; os outros, o que veio do servidor
  const profile = isMe ? loadProfile() : null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 20 }}
      className={cn("flex min-w-0 flex-col items-center gap-1 rounded-2xl p-2", isMe && "bg-white/10 ring-1 ring-amber-300/60")}
    >
      <Avatar
        name={player.name}
        compact={compact}
        hideLabel
        iconId={profile?.iconId ?? (player.iconId as ProfileIconId | undefined)}
        accent={profile?.accent ?? (player.accent as ProfileAccent | undefined)}
      />
      <div className="w-full truncate text-center text-sm font-bold">{player.name}</div>
      <div className="flex min-h-[1rem] flex-wrap justify-center gap-1">
        {isMe && <SeatTag tone="you">{t("waiting.you")}</SeatTag>}
        {isHost && <SeatTag tone="host">{t("waiting.host")}</SeatTag>}
      </div>
    </motion.div>
  );
}

function waitingHint(canStart: boolean, quickMatch: boolean): { title: string; desc: string } {
  if (canStart) return { title: "waiting.waitHost", desc: "waiting.waitHostDesc" };
  return { title: "waiting.needPlayers", desc: quickMatch ? "queue.waitingPlayersDesc" : "waiting.needPlayersDesc" };
}

/** Contagem da partida rápida, botão de começar (host) ou aviso de espera. */
function StartArea({
  canStart,
  startCountdown,
  isHost,
  quickMatch,
  compact,
  playerCount,
  onStart,
}: {
  canStart: boolean;
  startCountdown: number | null;
  isHost: boolean;
  quickMatch: boolean;
  compact: boolean;
  playerCount: number;
  onStart: () => void;
}) {
  const { t } = useI18n();
  if (canStart && startCountdown != null) {
    return (
      <motion.div
        key={startCountdown}
        initial={{ scale: 1.4, opacity: 0.4 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn("text-center font-display font-bold text-amber-200", fit(compact, "text-2xl", "text-4xl"))}
      >
        {t("queue.countdown", { seconds: String(Math.max(startCountdown, 1)) })}
      </motion.div>
    );
  }
  if (isHost && (canStart || !quickMatch)) {
    return (
      <Button
        variant="primary"
        size="lg"
        disabled={!canStart}
        className={cn("w-full font-bold", canStart && "ring-2 ring-amber-300/70", fit(compact, "text-sm py-3 h-auto", "text-lg py-6"))}
        onClick={onStart}
      >
        {canStart ? `${t("waiting.startGame")} (${playerCount})` : t("waiting.missingPlayer")}
      </Button>
    );
  }
  const hint = waitingHint(canStart, quickMatch);
  return (
    <div className="rounded-xl bg-white/10 p-2 text-center sm:p-3">
      <div className="font-semibold text-amber-100">{t(hint.title)}</div>
      <div className="mt-0.5 text-sm text-white/60">{t(hint.desc)}</div>
    </div>
  );
}

function subtitleKey(quickMatch: boolean, isLan: boolean): string {
  if (quickMatch) return "queue.matchedDesc";
  return isLan ? "waiting.shareLan" : "waiting.shareCode";
}


export function WaitingRoom({
  roomCode,
  players,
  playerId,
  isHost,
  hostId,
  maxPlayers,
  onCopyCode,
  onShareInvite,
  onCopyDiscordInvite,
  onInviteFriend,
  onCopyLanUrl,
  onStart,
  networkMode = "server",
  lanJoinUrl,
  quickMatch = false,
  startCountdown = null,
}: WaitingRoomProps) {
  const { t } = useI18n();
  const canStart = players.length >= 2;
  const isLan = networkMode === "lan";
  const isPortrait = useIsPortrait();
  const isCompactGame = useIsCompactGame();
  const isLandscape = isCompactGame && !isPortrait;
  const { mat } = useSyncExternalStore(subscribeTableTheme, loadTableTheme, loadTableTheme);
  const emptySeats = emptySeatCount(players.length, maxPlayers);
  const manySeats = players.length + emptySeats > 4;

  const previousCount = useRef(players.length);
  useEffect(() => {
    if (players.length > previousCount.current) audioManager.playCardSlide();
    previousCount.current = players.length;
  }, [players.length]);

  return (
    <div
      className={cn(
        `felt-${mat}`,
        "flex items-center justify-center relative",
        fit(isLandscape, "h-[100dvh] min-h-0 p-2 overflow-hidden", "min-h-[100dvh] p-4 sm:p-8")
      )}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle, transparent 30%, rgba(0,0,0,0.6) 100%)" }}
      />

      <div className={cn("absolute z-20", fit(isLandscape, "top-2 right-2", "top-4 right-4"))}>
        <div
          className={cn(
            "flex items-center [&_button]:bg-white/90 [&_button]:text-indigo-900 [&_button]:border-indigo-200 [&_button]:hover:bg-white [&_button]:shadow-md",
            fit(isLandscape, "gap-1.5 [&_button]:h-8 [&_button]:w-8 [&_button]:p-0", "gap-2")
          )}
        >
          <VolumeControl />
          <TableThemeButton />
        </div>
      </div>

      <div
        className={cn(
          "relative w-full rounded-3xl border border-[#d4af37]/40 bg-black/55 text-white shadow-2xl backdrop-blur-md",
          fit(isLandscape, "max-w-3xl max-h-[min(94dvh,28rem)] overflow-y-auto p-4 grid grid-cols-2 gap-4", "max-w-lg p-6 sm:p-8")
        )}
      >
        <div className="min-w-0">
          <div className={cn("text-center", fit(isLandscape, "mb-3", "mb-6"))}>
            <h2 className={cn("font-display font-bold text-amber-100", fit(isLandscape, "text-xl", "text-3xl"))}>
              {quickMatch ? t("queue.matched") : t("waiting.title")}
            </h2>
            <p className={cn("text-white/60", fit(isLandscape, "mt-1 text-xs", "mt-2 text-sm"))}>
              {t(subtitleKey(quickMatch, isLan))}
            </p>
          </div>

          {!quickMatch && (
            <InviteOptions
              roomCode={roomCode}
              players={players}
              isLan={isLan}
              isLandscape={isLandscape}
              lanJoinUrl={lanJoinUrl}
              onCopyCode={onCopyCode}
              onShareInvite={onShareInvite}
              onCopyDiscordInvite={onCopyDiscordInvite}
              onInviteFriend={onInviteFriend}
              onCopyLanUrl={onCopyLanUrl}
            />
          )}
        </div>

        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-white/60">
            {t("waiting.players")} ({players.length}
            {emptySeats > 0 ? `/${players.length + emptySeats}` : ""})
          </h3>
          <div
            className={cn(
              "grid gap-1",
              fit(
                isLandscape,
                manySeats ? "grid-cols-3" : "grid-cols-4",
                manySeats ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"
              )
            )}
          >
            {players.map((p) => (
              <SeatCard key={p.id} player={p} isMe={p.id === playerId} isHost={p.id === hostId} compact={isLandscape} />
            ))}
            {Array.from({ length: emptySeats }, (_, i) => (
              <EmptySeat key={i} compact={isLandscape} label={t("waiting.emptySeat")} />
            ))}
          </div>

          <div className={fit(isLandscape, "mt-2", "mt-5")}>
            <StartArea
              canStart={canStart}
              startCountdown={startCountdown}
              isHost={isHost}
              quickMatch={quickMatch}
              compact={isLandscape}
              playerCount={players.length}
              onStart={onStart}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
