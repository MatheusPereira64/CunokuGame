import { describe, it, expect } from "vitest";
import { listLanAddresses, buildLanInfo } from "./lanInfo";
import type { NetworkInterfaceInfo } from "os";

describe("listLanAddresses", () => {
  it("filtra só IPv4 externas", () => {
    const fake: NodeJS.Dict<NetworkInterfaceInfo[]> = {
      lo: [
        {
          address: "127.0.0.1",
          netmask: "255.0.0.0",
          family: "IPv4",
          mac: "00:00:00:00:00:00",
          internal: true,
          cidr: "127.0.0.1/8",
        },
      ],
      eth0: [
        {
          address: "192.168.1.42",
          netmask: "255.255.255.0",
          family: "IPv4",
          mac: "aa:bb:cc:dd:ee:ff",
          internal: false,
          cidr: "192.168.1.42/24",
        },
        {
          address: "fe80::1",
          netmask: "ffff:ffff:ffff:ffff::",
          family: "IPv6",
          mac: "aa:bb:cc:dd:ee:ff",
          internal: false,
          cidr: "fe80::1/64",
          scopeid: 1,
        },
      ],
    };

    expect(listLanAddresses(fake)).toEqual(["192.168.1.42"]);
  });
});

describe("buildLanInfo", () => {
  it("monta joinBaseUrls com a porta", () => {
    const fake: NodeJS.Dict<NetworkInterfaceInfo[]> = {
      wlan0: [
        {
          address: "10.0.0.5",
          netmask: "255.255.255.0",
          family: "IPv4",
          mac: "11:22:33:44:55:66",
          internal: false,
          cidr: "10.0.0.5/24",
        },
      ],
    };
    const info = buildLanInfo(5000, fake);
    expect(info.port).toBe(5000);
    expect(info.addresses).toEqual(["10.0.0.5"]);
    expect(info.joinBaseUrls).toEqual(["http://10.0.0.5:5000"]);
  });
});
