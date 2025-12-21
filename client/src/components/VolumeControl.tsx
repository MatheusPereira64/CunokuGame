import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/Button";
import { audioManager } from "@/utils/audioManager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function VolumeControl() {
  const [musicVolume, setMusicVolume] = useState(audioManager.getMusicVolume());
  const [sfxVolume, setSfxVolume] = useState(audioManager.getSfxVolume());
  const [isMuted, setIsMuted] = useState(audioManager.getMuted());
  const [isOpen, setIsOpen] = useState(false);

  // Atualiza estados quando o diálogo abre
  useEffect(() => {
    if (isOpen) {
      setMusicVolume(audioManager.getMusicVolume());
      setSfxVolume(audioManager.getSfxVolume());
      setIsMuted(audioManager.getMuted());
    }
  }, [isOpen]);

  const handleMusicVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setMusicVolume(newVolume);
    audioManager.setMusicVolume(newVolume);
  };

  const handleSfxVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setSfxVolume(newVolume);
    audioManager.setSfxVolume(newVolume);
  };

  const handleMuteToggle = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioManager.setMuted(newMuted);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Ajustar volume"
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações de Áudio</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Controle de Mute */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Som</label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMuteToggle}
              className="flex items-center gap-2"
            >
              {isMuted ? (
                <>
                  <VolumeX className="h-4 w-4" />
                  Desmutar
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4" />
                  Mutar
                </>
              )}
            </Button>
          </div>

          {/* Volume da Música */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Volume da Música</label>
              <span className="text-sm text-muted-foreground">
                {Math.round(musicVolume * 100)}%
              </span>
            </div>
            <Slider
              value={[musicVolume]}
              onValueChange={handleMusicVolumeChange}
              max={1}
              min={0}
              step={0.01}
              disabled={isMuted}
              className="w-full"
            />
          </div>

          {/* Volume dos Efeitos Sonoros */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Volume dos Efeitos</label>
              <span className="text-sm text-muted-foreground">
                {Math.round(sfxVolume * 100)}%
              </span>
            </div>
            <Slider
              value={[sfxVolume]}
              onValueChange={handleSfxVolumeChange}
              max={1}
              min={0}
              step={0.01}
              disabled={isMuted}
              className="w-full"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

