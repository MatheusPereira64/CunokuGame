/**
 * Gerenciador de áudio para o jogo Cunoku
 * Controla músicas de fundo e efeitos sonoros
 */

class AudioManager {
  private menuMusic: HTMLAudioElement | null = null;
  private gameMusic: HTMLAudioElement | null = null;
  private currentMusic: HTMLAudioElement | null = null;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.7;
  private isMuted: boolean = false;
  private userInteracted: boolean = false;
  private audioCtx: AudioContext | null = null;

  constructor() {
    // Carrega volumes salvos do localStorage
    const savedMusicVolume = localStorage.getItem('cunoku_music_volume');
    const savedSfxVolume = localStorage.getItem('cunoku_sfx_volume');
    const savedMuted = localStorage.getItem('cunoku_muted');
    
    if (savedMusicVolume !== null) {
      this.musicVolume = parseFloat(savedMusicVolume);
    }
    if (savedSfxVolume !== null) {
      this.sfxVolume = parseFloat(savedSfxVolume);
    }
    if (savedMuted !== null) {
      this.isMuted = savedMuted === 'true';
    }

    // Inicializa as músicas
    this.menuMusic = new Audio('/audio/soundtrack/menu.mp3');
    this.menuMusic.loop = true;
    this.menuMusic.volume = this.musicVolume;

    this.gameMusic = new Audio('/audio/soundtrack/match-frenzy.mp3');
    this.gameMusic.loop = true;
    this.gameMusic.volume = this.musicVolume;

    // Detecta primeira interação do usuário
    this.setupUserInteraction();
  }

  /**
   * Configura detecção de interação do usuário
   */
  private setupUserInteraction(): void {
    const enableAudio = () => {
      this.userInteracted = true;
      // Tenta tocar a música do menu se já estiver configurada para tocar
      if (this.currentMusic === this.menuMusic && this.menuMusic && this.menuMusic.paused) {
        this.menuMusic.play().catch(err => {
          console.warn('Failed to play menu music after interaction:', err);
        });
      }
      // Remove listeners após primeira interação
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };

    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('keydown', enableAudio, { once: true });
    document.addEventListener('touchstart', enableAudio, { once: true });
  }

  /**
   * Toca a música do menu
   */
  playMenuMusic(): void {
    if (this.isMuted) return;
    
    this.stopAllMusic();
    if (this.menuMusic) {
      // Tenta tocar mesmo sem interação do usuário
      // Se falhar, será tentado novamente após interação
      this.menuMusic.play().catch(err => {
        // Se falhar por falta de interação, marca para tentar novamente
        if (!this.userInteracted) {
          console.log('Menu music will play after user interaction');
        } else {
          console.warn('Failed to play menu music:', err);
        }
      });
      this.currentMusic = this.menuMusic;
    }
  }

  /**
   * Toca a música da partida
   */
  playGameMusic(): void {
    if (this.isMuted || !this.userInteracted) return;
    
    this.stopAllMusic();
    if (this.gameMusic) {
      this.gameMusic.play().catch(err => {
        console.warn('Failed to play game music:', err);
      });
      this.currentMusic = this.gameMusic;
    }
  }

  /**
   * Para todas as músicas
   */
  stopAllMusic(): void {
    if (this.menuMusic) {
      this.menuMusic.pause();
      this.menuMusic.currentTime = 0;
    }
    if (this.gameMusic) {
      this.gameMusic.pause();
      this.gameMusic.currentTime = 0;
    }
    this.currentMusic = null;
  }

  /**
   * Toca efeito sonoro de vitória
   */
  playGameWon(): void {
    if (this.isMuted || !this.userInteracted) return;
    
    const sound = new Audio('/audio/sfx/game-won.mp3');
    sound.volume = this.sfxVolume;
    sound.play().catch(err => {
      console.warn('Failed to play game won sound:', err);
    });
  }

  /**
   * Toca efeito sonoro de derrota
   */
  playGameLost(): void {
    if (this.isMuted || !this.userInteracted) return;
    
    const sound = new Audio('/audio/sfx/game-lost.mp3');
    sound.volume = this.sfxVolume;
    sound.play().catch(err => {
      console.warn('Failed to play game lost sound:', err);
    });
  }

  // ============================================
  // SFX sintetizados via Web Audio (sem arquivos)
  // ============================================

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
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

  /** Ruído filtrado curto: som de carta deslizando na mesa */
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

  /** Estalo curto: som de carta virando */
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

  /** Dois deslizes em sequência: troca de cartas */
  playSwap(): void {
    if (!this.canPlaySfx()) return;
    this.playCardSlide();
    setTimeout(() => this.playCardSlide(), 160);
  }

  /** Zumbido grave: punição por descarte errado */
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

  /** Dois toques suaves ascendentes: começou o seu turno */
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

    playNote(659.25, 0); // Mi5
    playNote(880, 0.14); // Lá5
  }

  /**
   * Define o volume da música
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.menuMusic) this.menuMusic.volume = this.musicVolume;
    if (this.gameMusic) this.gameMusic.volume = this.musicVolume;
    // Salva no localStorage
    localStorage.setItem('cunoku_music_volume', this.musicVolume.toString());
  }

  /**
   * Obtém o volume da música
   */
  getMusicVolume(): number {
    return this.musicVolume;
  }

  /**
   * Define o volume dos efeitos sonoros
   */
  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    // Salva no localStorage
    localStorage.setItem('cunoku_sfx_volume', this.sfxVolume.toString());
  }

  /**
   * Obtém o volume dos efeitos sonoros
   */
  getSfxVolume(): number {
    return this.sfxVolume;
  }

  /**
   * Muta/desmuta o áudio
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    localStorage.setItem('cunoku_muted', muted.toString());
    if (muted) {
      this.stopAllMusic();
    } else {
      // Retoma a música atual se houver
      if (this.currentMusic) {
        this.currentMusic.play().catch(err => {
          console.warn('Failed to resume music:', err);
        });
      }
    }
  }

  /**
   * Verifica se está mudo
   */
  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Limpa recursos
   */
  cleanup(): void {
    this.stopAllMusic();
    if (this.menuMusic) {
      this.menuMusic = null;
    }
    if (this.gameMusic) {
      this.gameMusic = null;
    }
  }
}

// Instância singleton
export const audioManager = new AudioManager();

