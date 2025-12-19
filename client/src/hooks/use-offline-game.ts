import { useState, useCallback, useEffect, useRef } from "react";
import { GameState, GameAction, Player } from "@shared/schema";
import { processOfflineAction } from "@/utils/offlineGameLogic";
import { BotPlayer } from "@/utils/botPlayer";

export function useOfflineGame(
  initialGameState: GameState | null,
  playerId: string,
  botDifficulty: "easy" | "medium" | "hard"
) {
  const [gameState, setGameState] = useState<GameState | null>(initialGameState);
  const [botPlayers, setBotPlayers] = useState<Map<string, BotPlayer>>(new Map());
  const processingRef = useRef(false);

  // Atualiza o estado quando initialGameState muda (carregado do sessionStorage)
  useEffect(() => {
    if (initialGameState) {
      console.log("Updating game state in hook:", { 
        players: initialGameState.players.length,
        currentPlayer: initialGameState.currentPlayerIndex 
      });
      setGameState(initialGameState);
    }
  }, [initialGameState]);

  // Processa turnos dos bots automaticamente
  const processBotTurns = useCallback((currentState: GameState, bots: Map<string, BotPlayer>) => {
    if (processingRef.current) return; // Evita múltiplas execuções simultâneas
    processingRef.current = true;

    let state = { ...currentState };
    
    // Continua processando enquanto for turno de bot
    const processNextBot = () => {
      if (!state || state.winnerId) {
        setGameState(state);
        processingRef.current = false;
        return;
      }

      const currentPlayer = state.players[state.currentPlayerIndex];
      
      // Se não é bot, para
      if (!currentPlayer.isBot || currentPlayer.id === playerId) {
        setGameState(state);
        sessionStorage.setItem(`offline_game_${playerId}`, JSON.stringify(state));
        processingRef.current = false;
        return;
      }

      // Processa turno do bot
      const bot = bots.get(currentPlayer.id);
      if (bot) {
        const action = bot.decideTurn(state, state.currentPlayerIndex);
        state = processOfflineAction(state, action, currentPlayer.id);
        
        // Salva estado
        setGameState(state);
        sessionStorage.setItem(`offline_game_${playerId}`, JSON.stringify(state));
        
        // Continua processando após um delay
        setTimeout(processNextBot, 800);
      } else {
        setGameState(state);
        processingRef.current = false;
      }
    };
    
    processNextBot();
  }, [playerId]);

  // Inicializa bots quando o estado do jogo é carregado
  useEffect(() => {
    if (gameState && botPlayers.size === 0) {
      const bots = new Map<string, BotPlayer>();
      gameState.players.forEach((player) => {
        if (player.isBot) {
          bots.set(player.id, new BotPlayer(player.name, botDifficulty));
        }
      });
      setBotPlayers(bots);
      
      // Se for turno de bot ao carregar, processa automaticamente
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer && currentPlayer.isBot && currentPlayer.id !== playerId) {
        setTimeout(() => {
          processBotTurns(gameState, bots);
        }, 1000);
      }
    }
  }, [gameState, botDifficulty, playerId, processBotTurns, botPlayers.size]);

  // Processa ação do jogador e turnos dos bots
  const sendAction = useCallback((action: GameAction) => {
    if (!gameState) return;

    // Processa ação do jogador
    let newState = processOfflineAction(gameState, action, playerId);
    
    // Salva estado atualizado
    setGameState(newState);
    sessionStorage.setItem(`offline_game_${playerId}`, JSON.stringify(newState));

    // Se não é mais o turno do jogador humano, processa bots
    setTimeout(() => {
      processBotTurns(newState, botPlayers);
    }, 500);
  }, [gameState, playerId, botPlayers, processBotTurns]);

  return { gameState, sendAction, connected: true };
}
