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

  constructor() {
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

  /**
   * Define o volume da música
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.menuMusic) this.menuMusic.volume = this.musicVolume;
    if (this.gameMusic) this.gameMusic.volume = this.musicVolume;
  }

  /**
   * Define o volume dos efeitos sonoros
   */
  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Muta/desmuta o áudio
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
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

