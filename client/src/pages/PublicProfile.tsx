import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Award, Copy } from "lucide-react";
import type { PublicProfileView } from "@shared/rank";
import { ACHIEVEMENTS } from "@shared/achievements";
import { BANNER_STYLES, FRAME_STYLES, type BannerId, type FrameId } from "@shared/cosmetics";
import { Button } from "@/components/Button";
import { RankBadge } from "@/components/RankBadge";
import { useI18n } from "@/contexts/i18n-context";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/gameServer";
import { copyToClipboard } from "@/lib/clipboard";
import { getProfileAccent, getProfileIcon, type ProfileAccent, type ProfileIconId } from "@/lib/playerProfile";
import { cn } from "@/lib/utils";

/** Endereço do perfil público para compartilhar (Discord, WhatsApp…). */
export function publicProfileUrl(nickname: string): string {
  return `${window.location.origin}/p/${encodeURIComponent(nickname)}`;
}

type Load = { status: "loading" } | { status: "missing" } | { status: "error" } | { status: "ok"; profile: PublicProfileView };

/** Página aberta a qualquer um: ranking, números e conquistas de um jogador. */
export default function PublicProfile({ nickname }: { nickname: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setLoad({ status: "loading" });
    fetch(apiUrl(`/api/rank/profile/${encodeURIComponent(nickname)}`), { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 404) return setLoad({ status: "missing" });
        if (!res.ok) return setLoad({ status: "error" });
        const data = (await res.json()) as { profile: PublicProfileView };
        setLoad({ status: "ok", profile: data.profile });
      })
      .catch((err) => {
        if (!controller.signal.aborted && err) setLoad({ status: "error" });
      });
    return () => controller.abort();
  }, [nickname]);

  const share = async () => {
    const ok = await copyToClipboard(publicProfileUrl(nickname));
    toast({ title: ok ? t("profilePage.copied") : t("error.generic") });
  };

  return (
    <div className="flex min-h-[100dvh] items-start justify-center px-4 pb-10 pt-6">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-800 hover:underline">
          <ArrowLeft className="h-4 w-4" /> {t("profilePage.play")}
        </Link>
        {load.status === "loading" && <p className="py-12 text-center text-gray-500">{t("competition.loading")}</p>}
        {load.status === "missing" && <p className="py-12 text-center text-gray-600">{t("profilePage.missing", { name: nickname })}</p>}
        {load.status === "error" && <p className="py-12 text-center text-gray-600">{t("competition.offline")}</p>}
        {load.status === "ok" && <ProfileCard profile={load.profile} onShare={share} />}
      </div>
    </div>
  );
}

function ProfileCard({ profile, onShare }: { profile: PublicProfileView; onShare: () => void }) {
  const { t } = useI18n();
  const Icon = getProfileIcon((profile.iconId as ProfileIconId) || "spade");
  const accent = getProfileAccent((profile.accent as ProfileAccent) || "indigo");
  const banner = BANNER_STYLES[(profile.bannerId as BannerId) in BANNER_STYLES ? (profile.bannerId as BannerId) : "default"];
  const frame = FRAME_STYLES[(profile.frameId as FrameId) in FRAME_STYLES ? (profile.frameId as FrameId) : "none"];
  const winRate = profile.gamesPlayed > 0 ? Math.round((profile.wins / profile.gamesPlayed) * 100) : null;
  const unlocked = new Set(profile.achievements);
  const achievements = ACHIEVEMENTS.filter((a) => unlocked.has(a.id) && a.id !== "pvp_100_title");

  const stats: [string, string][] = [
    [t("profilePage.position"), profile.position ? `#${profile.position}` : "—"],
    [t("profile.wins"), String(profile.wins)],
    [t("profile.gamesPlayed"), String(profile.gamesPlayed)],
    [t("profilePage.winRate"), winRate === null ? "—" : `${winRate}%`],
    [t("profilePage.best"), profile.bestScore === null ? "—" : String(profile.bestScore)],
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-xl">
      <div className={cn("flex items-center gap-4 p-5", banner)}>
        <div className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2", accent.bg, accent.text, accent.ring, frame)}>
          <Icon className="h-8 w-8" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl">{profile.displayName || profile.nickname}</h1>
          <p className="truncate text-sm opacity-80">
            @{profile.nickname}
            {profile.titleId && profile.titleId !== "none" ? ` · ${t(`cosmetic.title.${profile.titleId}`)}` : ""}
          </p>
        </div>
        <RankBadge rank={profile.rank} />
      </div>

      <dl className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-gray-50 p-2 text-center">
            <dt className="text-[11px] text-gray-500">{label}</dt>
            <dd className="font-mono text-lg font-bold text-indigo-900">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="px-4 pb-4">
        <h2 className="mb-2 text-sm font-bold text-indigo-900">{t("profilePage.achievements", { count: String(achievements.length) })}</h2>
        {achievements.length === 0 ? (
          <p className="rounded-lg bg-gray-50 p-3 text-center text-sm text-gray-500">{t("profilePage.noAchievements")}</p>
        ) : (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {achievements.map((a) => (
              <li key={a.id} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs">
                <Award className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  <span className="block font-bold text-gray-900">{t(`achieve.${a.id}.title`)}</span>
                  <span className="block text-gray-600">{t(`achieve.${a.id}.desc`)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-gray-100 p-4 sm:flex-row">
        <Link href="/" className="flex-1">
          <Button className="w-full">{t("profilePage.play")}</Button>
        </Link>
        <Button variant="outline" className="flex-1" onClick={onShare}>
          <Copy className="mr-2 h-4 w-4" /> {t("profilePage.share")}
        </Button>
      </div>
    </div>
  );
}
