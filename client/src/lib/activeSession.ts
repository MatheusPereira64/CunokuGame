const STORAGE_KEY = "cunoku_active_session";
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

export type ActiveSession = {
  code: string;
  playerId: string;
  name: string;
  savedAt: number;
};

export function saveActiveSession(session: ActiveSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadActiveSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveSession;
    if (!parsed.code || !parsed.playerId || !parsed.savedAt) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      clearActiveSession();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearActiveSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function rememberOnlineRoom(opts: {
  code: string;
  playerId: string;
  name: string;
  hostId?: string;
}): void {
  sessionStorage.setItem(`player_${opts.code}`, opts.playerId);
  sessionStorage.setItem(`playerName_${opts.code}`, opts.name);
  if (opts.hostId) sessionStorage.setItem(`hostId_${opts.code}`, opts.hostId);
  saveActiveSession({
    code: opts.code,
    playerId: opts.playerId,
    name: opts.name,
    savedAt: Date.now(),
  });
}
