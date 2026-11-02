/** Fila rápida: com 2 jogadores, busca mais gente por 1 minuto e depois conta 10s. */

export const QUICK_MATCH_MIN = 2;
export const QUICK_MATCH_MAX = 4;
export const FILL_WINDOW_MS = 60_000;
export const START_COUNTDOWN_MS = 10_000;
export const MATCH_TTL_MS = 30 * 60 * 1000;
/** `rooms.game_mode` das salas abertas pela fila: qualquer jogador da mesa pode iniciar. */
export const QUICK_MATCH_MODE = "quick";

export type QueueTicket = {
  ticketId: string;
  playerId: string;
  playerName: string;
  joinedAt: number;
};

export type MatchedSeat = {
  ticketId: string;
  playerId: string;
  playerName: string;
  code: string;
  hostId: string;
  matchedAt: number;
};

export type Lobby = {
  players: QueueTicket[];
  /** Busca jogadores extras até este instante. */
  fillUntil: number;
  /** Fim da contagem de 10s. null enquanto a busca não acabou. */
  countdownEndsAt: number | null;
};

export type QueueState = {
  waiting: QueueTicket[];
  lobby: Lobby | null;
  matched: Record<string, MatchedSeat>;
};

export type TicketView = {
  status: "waiting" | "filling" | "countdown" | "matched";
  ticketId: string;
  playerId: string;
  position?: number;
  players?: number;
  secondsLeft?: number;
  code?: string;
  hostId?: string;
};

export function emptyQueue(): QueueState {
  return { waiting: [], lobby: null, matched: {} };
}

function copyState(state: QueueState): QueueState {
  return {
    waiting: [...state.waiting],
    lobby: state.lobby
      ? {
          players: [...state.lobby.players],
          fillUntil: state.lobby.fillUntil,
          countdownEndsAt: state.lobby.countdownEndsAt,
        }
      : null,
    matched: { ...state.matched },
  };
}

function openLobby(players: QueueTicket[], now: number): Lobby {
  return {
    players,
    fillUntil: now + FILL_WINDOW_MS,
    countdownEndsAt: null,
  };
}

function pullLobby(waiting: QueueTicket[], now: number): { lobby: Lobby; rest: QueueTicket[] } | null {
  if (waiting.length < QUICK_MATCH_MIN) return null;
  const size = Math.min(QUICK_MATCH_MAX, waiting.length);
  return { lobby: openLobby(waiting.slice(0, size), now), rest: waiting.slice(size) };
}

export function enqueueTicket(state: QueueState, ticket: QueueTicket, now: number): QueueState {
  const next = copyState(state);
  if (next.lobby && next.lobby.countdownEndsAt == null && next.lobby.players.length < QUICK_MATCH_MAX) {
    next.lobby.players.push(ticket);
    return next;
  }
  next.waiting.push(ticket);
  if (!next.lobby) {
    const formed = pullLobby(next.waiting, now);
    if (formed) {
      next.lobby = formed.lobby;
      next.waiting = formed.rest;
    }
  }
  return next;
}

export function leaveTicket(state: QueueState, ticketId: string, now: number): QueueState {
  const next = copyState(state);
  next.waiting = next.waiting.filter((t) => t.ticketId !== ticketId);
  if (next.lobby) {
    next.lobby.players = next.lobby.players.filter((t) => t.ticketId !== ticketId);
    if (next.lobby.players.length < QUICK_MATCH_MIN) {
      next.waiting = [...next.lobby.players, ...next.waiting];
      next.lobby = null;
    }
  }
  if (!next.lobby) {
    const formed = pullLobby(next.waiting, now);
    if (formed) {
      next.lobby = formed.lobby;
      next.waiting = formed.rest;
    }
  }
  return next;
}

/** Avança a busca e a contagem. `ready` é o grupo que deve virar sala agora. */
export function advanceQueue(state: QueueState, now: number): { state: QueueState; ready: QueueTicket[] | null } {
  const next = copyState(state);
  if (!next.lobby) {
    const formed = pullLobby(next.waiting, now);
    if (formed) {
      next.lobby = formed.lobby;
      next.waiting = formed.rest;
    }
  }
  if (!next.lobby) return { state: next, ready: null };

  const fillDone = now >= next.lobby.fillUntil;
  const full = next.lobby.players.length >= QUICK_MATCH_MAX;
  const countdownDone = next.lobby.countdownEndsAt != null && now >= next.lobby.countdownEndsAt;
  if (fillDone || full || countdownDone) {
    const ready = next.lobby.players;
    next.lobby = null;
    const formed = pullLobby(next.waiting, now);
    if (formed) {
      next.lobby = formed.lobby;
      next.waiting = formed.rest;
    }
    return { state: next, ready };
  }

  return { state: next, ready: null };
}

export function commitMatch(
  state: QueueState,
  group: QueueTicket[],
  code: string,
  hostId: string,
  now: number,
): QueueState {
  const next = copyState(state);
  for (const member of group) {
    next.matched[member.ticketId] = {
      ticketId: member.ticketId,
      playerId: member.playerId,
      playerName: member.playerName,
      code,
      hostId,
      matchedAt: now,
    };
  }
  return next;
}

export function viewTicket(state: QueueState, ticketId: string, now: number): TicketView | null {
  const seat = state.matched[ticketId];
  if (seat) {
    return {
      status: "matched",
      ticketId,
      playerId: seat.playerId,
      code: seat.code,
      hostId: seat.hostId,
    };
  }
  const inLobby = state.lobby?.players.find((t) => t.ticketId === ticketId);
  if (inLobby && state.lobby) {
    if (state.lobby.countdownEndsAt != null) {
      return {
        status: "countdown",
        ticketId,
        playerId: inLobby.playerId,
        players: state.lobby.players.length,
        secondsLeft: Math.max(1, Math.ceil((state.lobby.countdownEndsAt - now) / 1000)),
      };
    }
    return {
      status: "filling",
      ticketId,
      playerId: inLobby.playerId,
      players: state.lobby.players.length,
      secondsLeft: Math.max(0, Math.ceil((state.lobby.fillUntil - now) / 1000)),
    };
  }
  const index = state.waiting.findIndex((t) => t.ticketId === ticketId);
  if (index < 0) return null;
  return {
    status: "waiting",
    ticketId,
    playerId: state.waiting[index]!.playerId,
    position: index + 1,
  };
}

export function pruneMatches(matched: Record<string, MatchedSeat>, now: number): Record<string, MatchedSeat> {
  const next: Record<string, MatchedSeat> = {};
  for (const [id, seat] of Object.entries(matched)) {
    if (now - seat.matchedAt < MATCH_TTL_MS) next[id] = seat;
  }
  return next;
}
