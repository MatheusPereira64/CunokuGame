export type CardBackId = "seigaiha" | "asanoha" | "shippo";
export type TableMatId = "tatami" | "urushi" | "night";

export const CARD_BACKS: CardBackId[] = ["seigaiha", "asanoha", "shippo"];
export const TABLE_MATS: TableMatId[] = ["tatami", "urushi", "night"];

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
    const next: TableTheme = {
      back: isBack(parsed.back) ? parsed.back : DEFAULT_THEME.back,
      mat: isMat(parsed.mat) ? parsed.mat : DEFAULT_THEME.mat,
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
