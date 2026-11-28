import { useSyncExternalStore } from "react";
import type { GameState } from "@shared/schema";

/** Últimas partidas deste aparelho (todas as modalidades), da mais recente para a mais antiga. */
export type MatchHistoryEntry = {
  id: string;
  /** Epoch ms do fim da partida */
  at: number;
  mode: "bots" | "online" | "daily";
  won: boolean;
  /** Posição do jogador (1 = menos pontos) */
  place: number;
  myScore: number;
  rounds: number;
  players: { name: string; score: number; isMe: boolean; isBot: boolean; won: boolean; declared: boolean }[];
};

export const HISTORY_LIMIT = 30;
const STORAGE_KEY = "cunoku_match_history";
const EVENT = "cunoku-history";
const EMPTY: readonly MatchHistoryEntry[] = [];

let cachedRaw: string | null | undefined;
let cached: readonly MatchHistoryEntry[] = EMPTY;

export function loadMatchHistory(): readonly MatchHistoryEntry[] {
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
    cached = Array.isArray(parsed) ? (parsed as MatchHistoryEntry[]) : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

/** Monta a entrada do histórico a partir do estado final da partida. */
export function historyEntryFromState(args: {
  id: string;
  state: GameState;
  playerId: string;
  isOffline: boolean;
  now?: number;
}): MatchHistoryEntry | null {
  const { state, playerId } = args;
  if (!state.winnerId) return null;
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return null;
  const ranked = [...state.players].sort((a, b) => a.score - b.score);
  let mode: MatchHistoryEntry["mode"] = "online";
  if (state.dailyDay) mode = "daily";
  else if (args.isOffline) mode = "bots";
  return {
    id: args.id,
    at: args.now ?? Date.now(),
    mode,
    won: state.winnerId === playerId,
    place: ranked.findIndex((p) => p.id === playerId) + 1,
    myScore: me.score,
    rounds: state.round,
    players: ranked.map((p) => ({
      name: p.name,
      score: p.score,
      isMe: p.id === playerId,
      isBot: p.isBot,
      won: p.id === state.winnerId,
      declared: p.id === state.finalRoundDeclarerId,
    })),
  };
}

/** Guarda a partida (a mesma partida não entra duas vezes) e mantém só as mais recentes. */
export function addMatchToHistory(entry: MatchHistoryEntry): readonly MatchHistoryEntry[] {
  const next = [entry, ...loadMatchHistory().filter((e) => e.id !== entry.id)].slice(0, HISTORY_LIMIT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    cached = next;
  }
  window.dispatchEvent(new Event(EVENT));
  return next;
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useMatchHistory(): readonly MatchHistoryEntry[] {
  return useSyncExternalStore(subscribe, loadMatchHistory, () => EMPTY);
}
