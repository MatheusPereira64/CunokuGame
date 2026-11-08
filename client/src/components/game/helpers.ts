import type { Player } from "@shared/schema";
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

/** Só avisa o que foge do normal: as 4 cartas iniciais não precisam de legenda. */
export function seatDetail(
  player: Pick<Player, "id" | "hand">,
  skipNextTurnIds: string[] | undefined,
  t: (key: string, vars?: Record<string, string>) => string,
): string | null {
  if (skipNextTurnIds?.includes(player.id)) return t("game.losesNextTurn");
  return player.hand.length > 4 ? t("game.cardCount", { count: String(player.hand.length) }) : null;
}

const DEFAULT_MAX_PLAYERS = 4;

/** Assentos vazios da sala de espera; salas antigas não informam o limite. */
export function emptySeatCount(playerCount: number, maxPlayers?: number | null): number {
  return Math.max(0, (maxPlayers || DEFAULT_MAX_PLAYERS) - playerCount);
}
