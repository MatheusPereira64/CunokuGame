import { lazy, Suspense, type ReactNode } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import { useToast } from "@/hooks/use-toast";
import { publicProfileUrl } from "@/pages/PublicProfile";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RankBadge } from "@/components/RankBadge";
import { useI18n } from "@/contexts/i18n-context";
import { cn, fit } from "@/lib/utils";
import { CHART_DAYS, PROFILE_ACCENTS, recentDailyStats, type PlayerProfile, type ProfileAccent } from "@/lib/playerProfile";
import type { PublicRankProfile, SavedAccount } from "@/lib/rankAuth";
import { ArrowLeft, Check, Globe, Lock, X } from "lucide-react";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ACHIEVEMENTS, progressValue, type AchievementProgress } from "@shared/achievements";
import { BANNER_IDS, BANNER_STYLES, FRAME_IDS, FRAME_STYLES, TITLE_IDS, isCosmeticUnlocked, type FrameId } from "@shared/cosmetics";

/* Partes do diálogo de perfil: cada bloco da tela em um componente próprio. */

const StatsChart = lazy(() => import("@/components/StatsChart"));

export function ProfileDialogHeader({ view, isLandscapeMenu, onBack }: { view: "profile" | "account"; isLandscapeMenu: boolean; onBack: () => void }) {
  const { t } = useI18n();
  const account = view === "account";
  return (
    <DialogHeader className={cn(isLandscapeMenu && "pr-6 space-y-0.5")}>
      {account && (
        <button
          type="button"
          className="inline-flex items-center text-sm text-indigo-700 hover:text-indigo-900 font-medium mb-0.5 w-fit"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t("rank.backToProfile")}
        </button>
      )}
      <DialogTitle className={cn("font-display text-indigo-900", fit(isLandscapeMenu, "text-lg", "text-2xl"))}>
        {t(account ? "rank.accountTitle" : "profile.title")}
      </DialogTitle>
      {account ? (
        <DialogDescription className={cn(fit(isLandscapeMenu, "text-xs", "text-sm"))}>{t("rank.accountHint")}</DialogDescription>
      ) : (
        <DialogDescription className={cn(isLandscapeMenu && "text-xs line-clamp-2")}>{t("profile.description")}</DialogDescription>
      )}
    </DialogHeader>
  );
}

export function AccentPicker({ accent, onChange }: { accent: ProfileAccent; onChange: (id: ProfileAccent) => void }) {
  const { t } = useI18n();
  return (
    <div className="space-y-1.5">
      <Label>{t("profile.accent")}</Label>
      <div className="flex flex-wrap gap-2 items-center min-h-9">
        {PROFILE_ACCENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(a.id)}
            className={cn(
              "w-8 h-8 rounded-full border-2 transition-transform",
              a.soft,
              accent === a.id ? "scale-110 border-indigo-900 ring-2 ring-indigo-300" : "border-white",
            )}
            aria-label={a.id}
          />
        ))}
      </div>
    </div>
  );
}

/** Partidas dos últimos dias: resumo e gráfico (o gráfico só carrega com o diálogo aberto). */
export function RecentGames({ stats, open }: { stats: PlayerProfile["stats"]; open: boolean }) {
  const { t } = useI18n();
  const recent = recentDailyStats(stats);
  const games = recent.reduce((sum, d) => sum + d.games, 0);
  const wins = recent.reduce((sum, d) => sum + d.wins, 0);
  return (
    <div className="space-y-1.5">
      <Label>{t("profile.last30Days", { days: String(CHART_DAYS) })}</Label>
      {games === 0 ? (
        <p className="rounded-lg bg-gray-50 p-3 text-center text-xs text-gray-600">{t("profile.noRecentGames")}</p>
      ) : (
        <>
          <p className="text-xs text-gray-700">
            {t("profile.recentSummary", { wins: String(wins), games: String(games), rate: String(Math.round((wins / games) * 100)) })}
          </p>
          {open && (
            <Suspense fallback={<div className="h-40" />}>
              <StatsChart data={recent} />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
}

/** Dois ou mais botões lado a lado em que um fica marcado (abas simples). */
export function ChoiceTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (id: T) => void; options: { id: T; label: string; icon?: ReactNode }[] }) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <Button key={o.id} type="button" variant={value === o.id ? "primary" : "outline"} size="sm" className="flex-1" onClick={() => onChange(o.id)}>
          {o.icon}
          {o.label}
        </Button>
      ))}
    </div>
  );
}

