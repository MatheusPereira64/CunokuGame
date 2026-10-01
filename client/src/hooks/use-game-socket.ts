import { useEffect, useRef, useState, useCallback } from "react";
import { type GameState, type WsMessage, type GameAction, type Card } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/i18n-context";
import { wsUrl } from "@/lib/gameServer";

export function useGameSocket(roomCode: string, playerId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const { translateBotMessage } = useI18n();
  const [revealedCard, setRevealedCard] = useState<{ card: Card; playerName: string; targetPlayerId?: string; targetCardIndex?: number } | null>(null);
  const [swapInfo, setSwapInfo] = useState<{ player1Id: string; player1Name: string; player1CardIndex: number; player2Id: string; player2Name: string; player2CardIndex: number } | null>(null);
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const translateRef = useRef(translateBotMessage);
  translateRef.current = translateBotMessage;

  useEffect(() => {
    if (!roomCode || !playerId) return;

    let stopped = false;
    let attempt = 0;
    let retryTimer = 0;
    let ws: WebSocket | null = null;

    const connect = () => {
      if (stopped) return;
      const playerName = sessionStorage.getItem(`playerName_${roomCode}`) || `Player ${playerId.substring(0, 4)}`;
      ws = new WebSocket(wsUrl(roomCode));
      socketRef.current = ws;

      ws.onopen = () => {
        if (stopped) return;
        attempt = 0;
        setConnected(true);
        ws?.send(JSON.stringify({
          type: "join",
          code: roomCode,
          playerId,
          name: playerName,
        }));
      };

    ws.onmessage = (event) => {
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
              title: "Player Joined",
              description: `${(message as any).name} joined the room`,
            });
            // Quando alguém entra, o servidor deve enviar lobby_state atualizado automaticamente
            // Não precisamos fazer nada aqui, apenas aguardar o lobby_state
            break;
          case "error":
            toastRef.current({
              variant: "destructive",
              title: "Error",
              description: message.message
            });
            break;
          case "player_action":
            // Optional: Show toast for other player actions
            break;
          case "cunoku_declared":
            // Notificação quando alguém declara Cunoku
            toastRef.current({
              title: "🔥 CUNOKU Declarado!",
              description: `${message.playerName} declarou fim de jogo! Rodada final iniciada.`,
              duration: 5000,
            });
            break;
          case "bot_thinking":
            // Notificação quando um bot está pensando
            toastRef.current({
              title: `${(message as any).botName} está pensando...`,
              description: "O bot está analisando sua jogada",
              duration: 3000,
            });
            break;
          case "bot_action":
            // Notificação quando um bot executa uma ação
            const botMessage = (message as any).message;
            const translatedMessage = translateRef.current(botMessage);
            toastRef.current({
              title: `${(message as any).botName}`,
              description: translatedMessage,
              duration: 4000,
            });
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
        title: "Connection Lost",
        description: "Trying to reconnect..."
      });
    }
  }, [toast]);

  return { gameState, connected, sendAction, socketRef, revealedCard, setRevealedCard, swapInfo, setSwapInfo };
}
