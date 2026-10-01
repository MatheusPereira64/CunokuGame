import { generateRoomCode, newPlayerId } from "@shared/roomCode";
import {
  advanceQueue,
  commitMatch,
  emptyQueue,
  enqueueTicket,
  leaveTicket,
  pruneMatches,
  viewTicket,
  type QueueState,
  type TicketView,
} from "@shared/matchQueue";
import { storage } from "./storage";

/**
 * Fila em memória do servidor Node (uma instância).
 * No Worker a fila vive no Durable Object.
 */
class Matchmaker {
  private state: QueueState = emptyQueue();
  private tail: Promise<void> = Promise.resolve();

  enqueue(playerName: string): Promise<TicketView> {
    return this.locked(async () => {
      const now = Date.now();
      this.state.matched = pruneMatches(this.state.matched, now);
      const ticket = {
        ticketId: newPlayerId(),
        playerId: newPlayerId(),
        playerName: playerName.trim().slice(0, 24),
        joinedAt: now,
      };
      this.state = enqueueTicket(this.state, ticket, now);
      await this.settle(now);
      return viewTicket(this.state, ticket.ticketId, Date.now())!;
    });
  }

  status(ticketId: string): Promise<TicketView | null> {
    return this.locked(async () => {
      const now = Date.now();
      await this.settle(now);
      return viewTicket(this.state, ticketId, Date.now());
    });
  }

  leave(ticketId: string): Promise<void> {
    return this.locked(async () => {
      this.state = leaveTicket(this.state, ticketId, Date.now());
    });
  }

  private async settle(now: number): Promise<void> {
    const stepped = advanceQueue(this.state, now);
    this.state = stepped.state;
    if (!stepped.ready) return;
    const hostId = stepped.ready[0]!.playerId;
    const code = generateRoomCode(4);
    await storage.createRoom({
      code,
      hostId,
      status: "waiting",
      gameMode: "multiplayer",
      botDifficulty: "medium",
      maxPlayers: Math.max(stepped.ready.length, 2),
      botCount: 0,
    });
    this.state = commitMatch(this.state, stepped.ready, code, hostId, Date.now());
  }

  private locked<T>(fn: () => Promise<T>): Promise<T> {
    const job = this.tail.then(fn, fn);
    this.tail = job.then(
      () => undefined,
      () => undefined,
    );
    return job;
  }
}

let singleton: Matchmaker | null = null;

export function getMatchmaker(): Matchmaker {
  if (!singleton) singleton = new Matchmaker();
  return singleton;
}
