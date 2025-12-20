import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";
import { useCreateRoom, useJoinRoom } from "@/hooks/use-rooms";
import { useToast } from "@/hooks/use-toast";
import { Spade, Heart, Club, Diamond, ArrowRight, Gamepad2, Users, Bot } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createOfflineGame } from "@/utils/localGame";
import { audioManager } from "@/utils/audioManager";

export default function Home() {
  // Toca música do menu assim que o componente montar
  useEffect(() => {
    // Tenta tocar imediatamente
    audioManager.playMenuMusic();
    
    // Cleanup ao desmontar
    return () => {
      audioManager.stopAllMusic();
    };
  }, []);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"create" | "join" | "bots" | null>(null);
  const [gameMode, setGameMode] = useState<"multiplayer" | "vs_bots">("multiplayer");
  const [botDifficulty, setBotDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [botCount, setBotCount] = useState<number>(2);
  const [botCountOpen, setBotCountOpen] = useState(false);
  const [botDifficultyOpen, setBotDifficultyOpen] = useState(false);

  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();

  const handleCreate = async () => {
    if (!name) return toast({ title: "Name required", description: "Please enter your player name", variant: "destructive" });
    
    // Se for modo bots, cria partida offline
    if (gameMode === "vs_bots") {
      try {
        const { gameState, playerId } = createOfflineGame(name, botCount, botDifficulty);
        
        // Valida que o estado foi criado corretamente
        if (!gameState || !gameState.players || gameState.players.length === 0) {
          throw new Error("Failed to create game state");
        }
        
        // Salva estado do jogo no sessionStorage
        const stateString = JSON.stringify(gameState);
        sessionStorage.setItem(`offline_game_${playerId}`, stateString);
        sessionStorage.setItem(`offline_player_${playerId}`, playerId);
        sessionStorage.setItem(`offline_difficulty_${playerId}`, botDifficulty);
        
        console.log("Offline game created:", { 
          playerId, 
          players: gameState.players.length,
          state: gameState
        });
        
        // Pequeno delay para garantir que o sessionStorage foi salvo
        setTimeout(() => {
          // Redireciona para tela de jogo offline
          setLocation(`/game/offline?player=${playerId}&mode=offline`);
        }, 100);
      } catch (err: any) {
        console.error("Error creating offline game:", err);
        toast({ title: "Error", description: err.message || "Failed to start offline game", variant: "destructive" });
      }
      return;
    }
    
    // Modo multiplayer - cria sala online
    try {
      const result = await createRoom.mutateAsync({ 
        name,
        gameMode: "multiplayer"
      });
      sessionStorage.setItem(`player_${result.code}`, result.playerId);
      setLocation(`/game/${result.code}?player=${result.playerId}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleJoin = async () => {
    if (!name || !roomCode) return toast({ title: "Missing details", description: "Please enter name and room code", variant: "destructive" });

    try {
      const result = await joinRoom.mutateAsync({ name, code: roomCode });
      sessionStorage.setItem(`player_${result.code}`, result.playerId);
      setLocation(`/game/${result.code}?player=${result.playerId}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <Spade className="absolute top-10 left-10 w-32 h-32 text-indigo-900/5 rotate-12" />
        <Heart className="absolute bottom-10 right-10 w-40 h-40 text-red-900/5 -rotate-12" />
        <Club className="absolute top-20 right-20 w-24 h-24 text-indigo-900/5 rotate-45" />
        <Diamond className="absolute bottom-20 left-20 w-28 h-28 text-red-900/5 -rotate-45" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-block"
          >
            <h1 className="text-6xl md:text-8xl font-black text-indigo-900 tracking-tighter mb-2" style={{ fontFamily: 'Noto Serif JP' }}>
              Cunoku
            </h1>
            <div className="h-2 bg-red-600 w-full rounded-full" />
          </motion.div>
          <p className="mt-4 text-xl text-gray-600 font-medium">A Game of Strategy & Deception</p>
        </div>

        <div className="grid gap-6">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="primary" size="lg" className="w-full text-xl py-8" onClick={() => { setMode("create"); setGameMode("multiplayer"); }}>
                <Gamepad2 className="mr-3 w-6 h-6" /> Create New Game
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display text-indigo-900">Start a New Table</DialogTitle>
                <DialogDescription>Create a multiplayer room for friends to join</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="hostName">Your Name</Label>
                  <Input 
                    id="hostName" 
                    placeholder="Enter your name..." 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-lg py-6"
                  />
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={handleCreate} 
                  isLoading={createRoom.isPending}
                >
                  Create Room <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="lg" className="w-full text-xl py-8" onClick={() => { setMode("bots"); setGameMode("vs_bots"); }}>
                <Bot className="mr-3 w-6 h-6" /> Play Against Bots
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md overflow-visible">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display text-indigo-900">Play Against Bots</DialogTitle>
                <DialogDescription>Start a game with AI opponents</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 overflow-visible">
                <div className="space-y-2">
                  <Label htmlFor="botName">Your Name</Label>
                  <Input 
                    id="botName" 
                    placeholder="Enter your name..." 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-lg py-6"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="botCount">Number of Bots</Label>
                  <Select 
                    value={botCount.toString()} 
                    onValueChange={(value) => {
                      setBotCount(parseInt(value));
                      setBotCountOpen(false);
                    }}
                    open={botCountOpen}
                    onOpenChange={(open) => {
                      setBotCountOpen(open);
                      if (open) setBotDifficultyOpen(false);
                    }}
                  >
                    <SelectTrigger id="botCount" className="text-lg py-6 w-full">
                      <SelectValue placeholder="Select number of bots" />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper"
                      className="z-[100] auto-height"
                      sideOffset={5}
                    >
                      <SelectItem value="1">1 Bot</SelectItem>
                      <SelectItem value="2">2 Bots</SelectItem>
                      <SelectItem value="3">3 Bots</SelectItem>
                      <SelectItem value="4">4 Bots</SelectItem>
                      <SelectItem value="5">5 Bots</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="botDifficulty">Bot Difficulty</Label>
                  <Select 
                    value={botDifficulty} 
                    onValueChange={(value: "easy" | "medium" | "hard") => {
                      setBotDifficulty(value);
                      setBotDifficultyOpen(false);
                    }}
                    open={botDifficultyOpen}
                    onOpenChange={(open) => {
                      setBotDifficultyOpen(open);
                      if (open) setBotCountOpen(false);
                    }}
                  >
                    <SelectTrigger id="botDifficulty" className="text-lg py-6 w-full">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper"
                      className="z-[100] auto-height"
                      sideOffset={5}
                    >
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={handleCreate}
                >
                  Start Game <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="lg" className="w-full text-xl py-8" onClick={() => setMode("join")}>
                <Users className="mr-3 w-6 h-6" /> Join Existing Room
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display text-indigo-900">Join a Table</DialogTitle>
                <DialogDescription>Enter the room code to join an existing game</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="joinName">Your Name</Label>
                  <Input 
                    id="joinName" 
                    placeholder="Enter your name..." 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-lg py-6"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roomCode">Room Code</Label>
                  <Input 
                    id="roomCode" 
                    placeholder="e.g. A4B2" 
                    maxLength={4}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="text-lg py-6 font-mono tracking-widest uppercase"
                  />
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={handleJoin} 
                  isLoading={joinRoom.isPending}
                >
                  Join Room <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-12 text-center text-sm text-gray-500">
          <p>© 2025 Cunoku Card Game. Minimum 2 players.</p>
        </div>
      </motion.div>
    </div>
  );
}
