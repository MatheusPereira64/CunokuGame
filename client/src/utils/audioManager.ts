/**
 * Gerenciador de áudio para o jogo Cunoku
 * Controla músicas de fundo e efeitos sonoros
 */

type MusicTrack = "menu" | "game";

class AudioManager {
  private menuMusic: HTMLAudioElement | null = null;
  private gameMusic: HTMLAudioElement | null = null;
  private currentMusic: HTMLAudioElement | null = null;
  /** Faixa que deveria estar tocando (sobrevive a mute/pause). */
  private desiredTrack: MusicTrack | null = null;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.7;
  private isMuted: boolean = false;
  private userInteracted: boolean = false;
  private audioCtx: AudioContext | null = null;
  private readonly unlockEvents = ["pointerdown", "touchstart", "keydown", "click"] as const;
  private unlockHandler: (() => void) | null = null;

  constructor() {
    const savedMusicVolume = localStorage.getItem("cunoku_music_volume");
    const savedSfxVolume = localStorage.getItem("cunoku_sfx_volume");
    const savedMuted = localStorage.getItem("cunoku_muted");

    if (savedMusicVolume !== null) {
      this.musicVolume = parseFloat(savedMusicVolume);
    }
    if (savedSfxVolume !== null) {
      this.sfxVolume = parseFloat(savedSfxVolume);
    }
    if (savedMuted !== null) {
      this.isMuted = savedMuted === "true";
    }

    this.menuMusic = this.createLoopingTrack("/audio/soundtrack/menu.mp3");
    this.gameMusic = this.createLoopingTrack("/audio/soundtrack/match-frenzy.mp3");

    this.setupUserInteraction();
    this.setupAutoplayRetries();
  }

  private createLoopingTrack(src: string): HTMLAudioElement {
    const audio = new Audio(src);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = this.musicVolume;
    // Ajuda em iOS / WebViews embutidos
    audio.setAttribute("playsinline", "true");
    (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
    return audio;
  }

  private setupUserInteraction(): void {
    this.unlockHandler = () => {
      this.userInteracted = true;
      void this.getAudioContext();
      if (!this.isMuted) {
        void this.resumeDesiredTrack();
      }
      this.teardownUnlockListeners();
    };

    // Vários eventos: em mobile o primeiro gesto pode ser pointer/touch, não click
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    for (const event of this.unlockEvents) {
      document.addEventListener(event, this.unlockHandler, opts);
    }
  }

  private teardownUnlockListeners(): void {
    if (!this.unlockHandler) return;
    for (const event of this.unlockEvents) {
      document.removeEventListener(event, this.unlockHandler, true);
    }
    this.unlockHandler = null;
  }

  /**
   * Retenta autoplay quando a página fica visível / o arquivo carrega.
   * Browsers desktop ainda podem bloquear sem gesto; no WebView Android costuma liberar.
   */
  private setupAutoplayRetries(): void {
    const retry = () => {
      if (this.isMuted || !this.desiredTrack) return;
      const track = this.getTrackElement(this.desiredTrack);
      if (track && track.paused) {
        void this.tryPlay(track);
      }
    };

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") retry();
    });
    window.addEventListener("pageshow", retry);
    window.addEventListener("focus", retry);

