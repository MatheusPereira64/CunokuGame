import { useEffect, useLayoutEffect, useState } from "react";
import type { Card, Player } from "@shared/schema";
import { cn, fit } from "@/lib/utils";
import { useIsCompactGame } from "@/hooks/use-landscape";
import { useI18n } from "@/contexts/i18n-context";
import type { AbilityAction } from "./helpers";
import {
  abilityTargeting,
  buildAbilityAction,
  canPickCard,
  canPickPlayer,
  targetingPrompt,
  togglePick,
  type TargetPick,
} from "./targetingRules";

interface AbilityTargetingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drawnCard: Card | null;
  players: Player[];
  playerId: string;
  sealedCardIds?: string[];
  jokerRevealed?: boolean;
  onConfirm: (action: AbilityAction) => void;
}

type Box = { left: number; top: number; width: number; height: number };
type HitTarget = { key: string; pick: TargetPick; box: Box };

/** Área mínima de toque: as cartas dos assentos no celular são menores que um polegar. */
const MIN_TOUCH = 44;

function boxOf(el: Element | null): Box | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function union(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  const left = Math.min(...boxes.map((b) => b.left));
  const top = Math.min(...boxes.map((b) => b.top));
  const right = Math.max(...boxes.map((b) => b.left + b.width));
  const bottom = Math.max(...boxes.map((b) => b.top + b.height));
  return { left, top, width: right - left, height: bottom - top };
}

/** Só cresce na vertical: na horizontal as cartas vizinhas encostam e o toque cairia na errada. */
function touchBox(box: Box): Box {
  const extra = Math.max(0, MIN_TOUCH - box.height) / 2;
  return { ...box, top: box.top - extra, height: box.height + extra * 2 };
}

/**
 * Escolha do alvo do poder direto na mesa: o que dá para tocar brilha, o resto escurece,
 * e os botões ficam no canto, ao alcance do polegar. Nada precisa de rolagem.
 */
