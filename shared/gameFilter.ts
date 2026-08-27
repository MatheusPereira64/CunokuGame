import type { Card, GameState } from "./schema";

/** Face oculta enviada aos clientes (id preservado para animações/tracking). */
function hideCardFace(card: Card): Card {
  return {
    id: card.id,
    ownerId: card.ownerId,
    suit: "spades",
    rank: "A",
    value: 0,
    isFaceUp: false,
  };
}

/**
 * Filtra o estado público por jogador:
 * - drawnCard só para quem está no turno
 * - faces das mãos dos oponentes ocultas (peek 5/6 fica só no cliente via private_info)
 * - no fim da partida, tudo permanece visível
 */
export function filterGameStateForPlayer(state: GameState, playerId: string): GameState {
  const filteredState: GameState = structuredClone(state);

  if (filteredState.drawnCard) {
    const currentPlayer = state.players[state.currentPlayerIndex];
    const isCurrentPlayer = currentPlayer && currentPlayer.id === playerId;
    if (!isCurrentPlayer) {
      filteredState.drawnCard = null;
    }
  }

  if (filteredState.winnerId || filteredState.turnPhase === "finished") {
    return filteredState;
  }

  for (const player of filteredState.players) {
    if (player.id === playerId) continue;
    player.hand = player.hand.map(hideCardFace);
  }

  filteredState.deck = filteredState.deck.map(hideCardFace);

  return filteredState;
}
