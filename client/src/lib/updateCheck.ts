import {
  APP_VERSION,
  GITHUB_RELEASES_API,
  GITHUB_RELEASES_PAGE,
  compareSemver,
  isUpdateDismissed,
  normalizeVersion,
} from "./appVersion";

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  content_type: string;
  size: number;
}

export interface LatestReleaseInfo {
  tag: string;
  name: string;
  body: string;
  htmlUrl: string;
  publishedAt: string;
  downloadUrl: string;
  assetName: string | null;
}

function pickDownloadAsset(assets: ReleaseAsset[]): ReleaseAsset | null {
  if (!assets.length) return null;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isWin = /Windows/i.test(ua);

  const score = (name: string) => {
    const n = name.toLowerCase();
    if (isAndroid && n.endsWith(".apk")) return 100;
    if (isIOS && (n.endsWith(".ipa") || n.includes("ios"))) return 90;
    if (isWin && (n.endsWith(".exe") || n.endsWith(".msi"))) return 80;
    if (n.endsWith(".apk")) return 70;
    if (n.includes("mobile") || n.includes("android")) return 60;
    if (n.endsWith(".zip") || n.endsWith(".tar.gz")) return 40;
    return 10;
  };

  return [...assets].sort((a, b) => score(b.name) - score(a.name))[0] ?? null;
}

const RETRY_AFTER_FAILURE_MS = 5 * 60_000;
const MAX_RETRY_DELAY_MS = 60 * 60_000;

/** Falha da consulta, com o instante em que vale tentar de novo (limite por IP do GitHub). */
export class ReleaseCheckError extends Error {
  constructor(
    message: string,
    readonly retryAt: number | null,
  ) {
    super(message);
  }
}

/** A API sem login aceita 60 consultas por hora por IP; o limite é compartilhado com a rede toda. */
export function retryAtFromResponse(status: number, headers: { get(name: string): string | null }): number | null {
  if (status !== 403 && status !== 429) return null;
  const retryAfter = Number(headers.get("retry-after"));
  if (retryAfter > 0) return Date.now() + retryAfter * 1000;
  if (headers.get("x-ratelimit-remaining") !== "0") return null;
  const reset = Number(headers.get("x-ratelimit-reset"));
  return reset > 0 ? reset * 1000 : null;
}

export function updateRetryDelayMs(err: unknown, now = Date.now()): number {
  const retryAt = err instanceof ReleaseCheckError ? err.retryAt : null;
  if (retryAt === null) return RETRY_AFTER_FAILURE_MS;
  // Margem para o limite já ter reiniciado quando a nova consulta chegar
  return Math.min(Math.max(retryAt - now, 0) + 5_000, MAX_RETRY_DELAY_MS);
}

export async function fetchLatestRelease(signal?: AbortSignal): Promise<LatestReleaseInfo | null> {
  const res = await fetch(GITHUB_RELEASES_API, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal,
  });

  if (res.status === 404) {
    // Ainda não há releases publicados
    return null;
  }

  if (!res.ok) {
    throw new ReleaseCheckError(`GitHub releases: HTTP ${res.status}`, retryAtFromResponse(res.status, res.headers));
  }

  const data = (await res.json()) as {
    tag_name?: string;
    name?: string;
    body?: string;
    html_url?: string;
    published_at?: string;
    draft?: boolean;
    prerelease?: boolean;
    assets?: ReleaseAsset[];
  };

  if (data.draft || data.prerelease || !data.tag_name) {
    return null;
  }

  const assets = data.assets ?? [];
  const best = pickDownloadAsset(assets);
  const htmlUrl = data.html_url || GITHUB_RELEASES_PAGE;

  return {
    tag: normalizeVersion(data.tag_name),
    name: data.name || data.tag_name,
    body: data.body || "",
    htmlUrl,
    publishedAt: data.published_at || "",
    downloadUrl: best?.browser_download_url || htmlUrl,
    assetName: best?.name ?? null,
  };
}

export interface UpdateCheckResult {
  currentVersion: string;
  update: LatestReleaseInfo | null;
}

/** Retorna update se a release remota for mais nova e ainda não foi dispensada. */
export async function checkForAppUpdate(signal?: AbortSignal): Promise<UpdateCheckResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { currentVersion: APP_VERSION, update: null };
  }

  const latest = await fetchLatestRelease(signal);
  if (!latest) {
    return { currentVersion: APP_VERSION, update: null };
  }

  const remote = normalizeVersion(latest.tag);
  const local = normalizeVersion(APP_VERSION);

  // Mesma versão ou mais antiga no remoto → sem pop-up
  if (compareSemver(remote, local) <= 0) {
    return { currentVersion: APP_VERSION, update: null };
  }

  if (isUpdateDismissed(remote)) {
    return { currentVersion: APP_VERSION, update: null };
  }

  return {
    currentVersion: APP_VERSION,
    update: { ...latest, tag: remote },
  };
}
