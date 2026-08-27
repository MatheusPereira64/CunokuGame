/** Origins permitidos para CORS (Capacitor + web + LAN). */
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/cunoku\.cunokugame\.workers\.dev$/i,
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^capacitor:\/\/localhost$/i,
  /^ionic:\/\/localhost$/i,
  /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(?::\d+)?$/i,
  /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?$/i,
  /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(?::\d+)?$/i,
];

export function resolveCorsOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null;
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(requestOrigin)) ? requestOrigin : null;
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = resolveCorsOrigin(request.headers.get("Origin"));
  const headers: Record<string, string> = {
    "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
  };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers["vary"] = "Origin";
  }
  return headers;
}
