import os from "os";

export interface LanInfo {
  port: number;
  addresses: string[];
  joinBaseUrls: string[];
}

/** Lista IPv4 não-internas das interfaces de rede (para convite LAN). */
export function listLanAddresses(
  interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]> = os.networkInterfaces()
): string[] {
  const addresses: string[] = [];
  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family !== "IPv4" && (entry.family as unknown) !== 4) continue;
      if (entry.internal) continue;
      if (!addresses.includes(entry.address)) {
        addresses.push(entry.address);
      }
    }
  }
  return addresses;
}

export function buildLanInfo(port: number, interfaces?: NodeJS.Dict<os.NetworkInterfaceInfo[]>): LanInfo {
  const addresses = listLanAddresses(interfaces);
  return {
    port,
    addresses,
    joinBaseUrls: addresses.map((ip) => `http://${ip}:${port}`),
  };
}
