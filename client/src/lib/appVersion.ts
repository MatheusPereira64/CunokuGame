/** Versão embutida do app — mantenha alinhada com package.json / tags de Release. */
export const APP_VERSION = "1.0.12";

export const GITHUB_OWNER = "MatheusPereira64";
export const GITHUB_REPO = "CunokuGame";
export const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
export const GITHUB_RELEASES_PAGE = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

const DISMISS_KEY = "cunoku_dismissed_update";

/** Normaliza tag tipo "v1.2.3" → "1.2.3" */
export function normalizeVersion(tag: string): string {
  return tag.trim().replace(/^v/i, "");
}

/**
 * Compara semver simples (major.minor.patch).
 * Retorna >0 se a > b, <0 se a < b, 0 se iguais.
 */
export function compareSemver(a: string, b: string): number {
  const pa = normalizeVersion(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = normalizeVersion(b).split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

export function isNewerVersion(remote: string, local: string = APP_VERSION): boolean {
  return compareSemver(remote, local) > 0;
}

export function getDismissedUpdateTag(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

export function dismissUpdateTag(tag: string): void {
  try {
    localStorage.setItem(DISMISS_KEY, normalizeVersion(tag));
  } catch {
    // ignore
  }
}

export function isUpdateDismissed(tag: string): boolean {
  const dismissed = getDismissedUpdateTag();
  if (!dismissed) return false;
  return normalizeVersion(dismissed) === normalizeVersion(tag);
}
