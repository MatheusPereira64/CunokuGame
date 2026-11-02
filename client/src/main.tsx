import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import App from "./App";
import { APP_VERSION } from "@/lib/appVersion";
import "./index.css";

const NATIVE_SW_KEY = "cunoku_native_sw_cleared";

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
        registerSW({ immediate: true });
      });
    }
  } catch {
    // Cache indisponível não pode impedir o jogo de abrir
  }

  createRoot(document.getElementById("root")!).render(<App />);
}

void boot();
