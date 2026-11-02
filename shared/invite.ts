/** Extrai o código de sala de um link, esquema cunoku:// ou código solto. */
export function parseInviteCode(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^[A-Za-z0-9]{4}$/.test(raw)) return raw.toUpperCase();

  try {
    const url = raw.includes("://") ? new URL(raw) : new URL(raw, "https://cunoku.local");
    const fromPath = url.pathname.match(/\/join\/([A-Za-z0-9]{4})(?:\/|$)/i);
    if (fromPath?.[1]) return fromPath[1].toUpperCase();

    const query = url.searchParams.get("join") || url.searchParams.get("code");
    if (query && /^[A-Za-z0-9]{4}$/.test(query)) return query.toUpperCase();

    // cunoku://join/ABCD → host "join", pathname "/ABCD"
    if (url.protocol === "cunoku:" && url.hostname.toLowerCase() === "join") {
      const segment = url.pathname.replace(/^\//, "").split("/")[0] ?? "";
      if (/^[A-Za-z0-9]{4}$/.test(segment)) return segment.toUpperCase();
    }
  } catch {
    return null;
  }
  return null;
}

export function invitePath(code: string): string {
  return `/join/${code.toUpperCase()}`;
}
