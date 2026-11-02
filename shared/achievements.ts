/** Contadores de progresso de conquistas (conta global). */
export type AchievementProgress = {
  botWinsEasy: number;
  botWinsMedium: number;
  botWinsHard: number;
  botGamesEasy: number;
  botGamesMedium: number;
  botGamesHard: number;
  pvpWins: number;
  anyWins: number;
  gamesPlayed: number;
  bestScore: number | null;
  winStreak: number;
  bestWinStreak: number;
};

export type AchievementStat = keyof AchievementProgress;

export type CosmeticReward = {
  type: "frame" | "title" | "banner";
  id: string;
};

export type AchievementDef = {
  id: string;
  /** Campo em AchievementProgress a comparar */
  stat: AchievementStat;
  threshold: number;
  /** Para bestScore: menor ou igual ao threshold conta (ex.: 0). */
  compare?: "gte" | "lte";
  category: "bots" | "pvp" | "general";
  reward?: CosmeticReward;
};

export const DEFAULT_PROGRESS: AchievementProgress = {
  botWinsEasy: 0,
  botWinsMedium: 0,
  botWinsHard: 0,
  botGamesEasy: 0,
  botGamesMedium: 0,
  botGamesHard: 0,
  pvpWins: 0,
  anyWins: 0,
  gamesPlayed: 0,
  bestScore: null,
  winStreak: 0,
  bestWinStreak: 0,
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "wins_1",
    stat: "anyWins",
    threshold: 1,
    category: "general",
    reward: { type: "title", id: "rookie" },
  },
  {
    id: "bot_easy_10",
    stat: "botWinsEasy",
    threshold: 10,
    category: "bots",
    reward: { type: "frame", id: "bronze_ring" },
  },
  {
    id: "bot_medium_50",
    stat: "botWinsMedium",
    threshold: 50,
    category: "bots",
    reward: { type: "banner", id: "forest" },
  },
  {
    id: "bot_hard_10",
    stat: "botWinsHard",
    threshold: 10,
    category: "bots",
    reward: { type: "title", id: "bot_slayer" },
  },
  {
    id: "bot_hard_100",
    stat: "botWinsHard",
    threshold: 100,
    category: "bots",
    reward: { type: "title", id: "hard_mode_hero" },
  },
  {
    id: "pvp_10",
    stat: "pvpWins",
    threshold: 10,
    category: "pvp",
    reward: { type: "frame", id: "gold_ring" },
  },
  {
    id: "pvp_50",
    stat: "pvpWins",
    threshold: 50,
    category: "pvp",
    reward: { type: "banner", id: "arena" },
  },
  {
    id: "games_50",
    stat: "gamesPlayed",
    threshold: 50,
    category: "general",
    reward: { type: "banner", id: "night" },
  },
  {
    id: "games_200",
    stat: "gamesPlayed",
    threshold: 200,
    category: "general",
    reward: { type: "frame", id: "neon" },
  },
  {
    id: "streak_5",
    stat: "bestWinStreak",
    threshold: 5,
    category: "general",
    reward: { type: "title", id: "card_shark" },
  },
  {
    id: "best_score_0",
    stat: "bestScore",
    threshold: 0,
    compare: "lte",
    category: "general",
    reward: { type: "banner", id: "celestial" },
  },
  {
    id: "pvp_100",
    stat: "pvpWins",
    threshold: 100,
    category: "pvp",
    reward: { type: "frame", id: "entity_aura" },
  },
  {
    id: "pvp_100_title",
    stat: "pvpWins",
    threshold: 100,
    category: "pvp",
    reward: { type: "title", id: "entity_contender" },
  },
];

export function normalizeProgress(raw: unknown): AchievementProgress {
  const p = (raw && typeof raw === "object" ? raw : {}) as Partial<AchievementProgress>;
  return {
    botWinsEasy: Number(p.botWinsEasy) || 0,
    botWinsMedium: Number(p.botWinsMedium) || 0,
    botWinsHard: Number(p.botWinsHard) || 0,
    botGamesEasy: Number(p.botGamesEasy) || 0,
    botGamesMedium: Number(p.botGamesMedium) || 0,
    botGamesHard: Number(p.botGamesHard) || 0,
    pvpWins: Number(p.pvpWins) || 0,
    anyWins: Number(p.anyWins) || 0,
    gamesPlayed: Number(p.gamesPlayed) || 0,
    bestScore: p.bestScore === null || p.bestScore === undefined ? null : Number(p.bestScore),
    winStreak: Number(p.winStreak) || 0,
    bestWinStreak: Number(p.bestWinStreak) || 0,
  };
}

export function normalizeAchievements(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

export function isAchievementMet(def: AchievementDef, progress: AchievementProgress): boolean {
  const value = progress[def.stat];
  if (def.stat === "bestScore") {
    if (value === null || value === undefined) return false;
    const n = Number(value);
    if (def.compare === "lte") return n <= def.threshold;
    return n >= def.threshold;
  }
  const n = Number(value) || 0;
  if (def.compare === "lte") return n <= def.threshold;
  return n >= def.threshold;
}

/** Retorna IDs de conquistas novas desbloqueadas (não inclui as já existentes). */
export function evaluateNewAchievements(
  progress: AchievementProgress,
  alreadyUnlocked: string[],
): string[] {
  const have = new Set(alreadyUnlocked);
  const newly: string[] = [];
  for (const def of ACHIEVEMENTS) {
    if (have.has(def.id)) continue;
    if (isAchievementMet(def, progress)) newly.push(def.id);
  }
  return newly;
}

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function progressValue(progress: AchievementProgress, stat: AchievementStat): number {
  const v = progress[stat];
  if (v === null || v === undefined) return 0;
  return Number(v) || 0;
}
