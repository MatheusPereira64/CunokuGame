import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/contexts/i18n-context";
import { useIsCompactGame, useIsPortrait } from "@/hooks/use-landscape";
import { cn } from "@/lib/utils";
import {
  loadProfile,
  saveProfile,
  winRate,
  PROFILE_ICONS,
  PROFILE_ACCENTS,
  type PlayerProfile,
  type ProfileAccent,
  type ProfileIconId,
} from "@/lib/playerProfile";
import {
  fetchRankMe,
  isRankLoggedIn,
  loginRankAccount,
  logoutRank,
  registerRankAccount,
  syncRankProfile,
  type PublicRankProfile,
} from "@/lib/rankAuth";
import { RankBadge } from "@/components/RankBadge";
import { ArrowLeft, Globe, UserRound } from "lucide-react";

type ProfileView = "profile" | "account";

interface ProfileDialogProps {
  compact?: boolean;
  onSaved?: (profile: PlayerProfile) => void;
}

export function ProfileDialog({ compact = false, onSaved }: ProfileDialogProps) {
  const { t } = useI18n();
  const isPortrait = useIsPortrait();
  const isCompactGame = useIsCompactGame();
  const isLandscapeMenu = compact || (isCompactGame && !isPortrait);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ProfileView>("profile");
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [name, setName] = useState(profile.displayName);
  const [iconId, setIconId] = useState<ProfileIconId>(profile.iconId);
  const [accent, setAccent] = useState<ProfileAccent>(profile.accent);

  const [rankProfile, setRankProfile] = useState<PublicRankProfile | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const p = loadProfile();
    setProfile(p);
    setName(p.displayName);
    setIconId(p.iconId);
    setAccent(p.accent);
    setView("profile");
    setAuthError(null);
    setPin("");
    if (isRankLoggedIn()) {
      void fetchRankMe()
        .then((rp) => setRankProfile(rp))
        .catch(() => setRankProfile(null));
    } else {
      setRankProfile(null);
    }
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setView("profile");
  };

  const handleSave = async () => {
    const next = saveProfile({ displayName: name, iconId, accent });
    setProfile(next);
    if (isRankLoggedIn()) {
      try {
        const synced = await syncRankProfile({
          displayName: next.displayName,
          iconId: next.iconId,
          accent: next.accent,
        });
        if (synced) setRankProfile(synced);
      } catch {
        // local save still ok
      }
    }
    onSaved?.(next);
    setOpen(false);
  };

  const handleAuth = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const local = loadProfile();
      const rp =
        authMode === "register"
          ? await registerRankAccount({
              nickname,
              pin,
              displayName: name || local.displayName || undefined,
              iconId,
              accent,
            })
          : await loginRankAccount({ nickname, pin });
      setRankProfile(rp);
      setPin("");
      setView("profile");
    } catch (err: any) {
      const code = String(err?.message || "");
      const key =
        code === "nickname_taken"
          ? "rank.error.nicknameTaken"
          : code === "invalid_credentials"
            ? "rank.error.credentials"
            : code === "invalid_nickname"
              ? "rank.error.nickname"
              : code === "invalid_pin"
                ? "rank.error.pin"
                : "rank.error.generic";
      setAuthError(t(key));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = () => {
    logoutRank();
    setRankProfile(null);
  };

  const rate = winRate(profile.stats);
  const inputClass = isLandscapeMenu ? "h-9 text-sm" : "text-lg py-5";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "bg-white/90 text-indigo-900 border border-indigo-200 hover:bg-white shadow-md",
            isLandscapeMenu && "h-8 w-8",
          )}
          aria-label={t("profile.title")}
        >
          <UserRound className={cn(isLandscapeMenu ? "h-4 w-4" : "h-5 w-5")} />
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "sm:max-w-md overflow-hidden flex flex-col",
          isLandscapeMenu
            ? "w-[min(96vw,34rem)] max-h-[min(94dvh,28rem)] p-3 gap-2"
            : "max-h-[min(92dvh,36rem)] gap-3",
        )}
      >
        <DialogHeader className={cn(isLandscapeMenu && "pr-6 space-y-0.5")}>
          {view === "account" ? (
            <>
              <button
                type="button"
                className="inline-flex items-center text-sm text-indigo-700 hover:text-indigo-900 font-medium mb-0.5 w-fit"
                onClick={() => {
                  setView("profile");
                  setAuthError(null);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                {t("rank.backToProfile")}
              </button>
              <DialogTitle
                className={cn("font-display text-indigo-900", isLandscapeMenu ? "text-lg" : "text-2xl")}
              >
                {t("rank.accountTitle")}
              </DialogTitle>
              <DialogDescription className={cn(isLandscapeMenu ? "text-xs" : "text-sm")}>
                {t("rank.accountHint")}
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle
                className={cn("font-display text-indigo-900", isLandscapeMenu ? "text-lg" : "text-2xl")}
              >
                {t("profile.title")}
              </DialogTitle>
              <DialogDescription className={cn(isLandscapeMenu && "text-xs line-clamp-2")}>
                {t("profile.description")}
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {view === "profile" ? (
          <>
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1",
                isLandscapeMenu ? "space-y-2.5 py-0.5" : "space-y-4 py-1",
              )}
            >
              <div className={cn(isLandscapeMenu ? "grid grid-cols-2 gap-2" : "space-y-4")}>
                <div className="space-y-1.5">
                  <Label htmlFor="profileName">{t("profile.displayName")}</Label>
                  <Input
                    id="profileName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("profile.namePlaceholder")}
                    maxLength={24}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{t("profile.accent")}</Label>
                  <div className="flex flex-wrap gap-2 items-center min-h-9">
                    {PROFILE_ACCENTS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAccent(a.id)}
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
              </div>

              <div className="space-y-1.5">
                <Label>{t("profile.icon")}</Label>
                <div className={cn("grid gap-1.5", isLandscapeMenu ? "grid-cols-10" : "grid-cols-5 gap-2")}>
                  {PROFILE_ICONS.map(({ id, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setIconId(id)}
                      className={cn(
                        "aspect-square rounded-xl border-2 flex items-center justify-center transition-colors",
                        iconId === id
                          ? "border-indigo-600 bg-indigo-50 text-indigo-800"
                          : "border-gray-200 bg-white text-gray-600 hover:border-indigo-300",
                      )}
                      aria-label={id}
                    >
                      <Icon className={cn(isLandscapeMenu ? "w-4 h-4" : "w-5 h-5")} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-2 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-indigo-500 font-semibold">
                    {t("profile.gamesPlayed")}
                  </div>
                  <div className={cn("font-bold text-indigo-900", isLandscapeMenu ? "text-base" : "text-lg")}>
                    {profile.stats.gamesPlayed}
                  </div>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">
                    {t("profile.wins")}
                  </div>
                  <div className={cn("font-bold text-emerald-900", isLandscapeMenu ? "text-base" : "text-lg")}>
                    {profile.stats.wins}
                  </div>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-2 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-amber-600 font-semibold">
                    {t("profile.bestScore")}
                  </div>
                  <div className={cn("font-bold text-amber-900", isLandscapeMenu ? "text-base" : "text-lg")}>
                    {profile.stats.bestScore === null ? "—" : profile.stats.bestScore}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                    {t("profile.winRate")}
                  </div>
                  <div className={cn("font-bold text-slate-800", isLandscapeMenu ? "text-base" : "text-lg")}>
                    {rate}%
                  </div>
                </div>
              </div>
              {!isLandscapeMenu && (
                <p className="text-[11px] text-gray-500 leading-snug">{t("profile.bestScoreHint")}</p>
              )}

              <button
                type="button"
                onClick={() => {
                  setAuthError(null);
                  setView("account");
                }}
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
                        ? `@${rankProfile.nickname}${rankProfile.position ? ` · #${rankProfile.position}` : ""} · ${rankProfile.wins}W`
                        : t("rank.openAccount")}
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <Button
              variant="primary"
              className={cn("w-full shrink-0", isLandscapeMenu && "h-9 text-sm")}
              onClick={() => void handleSave()}
            >
              {t("profile.save")}
            </Button>
          </>
        ) : (
          <>
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 space-y-3",
                isLandscapeMenu && "py-0.5",
              )}
            >
              {rankProfile ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-indigo-900 truncate">@{rankProfile.nickname}</div>
                      <div className="text-xs text-indigo-700">
                        {rankProfile.position ? `#${rankProfile.position} · ` : ""}
                        {rankProfile.wins}W
                      </div>
                    </div>
                    <RankBadge rank={rankProfile.rank} compact={isLandscapeMenu} />
                  </div>
                  <Button variant="outline" className="w-full" onClick={handleLogout}>
                    {t("rank.logout")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={authMode === "register" ? "primary" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setAuthMode("register")}
                    >
                      {t("rank.register")}
                    </Button>
                    <Button
                      type="button"
                      variant={authMode === "login" ? "primary" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setAuthMode("login")}
                    >
                      {t("rank.login")}
                    </Button>
                  </div>
                  <div className={cn(isLandscapeMenu ? "grid grid-cols-2 gap-2" : "space-y-3")}>
                    <div className="space-y-1.5">
                      <Label htmlFor="rankNick">{t("rank.nickname")}</Label>
                      <Input
                        id="rankNick"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="apelido"
                        maxLength={16}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="rankPin">{t("rank.pin")}</Label>
                      <Input
                        id="rankPin"
                        type="password"
                        inputMode="numeric"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="****"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  {authError && <p className="text-xs text-red-600">{authError}</p>}
                </div>
              )}
            </div>

            {!rankProfile && (
              <Button
                variant="primary"
                className={cn("w-full shrink-0", isLandscapeMenu && "h-9 text-sm")}
                onClick={() => void handleAuth()}
                isLoading={authBusy}
              >
                {authMode === "register" ? t("rank.registerSubmit") : t("rank.loginSubmit")}
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
