import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { ProfileIconPicker } from "@/components/ProfileIconPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/contexts/i18n-context";
import { useIsCompactGame, useIsPortrait } from "@/hooks/use-landscape";
import { cn, fit } from "@/lib/utils";
import {
  loadProfile,
  saveProfile,
  winRate,
  getProfileAccent,
  getProfileIcon,
  type PlayerProfile,
  type ProfileAccent,
  type ProfileIconId,
} from "@/lib/playerProfile";
import {
  fetchRankMe,
  isRankLoggedIn,
  linkRankEmail,
  loginRankAccount,
  logoutRank,
  registerRankAccount,
  syncRankProfile,
  type PublicRankProfile,
  forgetSavedAccount,
  getSavedAccounts,
  switchToSavedAccount,
  type SavedAccount,
} from "@/lib/rankAuth";
import {
  AccentPicker,
  AccountEntryButton,
  AchievementList,
  AuthFields,
  ChoiceTabs,
  ChooseUsernameCard,
  CosmeticPicker,
  LinkEmailCard,
  ProfileDialogHeader,
  ProfileStatTiles,
  RankCard,
  RecentGames,
  SavedAccountsList,
} from "@/components/ProfileDialogParts";
import { Trophy, UserRound } from "lucide-react";
import { type AchievementProgress, DEFAULT_PROGRESS } from "@shared/achievements";
import { BANNER_STYLES, type BannerId } from "@shared/cosmetics";

type ProfileView = "profile" | "account";
type AccountTab = "look" | "achievements";

interface ProfileDialogProps {
  compact?: boolean;
  highlight?: boolean;
  onSaved?: (profile: PlayerProfile) => void;
}

const AUTH_ERRORS: Record<string, string> = {
  nickname_taken: "rank.error.nicknameTaken",
  invalid_credentials: "rank.error.credentials",
  invalid_nickname: "rank.error.nickname",
  invalid_email: "rank.error.email",
  invalid_password: "rank.error.password",
  email_taken: "rank.error.emailTaken",
  email_already_linked: "rank.error.emailLinked",
};

function authErrorKey(code: string) {
  return AUTH_ERRORS[code] ?? "rank.error.generic";
}

