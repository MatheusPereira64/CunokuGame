import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { GameState } from "@shared/schema";
import { audioManager } from "@/utils/audioManager";
import { vibrate } from "@/lib/haptics";

/** Quantos segundos antes do fim da vez o jogador é avisado. */
export const TURN_WARNING_S = 10;
const NOTIFICATION_ID = 6060;

type Texts = { title: string; body: string };

/** Quanto falta (ms) para o aviso; null quando não há relógio ou já passou da hora. */
export function warningDelay(deadline: number | null | undefined, now: number): number | null {
  if (deadline == null) return null;
  const delay = deadline - TURN_WARNING_S * 1000 - now;
  return delay > 0 ? delay : null;
}

let permissionAsked = false;

/** Pede a permissão uma vez, na primeira vez com relógio, e não insiste se o jogador negar. */
async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const current = await LocalNotifications.checkPermissions();
      if (current.display === "granted") return true;
      if (permissionAsked || current.display === "denied") return false;
      permissionAsked = true;
      return (await LocalNotifications.requestPermissions()).display === "granted";
    }
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    if (permissionAsked || Notification.permission === "denied") return false;
    permissionAsked = true;
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** No app, a notificação é agendada no sistema: chega mesmo com a tela desligada. */
async function scheduleNative(at: number, texts: Texts): Promise<void> {
  if (!(await ensureNotificationPermission())) return;
  await LocalNotifications.schedule({
    notifications: [{ id: NOTIFICATION_ID, title: texts.title, body: texts.body, schedule: { at: new Date(at), allowWhileIdle: true } }],
  });
}

async function cancelNative(): Promise<void> {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
  } catch {
    /* nada agendado */
  }
}

/**
 * Faltando 10 segundos da minha vez: som e vibração com o jogo aberto, e notificação
 * quando o app está em segundo plano ou com a tela desligada.
 */
export function useTurnWarning(gameState: GameState | null | undefined, isMyTurn: boolean, texts: Texts) {
  const textsRef = useRef(texts);
  textsRef.current = texts;
  const deadline = isMyTurn && !gameState?.winnerId ? gameState?.turnDeadline ?? null : null;
  const turnKey = gameState?.turnKey ?? null;

  useEffect(() => {
    const delay = warningDelay(deadline, Date.now());
    if (delay == null || deadline == null) return;
    const native = Capacitor.isNativePlatform();
    if (native) void scheduleNative(deadline - TURN_WARNING_S * 1000, textsRef.current);
    else void ensureNotificationPermission();

    const timer = setTimeout(() => {
      audioManager.playTimeWarning();
      vibrate("alert");
      if (!native && document.visibilityState === "hidden" && typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification(textsRef.current.title, { body: textsRef.current.body, tag: "cunoku-turn" });
        } catch {
          /* navegador sem suporte a notificação fora de service worker */
        }
      }
    }, delay);
    return () => {
      clearTimeout(timer);
      if (native) void cancelNative();
    };
  }, [deadline, turnKey]);
}