export function AbilityTargeting({
  open,
  onOpenChange,
  drawnCard,
  players,
  playerId,
  sealedCardIds = [],
  jokerRevealed = false,
  onConfirm,
}: AbilityTargetingProps) {
  const isCompact = useIsCompactGame();
  const { t } = useI18n();
  const [picks, setPicks] = useState<TargetPick[]>([]);
  const [targets, setTargets] = useState<HitTarget[]>([]);
  const spec = abilityTargeting(drawnCard?.rank, jokerRevealed);

  useEffect(() => {
    if (!open) setPicks([]);
  }, [open]);

  // Mede a mesa de verdade: as mãos se abrem ao entrar no modo de escolha, então mede de novo depois
  useLayoutEffect(() => {
    if (!open || !spec || spec.pick === "none") {
      setTargets([]);
      return;
    }
    const measure = () => {
      const found: HitTarget[] = [];
      for (const p of players) {
        if (!canPickPlayer(spec, p.id, playerId)) continue;
        const cardBoxes = p.hand.map((_, i) => boxOf(document.querySelector(`[data-card-target="${p.id}:${i}"]`)));
        if (spec.pick === "player") {
          const avatar = boxOf(document.querySelector(`[data-player-target="${p.id}"]`));
          const whole = union([avatar, ...cardBoxes].filter((b): b is Box => !!b));
          if (whole) found.push({ key: p.id, pick: { playerId: p.id }, box: whole });
          continue;
        }
        p.hand.forEach((card, i) => {
          const box = cardBoxes[i];
          const pick = { playerId: p.id, cardIndex: i };
          if (box && canPickCard(spec, [], pick, playerId, sealedCardIds.includes(card.id))) {
            found.push({ key: `${p.id}:${i}`, pick, box: touchBox(box) });
          }
        });
      }
      setTargets(found);
    };
    let frame = requestAnimationFrame(() => (frame = requestAnimationFrame(measure)));
    const settle = window.setTimeout(measure, 320);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener("resize", measure);
    };
  }, [open, spec?.pick, spec?.who, players, playerId, sealedCardIds]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open || !drawnCard || !spec) return null;

  const action = buildAbilityAction(drawnCard.rank, jokerRevealed, picks, playerId);
  const ready = action !== null && (spec.pick === "none" || picks.length === spec.slots);
  const isPicked = (pick: TargetPick) => picks.some((p) => p.playerId === pick.playerId && p.cardIndex === pick.cardIndex);
  const pickable = (target: HitTarget) =>
    spec.pick === "player" ||
    canPickCard(spec, picks, target.pick as Required<TargetPick>, playerId, false);

  const confirm = () => {
    if (!ready || !action) return;
    onOpenChange(false);
    onConfirm(action);
  };
  const back = () => (picks.length > 0 && spec.slots === 2 ? setPicks(picks.slice(0, -1)) : onOpenChange(false));

  // Na troca, a seta aparece assim que as duas cartas estão escolhidas
  const pickedBoxes = picks
    .map((p) => targets.find((target) => target.pick.playerId === p.playerId && target.pick.cardIndex === p.cardIndex)?.box)
    .filter((b): b is Box => !!b);
  const center = (b: Box) => ({ x: b.left + b.width / 2, y: b.top + b.height / 2 });

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={t(targetingPrompt(spec, picks))}>
      <div className="absolute inset-0 bg-black/55" />

      {targets.map((target) => {
        const picked = isPicked(target.pick);
        const enabled = picked || pickable(target);
        return (
          <button
            key={target.key}
            type="button"
            aria-label={
              target.pick.cardIndex == null
                ? players.find((p) => p.id === target.pick.playerId)?.name
                : t("target.cardOf", {
                    card: String(target.pick.cardIndex + 1),
                    player: players.find((p) => p.id === target.pick.playerId)?.name ?? "",
                  })
            }
            disabled={!enabled}
            onClick={() => setPicks(togglePick(spec, picks, target.pick))}
            className={cn(
              "absolute rounded-xl transition-all",
              picked
                ? "bg-amber-200/25 ring-4 ring-amber-300 shadow-[0_0_24px_rgba(252,211,77,0.7)]"
                : enabled
                  ? "bg-amber-200/10 ring-2 ring-amber-400 motion-safe:animate-pulse"
                  : "opacity-0"
            )}
            style={{ left: target.box.left - 3, top: target.box.top - 3, width: target.box.width + 6, height: target.box.height + 6 }}
          >
            {picked && target.pick.cardIndex != null && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-300 px-1.5 text-[11px] font-black text-amber-950">
                {target.pick.cardIndex + 1}
              </span>
            )}
          </button>
        );
      })}

      {pickedBoxes.length === 2 && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {(() => {
            const [from, to] = pickedBoxes.map(center);
            const mid = { x: (from.x + to.x) / 2 - (to.y - from.y) * 0.2, y: (from.y + to.y) / 2 + (to.x - from.x) * 0.2 };
            return <path d={`M ${from.x} ${from.y} Q ${mid.x} ${mid.y} ${to.x} ${to.y}`} fill="none" stroke="#fcd34d" strokeWidth={3} strokeDasharray="8 6" />;
          })()}
        </svg>
      )}

      <div
        className={cn(
          "absolute left-1/2 flex max-w-[48vw] -translate-x-1/2 items-center gap-2 rounded-full border border-amber-400 bg-amber-950/90 text-amber-50 shadow-xl",
          fit(isCompact, "top-1 px-3 py-1 text-xs", "top-2 px-5 py-2 text-base")
        )}
      >
        {spec.slots === 2 && (
          <span className="shrink-0 rounded-full bg-amber-300 px-2 font-bold text-amber-950">
            {Math.min(picks.length + 1, 2)}/2
          </span>
        )}
        <span className="truncate">{t(targetingPrompt(spec, picks))}</span>
      </div>

      {/* No topo, sobre a barra da partida: embaixo, uma mão grande ficaria atrás dos botões */}
      <div
        className={cn("absolute flex gap-2", fit(isCompact, "top-1 right-1.5", "top-2 right-4"))}
        style={{ paddingRight: "env(safe-area-inset-right, 0px)" }}
      >
        <button
          type="button"
          onClick={back}
          className={cn("rounded-xl bg-white/90 font-semibold text-neutral-900 shadow-lg", fit(isCompact, "px-3 py-1.5 text-xs", "px-5 py-2.5 text-sm"))}
        >
          {picks.length > 0 && spec.slots === 2 ? t("target.back") : t("target.cancel")}
        </button>
        <button
          type="button"
          onClick={confirm}
          aria-disabled={!ready}
          className={cn(
            "rounded-xl font-bold shadow-lg transition-opacity",
            fit(isCompact, "px-4 py-1.5 text-sm", "px-7 py-2.5 text-base"),
            ready ? "bg-amber-400 text-amber-950" : "bg-amber-400/40 text-amber-950/60"
          )}
        >
          {t(spec.confirmKey)}
        </button>
      </div>
    </div>
  );
}
