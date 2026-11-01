const PLAYER_KEY_STORAGE = "cunoku_player_key";

function newKey(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  // randomUUID não existe em http puro (LAN)
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Identidade anônima do aparelho no ranking: nunca é exibida nem devolvida pela API. */
export function getPlayerKey(): string {
  try {
    const stored = localStorage.getItem(PLAYER_KEY_STORAGE);
    if (stored) return stored;
    const created = newKey();
    localStorage.setItem(PLAYER_KEY_STORAGE, created);
    return created;
  } catch {
    return newKey();
  }
}
