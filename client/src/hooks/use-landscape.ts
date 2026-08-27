import * as React from "react";
import { Capacitor } from "@capacitor/core";
import { ScreenOrientation } from "@capacitor/screen-orientation";

/** True quando a viewport está em modo retrato (altura > largura). */
export function useIsPortrait() {
  const [isPortrait, setIsPortrait] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia("(orientation: portrait)");
    const update = () => {
      setIsPortrait(
        window.matchMedia("(orientation: portrait)").matches || window.innerHeight > window.innerWidth
      );
    };
    update();
    mql.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mql.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return isPortrait;
}

/**
 * Layout compacto da mesa.
 * Celular em landscape costuma ter width > 768px (useIsMobile = false) e altura baixa —
 * sem este hook a UI usa tamanhos de desktop e fica enorme.
 * Desktop alto / largo permanece no layout normal.
 */
export function useIsCompactGame() {
  const [isCompact, setIsCompact] = React.useState(false);

  React.useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      setIsCompact(w < 768 || h < 520 || (coarse && h < 680 && w < 1200));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return isCompact;
}

/**
 * Trava em paisagem (partida).
 * No Capacitor usa o plugin nativo; no browser/PWA tenta Screen Orientation API.
 */
export async function lockLandscape(): Promise<() => void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await ScreenOrientation.lock({ orientation: "landscape" });
    } catch {
      // Alguns devices / versões podem falhar — LandscapePrompt cobre
    }
    return () => {
      void unlockOrientation();
    };
  }

  const orientation = screen.orientation as typeof screen.orientation & {
    lock?: (orientation: string) => Promise<void>;
    unlock?: () => void;
  };

  try {
    if (orientation?.lock) {
      await orientation.lock("landscape");
    }
  } catch {
    // Browsers sem permissão — overlay de retrato cobre o caso
  }

  return () => {
    try {
      orientation?.unlock?.();
    } catch {
      // ignore
    }
  };
}

/** Libera orientação (menu / sala de espera — portrait ou landscape). */
export async function unlockOrientation(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await ScreenOrientation.unlock();
    } catch {
      // ignore
    }
    return;
  }

  try {
    const orientation = screen.orientation as typeof screen.orientation & { unlock?: () => void };
    orientation?.unlock?.();
  } catch {
    // ignore
  }
}
