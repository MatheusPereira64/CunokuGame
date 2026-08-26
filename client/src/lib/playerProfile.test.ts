import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultProfile,
  hasRecordedMatchStats,
  loadProfile,
  markMatchStatsRecorded,
  normalizeProfile,
  PROFILE_STORAGE_KEY,
  recordMatchResult,
  saveProfile,
  winRate,
} from "./playerProfile";

function mockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
}

describe("playerProfile", () => {
  beforeEach(() => {
    const ls = mockStorage();
    const ss = mockStorage();
    vi.stubGlobal("localStorage", ls);
    vi.stubGlobal("sessionStorage", ss);
  });

  it("retorna default quando vazio", () => {
    expect(loadProfile()).toEqual(defaultProfile());
  });

  it("salva e carrega perfil", () => {
    const saved = saveProfile({ displayName: "Matheus", iconId: "crown", accent: "amber" });
    expect(saved.displayName).toBe("Matheus");
    expect(saved.iconId).toBe("crown");
    expect(saved.accent).toBe("amber");
    expect(loadProfile().displayName).toBe("Matheus");
    expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBeTruthy();
  });

  it("normaliza dados inválidos", () => {
    const p = normalizeProfile({
      displayName: "  LongNameThatExceedsLimitXX ",
      iconId: "nope",
      accent: "purple",
      stats: { gamesPlayed: -3, wins: "x", bestScore: "bad" },
    });
    expect(p.displayName.length).toBeLessThanOrEqual(24);
    expect(p.iconId).toBe("spade");
    expect(p.accent).toBe("indigo");
    expect(p.stats.gamesPlayed).toBe(0);
    expect(p.stats.wins).toBe(0);
    expect(p.stats.bestScore).toBeNull();
  });

  it("recordMatchResult incrementa partidas e vitórias", () => {
    recordMatchResult({ won: true, finalScore: 5 });
    recordMatchResult({ won: false, finalScore: 12 });
    const p = loadProfile();
    expect(p.stats.gamesPlayed).toBe(2);
    expect(p.stats.wins).toBe(1);
  });

  it("bestScore guarda o menor valor", () => {
    recordMatchResult({ won: false, finalScore: 8 });
    expect(loadProfile().stats.bestScore).toBe(8);
    recordMatchResult({ won: true, finalScore: 2 });
    expect(loadProfile().stats.bestScore).toBe(2);
    recordMatchResult({ won: true, finalScore: 4 });
    expect(loadProfile().stats.bestScore).toBe(2);
    recordMatchResult({ won: true, finalScore: -1 });
    expect(loadProfile().stats.bestScore).toBe(-1);
  });

  it("winRate calcula porcentagem", () => {
    expect(winRate({ gamesPlayed: 0, wins: 0, bestScore: null })).toBe(0);
    expect(winRate({ gamesPlayed: 4, wins: 1, bestScore: 3 })).toBe(25);
  });

  it("guard de sessão evita recontagem", () => {
    expect(hasRecordedMatchStats("abc")).toBe(false);
    markMatchStatsRecorded("abc");
    expect(hasRecordedMatchStats("abc")).toBe(true);
  });
});
