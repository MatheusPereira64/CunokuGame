import { useEffect, useRef, useState, useCallback } from "react";
import { checkForAppUpdate, updateRetryDelayMs, type LatestReleaseInfo } from "@/lib/updateCheck";
import { dismissUpdateTag, isNewerVersion, APP_VERSION } from "@/lib/appVersion";

/** Ao voltar para o app (ele pode ficar dias em segundo plano), só consulta se a última for antiga. */
const FOREGROUND_RECHECK_MS = 30 * 60_000;

export function useUpdateCheck() {
  const [update, setUpdate] = useState<LatestReleaseInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [currentVersion] = useState(APP_VERSION);
  const lastSuccessRef = useRef(0);
  const retryTimerRef = useRef<number | undefined>(undefined);
  /** Versão já oferecida nesta sessão: novas consultas não reabrem nem interrompem o download. */
  const offeredTagRef = useRef<string | null>(null);

  const runCheckRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const runCheck = useCallback(async (signal?: AbortSignal) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setUpdate(null);
      setOpen(false);
      return;
    }
    window.clearTimeout(retryTimerRef.current);
    setChecking(true);
    try {
      const result = await checkForAppUpdate(signal);
      if (signal?.aborted) return;
      lastSuccessRef.current = Date.now();

      // Só abre o pop-up se a release remota for estritamente mais nova
      const remote = result.update;
      if (remote && isNewerVersion(remote.tag, result.currentVersion)) {
        if (offeredTagRef.current !== remote.tag) {
          offeredTagRef.current = remote.tag;
          setUpdate(remote);
          setOpen(true);
        }
      } else {
        setUpdate(null);
        setOpen(false);
      }
    } catch (err) {
      if (signal?.aborted) return;
      console.warn("Update check failed:", err);
      // Sem isso, uma falha (ex.: limite do GitHub) só seria refeita ao reiniciar o app
      retryTimerRef.current = window.setTimeout(() => {
        void runCheckRef.current();
      }, updateRetryDelayMs(err));
    } finally {
      if (!signal?.aborted) setChecking(false);
    }
  }, []);

  runCheckRef.current = runCheck;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void runCheck(controller.signal);
    }, 1500);

    const onOnline = () => {
      void runCheck();
    };
    window.addEventListener("online", onOnline);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastSuccessRef.current >= FOREGROUND_RECHECK_MS) void runCheck();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
      window.clearTimeout(retryTimerRef.current);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [runCheck]);

  const dismiss = useCallback(() => {
    if (update) {
      dismissUpdateTag(update.tag);
    }
    setOpen(false);
  }, [update]);

  const download = useCallback(() => {
    if (!update) return;
    window.open(update.downloadUrl, "_blank", "noopener,noreferrer");
    setOpen(false);
  }, [update]);

  return {
    update,
    open,
    setOpen,
    checking,
    currentVersion,
    dismiss,
    download,
    recheck: runCheck,
  };
}
