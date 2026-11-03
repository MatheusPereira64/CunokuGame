import { beforeEach, describe, expect, it, vi } from "vitest";

/** Imita a política de iOS/Safari: cada elemento só toca com som depois de tocar dentro de um gesto. */
let inGesture = false;

class FakeAudio {
  static instances: FakeAudio[] = [];
  loop = false;
  preload = "";
  volume = 1;
  muted = false;
  paused = true;
  currentTime = 0;
  unlocked = false;
  /** Quando true, play() fica pendente como num arquivo ainda carregando. */
  static slow = false;
  private pending: { resolve: () => void; reject: (e: Error) => void }[] = [];

  constructor(public src: string) {
    FakeAudio.instances.push(this);
  }
  setAttribute() {}
  addEventListener() {}

  play(): Promise<void> {
    if (inGesture) this.unlocked = true;
    if (!this.muted && !this.unlocked) {
      return Promise.reject(Object.assign(new Error("blocked"), { name: "NotAllowedError" }));
    }
    this.paused = false;
    if (!FakeAudio.slow) return Promise.resolve();
    return new Promise((resolve, reject) => this.pending.push({ resolve, reject }));
  }

  pause() {
    this.paused = true;
    const aborted = Object.assign(new Error("aborted"), { name: "AbortError" });
    this.pending.splice(0).forEach((p) => p.reject(aborted));
  }

  finishLoading() {
    this.pending.splice(0).forEach((p) => p.resolve());
  }
}

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

/** Valor do sorteio da música; a partir de 0,2 escolhe a primeira faixa da partida. */
let nextRandom = 0.9;

async function setup() {
  vi.resetModules();
  nextRandom = 0.9;
  vi.doMock("@shared/secureRandom", () => ({ randomFloat: () => nextRandom }));
  FakeAudio.instances = [];
  FakeAudio.slow = false;
  inGesture = false;

  const listeners = new Map<string, Set<() => void>>();
  const target = {
    addEventListener: (type: string, fn: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: () => void) => {
      listeners.get(type)?.delete(fn);
    },
  };
  const store = new Map<string, string>();
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("document", { ...target, visibilityState: "visible" });
  vi.stubGlobal("window", { ...target });
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
  });

  const { audioManager } = await import("./audioManager");
  const [menu, game] = FakeAudio.instances as [FakeAudio, FakeAudio];
  const tap = async () => {
    inGesture = true;
    Array.from(listeners.get("pointerdown") ?? []).forEach((fn) => fn());
    inGesture = false;
    await flush();
  };
  return { audioManager, menu, game, tap };
}

describe("sorteio da música da partida", () => {
  beforeEach(() => vi.unstubAllGlobals());

  const start = async (random: number) => {
    const ctx = await setup();
    await ctx.tap();
    nextRandom = random;
    ctx.audioManager.playGameMusic();
    await flush();
    const [, first, second] = FakeAudio.instances as [FakeAudio, FakeAudio, FakeAudio];
    return { ...ctx, first, second };
  };

  it("toca a segunda faixa em 20% das partidas", async () => {
    const usual = await start(0.2);
    expect(usual.first.paused).toBe(false);
    expect(usual.second.paused).toBe(true);
    const other = await start(0.19);
    expect(other.first.paused).toBe(true);
    expect(other.second.paused).toBe(false);
    expect(other.second.src).toContain("match-pai-de-familia.mp3");
  });

  it("mantém a faixa na mesma partida e sorteia de novo na seguinte", async () => {
    const { audioManager, first, second } = await start(0);
    nextRandom = 0.9;
    audioManager.playGameMusic();
    await flush();
    expect(second.paused).toBe(false);
    expect(first.paused).toBe(true);

    audioManager.stopAllMusic();
    audioManager.playGameMusic();
    await flush();
    expect(first.paused).toBe(false);
    expect(second.paused).toBe(true);
  });

  it("toca só uma música por vez", async () => {
    const { audioManager, menu } = await start(0.9);
    audioManager.playMenuMusic();
    await flush();
    expect(FakeAudio.instances.filter((a) => !a.paused)).toEqual([menu]);
  });
});

describe("música da partida", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("toca com som depois de um único toque no menu, mesmo iniciada sem gesto", async () => {
    const { audioManager, menu, game, tap } = await setup();
    audioManager.playMenuMusic();
    await flush();
    await tap();
    expect(menu.muted).toBe(false);
    expect(menu.paused).toBe(false);

    audioManager.stopAllMusic();
    audioManager.playGameMusic();
    await flush();
    expect(game.paused).toBe(false);
    expect(game.muted).toBe(false);
  });

  it("fica com som no próximo toque se o navegador bloquear a faixa da partida", async () => {
    const { audioManager, game, tap } = await setup();
    await tap();
    game.unlocked = false; // ex.: navegador revogou a liberação

    audioManager.playGameMusic();
    await flush();
    expect(game.muted).toBe(true);

    await tap();
    expect(game.paused).toBe(false);
    expect(game.muted).toBe(false);
  });

  it("não deixa uma tentativa abortada silenciar a tentativa nova", async () => {
    const { audioManager, game, tap } = await setup();
    await tap();
    FakeAudio.slow = true;

    audioManager.playGameMusic();
    audioManager.stopAllMusic();
    audioManager.playGameMusic();
    await flush();
    game.finishLoading();
    await flush();

    expect(game.paused).toBe(false);
    expect(game.muted).toBe(false);
  });

  it("não religa o menu mudo quando ele é interrompido ao entrar na partida", async () => {
    const { audioManager, menu, game, tap } = await setup();
    await tap();
    FakeAudio.slow = true;

    audioManager.playMenuMusic();
    audioManager.stopAllMusic();
    audioManager.playGameMusic();
    await flush();
    game.finishLoading();
    await flush();

    expect(menu.paused).toBe(true);
    expect(game.paused).toBe(false);
  });

  it("não toca nada depois de parar a música, mesmo com a liberação pendente", async () => {
    const { audioManager, menu, game, tap } = await setup();
    await tap();
    audioManager.stopAllMusic();
    await flush();
    expect(menu.paused).toBe(true);
    expect(game.paused).toBe(true);
    expect(menu.muted).toBe(false);
    expect(game.muted).toBe(false);
  });
});
