import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Smile } from "lucide-react";
import { Button } from "@/components/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/contexts/i18n-context";
import { cn } from "@/lib/utils";
import { EMOTE_COOLDOWN_MS, EMOTES, getEmoteEmoji, type EmoteId } from "@shared/emotes";

interface EmotePickerProps {
  compact?: boolean;
  onSelect: (emoteId: EmoteId) => void;
}

export function EmotePicker({ compact = false, onSelect }: EmotePickerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [coolingDown, setCoolingDown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

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
          {EMOTES.map((emote) => (
            <button
              key={emote.id}
              type="button"
              aria-label={t(`emote.${emote.id}`)}
              onClick={() => handleSelect(emote.id)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl hover:bg-indigo-50"
            >
              {emote.emoji}
            </button>
          ))}
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
          {emoji}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
