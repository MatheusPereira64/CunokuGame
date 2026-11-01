import type { Card, GameState, Room } from "./schema";

/** Carta sem face: mantém só o id, que não identifica a carta (ver withNewId em server/game.ts). */
function hiddenCard(id: string): Card {
  return { id, suit: "spades", rank: "A", value: 0, isFaceUp: false, isHidden: true };
}

/**
 * Estado que cada jogador pode ver:
 * - seed nunca sai do servidor
 * - baralho sempre mascarado, inclusive no fim: no desafio diário a ordem vale para todos os jogadores do dia
 * - drawnCard só para quem está no turno
 * - até haver vencedor, só as cartas da própria mão marcadas em knownCards mantêm a face
 *   (a habilidade 5/6 entrega a face por private_info)
 */
export function filterGameStateForPlayer(state: GameState, playerId: string): GameState {
  const filteredState: GameState = structuredClone(state);
  delete filteredState.seed;

  filteredState.deck = filteredState.deck.map((_, i) => hiddenCard(`hidden-deck-${i}`));

  if (filteredState.drawnCard) {
    const currentPlayer = state.players[state.currentPlayerIndex];
    const isCurrentPlayer = currentPlayer && currentPlayer.id === playerId;
    if (!isCurrentPlayer) {
      filteredState.drawnCard = null;
    }
  }

  if (filteredState.winnerId) return filteredState;

  for (const player of filteredState.players) {
    const isMe = player.id === playerId;
    player.hand = player.hand.map((card, i) =>
      isMe && player.knownCards[i.toString()] ? card : hiddenCard(card.id),
    );
    if (!isMe) player.knownCards = {};
  }

  return filteredState;
}

/** Sala para as rotas HTTP, que não identificam o jogador: o estado da partida só sai pelo WebSocket. */
export function toPublicRoom(room: Room): Omit<Room, "gameState"> {
  const { gameState: _gameState, ...publicRoom } = room;
  return publicRoom;
}
