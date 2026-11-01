import { describe, expect, it } from "vitest";
import {
  aggregateLeague,
  computeStreak,
  dailyPoints,
  leagueTier,
  nextDayStart,
  nextWeekStart,
  previousWeekKey,
  sortDailyResults,
  weekKey,
} from "./competition";
import { seededRandom } from "./seededRandom";

function result(playerKey: string, points: number, overrides: Partial<Parameters<typeof aggregateLeague>[0][number]> = {}) {
  return { playerKey, displayName: playerKey, won: false, score: 0, points, createdAt: new Date(0), ...overrides };
}

describe("computeStreak", () => {
  it("conta dias consecutivos terminando hoje ou ontem", () => {
    const days = ["2026-10-30", "2026-10-31", "2026-11-01"];
    expect(computeStreak(days, "2026-11-01")).toEqual({ current: 3, best: 3 });
    expect(computeStreak(days, "2026-11-02")).toEqual({ current: 3, best: 3 });
  });

  it("zera a sequência atual depois de pular um dia, mantendo a melhor", () => {
    expect(computeStreak(["2026-10-30", "2026-10-31"], "2026-11-02")).toEqual({ current: 0, best: 2 });
  });

  it("recomeça depois de um buraco e ignora dias repetidos", () => {
    const days = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-11-01", "2026-11-01"];
    expect(computeStreak(days, "2026-11-01")).toEqual({ current: 1, best: 3 });
  });

  it("atravessa a virada de mês e ano", () => {
    expect(computeStreak(["2026-12-31", "2027-01-01"], "2027-01-01").current).toBe(2);
  });

  it("não tem streak sem partidas", () => {
    expect(computeStreak([], "2026-11-01")).toEqual({ current: 0, best: 0 });
  });
});

describe("semanas", () => {
  it("segue a semana ISO, inclusive na virada do ano", () => {
    expect(weekKey(new Date("2026-11-01T23:59:00Z"))).toBe("2026-W44"); // domingo
    expect(weekKey(new Date("2026-11-02T00:00:00Z"))).toBe("2026-W45"); // segunda
    expect(weekKey(new Date("2027-01-01T12:00:00Z"))).toBe("2026-W53");
    expect(weekKey(new Date("2025-12-29T12:00:00Z"))).toBe("2026-W01");
  });

  it("calcula semana anterior e próximos reinícios", () => {
    expect(previousWeekKey(new Date("2026-11-02T00:00:00Z"))).toBe("2026-W44");
    expect(nextWeekStart(new Date("2026-11-01T23:00:00Z")).toISOString()).toBe("2026-11-02T00:00:00.000Z");
    expect(nextWeekStart(new Date("2026-11-02T00:00:00Z")).toISOString()).toBe("2026-11-09T00:00:00.000Z");
    expect(nextDayStart(new Date("2026-12-31T23:00:00Z")).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("pontos e faixas", () => {
  it("premia vitória e score baixo com limite de bônus", () => {
    expect(dailyPoints(false, 30)).toBe(10);
    expect(dailyPoints(true, 5)).toBe(35);
    expect(dailyPoints(true, -20)).toBe(40);
  });

  it("define a faixa pelos pontos", () => {
    expect(leagueTier(0)).toBe("bronze");
    expect(leagueTier(50)).toBe("silver");
    expect(leagueTier(120)).toBe("gold");
    expect(leagueTier(250)).toBe("diamond");
  });
});

describe("rankings", () => {
  it("desempata o dia por quem terminou primeiro", () => {
    const rows = sortDailyResults([
      result("late", 0, { score: 4, createdAt: new Date(2000) }),
      result("early", 0, { score: 4, createdAt: new Date(1000) }),
      result("best", 0, { score: 1, createdAt: new Date(3000) }),
    ]);
    expect(rows.map((r) => r.playerKey)).toEqual(["best", "early", "late"]);
  });

  it("soma por jogador e usa o nome mais recente", () => {
    const standings = aggregateLeague([
      result("a", 10, { displayName: "Antigo", createdAt: new Date(1000), won: true }),
      result("b", 15),
      result("a", 10, { displayName: "Novo", createdAt: new Date(2000) }),
    ]);
    expect(standings[0]).toMatchObject({ playerKey: "a", name: "Novo", points: 20, wins: 1, games: 2, rank: 1 });
    expect(standings[1]).toMatchObject({ playerKey: "b", rank: 2 });
  });
});

describe("seededRandom", () => {
  it("é reprodutível e varia com a seed", () => {
    const sequence = (seed: string) => {
      const random = seededRandom(seed);
      return Array.from({ length: 5 }, () => random());
    };
    expect(sequence("a")).toEqual(sequence("a"));
    expect(sequence("a")).not.toEqual(sequence("b"));
    expect(sequence("a").every((n) => n >= 0 && n < 1)).toBe(true);
  });
});
