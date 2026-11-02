import { useCallback, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/Button";
import { useI18n } from "@/contexts/i18n-context";
import { AppUpdater } from "@/lib/nativeUpdater";
import type { LatestReleaseInfo } from "@/lib/updateCheck";

type Phase = "downloading" | "installing" | "permission" | "failed";

/** Faixa no topo enquanto o APK novo baixa; no fim abre o instalador do Android. */
export function SelfUpdateBar({ update }: { update: LatestReleaseInfo }) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("downloading");
  const [percent, setPercent] = useState(0);
  const runningRef = useRef(false);

  const install = useCallback(async () => {
    const result = await AppUpdater.install();
    setPhase(result.needsPermission ? "permission" : "installing");
  }, []);

  const start = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase("downloading");
    setPercent(0);
    const listener = await AppUpdater.addListener("progress", (p) => {
      if (p.percent >= 0) setPercent(p.percent);
    });
    try {
      await AppUpdater.download({ url: update.downloadUrl });
      await install();
    } catch (err) {
      console.warn("Self update failed:", err);
      setPhase("failed");
    } finally {
      await listener.remove();
      runningRef.current = false;
    }
  }, [update.downloadUrl, install]);

  useEffect(() => {
    void start();
  }, [start]);

  // Volta das configurações de "instalar apps desconhecidos": tenta instalar de novo
  useEffect(() => {
    if (phase !== "permission") return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void install().catch(() => setPhase("failed"));
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [phase, install]);

  const message =
    phase === "downloading"
      ? t("update.downloading", { version: update.tag, percent: String(percent) })
      : phase === "installing"
        ? t("update.installing")
        : phase === "permission"
          ? t("update.permission")
          : t("update.failed");

  return (
    <div className="fixed inset-x-0 top-0 z-[200] flex justify-center p-2 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md rounded-xl bg-indigo-950/95 text-white shadow-2xl px-4 py-3">
        <div className="flex items-center gap-3">
          <Download className="h-4 w-4 shrink-0 text-amber-300" />
          <p className="flex-1 text-sm font-medium leading-snug">{message}</p>
          {phase === "permission" && (
            <Button size="sm" variant="primary" onClick={() => void install()}>
              {t("update.installNow")}
            </Button>
          )}
          {phase === "failed" && (
            <Button size="sm" variant="primary" onClick={() => void start()}>
              {t("update.retry")}
            </Button>
          )}
        </div>
        {phase === "downloading" && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-amber-400 transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
