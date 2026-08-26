import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Download } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Botão / banner para instalar o Cunoku na tela inicial do celular (PWA).
 */
export function InstallAppButton({ className, compact }: { className?: string; compact?: boolean }) {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIos) {
      setIosHint(true);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
      setDeferred(null);
      return;
    }
    if (iosHint) {
      setIosHint(true);
      alert(t("install.iosHint"));
    }
  };

  // Android/Chrome: só mostra quando o browser oferece instalação
  // iOS: mostra dica permanente (Safari não dispara beforeinstallprompt)
  if (!deferred && !iosHint) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "sm" : "md"}
      className={cn(
        "border-indigo-300 text-indigo-900 bg-white/90 hover:bg-white shadow-md",
        compact ? "h-8 text-xs px-2" : "",
        className
      )}
      onClick={handleInstall}
    >
      <Download className={cn(compact ? "w-3.5 h-3.5 mr-1" : "w-4 h-4 mr-2")} />
      {t("install.addToHome")}
    </Button>
  );
}
