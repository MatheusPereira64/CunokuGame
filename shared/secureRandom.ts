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
export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}
