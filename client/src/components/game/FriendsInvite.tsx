import { useState } from "react";
import { Star } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { cn, fit } from "@/lib/utils";
import { useI18n } from "@/contexts/i18n-context";
import { loadFriends, toggleFavorite, type FriendEntry } from "@/lib/friends";
import type { ProfileAccent, ProfileIconId } from "@/lib/playerProfile";

/**
 * Amigos e jogadores recentes na sala de espera: um toque manda o convite com o código da sala.
 * Quem já está na mesa não aparece.
 */
export function FriendsInvite({
  inRoom,
  compact,
  onInvite,
}: {
  inRoom: string[];
  compact: boolean;
  onInvite: (name: string) => void;
}) {
  const { t } = useI18n();
  const [friends, setFriends] = useState<FriendEntry[]>(loadFriends);
  const here = new Set(inRoom.map((n) => n.trim().toLocaleLowerCase()));
  const shown = friends.filter((f) => !here.has(f.name.trim().toLocaleLowerCase())).slice(0, compact ? 4 : 6);
  if (shown.length === 0) return null;

  return (
    <div className={fit(compact, "mt-2", "mt-1 mb-4")}>
      <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-white/60">{t("friends.title")}</div>
      <div className={cn("grid gap-1.5", fit(compact, "grid-cols-2", "grid-cols-3"))}>
        {shown.map((f) => (
          <div key={f.name} className="relative flex min-w-0 items-center gap-1.5 rounded-xl bg-white/10 p-1.5">
            <Avatar
              name={f.name}
              compact
              hideLabel
              iconId={f.iconId as ProfileIconId | undefined}
              accent={f.accent as ProfileAccent | undefined}
              className="shrink-0 scale-75"
            />
            <button
              type="button"
              onClick={() => onInvite(f.name)}
              className="min-w-0 flex-1 text-left"
              aria-label={t("friends.inviteName", { name: f.name })}
            >
              <div className="truncate text-xs font-bold">{f.name}</div>
              <div className="text-[10px] text-amber-200">{t("friends.invite")}</div>
            </button>
            <button
              type="button"
              onClick={() => setFriends(toggleFavorite(f.name))}
              aria-label={t("friends.favorite")}
              aria-pressed={!!f.favorite}
              className="shrink-0 p-1"
            >
              <Star className={cn("h-3.5 w-3.5", f.favorite ? "fill-amber-300 text-amber-300" : "text-white/40")} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
