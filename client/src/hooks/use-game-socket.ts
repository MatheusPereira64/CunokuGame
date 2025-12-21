import { useEffect, useRef, useState, useCallback } from "react";
import { type GameState, type WsMessage, type GameAction } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useGameSocket(roomCode: string, playerId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!roomCode || !playerId) return;

    // Busca o nome do jogador do sessionStorage
    const playerName = sessionStorage.getItem(`playerName_${roomCode}`) || `Player ${playerId.substring(0, 4)}`;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log("Connected to game room:", roomCode);
      
      // Envia mensagem de join assim que conectar
      ws.send(JSON.stringify({
        type: "join",
        code: roomCode,
        playerId: playerId,
        name: playerName
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
              turnPhase: "waiting" as any,
              isFinalRound: false,
              finalRoundDeclarerId: null,
              winnerId: null
            };
            console.log("Setting game state to lobby state with", lobbyState.players.length, "players:", lobbyState.players.map(p => p.name));
            setGameState(lobbyState);
            break;
          case "player_joined":
            console.log("Player joined notification:", (message as any).name);
            toast({
              title: "Player Joined",
              description: `${(message as any).name} joined the room`,
            });
            // Quando alguém entra, o servidor deve enviar lobby_state atualizado automaticamente
            // Não precisamos fazer nada aqui, apenas aguardar o lobby_state
            break;
          case "error":
            toast({
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
            toast({
              title: "🔥 CUNOKU Declarado!",
              description: `${message.playerName} declarou fim de jogo! Rodada final iniciada.`,
              duration: 5000,
            });
            break;
          case "bot_thinking":
            // Notificação quando um bot está pensando
            toast({
              title: `${(message as any).botName} está pensando...`,
              description: "O bot está analisando sua jogada",
              duration: 3000,
            });
            break;
          case "private_info":
            // Mensagem privada (para cartas 5 e 6)
            toast({
              title: "Carta Revelada!",
              description: message.card 
                ? `${message.playerName} tem ${message.card.rank} de ${message.card.suit}`
                : message.message,
            });
            break;
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log("Disconnected from game room");
    };

    return () => {
      ws.close();
    };
  }, [roomCode, playerId, toast]);

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

  return { gameState, connected, sendAction, socketRef };
}
