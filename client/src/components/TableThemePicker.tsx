import { useEffect, useState, type ReactNode } from "react";
import { Award, Lock, Paintbrush } from "lucide-react";
import { FEAT_IDS, FEAT_REWARDS, featForReward, type FeatReward } from "@shared/matchFeats";
import { getEmoteEmoji } from "@shared/emotes";
import { PlayingCard } from "@/components/PlayingCard";
import { useFeats } from "@/lib/feats";
import { Button } from "@/components/Button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/contexts/i18n-context";
import {
  CARD_BACKS,
  LIGHT_THEME,
  TABLE_MATS,
  isInSeason,
  isSeasonal,
  isThemeItemAvailable,
  loadTableTheme,
  saveTableTheme,
  subscribeTableTheme,
  type CardBackId,
  type TableMatId,
} from "@/lib/tableTheme";
import { cn } from "@/lib/utils";

function ThemeOption({
  label,
  selected,
  locked,
  lockLabel,
  tag,
  onPick,
  children,
}: {
  label: string;
  selected: boolean;
  locked: boolean;
  lockLabel: string;
  tag?: string;
  onPick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={locked}
      title={locked ? lockLabel : label}
      aria-label={locked ? lockLabel : label}
      className={cn(
        "relative flex flex-col items-center gap-1 rounded-xl border px-1.5 py-2 text-xs",
        selected ? "border-indigo-600 bg-indigo-50 text-indigo-900" : "border-gray-200",
        locked && "cursor-not-allowed opacity-50",
      )}
    >
      {children}
      <span className="leading-tight">{label}</span>
      {tag && <span className="absolute -top-2 right-1 rounded-full bg-red-600 px-1.5 text-[9px] font-bold text-white">{tag}</span>}
      {locked && (
        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/40">
          <Lock className="h-4 w-4 text-gray-700" />
        </span>
      )}
    </button>
  );
}

export function TableThemePicker() {
  const { t } = useI18n();
  const [theme, setTheme] = useState(loadTableTheme);
  const feats = useFeats();

  useEffect(() => subscribeTableTheme(() => setTheme(loadTableTheme())), []);

  const pick = (patch: Partial<{ back: CardBackId; mat: TableMatId }>) => {
    const next = { ...loadTableTheme(), ...patch };
    setTheme(next);
    saveTableTheme(next);
  };

  const tagFor = (id: string) => (isSeasonal(id) ? t("theme.seasonTag") : LIGHT_THEME.has(id) ? t("theme.lightTag") : undefined);
  const lockLabel = (kind: "back" | "mat", id: string) => {
    const feat = featForReward(kind, id);
    return feat ? t("feats.lockedBy", { feat: t(`feats.${feat}.title`) }) : t("theme.outOfSeason");
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>{t("theme.back")}</Label>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {CARD_BACKS.filter((id) => isInSeason(id)).map((id) => (
            <ThemeOption
              key={id}
              label={t(`theme.${id}`)}
              selected={theme.back === id}
              locked={!isThemeItemAvailable("back", id, feats)}
              lockLabel={lockLabel("back", id)}
              tag={tagFor(id)}
              onPick={() => pick({ back: id })}
            >
              <BackPreview id={id} />
            </ThemeOption>
          ))}
        </div>
      </div>
      <div>
        <Label>{t("theme.mat")}</Label>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {TABLE_MATS.filter((id) => isInSeason(id)).map((id) => (
            <ThemeOption
              key={id}
              label={t(`theme.${id}`)}
              selected={theme.mat === id}
              locked={!isThemeItemAvailable("mat", id, feats)}
              lockLabel={lockLabel("mat", id)}
              tag={tagFor(id)}
              onPick={() => pick({ mat: id })}
            >
              <span className={cn("block h-8 w-12 rounded-md border-[3px]", `felt-${id}`)} aria-hidden="true" />
            </ThemeOption>
          ))}
        </div>
      </div>
      <FeatList feats={feats} />
    </div>
  );
}

/** Verso em miniatura: usa o próprio PlayingCard com o tema forçado. */
function BackPreview({ id }: { id: CardBackId }) {
  return <PlayingCard hidden animate={false} backOverride={id} className="h-12 w-8 rounded-md border" />;
}

function FeatList({ feats }: { feats: readonly string[] }) {
  const { t } = useI18n();
  return (
    <div>
      <Label>{t("feats.title")}</Label>
      <ul className="mt-2 space-y-1.5">
        {FEAT_IDS.map((id) => {
          const done = feats.includes(id);
          return (
            <li key={id} className={cn("flex items-start gap-2 rounded-lg border p-2 text-xs", done ? "border-amber-300 bg-amber-50" : "border-gray-200")}>
              {done ? <Award className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> : <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />}
              <span>
                <span className="font-bold text-gray-900">{t(`feats.${id}.title`)}</span>
                <span className="block text-gray-600">{t(`feats.${id}.desc`)}</span>
                <span className="block text-indigo-800">
                  {t("feats.rewards")}: {FEAT_REWARDS[id].map((r) => rewardLabel(r, t)).join(", ")}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function rewardLabel(reward: FeatReward, t: (key: string) => string) {
  if (reward.type === "emote") return `${getEmoteEmoji(reward.id) ?? ""} ${t(`emote.${reward.id}`)}`;
  return `${t(reward.type === "back" ? "theme.back" : "theme.mat")} ${t(`theme.${reward.id}`)}`;
}

/** Atalho de pincel para trocar verso e tapete sem sair da mesa. */
export function TableThemeButton() {
  const { t } = useI18n();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("theme.title")}>
          <Paintbrush className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-indigo-900">{t("theme.title")}</DialogTitle>
          <DialogDescription>{t("theme.description")}</DialogDescription>
        </DialogHeader>
        <TableThemePicker />
      </DialogContent>
    </Dialog>
  );
}
