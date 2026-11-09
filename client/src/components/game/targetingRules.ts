import { createContext, useContext } from "react";
import type { Card } from "@shared/schema";
import type { AbilityAction } from "./helpers";

/** O que cada poder pede para escolher, direto na mesa. */
export type TargetingSpec = {
  /** "card": toca numa carta; "player": no jogador (ícone ou mão); "none": só confirma */
  pick: "card" | "player" | "none";
  /** Quantas escolhas o poder precisa */
  slots: 1 | 2;
  /** De quem dá para escolher */
  who: "others" | "self" | "anyone";
  promptKey: string;
  confirmKey: string;
};

export type TargetPick = { playerId: string; cardIndex?: number; cardId?: string };

/** A mesma carta, mesmo que tenha mudado de posição na mão. */
export function samePick(a: TargetPick, b: TargetPick): boolean {
  if (a.playerId !== b.playerId) return false;
  if (a.cardId && b.cardId) return a.cardId === b.cardId;
  return a.cardIndex === b.cardIndex;
}

export function abilityTargeting(rank: Card["rank"] | undefined, jokerRevealed: boolean): TargetingSpec | null {
  switch (rank) {
    case "A":
    case "2":
      return { pick: "player", slots: 1, who: "others", promptKey: "target.pickOpponent", confirmKey: "target.confirmWind" };
    case "3":
    case "4":
      return { pick: "card", slots: 1, who: "anyone", promptKey: "target.pickSeal", confirmKey: "target.confirmSeal" };
    case "5":
    case "6":
      return { pick: "card", slots: 1, who: "others", promptKey: "target.pickOpponentCard", confirmKey: "target.confirmPeek" };
    case "7":
    case "8":
      return { pick: "card", slots: 1, who: "self", promptKey: "target.pickOwnCard", confirmKey: "target.confirmPeek" };
    case "9":
    case "10":
      return { pick: "card", slots: 2, who: "anyone", promptKey: "target.swapFirst", confirmKey: "target.confirmSwap" };
    case "J":
      return { pick: "none", slots: 1, who: "self", promptKey: "game.abilityJack", confirmKey: "target.confirmJack" };
    case "Q":
      return { pick: "player", slots: 1, who: "others", promptKey: "target.pickOpponent", confirmKey: "target.confirmQueen" };
    case "K":
      return { pick: "player", slots: 1, who: "anyone", promptKey: "target.pickPlayer", confirmKey: "target.confirmKing" };
    case "Joker":
      return jokerRevealed
        ? { pick: "card", slots: 1, who: "others", promptKey: "target.pickForced", confirmKey: "target.confirmJokerForce" }
        : { pick: "none", slots: 1, who: "self", promptKey: "game.abilityJoker", confirmKey: "target.confirmJokerReveal" };
    default:
      return null;
  }
}

/** Texto da faixa: na troca, o segundo passo pede a carta de outro jogador. */
export function targetingPrompt(spec: TargetingSpec, picks: TargetPick[]): string {
  if (spec.slots === 2 && picks.length >= 1) return "target.swapSecond";
  return spec.promptKey;
}

export function canPickPlayer(spec: TargetingSpec, targetId: string, playerId: string): boolean {
  if (spec.who === "others") return targetId !== playerId;
  if (spec.who === "self") return targetId === playerId;
  return true;
}

/** Carta selada não pode ser vista, trocada nem selada de novo; a troca exige dois jogadores diferentes. */
export function canPickCard(
  spec: TargetingSpec,
  picks: TargetPick[],
  target: TargetPick & { cardIndex: number },
  playerId: string,
  sealed: boolean,
): boolean {
  if (spec.pick !== "card" || sealed || !canPickPlayer(spec, target.playerId, playerId)) return false;
  const already = picks.some((p) => samePick(p, target));
  if (already) return true;
  if (spec.slots === 2 && picks.length === 1) return picks[0]!.playerId !== target.playerId;
  return true;
}

/** Tocar de novo desmarca; com tudo escolhido, a nova escolha troca a última. */
export function togglePick(spec: TargetingSpec, picks: TargetPick[], pick: TargetPick): TargetPick[] {
  if (picks.some((p) => samePick(p, pick))) return picks.filter((p) => !samePick(p, pick));
  if (picks.length < spec.slots) return [...picks, pick];
  return [...picks.slice(0, spec.slots - 1), pick];
}

export function buildAbilityAction(
  rank: Card["rank"] | undefined,
  jokerRevealed: boolean,
  picks: TargetPick[],
  playerId: string,
): AbilityAction | null {
  const [a, b] = picks;
  switch (rank) {
    case "A":
    case "2":
      return a ? { kind: "wind", targetPlayerId: a.playerId } : null;
    case "3":
    case "4":
      return a?.cardIndex != null ? { kind: "seal", targetPlayerId: a.playerId, cardIndex: a.cardIndex, cardId: a.cardId } : null;
    case "5":
    case "6":
      return a?.cardIndex != null
        ? { kind: "peek_opponent", targetPlayerId: a.playerId, targetCardIndex: a.cardIndex, cardId: a.cardId }
        : null;
    case "7":
    case "8":
      return a?.cardIndex != null ? { kind: "peek_own", cardIndex: a.cardIndex, cardId: a.cardId } : null;
    case "9":
    case "10": {
      if (a?.cardIndex == null || b?.cardIndex == null || a.playerId === b.playerId) return null;
      const mine = [a, b].find((p) => p.playerId === playerId);
      const theirs = [a, b].find((p) => p !== mine);
      if (mine && theirs) {
        return {
          kind: "swap_me",
          myCardIndex: mine.cardIndex!,
          targetPlayerId: theirs.playerId,
          targetCardIndex: theirs.cardIndex!,
          myCardId: mine.cardId,
          targetCardId: theirs.cardId,
        };
      }
      return {
        kind: "swap_others",
        player1Id: a.playerId,
        card1Index: a.cardIndex,
        player2Id: b.playerId,
        card2Index: b.cardIndex,
        card1Id: a.cardId,
        card2Id: b.cardId,
      };
    }
    case "J":
      return { kind: "jack" };
    case "Q":
      return a ? { kind: "queen", targetPlayerId: a.playerId } : null;
    case "K":
      return a ? { kind: "king", targetPlayerId: a.playerId } : null;
    case "Joker":
      if (!jokerRevealed) return { kind: "joker_reveal" };
      return a?.cardIndex != null
        ? { kind: "joker_force", targetPlayerId: a.playerId, cardIndex: a.cardIndex, cardId: a.cardId }
        : null;
    default:
      return null;
  }
}

/** Jogadores cujas mãos abrem sem sobreposição enquanto se escolhe uma carta delas. */
export const TargetingSpreadContext = createContext<ReadonlySet<string>>(new Set());

export function useTargetingSpread() {
  return useContext(TargetingSpreadContext);
}
