import type { GameState } from "@shared/schema";
import { GameLogic } from "./game";

/** Janela para o jogador desconectado voltar quando chega a vez dele. */
export const DISCONNECT_TURN_MS = 50_000;

function currentHumanDisconnected(state: GameState) {
  if (state.winnerId || state.turnPhase === "finished" || state.turnPhase === "waiting") return null;
  const player = state.players[state.currentPlayerIndex];
  if (!player || player.isBot || player.isConnected) return null;
  if (state.turnPhase !== "draw" && state.turnPhase !== "action") return null;
  return player;
}

/**
 * Abre (ou mantém) a janela de 50s se a vez é de um humano offline.
 * Limpa a janela quando o jogador volta ou o turno passa.
 */
export function syncReconnectWindow(state: GameState, now = Date.now()): GameState {
  const player = currentHumanDisconnected(state);
  if (!player) {
    if (state.reconnectDeadline == null && state.reconnectPlayerId == null) return state;
    return { ...state, reconnectDeadline: null, reconnectPlayerId: null };
  }
  if (state.reconnectPlayerId === player.id && state.reconnectDeadline != null) return state;
  return {
    ...state,
    reconnectPlayerId: player.id,
    reconnectDeadline: now + DISCONNECT_TURN_MS,
  };
}

/**
 * Se a janela acabou e o jogador segue offline: compra do monte (se ainda não comprou)
 * e descarta essa carta.
 */
export function autoPlayDisconnectedTurn(state: GameState, now = Date.now()): GameState {
  const player = currentHumanDisconnected(state);
  if (!player || state.reconnectPlayerId !== player.id) return state;
  if (state.reconnectDeadline == null || now < state.reconnectDeadline) return state;

  let current = state;
  if (current.turnPhase === "draw" || !current.drawnCard) {
    current = GameLogic.processAction(current, { type: "draw_deck" }, player.id).newState;
  }

  if (
    current.drawnCard &&
    current.players[current.currentPlayerIndex]?.id === player.id &&
    current.turnPhase !== "finished"
  ) {
    current = GameLogic.processAction(current, { type: "discard_drawn" }, player.id).newState;
    current.logs.push(`${player.name} não reconectou a tempo e a carta comprada foi descartada.`);
  }

  return syncReconnectWindow(current, now);
}
