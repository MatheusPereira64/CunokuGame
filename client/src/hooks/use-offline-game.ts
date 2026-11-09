import { useState, useCallback, useEffect, useRef } from "react";
import { GameState, GameAction, Player } from "@shared/schema";
import { processOfflineAction } from "@/utils/offlineGameLogic";
import { applyBotReactions } from "@shared/cardPowers";
import { BotPlayer } from "@/utils/botPlayer";

export function useOfflineGame(
  initialGameState: GameState | null,
  playerId: string,
  botDifficulty: "easy" | "medium" | "hard"
) {
  const [gameState, setGameState] = useState<GameState | null>(initialGameState);
  const [botPlayers, setBotPlayers] = useState<Map<string, BotPlayer>>(new Map());
  const processingRef = useRef(false);
  // Fonte única do estado: o descarte é livre e pode acontecer enquanto o bot "pensa"
  const latestState = useRef<GameState | null>(initialGameState);

  // Atualiza o estado quando initialGameState muda (carregado do sessionStorage)
  useEffect(() => {
    if (initialGameState) {
      console.log("Updating game state in hook:", { 
        players: initialGameState.players.length,
        currentPlayer: initialGameState.currentPlayerIndex 
      });
      latestState.current = initialGameState;
      setGameState(initialGameState);
    }
  }, [initialGameState]);

  const commitState = useCallback((state: GameState) => {
    latestState.current = state;
    setGameState(state);
    sessionStorage.setItem(`offline_game_${playerId}`, JSON.stringify(state));
  }, [playerId]);

  // Bots descartam fora da vez a carta que sabem ser igual ao topo, um instante depois da jogada
  const reactionTimer = useRef(0);
  const scheduleBotReactions = useCallback(() => {
    if (botDifficulty === "easy") return;
    window.clearTimeout(reactionTimer.current);
    reactionTimer.current = window.setTimeout(() => {
      const current = latestState.current;
      if (!current || current.winnerId) return;
      const reacted = applyBotReactions(
        current,
        (s, botId, cardIndex) => processOfflineAction(structuredClone(s), { type: "matched_discard", cardIndex }, botId),
        () => true,
      );
      if (reacted !== current) commitState(reacted);
    }, 700);
  }, [botDifficulty, commitState]);

  // Processa turnos dos bots automaticamente
  const processBotTurns = useCallback((bots: Map<string, BotPlayer>) => {
    if (processingRef.current) return; // Evita múltiplas execuções simultâneas
    processingRef.current = true;

    // Continua processando enquanto for turno de bot
    const processNextBot = () => {
      const state = latestState.current;
      const currentPlayer = state?.players[state.currentPlayerIndex];
      const bot = currentPlayer && bots.get(currentPlayer.id);
      if (!state || state.winnerId || !currentPlayer?.isBot || currentPlayer.id === playerId || !bot) {
        processingRef.current = false;
        return;
      }

      // Espera 3 segundos antes de executar a ação
      setTimeout(() => {
        const before = latestState.current;
        if (!before || before.winnerId) {
          processingRef.current = false;
          return;
        }
        const action = bot.decideTurn(before, before.currentPlayerIndex);
        const after = processOfflineAction(before, action, currentPlayer.id);

        commitState(after);
        scheduleBotReactions();

        // Continua processando após um pequeno delay
        setTimeout(processNextBot, 500);
      }, 3000);
    };

    processNextBot();
  }, [playerId, commitState, scheduleBotReactions]);

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
          processBotTurns(bots);
        }, 1000);
      }
    }
  }, [gameState, botDifficulty, playerId, processBotTurns, botPlayers.size]);

  // Processa ação do jogador e turnos dos bots
  const sendAction = useCallback((action: GameAction) => {
    const current = latestState.current;
    if (!current) return;

    commitState(processOfflineAction(current, action, playerId));
    scheduleBotReactions();

    // Se não é mais o turno do jogador humano, processa bots
    setTimeout(() => {
      processBotTurns(botPlayers);
    }, 500);
  }, [playerId, botPlayers, processBotTurns, commitState, scheduleBotReactions]);

  return { gameState, sendAction, connected: true };
}
