import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Smile } from "lucide-react";
import { Button } from "@/components/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/contexts/i18n-context";
import { cn } from "@/lib/utils";
import { EMOTE_COOLDOWN_MS, EMOTE_MOTION, EMOTES, getEmoteEmoji, type EmoteId } from "@shared/emotes";
import { featForReward, isRewardUnlocked } from "@shared/matchFeats";
import { useFeats } from "@/lib/feats";

interface EmotePickerProps {
  compact?: boolean;
  onSelect: (emoteId: EmoteId) => void;
}

export function EmotePicker({ compact = false, onSelect }: EmotePickerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [coolingDown, setCoolingDown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const feats = useFeats();

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleSelect = (emoteId: EmoteId) => {
    onSelect(emoteId);
    setOpen(false);
    setCoolingDown(true);
    timerRef.current = setTimeout(() => setCoolingDown(false), EMOTE_COOLDOWN_MS);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={coolingDown}
          aria-label={t("game.emotes")}
          className={cn(
            "bg-black/20 text-white border-white/20 backdrop-blur-sm hover:bg-black/30",
            compact ? "h-7 w-7 p-0" : "h-9 w-9 p-0",
          )}
        >
          <Smile className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[100] w-auto bg-white p-1.5">
        <div className="grid grid-cols-4 gap-1">
          {EMOTES.map((emote) => {
            const unlocked = isRewardUnlocked("emote", emote.id, feats);
            const feat = featForReward("emote", emote.id);
            const label = unlocked ? t(`emote.${emote.id}`) : t("feats.lockedBy", { feat: t(`feats.${feat}.title`) });
            return (
              <button
                key={emote.id}
                type="button"
                aria-label={label}
                title={label}
                disabled={!unlocked}
                onClick={() => handleSelect(emote.id)}
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-lg text-2xl",
                  unlocked ? "hover:bg-indigo-50" : "cursor-not-allowed opacity-40 grayscale",
                )}
              >
                {emote.emoji}
                {!unlocked && <Lock className="absolute bottom-0.5 right-0.5 h-3 w-3 text-gray-700" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Balão do emote; o pai precisa ser `relative`. */
export function EmoteBubble({ emoteId, className }: { emoteId?: string; className?: string }) {
  const emoji = emoteId ? getEmoteEmoji(emoteId) : undefined;
  return (
    <AnimatePresence>
      {emoji && (
        <motion.div
          key={emoteId}
          initial={{ opacity: 0, scale: 0.4, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: -8 }}
          className={cn(
            "pointer-events-none absolute z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl shadow-lg",
            className,
          )}
        >
          <span className={cn("inline-block", emoteId && EMOTE_MOTION[emoteId] && `emote-${EMOTE_MOTION[emoteId]}`)}>{emoji}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
