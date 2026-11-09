import { useEffect, useRef, useState } from "react";
import type { GameState } from "@shared/schema";
import { ABILITY_KINDS, parseActionLog, seatTextKey, targetsViewer, type ActionEvent } from "@/lib/actionFeed";
import type { NoticeTone, PersonalAlert, SeatNotice } from "@/components/game/seatNotice";
import { vibrate } from "@/lib/haptics";

type Translate = (key: string, vars?: Record<string, string>) => string;

const BASIC_MS = 1900;
const ABILITY_MS = 3200;
const ALERT_MS = 3600;
/** Uma rajada de bots não vira uma fila longa: só as últimas linhas aparecem. */
const MAX_NEW_LINES = 6;

function toneOf(event: ActionEvent, viewerId: string): NoticeTone {
  if (event.kind === "penalty_draw" || event.kind === "penalty_skip") return "penalty";
  if (event.targetIds.includes(viewerId)) return "alert";
  return ABILITY_KINDS.has(event.kind) ? "ability" : "info";
}

/**
 * Avisos das jogadas dos outros: balão no assento de quem jogou e,
 * quando a jogada mexe nas suas cartas, um alerta no topo com vibração.
 */
export function useActionFeed(gameState: GameState | null | undefined, viewerId: string, t: Translate) {
  const [seatNotices, setSeatNotices] = useState<Record<string, SeatNotice>>({});
  const [personalAlert, setPersonalAlert] = useState<PersonalAlert | null>(null);
  const seenLogs = useRef<number | null>(null);
  const nextId = useRef(1);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const tRef = useRef(t);
  tRef.current = t;

  // O jogo offline muta o array de logs no lugar: o que muda de verdade é o tamanho
  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const logCount = gameState?.logs?.length ?? null;

  useEffect(() => {
    const state = stateRef.current;
    if (logCount === null || !state) return;
    const logs = state.logs;
    const players = state.players;
    const previous = seenLogs.current;
    seenLogs.current = logs.length;
    // Primeiro estado (ou reconexão/revanche): não repete o histórico
    if (previous === null || logs.length <= previous) return;

    const named = players.map((p) => ({ id: p.id, name: p.name }));
    const me = players.find((p) => p.id === viewerId);
    for (const line of logs.slice(previous).slice(-MAX_NEW_LINES)) {
      const event = parseActionLog(line, named);
      if (!event || event.actorId === viewerId) continue;
      const actor = players.find((p) => p.id === event.actorId);
      const vars = { ...event.vars };
      if (me && vars.target === me.name) vars.target = tRef.current("feed.you");
      const notice: SeatNotice = {
        id: nextId.current++,
        kind: event.kind,
        text: tRef.current(seatTextKey(event, viewerId), vars),
        tone: toneOf(event, viewerId),
      };
      setSeatNotices((current) => ({ ...current, [event.actorId]: notice }));
      const previousTimer = timers.current.get(event.actorId);
      if (previousTimer) clearTimeout(previousTimer);
      const ms = notice.tone === "info" ? BASIC_MS : ABILITY_MS;
      timers.current.set(
        event.actorId,
        setTimeout(() => {
          timers.current.delete(event.actorId);
          setSeatNotices((current) => {
            if (current[event.actorId]?.id !== notice.id) return current;
            const next = { ...current };
            delete next[event.actorId];
            return next;
          });
        }, ms),
      );

      if (actor && targetsViewer(event, viewerId)) {
        const alert: PersonalAlert = {
          id: notice.id,
          kind: event.kind,
          actorName: actor.name,
          text: tRef.current(`alert.${event.kind}`, { player: actor.name }),
        };
        setPersonalAlert(alert);
        vibrate("alert");
        const alertKey = "__alert__";
        const old = timers.current.get(alertKey);
        if (old) clearTimeout(old);
        timers.current.set(
          alertKey,
          setTimeout(() => setPersonalAlert((cur) => (cur?.id === alert.id ? null : cur)), ALERT_MS),
        );
      }
    }
  }, [logCount, viewerId]);

  useEffect(() => {
    const all = timers.current;
    return () => {
      all.forEach((timer) => clearTimeout(timer));
      all.clear();
    };
  }, []);

  return { seatNotices, personalAlert };
}
