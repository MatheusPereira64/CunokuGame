import { describe, it, expect } from "vitest";
import { normalizeServerBase, isLikelyLocalHost, apiUrl, wsUrl } from "./gameServer";

describe("normalizeServerBase", () => {
  it("aceita IP com porta e adiciona http", () => {
    expect(normalizeServerBase("192.168.0.15:5000")).toBe("http://192.168.0.15:5000");
  });

  it("preserva https e remove path", () => {
    expect(normalizeServerBase("https://example.com/game?x=1")).toBe("https://example.com");
  });

  it("rejeita entrada vazia ou inválida", () => {
    expect(normalizeServerBase("")).toBeNull();
    expect(normalizeServerBase("   ")).toBeNull();
    expect(normalizeServerBase("not a url :::")).toBeNull();
  });
});

describe("isLikelyLocalHost", () => {
  it("reconhece loopback e ranges privados", () => {
    expect(isLikelyLocalHost("localhost")).toBe(true);
    expect(isLikelyLocalHost("127.0.0.1")).toBe(true);
    expect(isLikelyLocalHost("192.168.1.10")).toBe(true);
    expect(isLikelyLocalHost("10.0.0.2")).toBe(true);
    expect(isLikelyLocalHost("172.16.5.1")).toBe(true);
    expect(isLikelyLocalHost("8.8.8.8")).toBe(false);
    expect(isLikelyLocalHost("cunoku.example.com")).toBe(false);
  });
});

describe("apiUrl / wsUrl with default origin", () => {
  it("apiUrl retorna path relativo no mesmo origin (sem session base)", () => {
    // Em ambiente de teste sem sessionStorage set, usa window se existir
    const path = apiUrl("/api/rooms");
    expect(path === "/api/rooms" || path.endsWith("/api/rooms")).toBe(true);
  });

  it("wsUrl termina com /ws", () => {
    expect(wsUrl().endsWith("/ws")).toBe(true);
  });
});
