import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { isNativeApp } from "./gameServer";

export type UpdateProgress = { downloaded: number; total: number; percent: number };

interface AppUpdaterPlugin {
  download(options: { url: string }): Promise<{ path: string }>;
  install(): Promise<{ started: boolean; needsPermission: boolean }>;
  addListener(event: "progress", listener: (progress: UpdateProgress) => void): Promise<PluginListenerHandle>;
}

export const AppUpdater = registerPlugin<AppUpdaterPlugin>("AppUpdater");

/** APK Android com o plugin nativo: baixa e instala sem sair do app. */
export function canSelfUpdate(assetName: string | null): boolean {
  return (
    isNativeApp() &&
    Capacitor.getPlatform() === "android" &&
    Capacitor.isPluginAvailable("AppUpdater") &&
    !!assetName?.toLowerCase().endsWith(".apk")
  );
}
