import * as React from "react";

/** True quando a viewport está em modo retrato (altura > largura). */
export function useIsPortrait() {
  const [isPortrait, setIsPortrait] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia("(orientation: portrait)");
    const update = () => {
      setIsPortrait(window.matchMedia("(orientation: portrait)").matches || window.innerHeight > window.innerWidth);
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
 * Tenta travar a orientação em paisagem (funciona melhor em PWA / fullscreen).
 * Retorna cleanup que libera o lock.
 */
export async function lockLandscape(): Promise<() => void> {
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: string) => Promise<void>;
  };

  try {
    if (orientation?.lock) {
      await orientation.lock("landscape");
    }
  } catch {
    // Browsers sem permissão (Safari, Chrome desktop) — overlay cobre o caso
  }

  return () => {
    try {
      orientation?.unlock?.();
    } catch {
      // ignore
    }
  };
}
