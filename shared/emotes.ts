/** Emotes pré-definidos da mesa — não existe chat livre. */
export const EMOTES = [
  { id: "thumbs", emoji: "👍" },
  { id: "clap", emoji: "👏" },
  { id: "laugh", emoji: "😂" },
  { id: "wow", emoji: "😮" },
  { id: "think", emoji: "🤔" },
  { id: "sad", emoji: "😢" },
  { id: "angry", emoji: "😡" },
  { id: "fire", emoji: "🔥" },
] as const;

export type EmoteId = (typeof EMOTES)[number]["id"];

export const EMOTE_COOLDOWN_MS = 2000;

export function isEmoteId(value: unknown): value is EmoteId {
  return EMOTES.some((e) => e.id === value);
}

export function getEmoteEmoji(id: string): string | undefined {
  return EMOTES.find((e) => e.id === id)?.emoji;
}
