import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadFriends, rememberPlayers, sortFriends, toggleFavorite } from "./friends";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
});

describe("amigos e recentes", () => {
  it("lembra quem jogou, pelo nome, sem duplicar", () => {
    rememberPlayers([{ name: "Kenji" }, { name: "Yuki" }], 1);
    rememberPlayers([{ name: " kenji ", iconId: "crown" }], 2);
    const list = loadFriends();
    expect(list.map((f) => f.name)).toEqual(["kenji", "Yuki"]);
    expect(list[0]).toMatchObject({ iconId: "crown", lastPlayedAt: 2 });
  });

  it("favoritos vêm primeiro", () => {
    rememberPlayers([{ name: "Kenji" }], 1);
    rememberPlayers([{ name: "Yuki" }], 2);
    expect(toggleFavorite("kenji").map((f) => f.name)).toEqual(["Kenji", "Yuki"]);
    expect(toggleFavorite("Kenji").map((f) => f.name)).toEqual(["Yuki", "Kenji"]);
  });

  it("com a lista cheia, os favoritos ficam e os mais antigos saem", () => {
    rememberPlayers([{ name: "Fiel" }], 0);
    toggleFavorite("Fiel");
    rememberPlayers(Array.from({ length: 35 }, (_, i) => ({ name: `P${i}` })), 10);
    const list = loadFriends();
    expect(list).toHaveLength(30);
    expect(list[0]!.name).toBe("Fiel");
  });

  it("ignora nomes vazios", () => {
    expect(rememberPlayers([{ name: "  " }], 1)).toEqual([]);
    expect(sortFriends([])).toEqual([]);
  });
});