    for (const track of [this.menuMusic, this.gameMusic]) {
      track?.addEventListener("canplaythrough", retry, { once: true });
    }
  }

  private getTrackElement(track: MusicTrack): HTMLAudioElement | null {
    return track === "menu" ? this.menuMusic : this.gameMusic;
  }

  private async tryPlay(audio: HTMLAudioElement | null): Promise<boolean> {
    if (!audio || this.isMuted) return false;

    audio.volume = this.musicVolume;
    audio.muted = false;

    try {
      await audio.play();
      this.userInteracted = true;
      return true;
    } catch {
      // Alguns ambientes permitem autoplay só se começar mudo; depois desmutamos.
      try {
        audio.muted = true;
        await audio.play();
        audio.muted = false;
        audio.volume = this.musicVolume;
        this.userInteracted = true;
        return true;
      } catch (err) {
        console.log("Menu/game music waiting for user gesture:", err);
        return false;
      }
    }
  }

  private async resumeDesiredTrack(): Promise<void> {
    if (!this.desiredTrack || this.isMuted) return;
    const el = this.getTrackElement(this.desiredTrack);
    this.currentMusic = el;
    await this.tryPlay(el);
  }

  private pauseAllMusic(resetTime: boolean): void {
    for (const track of [this.menuMusic, this.gameMusic]) {
      if (!track) continue;
      track.pause();
      if (resetTime) track.currentTime = 0;
    }
  }

  /**
   * Toca a música do menu
   */
  playMenuMusic(): void {
    this.desiredTrack = "menu";
    this.pauseAllMusic(true);
    this.currentMusic = this.menuMusic;
    if (this.isMuted) return;
    void this.tryPlay(this.menuMusic);
  }

  /**
   * Toca a música da partida
   */
  playGameMusic(): void {
    this.desiredTrack = "game";
    this.pauseAllMusic(true);
    this.currentMusic = this.gameMusic;
    if (this.isMuted) return;
    void this.tryPlay(this.gameMusic);
  }

  /**
   * Para todas as músicas
   */
  stopAllMusic(): void {
    this.desiredTrack = null;
    this.pauseAllMusic(true);
    this.currentMusic = null;
  }

  playGameWon(): void {
    if (this.isMuted || !this.userInteracted) return;

    const sound = new Audio("/audio/sfx/game-won.mp3");
    sound.volume = this.sfxVolume;
    sound.play().catch((err) => {
      console.warn("Failed to play game won sound:", err);
    });
  }

  playGameLost(): void {
    if (this.isMuted || !this.userInteracted) return;

    const sound = new Audio("/audio/sfx/game-lost.mp3");
    sound.volume = this.sfxVolume;
    sound.play().catch((err) => {
      console.warn("Failed to play game lost sound:", err);
    });
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!this.audioCtx) {
      this.audioCtx = new Ctor();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private canPlaySfx(): boolean {
    return !this.isMuted && this.userInteracted && this.sfxVolume > 0;
  }

  playCardSlide(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const duration = 0.18;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2600, ctx.currentTime);
    filter.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.sfxVolume * 0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  }

  playCardFlip(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(680, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1150, ctx.currentTime + 0.06);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.sfxVolume * 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  playSwap(): void {
    if (!this.canPlaySfx()) return;
    this.playCardSlide();
    setTimeout(() => this.playCardSlide(), 160);
  }

  playPenalty(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.sfxVolume * 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  playYourTurn(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const playNote = (freq: number, startOffset: number) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime + startOffset);
      gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.22, ctx.currentTime + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + 0.28);

      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + 0.3);
    };

    playNote(659.25, 0);
    playNote(880, 0.14);
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.menuMusic) this.menuMusic.volume = this.musicVolume;
    if (this.gameMusic) this.gameMusic.volume = this.musicVolume;
    localStorage.setItem("cunoku_music_volume", this.musicVolume.toString());
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    localStorage.setItem("cunoku_sfx_volume", this.sfxVolume.toString());
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  /**
   * Muta/desmuta o áudio.
   * Mute apenas pausa (mantém a faixa desejada); desmute retoma essa faixa.
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    localStorage.setItem("cunoku_muted", muted.toString());

    if (muted) {
      // Não zera desiredTrack / currentMusic — senão o desmute não sabe o que retomar
      this.pauseAllMusic(false);
    } else {
      void this.resumeDesiredTrack();
    }
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  cleanup(): void {
    this.stopAllMusic();
    this.menuMusic = null;
    this.gameMusic = null;
  }
}

export const audioManager = new AudioManager();
