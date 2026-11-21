import { useEffect, useState } from "react";
import { Apple, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { useI18n } from "@/contexts/i18n-context";
import { isNativeApp } from "@/lib/gameServer";
import { cn } from "@/lib/utils";
import { inviteSnoozed, latestAppRelease, refreshIfBehindRelease, snoozeInvite, type AppDownloads } from "@/lib/webRelease";

/** Espera o menu aparecer antes de convidar: ninguém gosta de pop-up na cara. */
const INVITE_DELAY_MS = 2500;

function deviceKind(): "android" | "iphone" | "other" {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "iphone";
  return "other";
}

/**
 * Só no navegador: convida a jogar pelo app (APK no Android, IPA no iPhone).
 * O site está sempre na versão mais nova, então aqui nunca se oferece "baixar atualização".
 */
export function AppInviteDialog() {
  const { t } = useI18n();
  const [downloads, setDownloads] = useState<AppDownloads | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isNativeApp() || inviteSnoozed()) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void latestAppRelease().then((release) => {
        if (cancelled || !release || (!release.downloads.android && !release.downloads.iphone)) return;
        setDownloads(release.downloads);
        setOpen(true);
      });
    }, INVITE_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (!downloads) return null;

  const close = () => {
    snoozeInvite();
    setOpen(false);
  };
  const device = deviceKind();
  const go = (url: string) => {
    snoozeInvite();
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };
  // O botão do aparelho de quem está jogando vem primeiro e em destaque
  type Option = { kind: "android" | "iphone"; url: string; label: string; Icon: typeof Smartphone };
  const options: Option[] = [];
  if (downloads.android) options.push({ kind: "android", url: downloads.android, label: t("invite.android"), Icon: Smartphone });
  if (downloads.iphone) options.push({ kind: "iphone", url: downloads.iphone, label: t("invite.iphone"), Icon: Apple });
  options.sort((a, b) => Number(b.kind === device) - Number(a.kind === device));

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="max-h-[min(92dvh,28rem)] overflow-y-auto border-indigo-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl text-indigo-900">
            <span aria-hidden="true">🎴</span>
            {t("invite.title")}
          </DialogTitle>
          <DialogDescription className="pt-1 text-left">{t("invite.message")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {options.map(({ kind, url, label, Icon }, i) => (
            <Button
              key={kind}
              variant={i === 0 && device !== "other" ? "primary" : "outline"}
              className="w-full"
              onClick={() => go(url)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </Button>
          ))}
          {downloads.iphone && (
            <p className={cn("text-xs text-gray-500", device === "android" && "hidden")}>{t("invite.iphoneNote")}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" className="w-full sm:w-auto" onClick={close}>
            {t("invite.later")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Só no navegador: se a página abriu atrás da última release, busca a nova e recarrega. */
export function WebFreshness() {
  useEffect(() => {
    if (isNativeApp()) return;
    const timer = window.setTimeout(() => {
      void latestAppRelease().then((release) => {
        if (release) void refreshIfBehindRelease(release.tag);
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}
