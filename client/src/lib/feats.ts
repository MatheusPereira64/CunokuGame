import { useSyncExternalStore } from "react";
import { FEAT_IDS, type FeatId } from "@shared/matchFeats";

const STORAGE_KEY = "cunoku_feats";
const EVENT = "cunoku-feats";
const EMPTY: readonly FeatId[] = [];

let cachedRaw: string | null | undefined;
let cached: readonly FeatId[] = EMPTY;

/** Conquistas de jogada deste aparelho (a mesma referência enquanto nada muda). */
export function loadFeats(): readonly FeatId[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return cached;
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cached = Array.isArray(parsed) ? FEAT_IDS.filter((id) => parsed.includes(id)) : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

export function addFeats(ids: readonly FeatId[]): void {
  if (ids.length === 0) return;
  const next = Array.from(new Set([...loadFeats(), ...ids]));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* sem armazenamento: a conquista vale só nesta sessão */
    cached = next;
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useFeats(): readonly FeatId[] {
  return useSyncExternalStore(subscribe, loadFeats, () => EMPTY);
}
