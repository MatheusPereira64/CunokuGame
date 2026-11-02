import { describe, expect, it } from "vitest";
import {
  FILL_WINDOW_MS,
  advanceQueue,
  emptyQueue,
  enqueueTicket,
  pruneMatches,
  viewTicket,
  type MatchedSeat,
  type QueueTicket,
} from "./matchQueue";

function ticket(id: string): QueueTicket {
  return { ticketId: id, playerId: `p-${id}`, playerName: id, joinedAt: 0 };
}

describe("fila rápida", () => {
  it("um jogador fica esperando", () => {
    const state = enqueueTicket(emptyQueue(), ticket("a"), 0);
    expect(viewTicket(state, "a", 0)?.status).toBe("waiting");
    expect(advanceQueue(state, 0).ready).toBeNull();
  });

  it("o segundo jogador abre 1 minuto de busca e só depois a sala fica pronta", () => {
    let state = enqueueTicket(emptyQueue(), ticket("a"), 0);
    state = enqueueTicket(state, ticket("b"), 1_000);
    expect(viewTicket(state, "a", 1_000)?.status).toBe("filling");
    expect(state.lobby?.fillUntil).toBe(1_000 + FILL_WINDOW_MS);

    const mid = advanceQueue(state, 1_000 + 30_000);
    expect(mid.ready).toBeNull();
    expect(viewTicket(mid.state, "b", 1_000 + 30_000)?.status).toBe("filling");

    const afterMinute = advanceQueue(state, 1_000 + FILL_WINDOW_MS);
    expect(afterMinute.ready?.map((t) => t.ticketId)).toEqual(["a", "b"]);
  });

  it("aceita mais jogadores durante a busca e enche a mesa na hora", () => {
    let state = enqueueTicket(emptyQueue(), ticket("a"), 0);
    state = enqueueTicket(state, ticket("b"), 0);
    state = enqueueTicket(state, ticket("c"), 5_000);
    expect(state.lobby?.players).toHaveLength(3);
    expect(state.lobby?.countdownEndsAt).toBeNull();

    state = enqueueTicket(state, ticket("d"), 6_000);
    const full = advanceQueue(state, 6_000);
    expect(full.ready?.map((t) => t.ticketId)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("pruneMatches", () => {
  it("remove partidas antigas", () => {
    const seat: MatchedSeat = {
      ticketId: "t",
      playerId: "p",
      playerName: "Ana",
      code: "ABCD",
      hostId: "p",
      matchedAt: 0,
    };
    expect(pruneMatches({ t: seat }, 31 * 60 * 1000)).toEqual({});
    expect(pruneMatches({ t: seat }, 1000).t?.code).toBe("ABCD");
  });
});
