const SERVER_BASE_KEY = "cunoku_server_base";
const NETWORK_MODE_KEY = "cunoku_network_mode";
const LAN_JOIN_URL_KEY = "cunoku_lan_join_url";

export type NetworkMode = "lan" | "server";

/** Worker Cloudflare de produção (ranking, salas online, multiplayer cloud). */
export const DEFAULT_CLOUD_SERVER =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GAME_SERVER_URL) ||
  "https://cunoku.cunokugame.workers.dev";

/** Normaliza IP, host:porta ou URL completa para origem http(s). */
export function normalizeServerBase(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  let candidate = raw;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `http://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    if (!url.hostname) return null;
    // Remove path/query — só a origem do servidor do jogo
    return url.origin;
  } catch {
    return null;
  }
}

/** True no APK/IPA Capacitor (assets locais, origin tipicamente https://localhost). */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) return true;
  } catch {
    // ignore
  }
  // Build de produção embutido no WebView Capacitor (scheme https + localhost)
  const { protocol, hostname } = window.location;
  if (
    import.meta.env.PROD &&
    (hostname === "localhost" || hostname === "127.0.0.1") &&
    (protocol === "https:" || protocol === "http:" || protocol === "capacitor:")
  ) {
    return true;
  }
  return protocol === "capacitor:";
}

export function getServerBase(): string {
  if (typeof window === "undefined") return "";
  const stored = sessionStorage.getItem(SERVER_BASE_KEY);
  if (stored) return stored;
  // No app nativo, same-origin é o WebView local — API fica no Worker cloud
  if (isNativeApp()) {
    return String(DEFAULT_CLOUD_SERVER).replace(/\/$/, "");
  }
  return window.location.origin;
}

export function setServerBase(url: string | null): void {
  if (typeof window === "undefined") return;
  if (!url) {
    sessionStorage.removeItem(SERVER_BASE_KEY);
    return;
  }
  const normalized = normalizeServerBase(url);
  if (normalized) {
    sessionStorage.setItem(SERVER_BASE_KEY, normalized);
  }
}

export function clearServerBase(): void {
  setServerBase(null);
}

export function getNetworkMode(): NetworkMode {
  if (typeof window === "undefined") return "server";
  const mode = sessionStorage.getItem(NETWORK_MODE_KEY);
  return mode === "lan" ? "lan" : "server";
}

export function setNetworkMode(mode: NetworkMode): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(NETWORK_MODE_KEY, mode);
}

export function setLanJoinUrl(url: string | null): void {
  if (typeof window === "undefined") return;
  if (!url) {
    sessionStorage.removeItem(LAN_JOIN_URL_KEY);
    return;
  }
  sessionStorage.setItem(LAN_JOIN_URL_KEY, url);
}

export function getLanJoinUrl(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(LAN_JOIN_URL_KEY);
}

export function apiUrl(path: string): string {
  const base = getServerBase().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  // Same-origin relativo quando base === origin atual
  if (typeof window !== "undefined" && base === window.location.origin) {
    return p;
  }
  return `${base}${p}`;
}

export function wsUrl(roomCode?: string): string {
  const base = getServerBase();
  try {
    const url = new URL(base || (typeof window !== "undefined" ? window.location.origin : "http://localhost"));
    const protocol = url.protocol === "https:" ? "wss:" : "ws:";
    const path = `${protocol}//${url.host}/ws`;
    // Código na query para o Worker Cloudflare rotear ao Durable Object da sala.
    // O servidor Node (LAN) ignora a query e usa a mensagem `join`.
    if (roomCode) {
      return `${path}?code=${encodeURIComponent(roomCode.toUpperCase())}`;
    }
    return path;
  } catch {
    const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = typeof window !== "undefined" ? window.location.host : "localhost";
    const path = `${protocol}//${host}/ws`;
    if (roomCode) {
      return `${path}?code=${encodeURIComponent(roomCode.toUpperCase())}`;
    }
    return path;
  }
}

/** True se o hostname atual parece rede local / loopback. */
export function isLikelyLocalHost(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {
  if (!hostname) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)) return true;
  return false;
}
