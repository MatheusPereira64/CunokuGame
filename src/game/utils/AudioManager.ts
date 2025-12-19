import { EventEmitter } from './EventEmitter';

/**
 * Eventos do AudioManager
 */
export interface AudioManagerEvents {
  /** Volume alterado */
  'volume-changed': [volume: number];
  /** Mute alterado */
  'mute-changed': [muted: boolean];
}

/**
 * Gerenciador de áudio do jogo
 * 
 * Gerencia sons do jogo usando Web Audio API para gerar sons programaticamente
 * ou carregar assets de áudio.
 */
export class AudioManager extends EventEmitter<AudioManagerEvents> {
  private audioContext: AudioContext | null = null;
  private volume: number = 0.5;
  private muted: boolean = false;
  private sounds: Map<string, AudioBuffer> = new Map();

  constructor() {
    super();
    this.initAudioContext();
  }

  /**
   * Inicializa contexto de áudio
   */
  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API não suportada:', error);
    }
  }

  /**
   * Gera som de compra de carta
   */
  playCardDraw(): void {
    if (this.muted || !this.audioContext) return;
    this.playTone(200, 0.1, 'sine');
  }

  /**
   * Gera som de descarte
   */
  playCardDiscard(): void {
    if (this.muted || !this.audioContext) return;
    this.playTone(150, 0.15, 'square');
  }

  /**
   * Gera som de habilidade
   */
  playAbility(): void {
    if (this.muted || !this.audioContext) return;
    // Som mais complexo para habilidade
    this.playTone(300, 0.2, 'sine');
    setTimeout(() => {
      if (this.audioContext) {
        this.playTone(400, 0.15, 'sine');
      }
    }, 100);
  }

  /**
   * Gera som de erro
   */
  playError(): void {
    if (this.muted || !this.audioContext) return;
    this.playTone(100, 0.2, 'sawtooth');
  }

  /**
   * Gera som de sucesso
   */
  playSuccess(): void {
    if (this.muted || !this.audioContext) return;
    // Som ascendente
    this.playTone(300, 0.1, 'sine');
    setTimeout(() => {
      if (this.audioContext) {
        this.playTone(400, 0.1, 'sine');
      }
    }, 80);
    setTimeout(() => {
      if (this.audioContext) {
        this.playTone(500, 0.15, 'sine');
      }
    }, 160);
  }

  /**
   * Toca um tom usando Web Audio API
   */
  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  /**
   * Define volume (0-1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.emit('volume-changed', this.volume);
  }

  /**
   * Retorna volume atual
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Alterna mute
   */
  toggleMute(): void {
    this.muted = !this.muted;
    this.emit('mute-changed', this.muted);
  }

  /**
   * Define mute
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    this.emit('mute-changed', this.muted);
  }

  /**
   * Verifica se está mudo
   */
  isMuted(): boolean {
    return this.muted;
  }
}

