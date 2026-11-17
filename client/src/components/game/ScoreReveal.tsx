import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Player } from "@shared/schema";
import { PlayingCard } from "@/components/PlayingCard";
import { Avatar } from "@/components/Avatar";
import { useI18n } from "@/contexts/i18n-context";
import { cn } from "@/lib/utils";
import { audioManager } from "@/utils/audioManager";
import type { ProfileAccent, ProfileIconId } from "@/lib/playerProfile";

/** Pausa entre uma carta e outra: rápido o bastante para não cansar, lento para dar suspense. */
export const REVEAL_STEP_MS = 380;

/** Ordem de revelação: jogador por jogador, carta por carta (quem tem mais pontos primeiro). */
export function revealOrder(players: Pick<Player, "id" | "hand" | "score">[]): { playerId: string; cardIndex: number }[] {
  return [...players]
    .sort((a, b) => b.score - a.score)
    .flatMap((p) => p.hand.map((_, cardIndex) => ({ playerId: p.id, cardIndex })));
}

/** Acima de 4 cartas a fileira não cabe lado a lado no painel. */
function crowded(handSize: number) {
  return handSize > 4;
}

/** Soma das cartas já viradas; com tudo virado, vale o placar oficial. */
export function runningTotal(player: Pick<Player, "hand" | "score">, revealedCount: number): number {
  if (revealedCount >= player.hand.length) return player.score;
  return player.hand.slice(0, revealedCount).reduce((sum, card) => sum + (card.isHidden ? 0 : card.value), 0);
}

/**
 * Resumo do fim da partida: abre a mão de cada um, uma carta por vez, com a soma subindo.
 * Ensina a pontuação sem texto: dá para ver qual carta pesou.
 */
export function ScoreReveal({
  players,
  winnerId,
  localPlayerId,
  localProfile,
  compact,
}: {
  players: Player[];
  winnerId: string;
  localPlayerId?: string;
  localProfile: { iconId?: string; accent?: string };
  compact: boolean;
}) {
  const { t } = useI18n();
  const order = useMemo(() => revealOrder(players), [players]);
  const [step, setStep] = useState(0);
  const done = step >= order.length;

  useEffect(() => {
    if (done) return;
    const timer = setTimeout(() => {
      const next = order[step];
      const player = players.find((p) => p.id === next.playerId);
      if (player) audioManager.playScoreTick(runningTotal(player, next.cardIndex + 1));
      setStep((s) => s + 1);
    }, step === 0 ? 500 : REVEAL_STEP_MS);
    return () => clearTimeout(timer);
  }, [step, done, order, players]);

  const revealedFor = (playerId: string) => order.slice(0, step).filter((o) => o.playerId === playerId).length;
  const ranked = [...players].sort((a, b) => a.score - b.score);

  return (
    <div className={cn(compact ? "space-y-1 py-1" : "space-y-2 py-4")}>
      {ranked.map((p, i) => {
        const shown = revealedFor(p.id);
        const finished = shown >= p.hand.length;
        const isWinner = done && p.id === winnerId;
        const isMe = p.id === localPlayerId;
        return (
          <motion.div
            key={p.id}
            layout
            className={cn(
              // Se ainda faltar espaço (tela estreita), cartas e pontos descem para a linha de baixo
              "flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg transition-colors",
              compact ? "px-2 py-1" : "p-2.5",
              isWinner ? "bg-amber-50 ring-2 ring-amber-400" : "bg-gray-50",
            )}
          >
            {/* Base pequena: o nome encolhe (reticências) antes de a linha quebrar */}
            <div className="flex min-w-0 flex-1 basis-24 items-center gap-2">
              <span className="w-6 shrink-0 font-bold text-gray-400">{done ? `#${i + 1}` : ""}</span>
              <Avatar
                name={p.name}
                isBot={p.isBot}
                compact
                hideLabel
                className="shrink-0"
                iconId={(isMe ? localProfile.iconId : p.iconId) as ProfileIconId | undefined}
                accent={(isMe ? localProfile.accent : p.accent) as ProfileAccent | undefined}
              />
              <span className="truncate font-bold text-gray-900">{p.name}</span>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <div className={cn("flex", crowded(p.hand.length) ? "" : "gap-0.5")}>
                {p.hand.map((card, ci) => (
                  // Mão grande: as cartas se sobrepõem, deixando o canto com o valor à mostra
                  <div key={card.id || ci} className={cn(ci > 0 && crowded(p.hand.length) && (compact ? "-ml-3" : "-ml-3.5"))}>
                    <PlayingCard
                      card={card}
                      hidden={ci >= shown}
                      animate={false}
                      className={cn("rounded-md border", compact ? "h-10 w-7 p-0 [&>div]:p-0.5 [&_span]:text-[10px]" : "h-[3.25rem] w-9 [&>div]:p-1 [&_span]:text-sm")}
                    />
                  </div>
                ))}
              </div>
              <motion.span
                key={`${p.id}-${shown}`}
                initial={{ scale: shown > 0 ? 1.35 : 1 }}
                animate={{ scale: 1 }}
                className={cn(
                  "min-w-[3.5rem] text-right font-mono font-bold tabular-nums",
                  compact ? "text-base" : "text-xl",
                  finished ? "text-gray-900" : "text-gray-500",
                )}
              >
                {runningTotal(p, shown)} <span className="text-xs font-normal">{t("game.points")}</span>
              </motion.span>
            </div>
          </motion.div>
        );
      })}
      {!done && (
        <button type="button" onClick={() => setStep(order.length)} className="w-full text-center text-xs font-semibold text-indigo-700 underline">
          {t("summary.skip")}
        </button>
      )}
    </div>
  );
}
