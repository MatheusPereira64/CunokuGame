import { useEffect, useState, useCallback } from "react";
import { checkForAppUpdate, type LatestReleaseInfo } from "@/lib/updateCheck";
import { dismissUpdateTag } from "@/lib/appVersion";

export function useUpdateCheck() {
  const [update, setUpdate] = useState<LatestReleaseInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  const runCheck = useCallback(async (signal?: AbortSignal) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }
    setChecking(true);
    try {
      const result = await checkForAppUpdate(signal);
      if (signal?.aborted) return;
      if (result.update) {
        setUpdate(result.update);
        setOpen(true);
      }
    } catch (err) {
      console.warn("Update check failed:", err);
    } finally {
      if (!signal?.aborted) setChecking(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Pequeno atraso para não competir com o carregamento inicial
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
    dismiss,
    download,
    recheck: runCheck,
  };
}
