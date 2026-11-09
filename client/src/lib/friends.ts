/**
 * Amigos e jogadores recentes, guardados no aparelho.
 * O id do jogador muda a cada sala, então a pessoa é reconhecida pelo nome.
 */
export type FriendEntry = {
  name: string;
  iconId?: string;
  accent?: string;
  favorite?: boolean;
  lastPlayedAt: number;
};

const STORAGE_KEY = "cunoku_friends";
const MAX_ENTRIES = 30;

const keyOf = (name: string) => name.trim().toLocaleLowerCase();

function read(): FriendEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((f) => typeof f?.name === "string") : [];
  } catch {
    return [];
  }
}

function write(entries: FriendEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* sem armazenamento: a lista não persiste */
  }
}

/** Favoritos primeiro, depois quem jogou com você mais recentemente. */
export function sortFriends(entries: FriendEntry[]): FriendEntry[] {
  return [...entries].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || b.lastPlayedAt - a.lastPlayedAt);
}

export function loadFriends(): FriendEntry[] {
  return sortFriends(read());
}

/** Lembra quem estava na mesa; favoritos nunca saem quando a lista enche. */
export function rememberPlayers(
  players: { name: string; iconId?: string; accent?: string }[],
  now = Date.now(),
  entries = read(),
): FriendEntry[] {
  const byKey = new Map(entries.map((f) => [keyOf(f.name), f]));
  for (const p of players) {
    const name = p.name.trim();
    if (!name) continue;
    const prev = byKey.get(keyOf(name));
    byKey.set(keyOf(name), { ...prev, name, iconId: p.iconId ?? prev?.iconId, accent: p.accent ?? prev?.accent, lastPlayedAt: now });
  }
  const sorted = sortFriends(Array.from(byKey.values()));
  const kept = sorted.filter((f) => f.favorite).concat(sorted.filter((f) => !f.favorite)).slice(0, MAX_ENTRIES);
  write(kept);
  return sortFriends(kept);
}

export function toggleFavorite(name: string): FriendEntry[] {
  const next = read().map((f) => (keyOf(f.name) === keyOf(name) ? { ...f, favorite: !f.favorite } : f));
  write(next);
  return sortFriends(next);
}
