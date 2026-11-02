import { describe, expect, it } from "vitest";
import { invitePath, parseInviteCode } from "./invite";

describe("parseInviteCode", () => {
  it("aceita código solto", () => {
    expect(parseInviteCode("ab2k")).toBe("AB2K");
  });

  it("lê /join/CODE e query", () => {
    expect(parseInviteCode("https://cunoku.cunokugame.workers.dev/join/ab2k")).toBe("AB2K");
    expect(parseInviteCode("https://example.com/?join=zz99")).toBe("ZZ99");
  });

  it("lê o esquema cunoku://", () => {
    expect(parseInviteCode("cunoku://join/h7kp")).toBe("H7KP");
  });

  it("rejeita lixo", () => {
    expect(parseInviteCode("")).toBeNull();
    expect(parseInviteCode("https://example.com/rules")).toBeNull();
  });
});

describe("invitePath", () => {
  it("monta o path público", () => {
    expect(invitePath("ab2k")).toBe("/join/AB2K");
  });
});
