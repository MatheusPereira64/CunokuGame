import { useEffect, useState } from "react";
import type { GameState } from "@shared/schema";
import { Button } from "@/components/Button";
import { cn, fit } from "@/lib/utils";
import { useIsCompactGame } from "@/hooks/use-landscape";
import { useI18n } from "@/contexts/i18n-context";
import { getAbilityDescription, hasSpecialAbility } from "./helpers";
import { isTutorialDone } from "./GameTutorial";

const SEEN_KEY = "cunoku_seen_tips";
const OFF = "off";

/** Cartas com o mesmo poder dividem a dica: quem viu a do 5 já sabe a do 6. */
const POWER_GROUP: Record<string, string> = {
  A: "wind", "2": "wind", "3": "seal", "4": "seal", "5": "peekOther", "6": "peekOther",
  "7": "peekOwn", "8": "peekOwn", "9": "swap", "10": "swap", J: "jack", Q: "queen", K: "king", Joker: "joker",
};

function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    /* sem armazenamento: as dicas voltam na próxima partida */
  }
}

type Tip = { id: string; title: string; body: string };

/** Escolhe a dica do momento, se ainda não foi vista: cada uma aparece uma vez só. */
function currentTip(
  gameState: GameState,
  playerId: string,
  isMyTurn: boolean,
  seen: Set<string>,
  t: (key: string, vars?: Record<string, string>) => string,
): Tip | null {
  if (seen.has(OFF) || gameState.winnerId) return null;
  const card = gameState.drawnCard;
  if (isMyTurn && gameState.turnPhase === "action" && card && !gameState.drawnFromDiscard && hasSpecialAbility(card)) {
    const id = `power.${POWER_GROUP[card.rank] ?? card.rank}`;
    if (!seen.has(id)) {
      return {
        id,
        title: t("tips.powerTitle", { card: card.rank === "Joker" ? "★" : card.rank }),
        body: `${getAbilityDescription(card.rank, t)}. ${t("tips.powerHow")}`,
      };
    }
  }

  const me = gameState.players.find((p) => p.id === playerId);
  const top = gameState.discardPile[gameState.discardPile.length - 1];
  const knowsMatch = !!me && !!top && me.hand.some((c, i) => me.knownCards[String(i)] && c.rank === top.rank);
  if (!isMyTurn && knowsMatch && !seen.has("freeDiscard")) {
    return { id: "freeDiscard", title: t("tips.freeDiscardTitle"), body: t("tips.freeDiscardBody") };
  }

  if (isMyTurn && gameState.turnPhase === "draw" && gameState.round >= 5 && !gameState.isFinalRound && !seen.has("cunoku")) {
    return { id: "cunoku", title: t("tips.cunokuTitle"), body: t("tips.cunokuBody") };
  }
  return null;
}

/**
 * Tutorial jogável: depois da apresentação inicial, explica cada poder na primeira vez que ele
 * aparece, e também o descarte livre e o Cunoku, no momento em que dá para usar.
 */
export function PowerTips({ gameState, playerId, isMyTurn }: { gameState: GameState; playerId: string; isMyTurn: boolean }) {
  const { t } = useI18n();
  const isCompact = useIsCompactGame();
  const [seen, setSeen] = useState(loadSeen);
  const tip = isTutorialDone() ? currentTip(gameState, playerId, isMyTurn, seen, t) : null;

  // Uma dica que apareceu conta como vista, mesmo se o momento passar sem o jogador tocar em "Entendi"
  useEffect(() => {
    if (!tip) return;
    const id = tip.id;
    return () => {
      const next = new Set(loadSeen());
      next.add(id);
      saveSeen(next);
    };
  }, [tip?.id]);

  if (!tip) return null;

  const dismiss = (all = false) => {
    const next = new Set(seen);
    next.add(all ? OFF : tip.id);
    saveSeen(next);
    setSeen(next);
  };

  return (
    <div
      className={cn(
        // Embaixo, à esquerda: cobre o seu próprio ícone, e não os oponentes nem as cartas do centro
        "pointer-events-auto absolute bottom-2 left-2 z-[55] rounded-2xl border border-amber-300/50 bg-[#1a120c]/95 text-amber-50 shadow-2xl",
        fit(isCompact, "w-[min(11.5rem,30vw)] p-2", "w-80 p-4")
      )}
      role="status"
    >
      <div className={cn("font-display text-amber-200", fit(isCompact, "text-sm", "text-lg"))}>{tip.title}</div>
      <p className={cn("mt-1 leading-snug text-amber-50/90", fit(isCompact, "text-[11px]", "text-sm"))}>{tip.body}</p>
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" className={fit(isCompact, "h-7 px-3 text-xs", "")} onClick={() => dismiss()}>
          {t("tips.gotIt")}
        </Button>
        <button type="button" className="text-[11px] text-amber-200/70 underline" onClick={() => dismiss(true)}>
          {t("tips.stop")}
        </button>
      </div>
    </div>
  );
}
