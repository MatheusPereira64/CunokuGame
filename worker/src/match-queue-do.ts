import { DurableObject } from "cloudflare:workers";
import { generateRoomCode, newPlayerId } from "../../shared/roomCode";
import {
  advanceQueue,
  commitMatch,
  emptyQueue,
  enqueueTicket,
  leaveTicket,
  pruneMatches,
  viewTicket,
  type QueueState,
  type QueueTicket,
} from "../../shared/matchQueue";
import { createStorage } from "./storage";
import type { Env } from "./env";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Fila pública única (idFromName "public"). */
export class MatchQueueDurableObject extends DurableObject<Env> {
  private async read(): Promise<QueueState> {
    const stored = await this.ctx.storage.get<Partial<QueueState>>("queue");
    return {
      waiting: stored?.waiting ?? [],
      lobby: stored?.lobby ?? null,
      matched: stored?.matched ?? emptyQueue().matched,
    };
  }

  private async write(state: QueueState): Promise<void> {
    await this.ctx.storage.put("queue", state);
  }

  private async openRoom(group: QueueTicket[]): Promise<{ code: string; hostId: string }> {
    const storage = createStorage(this.env);
    const hostId = group[0]!.playerId;
    const code = generateRoomCode(4);
    const room = await storage.createRoom({
      code,
      hostId,
      status: "waiting",
      gameMode: "multiplayer",
      botDifficulty: "medium",
      maxPlayers: Math.max(group.length, 2),
      botCount: 0,
    });
    const id = this.env.ROOM.idFromName(code);
    await this.env.ROOM.get(id).fetch(
      new Request("https://room.internal/init", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ room }),
      }),
    );
    return { code, hostId };
  }

  private async settle(state: QueueState, now: number): Promise<QueueState> {
    const stepped = advanceQueue(state, now);
    if (!stepped.ready) return stepped.state;
    const { code, hostId } = await this.openRoom(stepped.ready);
    return commitMatch(stepped.state, stepped.ready, code, hostId, Date.now());
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const ticketMatch = url.pathname.match(/\/api\/matchmaking\/([^/]+)$/);

    if (method === "POST" && url.pathname.endsWith("/api/matchmaking")) {
      let playerName = "";
      try {
        const body = (await request.json()) as { playerName?: string };
        playerName = String(body.playerName || "").trim().slice(0, 24);
      } catch {
        return json({ message: "Invalid input" }, 400);
      }
      if (!playerName) return json({ message: "Invalid input" }, 400);

      const now = Date.now();
      let state = await this.read();
      state.matched = pruneMatches(state.matched, now);
      const ticket: QueueTicket = {
        ticketId: newPlayerId(),
        playerId: newPlayerId(),
        playerName,
        joinedAt: now,
      };
      state = enqueueTicket(state, ticket, now);
      state = await this.settle(state, now);
      await this.write(state);
      return json(viewTicket(state, ticket.ticketId, Date.now()));
    }

    if (ticketMatch && method === "GET") {
      const ticketId = decodeURIComponent(ticketMatch[1]!);
      const now = Date.now();
      let state = await this.read();
      state = await this.settle(state, now);
      await this.write(state);
      const view = viewTicket(state, ticketId, Date.now());
      if (!view) return json({ message: "Ticket not found" }, 404);
      return json(view);
    }

    if (ticketMatch && method === "DELETE") {
      const ticketId = decodeURIComponent(ticketMatch[1]!);
      let state = await this.read();
      state = leaveTicket(state, ticketId, Date.now());
      await this.write(state);
      return new Response(null, { status: 204 });
    }

    return json({ message: "Not found" }, 404);
  }
}
