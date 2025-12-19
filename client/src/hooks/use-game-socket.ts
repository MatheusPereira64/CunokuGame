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

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?room=${roomCode}&player=${playerId}`;
    
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log("Connected to game room:", roomCode);
    };

    ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case "game_state":
            setGameState(message.state);
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

  return { gameState, connected, sendAction };
}
