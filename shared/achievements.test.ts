import { describe, it, expect } from "vitest";
import {
  evaluateNewAchievements,
  isAchievementMet,
  normalizeProgress,
  DEFAULT_PROGRESS,
  type AchievementProgress,
} from "./achievements";
import { isCosmeticUnlocked, isFrameUnlocked, isTitleUnlocked } from "./cosmetics";
import { __test } from "./rankService";

describe("achievements evaluate", () => {
  it("desbloqueia bot_hard_100 ao atingir 100 vitórias hard", () => {
    const progress: AchievementProgress = {
      ...DEFAULT_PROGRESS,
      botWinsHard: 100,
    };
    const newly = evaluateNewAchievements(progress, []);
    expect(newly).toContain("bot_hard_100");
    expect(newly).toContain("bot_hard_10");
  });

  it("não re-desbloqueia conquistas já obtidas", () => {
    const progress: AchievementProgress = {
      ...DEFAULT_PROGRESS,
      anyWins: 5,
    };
    expect(evaluateNewAchievements(progress, ["wins_1"])).not.toContain("wins_1");
  });

  it("best_score_0 usa comparação lte", () => {
    const def = {
      id: "best_score_0",
      stat: "bestScore" as const,
      threshold: 0,
      compare: "lte" as const,
      category: "general" as const,
    };
    expect(isAchievementMet(def, { ...DEFAULT_PROGRESS, bestScore: 0 })).toBe(true);
    expect(isAchievementMet(def, { ...DEFAULT_PROGRESS, bestScore: -2 })).toBe(true);
    expect(isAchievementMet(def, { ...DEFAULT_PROGRESS, bestScore: 3 })).toBe(false);
    expect(isAchievementMet(def, { ...DEFAULT_PROGRESS, bestScore: null })).toBe(false);
  });
});

describe("cosmetics unlock", () => {
  it("defaults livres sem conquistas", () => {
    expect(isFrameUnlocked("none", [])).toBe(true);
    expect(isTitleUnlocked("rookie", [])).toBe(true);
    expect(isCosmeticUnlocked("banner", "default", [])).toBe(true);
  });

  it("hard_mode_hero só com bot_hard_100", () => {
    expect(isTitleUnlocked("hard_mode_hero", [])).toBe(false);
    expect(isTitleUnlocked("hard_mode_hero", ["bot_hard_100"])).toBe(true);
  });
});

describe("applyMatchToProgress", () => {
  it("bots hard incrementa botWinsHard, não pvpWins", () => {
    const next = __test.applyMatchToProgress(normalizeProgress({}), {
      won: true,
      finalScore: 4,
      mode: "bots",
      botDifficulty: "hard",
    });
    expect(next.botWinsHard).toBe(1);
    expect(next.pvpWins).toBe(0);
    expect(next.anyWins).toBe(1);
    expect(next.gamesPlayed).toBe(1);
  });

  it("pvp vitória incrementa pvpWins e streak", () => {
    const next = __test.applyMatchToProgress(normalizeProgress({ winStreak: 2, bestWinStreak: 2 }), {
      won: true,
      finalScore: 1,
      mode: "pvp",
    });
    expect(next.pvpWins).toBe(1);
    expect(next.winStreak).toBe(3);
    expect(next.bestWinStreak).toBe(3);
  });
});
