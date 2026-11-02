import { invitePath } from "@shared/invite";
import { DEFAULT_CLOUD_SERVER, getLanJoinUrl, getNetworkMode, isNativeApp } from "@/lib/gameServer";

/** URL que outro aparelho consegue abrir. */
export function buildInviteUrl(code: string): string {
  if (getNetworkMode() === "lan") {
    const base = (getLanJoinUrl() || window.location.origin).replace(/\/$/, "");
    return `${base}${invitePath(code)}`;
  }
  const origin = isNativeApp()
    ? String(DEFAULT_CLOUD_SERVER).replace(/\/$/, "")
    : window.location.origin.replace(/\/$/, "");
  return `${origin}${invitePath(code)}`;
}
