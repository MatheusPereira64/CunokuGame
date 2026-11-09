import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

const STORAGE_KEY = "cunoku_haptics";

export type HapticMoment = "turn" | "penalty" | "cunoku" | "alert";

/** Ligado por padrão: o jogador desliga nas configurações de som. */
export function hapticsEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
}

/** Padrões para o navegador, que só sabe vibrar por tempo (o iPhone não vibra pelo navegador). */
const WEB_PATTERNS: Record<HapticMoment, number[]> = {
  turn: [30],
  penalty: [60, 60, 60],
  cunoku: [40, 50, 120],
  alert: [25, 40, 25],
};

/** Toque leve na vez, mais forte na punição e no Cunoku. Nunca falha em voz alta. */
export function vibrate(moment: HapticMoment): void {
  if (!hapticsEnabled()) return;
  try {
    if (Capacitor.isNativePlatform()) {
      if (moment === "turn") void Haptics.impact({ style: ImpactStyle.Light });
      else if (moment === "penalty") void Haptics.notification({ type: NotificationType.Error });
      else if (moment === "alert") void Haptics.notification({ type: NotificationType.Warning });
      else void Haptics.impact({ style: ImpactStyle.Heavy });
      return;
    }
    navigator.vibrate?.(WEB_PATTERNS[moment]);
  } catch {
    /* aparelho sem motor de vibração */
  }
}
