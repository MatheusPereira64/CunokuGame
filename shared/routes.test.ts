import { describe, it, expect } from "vitest";
import { buildUrl, api } from "./routes";

describe("buildUrl", () => {
  it("substitui parâmetros nomeados no path", () => {
    expect(buildUrl("/api/rooms/:code", { code: "ABCD" })).toBe("/api/rooms/ABCD");
    expect(buildUrl("/api/rooms/:code/players/:id", { code: "ZZ", id: 7 })).toBe(
      "/api/rooms/ZZ/players/7"
    );
  });

  it("retorna o path original sem params", () => {
    expect(buildUrl("/api/rooms")).toBe("/api/rooms");
  });
});

describe("api.rooms contracts", () => {
  it("valida input de create room", () => {
    const parsed = api.rooms.create.input.parse({
      playerName: "Matheus",
      maxPlayers: 4,
      botCount: 2,
    });
    expect(parsed.playerName).toBe("Matheus");
    expect(parsed.gameMode).toBe("multiplayer");
  });

  it("rejeita join com código inválido", () => {
    expect(() =>
      api.rooms.join.input.parse({ code: "AB", playerName: "X" })
    ).toThrow();
  });
});
