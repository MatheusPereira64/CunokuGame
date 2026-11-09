import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import App from "./App";
import { APP_VERSION } from "@/lib/appVersion";
import "./index.css";

const NATIVE_SW_KEY = "cunoku_native_sw_cleared";
const UPDATE_CHECK_MS = 10 * 60 * 1000;

/** No app nativo o service worker guarda o bundle antigo e a tela fica na versão anterior. */
async function clearNativeServiceWorker(): Promise<boolean> {
  if (localStorage.getItem(NATIVE_SW_KEY) === APP_VERSION) return false;

  let hadCache = false;
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    hadCache = regs.length > 0;
    await Promise.all(regs.map((registration) => registration.unregister()));
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    if (keys.length > 0) hadCache = true;
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
  localStorage.setItem(NATIVE_SW_KEY, APP_VERSION);
  if (hadCache) {
    window.location.reload();
    return true;
  }
  return false;
}

async function boot() {
  try {
    if (Capacitor.isNativePlatform()) {
      const reloading = await clearNativeServiceWorker();
      if (reloading) return;
    } else {
      void import("virtual:pwa-register").then(({ registerSW }) => {
        registerSW({
          immediate: true,
          // O navegador só procura versão nova ao carregar a página: uma aba aberta há dias ficaria na antiga.
          // Procura de tempos em tempos e ao voltar para a aba; achando, a página recarrega sozinha.
          onRegisteredSW(_url, registration) {
            if (!registration) return;
            const check = () => {
              if (navigator.onLine) void registration.update().catch(() => undefined);
            };
            window.setInterval(check, UPDATE_CHECK_MS);
            document.addEventListener("visibilitychange", () => {
              if (document.visibilityState === "visible") check();
            });
          },
        });
      });
    }
  } catch {
    // Cache indisponível não pode impedir o jogo de abrir
  }

  // Com pouco espaço, o sistema pode apagar dados de sites: isso pede para preservar os do jogo
  void navigator.storage?.persist?.().catch(() => undefined);

  createRoot(document.getElementById("root")!).render(<App />);
}

void boot();
