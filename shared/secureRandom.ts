/** RNG baseado em Web Crypto (Worker + browser + Node 20+). */

/** Float em [0, 1). */
export function randomFloat(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! / 0x1_0000_0000;
}

/** Inteiro em [0, max). */
export function randomInt(max: number): number {
  if (max <= 0) return 0;
  return Math.floor(randomFloat() * max);
}

/** true com probabilidade p (0..1). */
export function randomChance(p: number): boolean {
  return randomFloat() < p;
}

/** Embaralha array in-place (Fisher–Yates). */
export function shuffleInPlace<T>(items: T[], random: () => number = randomFloat): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

/** UUID v4 seguro: usa crypto.randomUUID quando existe (WebViews antigos não têm). */
export function randomUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