export function ProfileStatTiles({ isLandscapeMenu, profile, rate }: { isLandscapeMenu: boolean; profile: PlayerProfile; rate: number }) {
  const { t } = useI18n();
  return (
    <>
      <div className={cn("grid gap-2", fit(isLandscapeMenu, "grid-cols-4", "grid-cols-2"))}>
        <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-2 text-center">
          <div className="text-[10px] uppercase tracking-wide text-indigo-500 font-semibold">
            {t("profile.gamesPlayed")}
          </div>
          <div className={cn("font-bold text-indigo-900", fit(isLandscapeMenu, "text-base", "text-lg"))}>
            {profile.stats.gamesPlayed}
          </div>
        </div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2 text-center">
          <div className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">
            {t("profile.wins")}
          </div>
          <div className={cn("font-bold text-emerald-900", fit(isLandscapeMenu, "text-base", "text-lg"))}>
            {profile.stats.wins}
          </div>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-2 text-center">
          <div className="text-[10px] uppercase tracking-wide text-amber-600 font-semibold">
            {t("profile.bestScore")}
          </div>
          <div className={cn("font-bold text-amber-900", fit(isLandscapeMenu, "text-base", "text-lg"))}>
            {profile.stats.bestScore === null ? "—" : profile.stats.bestScore}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-2 text-center">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
            {t("profile.winRate")}
          </div>
          <div className={cn("font-bold text-slate-800", fit(isLandscapeMenu, "text-base", "text-lg"))}>
            {rate}%
          </div>
        </div>
      </div>
      {!isLandscapeMenu && (
        <p className="text-[11px] text-gray-500 leading-snug">{t("profile.bestScoreHint")}</p>
      )}
    </>
  );
}

export function AccountEntryButton({ rankProfile, onOpen }: { rankProfile: PublicRankProfile | null; onOpen: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-50 px-3 py-2.5 text-left transition-colors"
    >
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-indigo-700 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-indigo-900 flex items-center gap-2 flex-wrap">
            {t("rank.accountTitle")}
            {rankProfile && <RankBadge rank={rankProfile.rank} compact />}
          </div>
          <div className="text-[11px] text-indigo-700/80 truncate">
            {rankProfile
              ? [rankProfile.nickname ? `@${rankProfile.nickname}` : t("rank.noUsername"), rankProfile.position ? `#${rankProfile.position}` : "", `${rankProfile.wins}W`].filter(Boolean).join(" · ")
              : t("rank.openAccount")}
          </div>
        </div>
      </div>
    </button>
  );
}

export function RankCard({ rankProfile, titleId, frameId, bannerClass }: { rankProfile: PublicRankProfile; titleId: string; frameId: string; bannerClass: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  return (
    <div
      className={cn(
        "rounded-xl border border-indigo-200 p-3 flex items-center justify-between gap-2",
        bannerClass,
      )}
    >
      <div className="min-w-0">
        <div className="font-bold truncate">
          {rankProfile.nickname ? `@${rankProfile.nickname}` : rankProfile.displayName || t("rank.noUsername")}
        </div>
        {rankProfile.email && <div className="text-[11px] opacity-70 truncate">{rankProfile.email}</div>}
        {titleId !== "none" && (
          <div className="text-xs opacity-80 truncate">{t(`cosmetic.title.${titleId}`)}</div>
        )}
        <div className="text-xs opacity-70">
          {rankProfile.position ? `#${rankProfile.position} · ` : ""}
          {rankProfile.wins}W
        </div>
        {rankProfile.nickname && (
          <button
            type="button"
            className="mt-1 text-xs font-semibold underline underline-offset-2 opacity-90 hover:opacity-100"
            onClick={async () => {
              const ok = await copyToClipboard(publicProfileUrl(rankProfile.nickname));
              toast({ title: ok ? t("profilePage.copied") : t("error.generic") });
            }}
          >
            {t("profilePage.copyMine")}
          </button>
        )}
      </div>
      <div
        className={cn(
          "w-12 h-12 rounded-full border-2 flex items-center justify-center bg-white/80",
          FRAME_STYLES[(frameId as FrameId) || "none"],
        )}
      >
        <RankBadge rank={rankProfile.rank} compact />
      </div>
    </div>
  );
}

export function ChooseUsernameCard({ username, setUsername, usernameBusy, usernameError, handleChooseUsername }: { username: string; setUsername: (v: string) => void; usernameBusy: boolean; usernameError: string | null; handleChooseUsername: () => Promise<void> }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 space-y-2">
      <div>
        <div className="text-sm font-bold text-amber-950">{t("rank.chooseUsername")}</div>
        <p className="text-xs text-amber-900/80">{t("rank.chooseUsernameHint")}</p>
      </div>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">@</span>
          <Input
            id="rankUsername"
            aria-label={t("rank.username")}
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, "_").slice(0, 16))}
            onKeyDown={(e) => e.key === "Enter" && void handleChooseUsername()}
            placeholder={t("profile.nicknamePlaceholder")}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={16}
            className="h-9 pl-6 text-sm"
          />
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="h-9 shrink-0"
          isLoading={usernameBusy}
          disabled={username.trim().length < 3}
          onClick={() => void handleChooseUsername()}
        >
          {t("rank.usernameSave")}
        </Button>
      </div>
      <p className="text-[11px] text-amber-900/70">{t("rank.usernameRules")}</p>
      {usernameError && <p className="text-xs text-red-600">{usernameError}</p>}
    </div>
  );
}

