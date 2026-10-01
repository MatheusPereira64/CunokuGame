import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Swords, Undo2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/contexts/i18n-context";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { apiUrl } from "@/lib/gameServer";
import {
  DEFAULT_CLOUD_SERVER,
  clearServerBase,
  isNativeApp,
  setLanJoinUrl,
  setNetworkMode,
  setServerBase,
} from "@/lib/gameServer";
import { clearActiveSession, loadActiveSession, rememberOnlineRoom, type ActiveSession } from "@/lib/activeSession";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  menuBtnClass: string;
  menuIconClass: string;
  onNeedName?: () => void;
};

type QueueResponse = {
  status: "waiting" | "filling" | "countdown" | "matched";
  ticketId: string;
  playerId: string;
  code?: string;
  hostId?: string;
  position?: number;
  players?: number;
  secondsLeft?: number;
};

export function HomeFeatures({ name, menuBtnClass, menuIconClass, onNeedName }: Props) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [queueView, setQueueView] = useState<QueueResponse | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const [fillDeadline, setFillDeadline] = useState<number | null>(null);
  const cancelRef = useRef(false);
  const ticketRef = useRef("");

  useEffect(() => {
    setSession(loadActiveSession());
  }, []);

  useEffect(() => {
    if (!searching) return;
    const id = window.setInterval(() => setClock(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [searching]);

  useEffect(() => {
    if (queueView?.status !== "filling" || queueView.secondsLeft == null) return;
    setFillDeadline(Date.now() + queueView.secondsLeft * 1000);
  }, [queueView?.status, queueView?.secondsLeft]);

  const useCloud = () => {
    if (isNativeApp()) setServerBase(DEFAULT_CLOUD_SERVER);
    else clearServerBase();
    setLanJoinUrl(null);
    setNetworkMode("server");
  };

  const rejoin = async () => {
    if (!session) return;
    useCloud();
    try {
      const res = await fetch(apiUrl(`/api/rooms/${session.code}`));
      if (!res.ok) {
        clearActiveSession();
        setSession(null);
        toast({ title: t("reconnect.gone"), variant: "destructive" });
        return;
      }
      rememberOnlineRoom({ code: session.code, playerId: session.playerId, name: session.name });
      setLocation(`/game/${session.code}?player=${session.playerId}`);
    } catch {
      toast({ title: t("error.generic"), variant: "destructive" });
    }
  };

  const startQueue = async () => {
    const playerName = name.trim();
    if (!playerName) {
      toast({ title: t("queue.needName"), variant: "destructive" });
      onNeedName?.();
      setQueueOpen(false);
      return;
    }
    useCloud();
    cancelRef.current = false;
    setSearching(true);
    setQueueView(null);
    try {
      const first = await fetch(apiUrl(api.matchmaking.enqueue.path), {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName }),
      });
      if (!first.ok) throw new Error("queue");
      let data = api.matchmaking.enqueue.responses[200].parse(await first.json()) as QueueResponse;
      ticketRef.current = data.ticketId;
      setQueueView(data);
      for (let i = 0; i < 120 && data.status !== "matched"; i++) {
        if (cancelRef.current) return;
        await new Promise((r) => setTimeout(r, 1000));
        if (cancelRef.current) return;
        const poll = await fetch(apiUrl(`/api/matchmaking/${ticketRef.current}`), { cache: "no-store" });
        if (poll.status === 404) throw new Error("queue");
        if (!poll.ok) continue;
        data = api.matchmaking.enqueue.responses[200].parse(await poll.json()) as QueueResponse;
        setQueueView(data);
      }
      if (cancelRef.current) return;
      if (data.status !== "matched" || !data.code) throw new Error("queue");
      rememberOnlineRoom({
        code: data.code,
        playerId: data.playerId,
        name: playerName,
        hostId: data.hostId,
      });
      setQueueOpen(false);
      setLocation(`/game/${data.code}?player=${data.playerId}&queue=1`);
    } catch {
      toast({ title: t("error.generic"), variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const cancelQueue = () => {
    cancelRef.current = true;
    const ticketId = ticketRef.current;
    ticketRef.current = "";
    if (ticketId) {
      void fetch(apiUrl(`/api/matchmaking/${ticketId}`), { method: "DELETE" });
    }
    setSearching(false);
    setQueueOpen(false);
  };

  return (
    <>
      {session && (
        <div className="w-full flex gap-2">
          <Button variant="secondary" size="lg" className={cn(menuBtnClass, "flex-1")} onClick={rejoin}>
            <Undo2 className={menuIconClass} /> {t("menu.rejoin")}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="shrink-0"
            onClick={() => {
              clearActiveSession();
              setSession(null);
            }}
          >
            {t("menu.dismissRejoin")}
          </Button>
        </div>
      )}

      <Button variant="secondary" size="lg" className={menuBtnClass} onClick={() => setQueueOpen(true)}>
        <Swords className={menuIconClass} /> {t("menu.quickMatch")}
      </Button>

      <Dialog open={queueOpen} onOpenChange={(open) => { if (!searching) setQueueOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-indigo-900">{t("queue.title")}</DialogTitle>
            <DialogDescription>{t("queue.description")}</DialogDescription>
          </DialogHeader>
          {searching ? (
            <div className="py-6 text-center space-y-2">
              {queueView?.status === "countdown" ? (
                <div className="font-display text-3xl text-indigo-900">
                  {t("queue.countdown", { seconds: String(queueView.secondsLeft ?? 1) })}
                </div>
              ) : queueView?.status === "filling" ? (
                <>
                  <div className="font-display text-xl text-indigo-900">
                    {t("queue.filling", {
                      seconds: String(
                        fillDeadline != null
                          ? Math.max(0, Math.ceil((fillDeadline - clock) / 1000))
                          : (queueView.secondsLeft ?? 60)
                      ),
                    })}
                  </div>
                  <p className="text-sm text-gray-500">
                    {t("queue.players", { count: String(queueView.players ?? 2) })}
                  </p>
                </>
              ) : (
                <div className="animate-pulse font-display text-xl text-indigo-900">{t("queue.searching")}</div>
              )}
              {queueView?.status === "waiting" && queueView.position != null && (
                <p className="text-sm text-gray-500">{t("queue.position", { position: String(queueView.position) })}</p>
              )}
              <Button variant="outline" className="mt-4" onClick={cancelQueue}>{t("queue.cancel")}</Button>
            </div>
          ) : (
            <Button className="w-full mt-2" onClick={startQueue}>{t("queue.start")}</Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
