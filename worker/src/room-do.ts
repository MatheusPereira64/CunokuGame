import { DurableObject } from "cloudflare:workers";
import type { GameState, Room } from "../../shared/schema";
import type { IStorage } from "../../server/storage";
import {
  createEmptySession,
  createFilteringMessenger,
  deserializeBots,
  executeBotTurn,
  handleJoinMessage,
  handlePlayerAction,
  handleStartGame,
  serializeBots,
  type RoomSessionData,
} from "../../server/roomHandlers";
import { createStorage } from "./storage";
import type { Env } from "./env";

type Attachment = {
  playerId: string | null;
  roomCode: string;
};

/** Storage que prioriza o cache do DO (necessário sem DB compartilhado entre isolates). */
class DoBackedStorage implements IStorage {
  constructor(
    private inner: IStorage,
    private state: DurableObjectState,
  ) {}

  private async cacheRoom(room: Room): Promise<void> {
    await this.state.storage.put("room", room);
  }

  async createRoom(room: Parameters<IStorage["createRoom"]>[0]): Promise<Room> {
    const created = await this.inner.createRoom(room);
    await this.cacheRoom(created);
    return created;
  }

  async getRoom(code: string): Promise<Room | undefined> {
    const cached = await this.state.storage.get<Room>("room");
    if (cached && cached.code === code) return cached;
    const room = await this.inner.getRoom(code);
    if (room) await this.cacheRoom(room);
    return room;
  }

  async listRooms(): Promise<Room[]> {
    return this.inner.listRooms();
  }

  async updateGameState(code: string, state: GameState): Promise<Room> {
    const room = await this.inner.updateGameState(code, state);
    await this.cacheRoom(room);
    return room;
  }

  async updateRoomStatus(code: string, status: string): Promise<Room> {
    const room = await this.inner.updateRoomStatus(code, status);
    await this.cacheRoom(room);
    return room;
  }
}

/**
 * Um Durable Object por código de sala: WebSockets + bots (alarms).
 */
export class RoomDurableObject extends DurableObject<Env> {
  private session: RoomSessionData = createEmptySession();
  private sessionLoaded = false;
  private roomCode = "";

  private storage(): IStorage {
    return new DoBackedStorage(createStorage(this.env), this.ctx);
  }

  private async loadSession(): Promise<void> {
    if (this.sessionLoaded) return;
    const stored = await this.ctx.storage.get<{
      names: [string, string][];
      bots: { id: string; name: string; difficulty: "easy" | "medium" | "hard" }[];
      roomCode?: string;
    }>("session");
    if (stored) {
      this.session = {
        playerNames: new Map(stored.names),
        bots: deserializeBots(stored.bots || []),
      };
      if (stored.roomCode) this.roomCode = stored.roomCode;
    }
    this.sessionLoaded = true;
  }

  private async saveSession(): Promise<void> {
    await this.ctx.storage.put("session", {
      names: Array.from(this.session.playerNames.entries()),
      bots: serializeBots(this.session.bots),
      roomCode: this.roomCode,
    });
  }

  private playerIdFor(ws: WebSocket): string | null {
    const att = ws.deserializeAttachment() as Attachment | null;
    return att?.playerId ?? null;
  }

  private setAttachment(ws: WebSocket, patch: Partial<Attachment>): void {
    const prev = (ws.deserializeAttachment() as Attachment | null) || {
      playerId: null,
      roomCode: this.roomCode,
    };
    ws.serializeAttachment({ ...prev, ...patch });
  }

  private connectedIds(): string[] {
    const ids: string[] = [];
    for (const ws of this.ctx.getWebSockets()) {
      const id = this.playerIdFor(ws);
      if (id) ids.push(id);
    }
    return ids;
  }

  private makeMessenger() {
    return createFilteringMessenger(
      (playerId) => {
        for (const ws of this.ctx.getWebSockets()) {
          if (this.playerIdFor(ws) === playerId) {
            return {
              open: true,
              send: (data) => {
                try {
                  ws.send(data);
                } catch {
                  /* ignore */
                }
              },
            };
          }
        }
        return undefined;
      },
      () => this.connectedIds(),
    );
  }

  private scheduleBot(_roomCode: string, state: GameState): void {
    const current = state.players[state.currentPlayerIndex];
    if (!current?.isBot) return;
    this.makeMessenger().broadcast({ type: "bot_thinking", botName: current.name });
    void this.ctx.storage.setAlarm(Date.now() + 3000);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Seed da sala após POST /api/rooms (API → DO)
    if (request.method === "POST" && url.pathname.endsWith("/init")) {
      const body = (await request.json()) as { room: Room };
      if (body?.room) {
        this.roomCode = body.room.code;
        await this.ctx.storage.put("room", body.room);
        await this.loadSession();
        await this.saveSession();
      }
      return new Response("ok");
    }

    const code =
      url.searchParams.get("code") ||
      url.pathname.split("/").filter(Boolean).pop() ||
      "";

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    if (!code || code === "ws") {
      return new Response("Missing room code", { status: 400 });
    }

    await this.loadSession();
    this.roomCode = code.toUpperCase();
    await this.saveSession();

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: null, roomCode: this.roomCode } satisfies Attachment);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.loadSession();
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);

    try {
      const msg = JSON.parse(text);
      const storage = this.storage();
      const messenger = this.makeMessenger();

      if (msg.type === "join") {
        const { code, playerId, name } = msg;
        this.roomCode = String(code).toUpperCase();
        await handleJoinMessage(
          storage,
          this.session,
          messenger,
          { code: this.roomCode, playerId, name },
          (id) => {
            this.setAttachment(ws, { playerId: id, roomCode: this.roomCode });
          },
          (m) => {
            try {
              ws.send(JSON.stringify(m));
            } catch {
              /* ignore */
            }
          },
        );
        await this.saveSession();
        return;
      }

      const att = ws.deserializeAttachment() as Attachment | null;
      const roomCode = att?.roomCode || this.roomCode;
      const playerId = att?.playerId;

      if (msg.type === "start_game") {
        if (!playerId) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "No room associated with connection. Please reconnect.",
            }),
          );
          return;
        }
        await handleStartGame(
          storage,
          this.session,
          messenger,
          roomCode,
          playerId,
          (c, s) => this.scheduleBot(c, s),
        );
        await this.saveSession();
        return;
      }

      if (msg.type === "player_action") {
        if (!playerId || !roomCode) return;
        await handlePlayerAction(
          storage,
          messenger,
          roomCode,
          playerId,
          msg.action,
          (c, s) => this.scheduleBot(c, s),
        );
        await this.saveSession();
      }
    } catch (e) {
      console.error("RoomDO message error", e);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    void ws;
  }

  async alarm(): Promise<void> {
    await this.loadSession();
    if (!this.roomCode) return;
    await executeBotTurn(
      this.storage(),
      this.session,
      this.makeMessenger(),
      this.roomCode,
      (c, s) => this.scheduleBot(c, s),
    );
    await this.saveSession();
  }
}
