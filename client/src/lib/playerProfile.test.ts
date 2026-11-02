import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultProfile,
  getProfileIconGroup,
  PROFILE_ICON_GROUPS,
  PROFILE_ICONS,
  hasRecordedMatchStats,
  loadProfile,
  markMatchStatsRecorded,
  normalizeProfile,
  PROFILE_STORAGE_KEY,
  recentDailyStats,
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

describe("histórico de 30 dias", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", mockStorage());
  });

  it("agrupa partidas por dia e preenche dias vazios", () => {
    const now = new Date(2026, 10, 15, 12);
    recordMatchResult({ won: true, finalScore: 3 }, now);
    recordMatchResult({ won: false, finalScore: 9 }, now);
    recordMatchResult({ won: true, finalScore: 1 }, new Date(2026, 10, 14, 23));

    const series = recentDailyStats(loadProfile().stats, 30, now);
    expect(series).toHaveLength(30);
    expect(series[29]).toEqual({ day: "2026-11-15", games: 2, wins: 1 });
    expect(series[28]).toEqual({ day: "2026-11-14", games: 1, wins: 1 });
    expect(series[0]).toEqual({ day: "2026-10-17", games: 0, wins: 0 });
  });

  it("descarta dias além da retenção", () => {
    recordMatchResult({ won: true, finalScore: 3 }, new Date(2026, 0, 1, 12));
    recordMatchResult({ won: true, finalScore: 3 }, new Date(2026, 10, 15, 12));
    expect(Object.keys(loadProfile().stats.history)).toEqual(["2026-11-15"]);
    expect(loadProfile().stats.gamesPlayed).toBe(2);
  });

  it("ignora histórico corrompido e nunca conta mais vitórias que partidas", () => {
    const { history } = normalizeProfile({
      stats: { history: { lixo: { games: 1 }, "2026-11-01": { games: 2, wins: 9 }, "2026-11-02": { games: -1 } } },
    }).stats;
    expect(history).toEqual({ "2026-11-01": { games: 2, wins: 2 } });
  });
});

describe("ícones do perfil", () => {
  it("mantém ícones novos ao salvar e rejeita ids desconhecidos", () => {
    expect(normalizeProfile({ iconId: "samurai" }).iconId).toBe("samurai");
    expect(normalizeProfile({ iconId: "nao-existe" }).iconId).toBe("spade");
  });

  it("tem ids únicos e todo tema tem ícones", () => {
    const ids = PROFILE_ICONS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const group of PROFILE_ICON_GROUPS) {
      expect(PROFILE_ICONS.some((i) => i.group === group)).toBe(true);
    }
    expect(getProfileIconGroup("astronaut")).toBe("explorers");
  });
});
