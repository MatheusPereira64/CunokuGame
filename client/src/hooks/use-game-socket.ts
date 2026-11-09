import { useEffect, useRef, useState, useCallback } from "react";
import { type GameState, type WsMessage, type GameAction, type Card, type MatchReward } from "@shared/schema";
import type { EmoteId } from "@shared/emotes";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/i18n-context";
import { wsUrl } from "@/lib/gameServer";
import { getRankToken } from "@/lib/rankAuth";
import { loadProfile } from "@/lib/playerProfile";

/** O servidor responde em inglês; o jogador vê no idioma dele. */
const SERVER_ERRORS: [RegExp, string][] = [
  [/^Room not found/, "net.roomNotFound"],
  [/^Game has already started/, "net.gameStarted"],
  [/^Room is full/, "net.roomFull"],
  [/^Only the host/, "net.hostOnly"],
  [/^Need at least 2 players/, "net.needPlayers"],
  [/^No room associated/, "net.reconnectNeeded"],
];

function translateServerError(message: string, t: (key: string, vars?: Record<string, string>) => string): string {
  const match = SERVER_ERRORS.find(([pattern]) => pattern.test(message));
  return match ? t(match[1]) : message;
}

export function useGameSocket(roomCode: string, playerId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;
  const [revealedCard, setRevealedCard] = useState<{ card: Card; playerName: string; targetPlayerId?: string; targetCardIndex?: number } | null>(null);
  const [swapInfo, setSwapInfo] = useState<{ player1Id: string; player1Name: string; player1CardIndex: number; player2Id: string; player2Name: string; player2CardIndex: number } | null>(null);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [incomingEmote, setIncomingEmote] = useState<{ playerId: string; emoteId: string; at: number } | null>(null);
  const [matchReward, setMatchReward] = useState<MatchReward | null>(null);
  const [privateReveal, setPrivateReveal] = useState<{ reveals: { playerId: string; cards: Card[] }[]; durationMs: number } | null>(null);

  useEffect(() => {
    if (!roomCode || !playerId) return;

    let stopped = false;
    let attempt = 0;
    let retryTimer = 0;
    let ws: WebSocket | null = null;
    let lastHeardAt = Date.now();

    // No celular a conexão pode morrer sem avisar (tela bloqueada, troca de Wi-Fi para 4G):
    // sem resposta ao ping, abandona o socket e reconecta na hora.
    const reconnectNow = () => {
      if (stopped) return;
      window.clearTimeout(retryTimer);
      if (ws) {
        ws.onclose = null;
        ws.onmessage = null;
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
      setConnected(false);
      attempt = 0;
      connect();
    };
    const checkAlive = (graceMs: number) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        if (!ws || ws.readyState === WebSocket.CLOSED) reconnectNow();
        return;
      }
      const sentAt = Date.now();
      ws.send("ping");
      window.setTimeout(() => {
        if (!stopped && lastHeardAt < sentAt) reconnectNow();
      }, graceMs);
    };
    const heartbeat = window.setInterval(() => checkAlive(10_000), 20_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") checkAlive(4_000);
    };
    const onOnline = () => checkAlive(4_000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    const connect = () => {
      if (stopped) return;
      const playerName = sessionStorage.getItem(`playerName_${roomCode}`) || `Player ${playerId.substring(0, 4)}`;
      ws = new WebSocket(wsUrl(roomCode));
      socketRef.current = ws;

      ws.onopen = () => {
        if (stopped) return;
        attempt = 0;
        lastHeardAt = Date.now();
        setConnected(true);
        const { iconId, accent } = loadProfile();
        ws?.send(JSON.stringify({
          type: "join",
          code: roomCode,
          playerId,
          name: playerName,
          rankToken: getRankToken(),
          iconId,
          accent,
        }));
      };

    ws.onmessage = (event) => {
      lastHeardAt = Date.now();
      if (event.data === "pong") return;
      try {
        const message: WsMessage = JSON.parse(event.data);
        console.log("WS message received:", message.type, message);
        
        switch (message.type) {
          case "game_state":
            console.log("Processing game_state");
            setGameState(message.state);
            break;
          case "lobby_state":
            console.log("Processing lobby_state - players:", (message as any).players?.length || 0, "hostId:", (message as any).hostId);
            // Estado de lobby - jogo ainda não começou
            // Cria um estado temporário para mostrar jogadores
            // Salva hostId se fornecido
            if ((message as any).hostId) {
              sessionStorage.setItem(`hostId_${roomCode}`, (message as any).hostId);
              console.log("Lobby state received - hostId:", (message as any).hostId, "players:", (message as any).players?.length || 0);
            } else {
              console.log("Lobby state received - no hostId, players:", (message as any).players?.length || 0);
            }
            if ((message as any).maxPlayers) {
              sessionStorage.setItem(`maxPlayers_${roomCode}`, String((message as any).maxPlayers));
            }
            const lobbyState: GameState = {
              players: (message as any).players || [],
              deck: [],
              discardPile: [],
              drawnCard: null,
              drawnFromDiscard: false,
              round: 0,
              currentPlayerIndex: 0,
              turnPhase: "waiting",
              isFinalRound: false,
              finalRoundDeclarerId: null,
              winnerId: null,
              logs: []
            };
            console.log("Setting game state to lobby state with", lobbyState.players.length, "players:", lobbyState.players.map(p => p.name));
            setGameState(lobbyState);
            break;
          case "player_joined":
            console.log("Player joined notification:", (message as any).name);
            toastRef.current({
              title: tRef.current("net.playerJoined"),
              description: tRef.current("net.playerJoinedDesc", { name: (message as any).name }),
            });
            // Quando alguém entra, o servidor deve enviar lobby_state atualizado automaticamente
            // Não precisamos fazer nada aqui, apenas aguardar o lobby_state
            break;
          case "error":
            toastRef.current({
              variant: "destructive",
              title: tRef.current("net.error"),
              description: translateServerError(message.message, tRef.current)
            });
            break;
          case "player_action":
            // Optional: Show toast for other player actions
            break;
          case "cunoku_declared":
            // O anúncio em tela cheia vem do estado (finalRound), igual para todos
            break;
          case "bot_thinking":
            // A linha de status já mostra de quem é a vez
            break;
          case "bot_action":
            // A jogada do bot aparece no assento dele, a partir do log do estado (useActionFeed)
            break;
          case "private_info":
            // Mensagem privada (para cartas 5 e 6) - armazena para exibir no overlay
            if (message.card && message.playerName) {
              setRevealedCard({ 
                card: message.card, 
                playerName: message.playerName,
                targetPlayerId: (message as any).targetPlayerId,
                targetCardIndex: (message as any).targetCardIndex
              });
            }
            break;
          case "private_reveal":
            setPrivateReveal({ reveals: message.reveals, durationMs: message.durationMs });
            break;
          case "emote":
            setIncomingEmote({ playerId: message.playerId, emoteId: message.emoteId, at: Date.now() });
            break;
          case "match_reward":
            setMatchReward({ points: message.points, daily: message.daily });
            break;
          case "card_swap":
            // Informação de troca de cartas - para animação
            if ((message as any).swapInfo) {
              setSwapInfo((message as any).swapInfo);
            }
            break;
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

      ws.onclose = () => {
        setConnected(false);
        if (stopped) return;
        const delay = Math.min(8000, 600 * 2 ** attempt);
        attempt += 1;
        retryTimer = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      stopped = true;
      window.clearTimeout(retryTimer);
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      ws?.close();
    };
  }, [roomCode, playerId]);

  const sendAction = useCallback((action: GameAction) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "player_action",
        action
      }));
    } else {
      toast({
        variant: "destructive",
        title: tRef.current("net.connectionLost"),
        description: tRef.current("net.reconnecting")
      });
    }
  }, [toast]);

  const sendEmote = useCallback((emoteId: EmoteId) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "emote", emoteId }));
    }
  }, []);

  return { gameState, connected, sendAction, socketRef, revealedCard, setRevealedCard, swapInfo, setSwapInfo, sendEmote, incomingEmote, matchReward, privateReveal };
}
