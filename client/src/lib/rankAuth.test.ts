import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  countsForGlobalRank,
  fetchRankMe,
  forgetSavedAccount,
  getRankToken,
  getSavedAccounts,
  isRankLoggedIn,
  loginRankAccount,
  logoutRank,
  registerRankAccount,
  switchToSavedAccount,
} from "./rankAuth";

describe("countsForGlobalRank", () => {
  const me = "p1";

  it("rejeita offline / só bots", () => {
    expect(
      countsForGlobalRank(true, [{ id: me }, { id: "b1", isBot: true }], me),
    ).toBe(false);
    expect(
      countsForGlobalRank(false, [{ id: me }, { id: "b1", isBot: true }], me),
    ).toBe(false);
  });

  it("aceita multiplayer com outro humano", () => {
    expect(
      countsForGlobalRank(
        false,
        [
          { id: me, isBot: false },
          { id: "p2", isBot: false },
        ],
        me,
      ),
    ).toBe(true);
    expect(
      countsForGlobalRank(
        false,
        [
          { id: me },
          { id: "p2" },
          { id: "b1", isBot: true },
        ],
        me,
      ),
    ).toBe(true);
  });
});

describe("contas salvas no aparelho", () => {
  const profile = (id: string) => ({
    playerId: id,
    nickname: `nick${id}`,
    displayName: `Nome ${id}`,
    iconId: "spade",
    accent: "indigo",
    wins: 3,
  });

  function serverReplies(...replies: { status: number; body: unknown }[]) {
    const queue = [...replies];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const reply = queue.shift() ?? { status: 500, body: {} };
        const text = JSON.stringify(reply.body);
        return {
          ok: reply.status < 400,
          status: reply.status,
          text: async () => text,
          json: async () => reply.body,
          clone() {
            return this;
          },
        };
      }),
    );
  }

  beforeEach(() => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("sessionStorage", storage);
    vi.stubGlobal("window", { location: { origin: "https://cunoku.test", protocol: "https:", hostname: "cunoku.test" } });
  });

  it("guarda a conta ao criar e ao entrar, com a mais recente no topo", async () => {
    serverReplies({ status: 201, body: { token: "t1", profile: profile("1") } }, { status: 200, body: { token: "t2", profile: profile("2") } });
    await registerRankAccount({ nickname: "nick1", pin: "1234" });
    await loginRankAccount({ nickname: "nick2", pin: "1234" });
    expect(getSavedAccounts().map((a) => a.nickname)).toEqual(["nick2", "nick1"]);
  });

  it("sair mantém a conta salva e dá para voltar sem PIN", async () => {
    serverReplies({ status: 200, body: { token: "t1", profile: profile("1") } }, { status: 200, body: { profile: profile("1") } });
    await loginRankAccount({ nickname: "nick1", pin: "1234" });
    logoutRank();
    expect(isRankLoggedIn()).toBe(false);
    expect(getSavedAccounts()).toHaveLength(1);

    const back = await switchToSavedAccount("1");
    expect(back?.nickname).toBe("nick1");
    expect(getRankToken()).toBe("t1");
  });

  it("guarda também quem já estava logado antes desta versão", async () => {
    localStorage.setItem("cunoku_rank_token", "antigo");
    localStorage.setItem("cunoku_rank_player_id", "9");
    serverReplies({ status: 200, body: { profile: profile("9") } });
    await fetchRankMe();
    expect(getSavedAccounts()[0]).toMatchObject({ playerId: "9", nickname: "nick9", token: "antigo" });
  });

  it("sessão inválida mantém a conta na lista para entrar com o PIN", async () => {
    serverReplies({ status: 200, body: { token: "t1", profile: profile("1") } }, { status: 401, body: {} });
    await loginRankAccount({ nickname: "nick1", pin: "1234" });
    expect(await fetchRankMe()).toBeNull();
    expect(isRankLoggedIn()).toBe(false);
    expect(getSavedAccounts()[0]).toMatchObject({ nickname: "nick1", token: null });
    expect(await switchToSavedAccount("1")).toBeNull();
  });

  it("falha de rede não encerra a sessão nem apaga a conta", async () => {
    serverReplies({ status: 200, body: { token: "t1", profile: profile("1") } }, { status: 500, body: {} });
    await loginRankAccount({ nickname: "nick1", pin: "1234" });
    await expect(fetchRankMe()).rejects.toThrow();
    expect(getRankToken()).toBe("t1");
    expect(getSavedAccounts()).toHaveLength(1);
  });

  it("esquecer remove a conta e encerra a sessão dela", async () => {
    serverReplies({ status: 200, body: { token: "t1", profile: profile("1") } });
    await loginRankAccount({ nickname: "nick1", pin: "1234" });
    forgetSavedAccount("1");
    expect(getSavedAccounts()).toEqual([]);
    expect(isRankLoggedIn()).toBe(false);
  });

  it("ignora lista corrompida", () => {
    localStorage.setItem("cunoku_saved_accounts", "{quebrado");
    expect(getSavedAccounts()).toEqual([]);
    localStorage.setItem("cunoku_saved_accounts", JSON.stringify([{ foo: 1 }, { playerId: "1", nickname: "ok", displayName: "ok", token: null }]));
    expect(getSavedAccounts().map((a) => a.nickname)).toEqual(["ok"]);
  });
});
