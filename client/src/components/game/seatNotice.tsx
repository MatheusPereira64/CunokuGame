import { createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Crown,
  Eye,
  Layers,
  Lock,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { ActionKind } from "@/lib/actionFeed";
import { cn } from "@/lib/utils";

export type NoticeTone = "info" | "ability" | "alert" | "penalty";

export interface SeatNotice {
  id: number;
  kind: ActionKind;
  text: string;
  tone: NoticeTone;
}

export interface PersonalAlert {
  id: number;
  kind: ActionKind;
  actorName: string;
  text: string;
}

/** Último aviso de cada jogador, por id. */
export const SeatNoticeContext = createContext<Record<string, SeatNotice>>({});

/** Alerta de quem mexeu nas suas cartas; aparece colado na sua mão. */
export const PersonalAlertContext = createContext<PersonalAlert | null>(null);

export function useSeatNotice(playerId: string): SeatNotice | undefined {
  return useContext(SeatNoticeContext)[playerId];
}

const ICONS: Record<ActionKind, LucideIcon> = {
  draw_deck: Layers,
  draw_discard: ArrowUpFromLine,
  discard: ArrowDownToLine,
  replace: RefreshCw,
  jack: Sparkles,
  peek_own: Eye,
  peek: Eye,
  swap: ArrowLeftRight,
  seal: Lock,
  queen: Crown,
  king: Crown,
  joker: Sparkles,
  wind: Wind,
  forced: ArrowLeftRight,
  penalty_draw: ShieldAlert,
  penalty_skip: ShieldAlert,
};

const TONES: Record<NoticeTone, string> = {
  info: "bg-neutral-950/85 text-white border-white/15",
  ability: "bg-indigo-950/90 text-amber-100 border-amber-300/60",
  alert: "bg-amber-400 text-amber-950 border-amber-200",
  penalty: "bg-red-600/95 text-white border-red-300/70",
};

/**
 * Balão curto junto ao avatar de quem jogou: o olho já está no assento, sem banner cobrindo a mesa.
 * O pai precisa ser `relative`.
 */
export function SeatNoticeChip({ notice, className }: { notice?: SeatNotice; className?: string }) {
  const Icon = notice ? ICONS[notice.kind] : null;
  return (
    <AnimatePresence>
      {notice && Icon && (
        <motion.div
          key={notice.id}
          role="status"
          initial={{ opacity: 0, scale: 0.7, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -4 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className={cn(
            "pointer-events-none absolute z-50 flex max-w-[11rem] items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-tight shadow-lg backdrop-blur-sm",
            TONES[notice.tone],
            className,
          )}
        >
          <Icon className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{notice.text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Alguém mexeu nas suas cartas: aviso destacado logo acima da sua mão, sem bloquear toques.
 * O pai precisa ser `relative`.
 */
export function PersonalAlertBubble({ className }: { className?: string }) {
  const alert = useContext(PersonalAlertContext);
  const Icon = alert ? ICONS[alert.kind] : null;
  return (
    <div className={cn("pointer-events-none absolute z-[60] flex justify-center", className)} aria-live="assertive">
      <AnimatePresence>
        {alert && Icon && (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="flex w-max max-w-[min(90vw,28rem)] items-center gap-2 rounded-2xl border-2 border-amber-200 bg-amber-400 px-3 py-2 text-amber-950 shadow-[0_8px_30px_rgba(251,191,36,0.45)]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-950/15">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-sm font-bold leading-snug">{alert.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
