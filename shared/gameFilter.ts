import type { GameState } from "./schema";

/** Oculta drawnCard de quem não está no turno atual. */
export function filterGameStateForPlayer(state: GameState, playerId: string): GameState {
  const filteredState: GameState = structuredClone(state);

  if (filteredState.drawnCard) {
    const currentPlayer = state.players[state.currentPlayerIndex];
    const isCurrentPlayer = currentPlayer && currentPlayer.id === playerId;
    if (!isCurrentPlayer) {
      filteredState.drawnCard = null;
    }
  }

  return filteredState;
}
