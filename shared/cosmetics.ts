import { ACHIEVEMENTS, normalizeAchievements } from "./achievements";

export type FrameId = "none" | "bronze_ring" | "gold_ring" | "neon" | "entity_aura";
export type TitleId =
  | "none"
  | "rookie"
  | "bot_slayer"
  | "hard_mode_hero"
  | "card_shark"
  | "entity_contender";
export type BannerId = "default" | "forest" | "night" | "arena" | "celestial";

export const FRAME_IDS: FrameId[] = ["none", "bronze_ring", "gold_ring", "neon", "entity_aura"];
export const TITLE_IDS: TitleId[] = [
  "none",
  "rookie",
  "bot_slayer",
  "hard_mode_hero",
  "card_shark",
  "entity_contender",
];
export const BANNER_IDS: BannerId[] = ["default", "forest", "night", "arena", "celestial"];

/** Sempre liberados sem conquista. */
export const FREE_FRAMES = new Set<string>(["none"]);
export const FREE_TITLES = new Set<string>(["none", "rookie"]);
export const FREE_BANNERS = new Set<string>(["default"]);

function unlockedByAchievements(achievements: string[]): {
  frames: Set<string>;
  titles: Set<string>;
  banners: Set<string>;
} {
  const frames = new Set(FREE_FRAMES);
  const titles = new Set(FREE_TITLES);
  const banners = new Set(FREE_BANNERS);
  const have = new Set(normalizeAchievements(achievements));
  for (const def of ACHIEVEMENTS) {
    if (!have.has(def.id) || !def.reward) continue;
    if (def.reward.type === "frame") frames.add(def.reward.id);
    if (def.reward.type === "title") titles.add(def.reward.id);
    if (def.reward.type === "banner") banners.add(def.reward.id);
  }
  return { frames, titles, banners };
}

export function isFrameUnlocked(frameId: string, achievements: string[]): boolean {
  return unlockedByAchievements(achievements).frames.has(frameId);
}

export function isTitleUnlocked(titleId: string, achievements: string[]): boolean {
  return unlockedByAchievements(achievements).titles.has(titleId);
}

export function isBannerUnlocked(bannerId: string, achievements: string[]): boolean {
  return unlockedByAchievements(achievements).banners.has(bannerId);
}

export function isCosmeticUnlocked(
  type: "frame" | "title" | "banner",
  id: string,
  achievements: string[],
): boolean {
  if (type === "frame") return isFrameUnlocked(id, achievements);
  if (type === "title") return isTitleUnlocked(id, achievements);
  return isBannerUnlocked(id, achievements);
}

/** Qual conquista libera este cosmético (se houver). */
export function achievementUnlockingCosmetic(
  type: "frame" | "title" | "banner",
  id: string,
): string | null {
  if (
    (type === "frame" && FREE_FRAMES.has(id)) ||
    (type === "title" && FREE_TITLES.has(id)) ||
    (type === "banner" && FREE_BANNERS.has(id))
  ) {
    return null;
  }
  const def = ACHIEVEMENTS.find((a) => a.reward?.type === type && a.reward.id === id);
  return def?.id ?? null;
}

/** Classes Tailwind para molduras no avatar. */
export const FRAME_STYLES: Record<FrameId, string> = {
  none: "",
  bronze_ring: "ring-4 ring-amber-700 shadow-[0_0_12px_rgba(180,83,9,0.45)]",
  gold_ring: "ring-4 ring-yellow-400 shadow-[0_0_14px_rgba(250,204,21,0.55)]",
  neon: "ring-4 ring-fuchsia-400 shadow-[0_0_16px_rgba(232,121,249,0.6)]",
  entity_aura: "ring-4 ring-violet-300 shadow-[0_0_20px_rgba(196,181,253,0.75)]",
};

export const BANNER_STYLES: Record<BannerId, string> = {
  default: "bg-gradient-to-br from-indigo-50 to-white",
  forest: "bg-gradient-to-br from-emerald-100 via-teal-50 to-lime-50",
  night: "bg-gradient-to-br from-slate-800 via-indigo-900 to-slate-900 text-white",
  arena: "bg-gradient-to-br from-orange-100 via-red-50 to-amber-50",
  celestial: "bg-gradient-to-br from-violet-200 via-fuchsia-100 to-sky-100",
};
