import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/contexts/i18n-context";
import { useJoinRoom } from "@/hooks/use-rooms";
import { rememberOnlineRoom } from "@/lib/activeSession";
import { loadProfile } from "@/lib/playerProfile";
import {
  DEFAULT_CLOUD_SERVER,
  isNativeApp,
  setNetworkMode,
  setServerBase,
  clearServerBase,
  setLanJoinUrl,
} from "@/lib/gameServer";
import { useToast } from "@/hooks/use-toast";

/** Página aberta por /join/:code (link de convite ou esquema cunoku://). */
export default function JoinInvite({ code }: { code: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const joinRoom = useJoinRoom();
  const roomCode = code.toUpperCase();
  const [name, setName] = useState(() => loadProfile().displayName);

  const join = async () => {
    if (!name.trim()) {
      toast({ title: t("error.nameRequired"), description: t("error.nameRequiredDesc"), variant: "destructive" });
      return;
    }
    if (isNativeApp()) {
      setServerBase(DEFAULT_CLOUD_SERVER);
    } else {
      clearServerBase();
    }
    setLanJoinUrl(null);
    setNetworkMode("server");
    try {
      const result = await joinRoom.mutateAsync({ name: name.trim(), code: roomCode });
      rememberOnlineRoom({ code: result.code, playerId: result.playerId, name: name.trim() });
      setLocation(`/game/${result.code}?player=${result.playerId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error.generic");
      toast({ title: t("error.generic"), description: message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-indigo-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#FDFBF7] text-indigo-950 rounded-3xl p-8 shadow-2xl">
        <h1 className="font-display text-3xl">{t("invite.title")}</h1>
        <p className="mt-2 text-sm text-gray-600">{t("invite.description", { code: roomCode })}</p>
        <div className="mt-6 space-y-2">
          <Label htmlFor="inviteName">{t("join.yourName")}</Label>
          <Input
            id="inviteName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("join.namePlaceholder")}
            className="text-lg py-6"
          />
        </div>
        <Button className="w-full mt-6" onClick={join} isLoading={joinRoom.isPending}>
          {t("invite.join")}
        </Button>
        <Button variant="outline" className="w-full mt-2" onClick={() => setLocation("/")}>
          {t("game.backToHome")}
        </Button>
      </div>
    </div>
  );
}
