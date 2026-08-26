import {
  APP_VERSION,
  GITHUB_RELEASES_API,
  GITHUB_RELEASES_PAGE,
  isNewerVersion,
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
    throw new Error(`GitHub releases: HTTP ${res.status}`);
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

  if (!isNewerVersion(latest.tag, APP_VERSION)) {
    return { currentVersion: APP_VERSION, update: null };
  }

  if (isUpdateDismissed(latest.tag)) {
    return { currentVersion: APP_VERSION, update: null };
  }

  return { currentVersion: APP_VERSION, update: latest };
}
