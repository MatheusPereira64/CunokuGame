import { APP_VERSION, GITHUB_RELEASES_API, GITHUB_RELEASES_PAGE, isNewerVersion, normalizeVersion } from "./appVersion";
import type { ReleaseAsset } from "./updateCheck";

/**
 * No navegador o jogo não é "baixado": o site deve estar sempre na última release.
 * Se a página carregou atrás da última release (cópia guardada pelo modo offline),
 * pede ao service worker a versão nova e recarrega — uma vez por versão, para nunca entrar em loop
 * (o site pode publicar alguns minutos antes ou depois da release).
 */
const REFRESH_KEY = "cunoku_web_refreshed_for";

export async function refreshIfBehindRelease(latestTag: string): Promise<boolean> {
  if (!isNewerVersion(latestTag, APP_VERSION)) return false;
  try {
    if (sessionStorage.getItem(REFRESH_KEY) === latestTag) return false;
    sessionStorage.setItem(REFRESH_KEY, latestTag);
  } catch {
    return false;
  }
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    await registration?.update();
  } catch {
    // Sem service worker: o recarregamento já busca a página nova
  }
  window.location.reload();
  return true;
}

export type AppDownloads = { android: string | null; iphone: string | null; page: string };

/** Última release com os links do APK e do IPA, numa consulta só (a API do GitHub limita por IP). */
export async function fetchAppDownloads(signal?: AbortSignal): Promise<{ tag: string; downloads: AppDownloads } | null> {
  const res = await fetch(GITHUB_RELEASES_API, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    signal,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { tag_name?: string; html_url?: string; draft?: boolean; prerelease?: boolean; assets?: ReleaseAsset[] };
  if (!data.tag_name || data.draft || data.prerelease) return null;
  const assets = data.assets ?? [];
  const find = (ext: string) => assets.find((asset) => asset.name.toLowerCase().endsWith(ext))?.browser_download_url ?? null;
  return {
    tag: normalizeVersion(data.tag_name),
    downloads: { android: find(".apk"), iphone: find(".ipa"), page: data.html_url || GITHUB_RELEASES_PAGE },
  };
}

let latestPromise: Promise<{ tag: string; downloads: AppDownloads } | null> | null = null;

/** Uma consulta por carregamento da página, compartilhada entre a checagem de versão e o convite. */
export function latestAppRelease(): Promise<{ tag: string; downloads: AppDownloads } | null> {
  latestPromise ??= fetchAppDownloads().catch(() => null);
  return latestPromise;
}

const INVITE_KEY = "cunoku_app_invite_dismissed_at";
/** Depois de "Agora não", o convite só volta depois disso. */
export const INVITE_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

export function inviteSnoozed(now = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(INVITE_KEY));
    return at > 0 && now - at < INVITE_SNOOZE_MS;
  } catch {
    return false;
  }
}

export function snoozeInvite(now = Date.now()): void {
  try {
    localStorage.setItem(INVITE_KEY, String(now));
  } catch {
    // Sem armazenamento: o convite pode aparecer de novo na próxima visita
  }
}
