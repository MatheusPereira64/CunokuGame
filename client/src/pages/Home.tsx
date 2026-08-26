import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";
import { useCreateRoom, useJoinRoom, fetchLanInfo } from "@/hooks/use-rooms";
import { useToast } from "@/hooks/use-toast";
import { Spade, Heart, Club, Diamond, ArrowRight, Gamepad2, Users, Bot, Languages, Wifi, Cloud, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createOfflineGame } from "@/utils/localGame";
import { audioManager } from "@/utils/audioManager";
import { VolumeControl } from "@/components/VolumeControl";
import { RulesDialog } from "@/components/RulesDialog";
import { InstallAppButton } from "@/components/InstallAppButton";
import { useI18n, type Language } from "@/contexts/i18n-context";
import { useIsCompactGame, useIsPortrait } from "@/hooks/use-landscape";
import { cn } from "@/lib/utils";
import {
  clearServerBase,
  isLikelyLocalHost,
  normalizeServerBase,
  setLanJoinUrl,
  setNetworkMode,
  setServerBase,
  type NetworkMode,
} from "@/lib/gameServer";

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
  const { t, language, setLanguage } = useI18n();
  const isPortrait = useIsPortrait();
  const isCompactGame = useIsCompactGame();
  // Layout lado a lado só em paisagem (mobile horizontal); vertical mantém o menu empilhado
  const isLandscapeMenu = isCompactGame && !isPortrait;
  const menuBtnClass = cn(
    "w-full",
    isLandscapeMenu ? "text-sm py-3 h-auto min-h-0" : "text-xl py-8"
  );
  const menuIconClass = cn(isLandscapeMenu ? "mr-2 w-4 h-4" : "mr-3 w-6 h-6");
  const dialogBodyClass = cn(
    "overflow-visible",
    isLandscapeMenu && "max-h-[min(85dvh,32rem)] overflow-y-auto py-2 space-y-3"
  );
  const [languageOpen, setLanguageOpen] = useState(false);
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"create" | "join" | "bots" | null>(null);
  const [gameMode, setGameMode] = useState<"multiplayer" | "vs_bots">("multiplayer");
  const [botDifficulty, setBotDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [botCount, setBotCount] = useState<number>(2);
  const [botCountOpen, setBotCountOpen] = useState(false);
  const [botDifficultyOpen, setBotDifficultyOpen] = useState(false);
  // Novos estados para Create New Game
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [includeBots, setIncludeBots] = useState<boolean>(false);
  const [maxPlayersOpen, setMaxPlayersOpen] = useState(false);
  const [createStep, setCreateStep] = useState<"network" | "form">("network");
  const [networkChoice, setNetworkChoice] = useState<NetworkMode | null>(null);
  const [hostAddress, setHostAddress] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();

  const resetCreateDialog = () => {
    setCreateStep("network");
    setNetworkChoice(null);
  };

  const handleCreate = async () => {
    if (!name) return toast({ title: t("error.nameRequired"), description: t("error.nameRequiredDesc"), variant: "destructive" });
    
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
        toast({ title: t("error.generic"), description: err.message || t("error.failedToStart"), variant: "destructive" });
      }
      return;
    }

    const mode: NetworkMode = networkChoice || "server";

    if (mode === "lan") {
      if (!isLikelyLocalHost()) {
        toast({
          title: t("create.lanNeedLocalHost"),
          description: t("create.lanNeedLocalHostDesc"),
          variant: "destructive",
        });
        return;
      }
      try {
        const lan = await fetchLanInfo();
        // Host continua same-origin (evita CORS); convidados usam o IP publicado
        const preferred =
          lan.joinBaseUrls.find((u) => u.includes(window.location.hostname)) ||
          lan.joinBaseUrls[0] ||
          window.location.origin;
        clearServerBase();
        setLanJoinUrl(preferred);
        setNetworkMode("lan");
      } catch (err: any) {
        toast({
          title: t("error.generic"),
          description: err.message || t("create.lanInfoFailed"),
          variant: "destructive",
        });
        return;
      }
    } else {
      clearServerBase();
      setLanJoinUrl(null);
      setNetworkMode("server");
    }
    
    // Modo multiplayer - cria sala online
    try {
      const result = await createRoom.mutateAsync({ 
        name,
        gameMode: "multiplayer",
        maxPlayers: maxPlayers,
        botCount: includeBots ? botCount : 0,
        botDifficulty: includeBots ? botDifficulty : undefined
      });
      sessionStorage.setItem(`player_${result.code}`, result.playerId);
      sessionStorage.setItem(`playerName_${result.code}`, name);
      // Salva o hostId (o criador da sala é sempre o host)
      sessionStorage.setItem(`hostId_${result.code}`, result.playerId);
      setCreateDialogOpen(false);
      setLocation(`/game/${result.code}?player=${result.playerId}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleJoin = async () => {
    if (!name || !roomCode) return toast({ title: t("error.missingDetails"), description: t("error.missingDetailsDesc"), variant: "destructive" });

    if (hostAddress.trim()) {
      const normalized = normalizeServerBase(hostAddress);
      if (!normalized) {
        toast({
          title: t("join.invalidHost"),
          description: t("join.invalidHostDesc"),
          variant: "destructive",
        });
        return;
      }
      setServerBase(normalized);
      setLanJoinUrl(normalized);
      setNetworkMode("lan");
    } else {
      clearServerBase();
      setLanJoinUrl(null);
      setNetworkMode("server");
    }

    try {
      const result = await joinRoom.mutateAsync({ name, code: roomCode });
      sessionStorage.setItem(`player_${result.code}`, result.playerId);
      sessionStorage.setItem(`playerName_${result.code}`, name);
      setLocation(`/game/${result.code}?player=${result.playerId}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center relative overflow-hidden",
        isLandscapeMenu ? "h-[100dvh] min-h-0 p-2 pt-10 pb-2" : "min-h-screen p-4"
      )}
    >
      {/* Language Selector - Top Left */}
      <div className={cn("absolute z-20", isLandscapeMenu ? "top-2 left-2" : "top-4 left-4")}>
        <Select
          value={language}
          onValueChange={(value: Language) => {
            setLanguage(value);
            setLanguageOpen(false);
          }}
          open={languageOpen}
          onOpenChange={setLanguageOpen}
        >
          <SelectTrigger
            className={cn(
              "bg-white/90 text-indigo-900 border-indigo-200 hover:bg-white shadow-md",
              isLandscapeMenu ? "w-[118px] h-8 text-xs" : "w-[140px]"
            )}
          >
            <Languages className={cn("mr-2", isLandscapeMenu ? "h-3.5 w-3.5" : "h-4 w-4")} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" className="z-[100] bg-white" sideOffset={5}>
            <SelectItem value="pt">{t("lang.pt")}</SelectItem>
            <SelectItem value="es">{t("lang.es")}</SelectItem>
            <SelectItem value="en">{t("lang.en")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Volume + instalar app - Top Right */}
      <div className={cn("absolute z-20 flex items-center gap-2", isLandscapeMenu ? "top-2 right-2" : "top-4 right-4")}>
        <InstallAppButton compact={isLandscapeMenu} />
        <div
          className={cn(
            "[&_button]:bg-white/90 [&_button]:text-indigo-900 [&_button]:border-indigo-200 [&_button]:hover:bg-white [&_button]:shadow-md",
            isLandscapeMenu && "[&_button]:h-8 [&_button]:w-8 [&_button]:p-0 scale-90 origin-top-right"
          )}
        >
          <VolumeControl />
        </div>
      </div>

      {/* Decorative Background Elements */}
      {!isLandscapeMenu && (
        <div className="absolute inset-0 pointer-events-none">
          <Spade className="absolute top-10 left-10 w-32 h-32 text-indigo-900/5 rotate-12" />
          <Heart className="absolute bottom-10 right-10 w-40 h-40 text-red-900/5 -rotate-12" />
          <Club className="absolute top-20 right-20 w-24 h-24 text-indigo-900/5 rotate-45" />
          <Diamond className="absolute bottom-20 left-20 w-28 h-28 text-red-900/5 -rotate-45" />
        </div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "w-full relative z-10",
          isLandscapeMenu
            ? "max-w-3xl flex flex-row items-center gap-5 px-1"
            : "max-w-md"
        )}
      >
        <div className={cn("text-center", isLandscapeMenu ? "mb-0 shrink-0 text-left w-[38%] max-w-[14rem]" : "mb-12")}>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className={cn("inline-block", isLandscapeMenu && "w-full")}
          >
            <h1
              className={cn(
                "font-black text-indigo-900 tracking-tighter",
                isLandscapeMenu ? "text-4xl mb-1" : "text-6xl md:text-8xl mb-2"
              )}
              style={{ fontFamily: 'Noto Serif JP' }}
            >
              {t("menu.title")}
            </h1>
            <div className={cn("bg-red-600 w-full rounded-full", isLandscapeMenu ? "h-1" : "h-2")} />
          </motion.div>
          <p
            className={cn(
              "text-gray-600 font-medium",
              isLandscapeMenu ? "mt-1.5 text-xs leading-snug" : "mt-4 text-xl"
            )}
          >
            {t("menu.subtitle")}
          </p>
        </div>

        <div className={cn("flex-1 min-w-0", isLandscapeMenu ? "grid grid-cols-2 gap-2" : "grid gap-6")}>
          <Dialog
            open={createDialogOpen}
            onOpenChange={(open) => {
              setCreateDialogOpen(open);
              if (open) {
                setMode("create");
                setGameMode("multiplayer");
                resetCreateDialog();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="primary" size="lg" className={menuBtnClass}>
                <Gamepad2 className={menuIconClass} /> {t("menu.createGame")}
              </Button>
            </DialogTrigger>
            <DialogContent className={cn("sm:max-w-md overflow-visible", isLandscapeMenu && "max-h-[90dvh]")}>
              <DialogHeader>
                <DialogTitle className={cn("font-display text-indigo-900", isLandscapeMenu ? "text-xl" : "text-2xl")}>
                  {createStep === "network" ? t("create.networkTitle") : t("create.title")}
                </DialogTitle>
                <DialogDescription>
                  {createStep === "network" ? t("create.networkDescription") : t("create.description")}
                </DialogDescription>
              </DialogHeader>

              {createStep === "network" ? (
                <div className={cn("space-y-3 py-2", dialogBodyClass)}>
                  <button
                    type="button"
                    className="w-full text-left rounded-xl border-2 border-indigo-200 hover:border-indigo-500 bg-white p-4 transition-colors"
                    onClick={() => {
                      setNetworkChoice("lan");
                      setCreateStep("form");
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-indigo-100 p-2 text-indigo-800">
                        <Wifi className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-indigo-900">{t("create.networkLan")}</div>
                        <p className="text-sm text-gray-600 mt-1">{t("create.networkLanDesc")}</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="w-full text-left rounded-xl border-2 border-red-200 hover:border-red-500 bg-white p-4 transition-colors"
                    onClick={() => {
                      setNetworkChoice("server");
                      setCreateStep("form");
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-red-100 p-2 text-red-700">
                        <Cloud className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-indigo-900">{t("create.networkServer")}</div>
                        <p className="text-sm text-gray-600 mt-1">{t("create.networkServerDesc")}</p>
                      </div>
                    </div>
                  </button>
                </div>
              ) : (
              <div className={cn("space-y-4 py-4 overflow-visible", dialogBodyClass)}>
                <button
                  type="button"
                  className="inline-flex items-center text-sm text-indigo-700 hover:text-indigo-900 font-medium"
                  onClick={() => setCreateStep("network")}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  {t("create.backToNetwork")}
                </button>
                {networkChoice === "lan" && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                    {t("create.lanHint")}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="hostName">{t("create.yourName")}</Label>
                  <Input 
                    id="hostName" 
                    placeholder={t("create.namePlaceholder")} 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-lg py-6"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxPlayers">{t("create.maxPlayers")}</Label>
                  <Select 
                    value={maxPlayers.toString()} 
                    onValueChange={(value) => {
                      const newMax = parseInt(value);
                      setMaxPlayers(newMax);
                      // Ajusta botCount se necessário
                      if (botCount > newMax - 1) {
                        setBotCount(newMax - 1);
                      }
                      setMaxPlayersOpen(false);
                    }}
                    open={maxPlayersOpen}
                    onOpenChange={(open) => {
                      setMaxPlayersOpen(open);
                      if (open) {
                        setBotCountOpen(false);
                        setBotDifficultyOpen(false);
                      }
                    }}
                  >
                    <SelectTrigger id="maxPlayers" className="text-lg py-6 w-full">
                      <SelectValue placeholder={t("create.maxPlayers")} />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper"
                      className="z-[100] auto-height bg-white"
                      sideOffset={5}
                    >
                      <SelectItem value="2">2 {t("create.players")}</SelectItem>
                      <SelectItem value="3">3 {t("create.players")}</SelectItem>
                      <SelectItem value="4">4 {t("create.players")}</SelectItem>
                      <SelectItem value="5">5 {t("create.players")}</SelectItem>
                      <SelectItem value="6">6 {t("create.players")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeBots"
                      checked={includeBots}
                      onChange={(e) => setIncludeBots(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <Label htmlFor="includeBots" className="cursor-pointer">
                      {t("create.addBots")}
                    </Label>
                  </div>
                </div>

                {includeBots && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="createBotCount">
                        {t("create.botCount").replace("{max}", (maxPlayers - 1).toString())}
                      </Label>
                      <Select 
                        value={Math.min(botCount, maxPlayers - 1).toString()} 
                        onValueChange={(value) => {
                          const newCount = parseInt(value);
                          setBotCount(Math.min(newCount, maxPlayers - 1));
                          setBotCountOpen(false);
                        }}
                        open={botCountOpen}
                        onOpenChange={(open) => {
                          setBotCountOpen(open);
                          if (open) {
                            setMaxPlayersOpen(false);
                            setBotDifficultyOpen(false);
                          }
                        }}
                      >
                        <SelectTrigger id="createBotCount" className="text-lg py-6 w-full">
                          <SelectValue placeholder={t("create.botCount")} />
                        </SelectTrigger>
                        <SelectContent 
                          position="popper"
                          className="z-[100] auto-height bg-white"
                          sideOffset={5}
                        >
                          {Array.from({ length: Math.min(maxPlayers - 1, 5) }, (_, i) => i + 1).map(num => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} {num > 1 ? t("create.bots") : t("create.bot")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {botCount > maxPlayers - 1 && (
                        <p className="text-xs text-orange-600">
                          {t("create.botCountAdjusted").replace("{max}", (maxPlayers - 1).toString()).replace("{total}", maxPlayers.toString())}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="createBotDifficulty">{t("create.botDifficulty")}</Label>
                      <Select 
                        value={botDifficulty} 
                        onValueChange={(value: "easy" | "medium" | "hard") => {
                          setBotDifficulty(value);
                          setBotDifficultyOpen(false);
                        }}
                        open={botDifficultyOpen}
                        onOpenChange={(open) => {
                          setBotDifficultyOpen(open);
                          if (open) {
                            setMaxPlayersOpen(false);
                            setBotCountOpen(false);
                          }
                        }}
                      >
                        <SelectTrigger id="createBotDifficulty" className="text-lg py-6 w-full">
                          <SelectValue placeholder={t("create.botDifficulty")} />
                        </SelectTrigger>
                        <SelectContent 
                          position="popper"
                          className="z-[100] auto-height bg-white"
                          sideOffset={5}
                        >
                          <SelectItem value="easy">{t("create.difficulty.easy")}</SelectItem>
                          <SelectItem value="medium">{t("create.difficulty.medium")}</SelectItem>
                          <SelectItem value="hard">{t("create.difficulty.hard")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <Button 
                  className="w-full mt-4" 
                  onClick={handleCreate} 
                  isLoading={createRoom.isPending}
                >
                  {t("create.createRoom")} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="lg" className={menuBtnClass} onClick={() => { setMode("bots"); setGameMode("vs_bots"); }}>
                <Bot className={menuIconClass} /> {t("menu.playBots")}
              </Button>
            </DialogTrigger>
            <DialogContent className={cn("sm:max-w-md overflow-visible", isLandscapeMenu && "max-h-[90dvh]")}>
              <DialogHeader>
                <DialogTitle className={cn("font-display text-indigo-900", isLandscapeMenu ? "text-xl" : "text-2xl")}>{t("bots.title")}</DialogTitle>
                <DialogDescription>{t("bots.description")}</DialogDescription>
              </DialogHeader>
              <div className={cn("space-y-4 py-4 overflow-visible", dialogBodyClass)}>
                <div className="space-y-2">
                  <Label htmlFor="botName">{t("bots.yourName")}</Label>
                  <Input 
                    id="botName" 
                    placeholder={t("bots.namePlaceholder")} 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-lg py-6"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="botCount">{t("bots.botCount")}</Label>
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
                      <SelectValue placeholder={t("bots.botCount")} />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper"
                      className="z-[100] auto-height bg-white"
                      sideOffset={5}
                    >
                      <SelectItem value="1">1 {t("bots.bot")}</SelectItem>
                      <SelectItem value="2">2 {t("bots.bots")}</SelectItem>
                      <SelectItem value="3">3 {t("bots.bots")}</SelectItem>
                      <SelectItem value="4">4 {t("bots.bots")}</SelectItem>
                      <SelectItem value="5">5 {t("bots.bots")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="botDifficulty">{t("bots.botDifficulty")}</Label>
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
                      <SelectValue placeholder={t("bots.botDifficulty")} />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper"
                      className="z-[100] auto-height bg-white"
                      sideOffset={5}
                    >
                      <SelectItem value="easy">{t("create.difficulty.easy")}</SelectItem>
                      <SelectItem value="medium">{t("create.difficulty.medium")}</SelectItem>
                      <SelectItem value="hard">{t("create.difficulty.hard")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={handleCreate}
                >
                  {t("bots.startGame")} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="lg" className={menuBtnClass} onClick={() => setMode("join")}>
                <Users className={menuIconClass} /> {t("menu.joinRoom")}
              </Button>
            </DialogTrigger>
            <DialogContent className={cn("sm:max-w-md", isLandscapeMenu && "max-h-[90dvh]")}>
              <DialogHeader>
                <DialogTitle className={cn("font-display text-indigo-900", isLandscapeMenu ? "text-xl" : "text-2xl")}>{t("join.title")}</DialogTitle>
                <DialogDescription>{t("join.description")}</DialogDescription>
              </DialogHeader>
              <div className={cn("space-y-4 py-4", dialogBodyClass)}>
                <div className="space-y-2">
                  <Label htmlFor="joinName">{t("join.yourName")}</Label>
                  <Input 
                    id="joinName" 
                    placeholder={t("join.namePlaceholder")} 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-lg py-6"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hostAddress">{t("join.hostAddress")}</Label>
                  <Input
                    id="hostAddress"
                    placeholder={t("join.hostAddressPlaceholder")}
                    value={hostAddress}
                    onChange={(e) => setHostAddress(e.target.value)}
                    className="text-lg py-6 font-mono"
                  />
                  <p className="text-xs text-gray-500">{t("join.hostAddressHint")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roomCode">{t("join.roomCode")}</Label>
                  <Input 
                    id="roomCode" 
                    placeholder={t("join.roomCodePlaceholder")} 
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
                  {t("join.joinRoom")} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <RulesDialog compact={isLandscapeMenu} />
        </div>

        {!isLandscapeMenu && (
          <div className="mt-12 text-center text-sm text-gray-500">
            <p>{t("menu.copyright")}</p>
          </div>
        )}
      </motion.div>
      {isLandscapeMenu && (
        <p className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 pointer-events-none">
          {t("menu.copyright")}
        </p>
      )}
    </div>
  );
}