export function ProfileDialog({ compact = false, highlight = false, onSaved }: ProfileDialogProps) {
  const { t } = useI18n();
  const isPortrait = useIsPortrait();
  const isCompactGame = useIsCompactGame();
  const isLandscapeMenu = compact || (isCompactGame && !isPortrait);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ProfileView>("profile");
  const [accountTab, setAccountTab] = useState<AccountTab>("look");
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [name, setName] = useState(profile.displayName);
  const [iconId, setIconId] = useState<ProfileIconId>(profile.iconId);
  const [accent, setAccent] = useState<ProfileAccent>(profile.accent);

  const [rankProfile, setRankProfile] = useState<PublicRankProfile | null>(null);
  const [frameId, setFrameId] = useState<string>("none");
  const [titleId, setTitleId] = useState<string>("none");
  const [bannerId, setBannerId] = useState<string>("default");
  const [cosmeticBusy, setCosmeticBusy] = useState(false);
  const [cosmeticError, setCosmeticError] = useState<string | null>(null);

  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [usernameBusy, setUsernameBusy] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const applyRankProfile = (rp: PublicRankProfile | null) => {
    setRankProfile(rp);
    if (rp) {
      setFrameId(rp.frameId || "none");
      setTitleId(rp.titleId || "none");
      setBannerId(rp.bannerId || "default");
    }
  };

  useEffect(() => {
    if (!open) return;
    const p = loadProfile();
    setProfile(p);
    setName(p.displayName);
    setIconId(p.iconId);
    setAccent(p.accent);
    setView("profile");
    setAccountTab("look");
    setAuthError(null);
    setCosmeticError(null);
    setUsernameError(null);
    setPassword("");
    const saved = getSavedAccounts();
    setSavedAccounts(saved);
    // Quem já teve conta aqui quase sempre quer entrar nela, não criar outra
    if (saved.length > 0) setAuthMode("login");
    if (isRankLoggedIn()) {
      void fetchRankMe()
        .then((rp) => {
          applyRankProfile(rp);
          if (!rp) return;
          const synced = loadProfile();
          setProfile(synced);
          setName(synced.displayName);
          setIconId(synced.iconId);
          setAccent(synced.accent);
        })
        .catch(() => applyRankProfile(null));
    } else {
      applyRankProfile(null);
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
        if (synced) applyRankProfile(synced);
      } catch {
        // local save still ok
      }
    }
    onSaved?.(next);
    setOpen(false);
  };

  const handleSaveCosmetics = async () => {
    setCosmeticBusy(true);
    setCosmeticError(null);
    try {
      const synced = await syncRankProfile({ frameId, titleId, bannerId });
      if (synced) applyRankProfile(synced);
    } catch (err: any) {
      const code = String(err?.message || "");
      setCosmeticError(code === "cosmetic_locked" ? t("cosmetic.locked") : t("rank.error.generic"));
    } finally {
      setCosmeticBusy(false);
    }
  };

  const handleAuth = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const local = loadProfile();
      const rp =
        authMode === "register"
          ? await registerRankAccount({
              email,
              password,
              displayName: name || local.displayName || undefined,
              iconId,
              accent,
            })
          : await loginRankAccount({ email, password });
      applyRankProfile(rp);
      syncFormFromProfile();
      setSavedAccounts(getSavedAccounts());
      setPassword("");
      setUsername(rp.nickname || "");
      setAccountTab("look");
    } catch (err: any) {
      setAuthError(t(authErrorKey(String(err?.message || ""))));
    } finally {
      setAuthBusy(false);
    }
  };

  /** Conta nova escolhe o nome de usuário; conta antiga sem e-mail ganha e-mail e senha. */
  const handleChooseUsername = async () => {
    setUsernameBusy(true);
    setUsernameError(null);
    try {
      const rp = await syncRankProfile({ nickname: username });
      if (rp) applyRankProfile(rp);
      setSavedAccounts(getSavedAccounts());
    } catch (err: any) {
      setUsernameError(t(authErrorKey(String(err?.message || ""))));
    } finally {
      setUsernameBusy(false);
    }
  };

  const handleLinkEmail = async () => {
    setUsernameBusy(true);
    setUsernameError(null);
    try {
      const rp = await linkRankEmail({ email, password });
      if (rp) applyRankProfile(rp);
      setPassword("");
      setSavedAccounts(getSavedAccounts());
    } catch (err: any) {
      setUsernameError(t(authErrorKey(String(err?.message || ""))));
    } finally {
      setUsernameBusy(false);
    }
  };

  const handleLogout = () => {
    logoutRank();
    applyRankProfile(null);
    setSavedAccounts(getSavedAccounts());
    setAuthMode("login");
  };

  const syncFormFromProfile = () => {
    const synced = loadProfile();
    setProfile(synced);
    setName(synced.displayName);
    setIconId(synced.iconId);
    setAccent(synced.accent);
    onSaved?.(synced);
  };

  const handleUseSaved = async (account: SavedAccount) => {
    setAuthError(null);
    // Sessão expirada: basta a senha para voltar à mesma conta
    if (!account.token) {
      setAuthMode("login");
      setEmail(account.email ?? "");
      if (!account.email) setAuthError(t("rank.legacyNoEmail"));
      return;
    }
    setSwitchingId(account.playerId);
    try {
      const rp = await switchToSavedAccount(account.playerId);
      setSavedAccounts(getSavedAccounts());
      if (!rp) {
        setAuthMode("login");
        setEmail(account.email ?? "");
        setAuthError(t(account.email ? "rank.sessionExpired" : "rank.legacyNoEmail"));
        return;
      }
      applyRankProfile(rp);
      syncFormFromProfile();
      setAccountTab("look");
    } catch {
      setAuthError(t("rank.error.generic"));
    } finally {
      setSwitchingId(null);
    }
  };

  const handleForgetSaved = (account: SavedAccount) => {
    forgetSavedAccount(account.playerId);
    setSavedAccounts(getSavedAccounts());
    if (rankProfile?.playerId === account.playerId) applyRankProfile(null);
  };

  const rate = winRate(profile.stats);
  const PreviewIcon = getProfileIcon(iconId);
  const previewAccent = getProfileAccent(accent);
  const inputClass = fit(isLandscapeMenu, "h-9 text-sm", "text-lg py-5");
  const achievements = rankProfile?.achievements ?? [];
  const progress: AchievementProgress = rankProfile?.progress ?? DEFAULT_PROGRESS;
  const bannerClass =
    bannerId in BANNER_STYLES ? BANNER_STYLES[bannerId as BannerId] : BANNER_STYLES.default;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "bg-white/90 text-indigo-900 border border-indigo-200 hover:bg-white shadow-md",
            isLandscapeMenu && "h-8 w-8",
            highlight && "ring-4 ring-amber-400 ring-offset-2 animate-pulse",
          )}
          aria-label={t("profile.title")}
        >
          <UserRound className={cn(fit(isLandscapeMenu, "h-4 w-4", "h-5 w-5"))} />
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "sm:max-w-md overflow-hidden flex flex-col",
          fit(isLandscapeMenu, "w-[min(96vw,34rem)] max-h-[min(94dvh,28rem)] p-3 gap-2", "w-[calc(100vw-1.5rem)] max-h-[min(92dvh,42rem)] gap-3 rounded-2xl p-5 sm:p-6"),
        )}
      >
        <ProfileDialogHeader
          view={view}
          isLandscapeMenu={isLandscapeMenu}
          onBack={() => {
            setView("profile");
            setAuthError(null);
          }}
        />

        {view === "profile" ? (
          <>
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto overscroll-contain -mx-2 px-2",
                fit(isLandscapeMenu, "space-y-2.5 py-1", "space-y-4 py-1.5"),
              )}
            >
              <div className={cn(fit(isLandscapeMenu, "grid grid-cols-2 gap-2", "space-y-4"))}>
                <div className="flex items-end gap-3">
                  <div
                    className={cn(
                      "shrink-0 rounded-full border-2 flex items-center justify-center",
                      fit(isLandscapeMenu, "w-9 h-9", "w-12 h-12"),
                      previewAccent.ring,
                      previewAccent.bg,
                      previewAccent.text,
                    )}
                    aria-hidden
                  >
                    <PreviewIcon className={fit(isLandscapeMenu, "w-5 h-5", "w-7 h-7")} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
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
                </div>

                <AccentPicker accent={accent} onChange={setAccent} />
              </div>

              <div className="space-y-1.5">
                <Label>{t("profile.icon")}</Label>
                <ProfileIconPicker value={iconId} onChange={setIconId} compact={isLandscapeMenu} />
              </div>

              <ProfileStatTiles isLandscapeMenu={isLandscapeMenu} profile={profile} rate={rate} />

              <RecentGames stats={profile.stats} open={open} />

              <AccountEntryButton
                rankProfile={rankProfile}
                onOpen={() => {
                  setAuthError(null);
                  setView("account");
                }}
              />
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
                "min-h-0 flex-1 overflow-y-auto overscroll-contain -mx-2 px-2 py-1 space-y-3",
              )}
            >
              {rankProfile ? (
                <div className="space-y-3">
                  <RankCard rankProfile={rankProfile} titleId={titleId} frameId={frameId} bannerClass={bannerClass} />

                  {!rankProfile.nickname && (
                    <ChooseUsernameCard
                      username={username}
                      setUsername={setUsername}
                      usernameBusy={usernameBusy}
                      usernameError={usernameError}
                      handleChooseUsername={handleChooseUsername}
                    />
                  )}

                  {rankProfile.nickname && rankProfile.email === null && (
                    <LinkEmailCard
                      isLandscapeMenu={isLandscapeMenu}
                      email={email}
                      setEmail={setEmail}
                      password={password}
                      setPassword={setPassword}
                      usernameBusy={usernameBusy}
                      usernameError={usernameError}
                      handleLinkEmail={handleLinkEmail}
                    />
                  )}

                  <ChoiceTabs
                    value={accountTab}
                    onChange={setAccountTab}
                    options={[
                      { id: "look", label: t("cosmetic.tabLook") },
                      { id: "achievements", label: t("achieve.tab"), icon: <Trophy className="w-3.5 h-3.5 mr-1" /> },
                    ]}
                  />

                  {accountTab === "look" ? (
                    <CosmeticPicker
                      achievements={achievements}
                      frameId={frameId}
                      setFrameId={setFrameId}
                      titleId={titleId}
                      setTitleId={setTitleId}
                      bannerId={bannerId}
                      setBannerId={setBannerId}
                      cosmeticBusy={cosmeticBusy}
                      cosmeticError={cosmeticError}
                      handleSaveCosmetics={handleSaveCosmetics}
                    />
                  ) : (
                    <AchievementList achievements={achievements} progress={progress} />
                  )}

                  <Button variant="outline" className="w-full" onClick={handleLogout}>
                    {t("rank.logout")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedAccounts.length > 0 && (
                    <SavedAccountsList
                      savedAccounts={savedAccounts}
                      switchingId={switchingId}
                      handleUseSaved={handleUseSaved}
                      handleForgetSaved={handleForgetSaved}
                    />
                  )}
                  <ChoiceTabs
                    value={authMode}
                    onChange={setAuthMode}
                    options={[
                      { id: "register", label: t("rank.register") },
                      { id: "login", label: t("rank.login") },
                    ]}
                  />
                  <AuthFields
                    isLandscapeMenu={isLandscapeMenu}
                    authMode={authMode}
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    authError={authError}
                    handleAuth={handleAuth}
                  />
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
