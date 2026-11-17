import { isRewardUnlocked } from "@shared/matchFeats";
import { loadFeats } from "./feats";

export type CardBackId = "seigaiha" | "asanoha" | "shippo" | "sakura" | "kin" | "murasaki" | "natal";
export type TableMatId = "tatami" | "urushi" | "night" | "washi" | "kin" | "natal";

export const CARD_BACKS: CardBackId[] = ["seigaiha", "asanoha", "shippo", "sakura", "kin", "murasaki", "natal"];
export const TABLE_MATS: TableMatId[] = ["tatami", "urushi", "night", "washi", "kin", "natal"];

/** Temas claros: tapete de papel washi e verso de sakura. */
export const LIGHT_THEME = new Set<string>(["washi", "sakura"]);

/** Itens da estação: só aparecem no mês deles. */
const SEASONAL: Record<string, number> = { natal: 11 };

export function isSeasonal(id: string): boolean {
  return id in SEASONAL;
}

export function isInSeason(id: string, now = new Date()): boolean {
  return !(id in SEASONAL) || SEASONAL[id] === now.getMonth();
}

/** Liberado pela conquista (se precisar de uma) e dentro da estação. */
export function isThemeItemAvailable(kind: "back" | "mat", id: string, feats: readonly string[], now = new Date()): boolean {
  return isInSeason(id, now) && isRewardUnlocked(kind, id, feats);
}

const STORAGE_KEY = "cunoku_table_theme";
const EVENT = "cunoku-theme";

export type TableTheme = {
  back: CardBackId;
  mat: TableMatId;
};

const DEFAULT_THEME: TableTheme = { back: "seigaiha", mat: "tatami" };

/** useSyncExternalStore exige a mesma referência enquanto o valor não muda. */
let cachedTheme: TableTheme = DEFAULT_THEME;
let cachedRaw: string | null | undefined;

function isBack(value: unknown): value is CardBackId {
  return CARD_BACKS.includes(value as CardBackId);
}

function isMat(value: unknown): value is TableMatId {
  return TABLE_MATS.includes(value as TableMatId);
}

export function loadTableTheme(): TableTheme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return cachedTheme;
  }
  if (raw === cachedRaw) return cachedTheme;
  cachedRaw = raw;
  if (!raw) {
    cachedTheme = DEFAULT_THEME;
    return cachedTheme;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<TableTheme>;
    // Item fora da estação (ou de conquista que este aparelho não tem) volta ao padrão
    const feats = loadFeats();
    const next: TableTheme = {
      back: isBack(parsed.back) && isThemeItemAvailable("back", parsed.back, feats) ? parsed.back : DEFAULT_THEME.back,
      mat: isMat(parsed.mat) && isThemeItemAvailable("mat", parsed.mat, feats) ? parsed.mat : DEFAULT_THEME.mat,
    };
    if (cachedTheme.back === next.back && cachedTheme.mat === next.mat) return cachedTheme;
    cachedTheme = next;
    return cachedTheme;
  } catch {
    cachedTheme = DEFAULT_THEME;
    return cachedTheme;
  }
}

export function saveTableTheme(theme: TableTheme): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeTableTheme(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
