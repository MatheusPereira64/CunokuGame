import { randomFloat } from "./secureRandom";

/** PRNG determinístico (mulberry32) para partidas com seed fixa. */
export function seededRandom(seed: string): () => number {
  let hash = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  let a = hash >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Aleatoriedade de uma decisão durante a partida. Com seed, deriva do progresso do
 * estado (não depende de contador em memória, que se perde ao hibernar o Durable Object).
 */
export function stateRandom(
  state: { seed?: string | null; logs: string[]; currentPlayerIndex: number },
  salt = "",
): () => number {
  if (!state.seed) return randomFloat;
  return seededRandom(`${state.seed}:${state.logs.length}:${state.currentPlayerIndex}:${salt}`);
}
