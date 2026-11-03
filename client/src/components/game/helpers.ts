import { Card } from "@shared/schema";

/** Todas as cartas do baralho possuem habilidade especial */
export function hasSpecialAbility(card: Card | null | undefined): boolean {
  if (!card) return false;
  return ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "Joker"].includes(card.rank);
}

export function getAbilityDescription(rank: string, t: (key: string) => string): string {
  switch (rank) {
    case "A":
    case "2":
      return t("game.abilityWind");
    case "3":
    case "4":
      return t("game.abilitySeal");
    case "J":
      return t("game.abilityJack");
    case "Q":
      return t("game.abilityQueen");
    case "K":
      return t("game.abilityKing");
    case "Joker":
      return t("game.abilityJoker");
    case "5":
    case "6":
      return t("game.abilityPeekOpponent");
    case "7":
    case "8":
      return t("game.abilityPeekOwn");
    case "9":
    case "10":
      return t("game.abilitySwap");
    default:
      return "";
  }
}

/** Ação escolhida no modal de habilidade, resolvida pelo Game */
export type AbilityAction =
  | { kind: "wind"; targetPlayerId: string }
  | { kind: "seal"; targetPlayerId: string; cardIndex: number }
  | { kind: "jack" }
  | { kind: "queen"; targetPlayerId: string }
  | { kind: "king"; targetPlayerId: string }
  | { kind: "joker_reveal" }
  | { kind: "joker_force"; targetPlayerId: string; cardIndex: number }
  | { kind: "peek_own"; cardIndex: number }
  | { kind: "peek_opponent"; targetPlayerId: string; targetCardIndex: number }
  | { kind: "swap_me"; myCardIndex: number; targetPlayerId: string; targetCardIndex: number }
  | { kind: "swap_others"; player1Id: string; card1Index: number; player2Id: string; card2Index: number };

export type AbilityConfirmInput = {
  isWind?: boolean;
  /** Basta escolher um jogador (Rainha, Rei) */
  needsPlayerOnly?: boolean;
  /** Escolhe jogador e carta (3 e 4, troca forçada do Coringa) */
  needsPlayerAndCard?: boolean;
  isPeekOpponent: boolean;
  isPeekOwn: boolean;
  isSwap: boolean;
  swapMode: "me_and_other" | "two_others";
  swapStep: 1 | 2;
  targetPlayer: string | null;
  targetCard: number | null;
  myCardIndex: number | null;
  firstPlayerSelection: { playerId: string; cardIndex: number } | null;
  targetPlayer2: string | null;
  targetCard2: number | null;
};

/** Quando o botão Confirmar do modal de habilidade deve ficar desabilitado */
export function abilityConfirmDisabled(input: AbilityConfirmInput): boolean {
  if ((input.isWind || input.needsPlayerOnly) && !input.targetPlayer) return true;
  if (input.needsPlayerAndCard && (!input.targetPlayer || input.targetCard === null)) return true;
  if (input.isPeekOpponent && (!input.targetPlayer || input.targetCard === null)) return true;
  if (input.isPeekOwn && input.myCardIndex === null) return true;
  if (input.isSwap && input.swapMode === "me_and_other") {
    return !input.targetPlayer || input.myCardIndex === null || input.targetCard === null;
  }
  if (input.isSwap && input.swapMode === "two_others") {
    if (input.swapStep === 1) return !input.targetPlayer || input.targetCard === null;
    return !input.firstPlayerSelection || !input.targetPlayer2 || input.targetCard2 === null;
  }
  return false;
}

const DEFAULT_MAX_PLAYERS = 4;

/** Assentos vazios da sala de espera; salas antigas não informam o limite. */
export function emptySeatCount(playerCount: number, maxPlayers?: number | null): number {
  return Math.max(0, (maxPlayers || DEFAULT_MAX_PLAYERS) - playerCount);
}