export function LinkEmailCard({ isLandscapeMenu, email, setEmail, password, setPassword, usernameBusy, usernameError, handleLinkEmail }: { isLandscapeMenu: boolean; email: string; setEmail: (v: string) => void; password: string; setPassword: (v: string) => void; usernameBusy: boolean; usernameError: string | null; handleLinkEmail: () => Promise<void> }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 space-y-2">
      <div>
        <div className="text-sm font-bold text-amber-950">{t("rank.linkEmailTitle")}</div>
        <p className="text-xs text-amber-900/80">{t("rank.linkEmailHint")}</p>
      </div>
      <div className={cn(fit(isLandscapeMenu, "grid grid-cols-2 gap-2", "space-y-2"))}>
        <Input
          type="email"
          aria-label={t("rank.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("rank.emailPlaceholder")}
          autoComplete="email"
          autoCapitalize="none"
          className="h-9 text-sm"
        />
        <Input
          type="password"
          aria-label={t("rank.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("rank.passwordPlaceholder")}
          autoComplete="new-password"
          className="h-9 text-sm"
        />
      </div>
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="w-full"
        isLoading={usernameBusy}
        onClick={() => void handleLinkEmail()}
      >
        {t("rank.linkEmailSubmit")}
      </Button>
      {usernameError && <p className="text-xs text-red-600">{usernameError}</p>}
    </div>
  );
}

export function CosmeticPicker({ achievements, frameId, setFrameId, titleId, setTitleId, bannerId, setBannerId, cosmeticBusy, cosmeticError, handleSaveCosmetics }: { achievements: string[]; frameId: string; setFrameId: (v: string) => void; titleId: string; setTitleId: (v: string) => void; bannerId: string; setBannerId: (v: string) => void; cosmeticBusy: boolean; cosmeticError: string | null; handleSaveCosmetics: () => Promise<void> }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t("cosmetic.frame")}</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {FRAME_IDS.map((id) => {
            const unlocked = isCosmeticUnlocked("frame", id, achievements);
            return (
              <button
                key={id}
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && setFrameId(id)}
                className={cn(
                  "relative aspect-square rounded-xl border-2 bg-white flex items-center justify-center",
                  frameId === id ? "border-indigo-600" : "border-gray-200",
                  !unlocked && "opacity-50",
                  FRAME_STYLES[id],
                )}
                title={t(`cosmetic.frame.${id}`)}
              >
                {!unlocked && <Lock className="w-3.5 h-3.5 text-gray-500" />}
                {unlocked && frameId === id && <Check className="w-4 h-4 text-indigo-700" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("cosmetic.titleLabel")}</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {TITLE_IDS.map((id) => {
            const unlocked = isCosmeticUnlocked("title", id, achievements);
            return (
              <button
                key={id}
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && setTitleId(id)}
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-left text-xs font-medium truncate",
                  titleId === id
                    ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                    : "border-gray-200 bg-white text-gray-700",
                  !unlocked && "opacity-50",
                )}
              >
                {!unlocked && <Lock className="w-3 h-3 inline mr-1" />}
                {t(`cosmetic.title.${id}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("cosmetic.banner")}</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {BANNER_IDS.map((id) => {
            const unlocked = isCosmeticUnlocked("banner", id, achievements);
            return (
              <button
                key={id}
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && setBannerId(id)}
                className={cn(
                  "h-9 rounded-lg border-2",
                  BANNER_STYLES[id],
                  bannerId === id ? "border-indigo-700" : "border-gray-200",
                  !unlocked && "opacity-50",
                )}
                title={t(`cosmetic.banner.${id}`)}
              >
                {!unlocked && <Lock className="w-3 h-3 mx-auto text-gray-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {cosmeticError && <p className="text-xs text-red-600">{cosmeticError}</p>}
      <Button
        variant="primary"
        className="w-full"
        isLoading={cosmeticBusy}
        onClick={() => void handleSaveCosmetics()}
      >
        {t("cosmetic.save")}
      </Button>
    </div>
  );
}

export function AchievementList({ achievements, progress }: { achievements: string[]; progress: AchievementProgress }) {
  const { t } = useI18n();
  return (
    <ul className="space-y-1.5">
      {ACHIEVEMENTS.filter((a) => a.id !== "pvp_100_title").map((def) => {
        const unlocked = achievements.includes(def.id);
        const current = progressValue(progress, def.stat);
        const target = def.threshold;
        const showProgress =
          def.stat === "bestScore"
            ? progress.bestScore === null
              ? `— / ≤${target}`
              : `${progress.bestScore} / ≤${target}`
            : `${Math.min(current, target)} / ${target}`;
        return (
          <li
            key={def.id}
            className={cn(
              "rounded-lg border px-2.5 py-2",
              unlocked ? "border-emerald-300 bg-emerald-50/70" : "border-gray-100 bg-white",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-indigo-900 truncate">
                  {t(`achieve.${def.id}.title`)}
                </div>
                <div className="text-[11px] text-gray-600 leading-snug">
                  {t(`achieve.${def.id}.desc`)}
                </div>
                {def.reward && (
                  <div className="text-[10px] text-amber-700 mt-0.5">
                    {t("achieve.reward")}: {t(`cosmetic.${def.reward.type}.${def.reward.id}`)}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                {unlocked ? (
                  <Check className="w-4 h-4 text-emerald-600 ml-auto" />
                ) : (
                  <span className="text-[10px] font-mono text-gray-500">{showProgress}</span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function SavedAccountsList({ savedAccounts, switchingId, handleUseSaved, handleForgetSaved }: { savedAccounts: SavedAccount[]; switchingId: string | null; handleUseSaved: (account: SavedAccount) => Promise<void>; handleForgetSaved: (account: SavedAccount) => void }) {
  const { t } = useI18n();
  return (
    <div className="space-y-1.5">
      <Label>{t("rank.savedAccounts")}</Label>
      <ul className="space-y-1.5">
        {savedAccounts.map((account) => (
          <li key={account.playerId} className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-auto min-w-0 flex-1 justify-start py-1.5 text-left"
              isLoading={switchingId === account.playerId}
              onClick={() => void handleUseSaved(account)}
            >
              <span className="block min-w-0">
                <span className="block truncate font-bold">{account.displayName}</span>
                <span className="block truncate text-[11px] font-normal">
                  {account.email || (account.nickname ? `@${account.nickname}` : "")}
                  {account.token ? "" : ` · ${t("rank.needsPin")}`}
                </span>
              </span>
            </Button>
            <button
              type="button"
              className="shrink-0 rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600"
              aria-label={t("rank.forgetAccount", { nickname: account.displayName || account.email || account.nickname })}
              title={t("rank.forgetAccount", { nickname: account.displayName || account.email || account.nickname })}
              onClick={() => handleForgetSaved(account)}
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AuthFields({ isLandscapeMenu, authMode, email, setEmail, password, setPassword, authError, handleAuth }: { isLandscapeMenu: boolean; authMode: "login" | "register"; email: string; setEmail: (v: string) => void; password: string; setPassword: (v: string) => void; authError: string | null; handleAuth: () => Promise<void> }) {
  const { t } = useI18n();
  return (
    <>
      <div className={cn(fit(isLandscapeMenu, "grid grid-cols-2 gap-2", "space-y-3"))}>
        <div className="space-y-1.5">
          <Label htmlFor="rankEmail">{t("rank.email")}</Label>
          <Input
            id="rankEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("rank.emailPlaceholder")}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rankPassword">{t("rank.password")}</Label>
          <Input
            id="rankPassword"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleAuth()}
            placeholder={authMode === "register" ? t("rank.passwordPlaceholder") : "••••••••"}
            autoComplete={authMode === "register" ? "new-password" : "current-password"}
            maxLength={128}
            className="h-9 text-sm"
          />
        </div>
      </div>
      {authMode === "register" && <p className="text-[11px] text-gray-500">{t("rank.registerHint")}</p>}
      {authError && <p className="text-xs text-red-600">{authError}</p>}
    </>
  );
}
