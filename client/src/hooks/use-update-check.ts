import { useEffect, useState, useCallback } from "react";
import { checkForAppUpdate, type LatestReleaseInfo } from "@/lib/updateCheck";
import { dismissUpdateTag, isNewerVersion, APP_VERSION } from "@/lib/appVersion";

export function useUpdateCheck() {
  const [update, setUpdate] = useState<LatestReleaseInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [currentVersion] = useState(APP_VERSION);

  const runCheck = useCallback(async (signal?: AbortSignal) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setUpdate(null);
      setOpen(false);
      return;
    }
    setChecking(true);
    try {
      const result = await checkForAppUpdate(signal);
      if (signal?.aborted) return;

      // Só abre o pop-up se a release remota for estritamente mais nova
      const remote = result.update;
      if (remote && isNewerVersion(remote.tag, result.currentVersion)) {
        setUpdate(remote);
        setOpen(true);
      } else {
        setUpdate(null);
        setOpen(false);
      }
    } catch (err) {
      console.warn("Update check failed:", err);
      setUpdate(null);
      setOpen(false);
    } finally {
      if (!signal?.aborted) setChecking(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void runCheck(controller.signal);
    }, 1500);

    const onOnline = () => {
      void runCheck();
    };
    window.addEventListener("online", onOnline);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
      window.removeEventListener("online", onOnline);
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
