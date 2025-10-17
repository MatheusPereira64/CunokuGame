/**
 * Gerador de sons básicos usando Web Audio API
 * Cria efeitos sonoros programaticamente para o jogo
 */

class SoundGenerator {
  constructor() {
    this.audioContext = null
    this.gainNode = null
    this.initialized = false
  }

  // Inicializar contexto de áudio
  init() {
    if (this.initialized) return

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      this.gainNode = this.audioContext.createGain()
      this.gainNode.connect(this.audioContext.destination)
      this.initialized = true
    } catch (error) {
      console.warn('Web Audio API não suportada:', error)
    }
  }

  // Criar oscilador com envelope
  createOscillator(frequency, type = 'sine', duration = 0.1, volume = 0.3) {
    if (!this.initialized) return null

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime)
    
    // Envelope ADSR
    const now = this.audioContext.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01) // Attack
    gainNode.gain.exponentialRampToValueAtTime(volume * 0.7, now + duration * 0.1) // Decay
    gainNode.gain.setValueAtTime(volume * 0.7, now + duration * 0.8) // Sustain
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration) // Release
    
    oscillator.connect(gainNode)
    gainNode.connect(this.gainNode)
    
    oscillator.start(now)
    oscillator.stop(now + duration)
    
    return oscillator
  }

  // Som de clique de botão
  buttonClick() {
    this.init()
    const frequency = 800 + Math.random() * 200
    this.createOscillator(frequency, 'square', 0.1, 0.2)
  }

  // Som de hover de botão
  buttonHover() {
    this.init()
    const frequency = 600 + Math.random() * 100
    this.createOscillator(frequency, 'sine', 0.05, 0.1)
  }

  // Som de descarte de carta
  cardDiscard() {
    this.init()
    const now = this.audioContext.currentTime
    
    // Som principal (whoosh)
    const oscillator1 = this.audioContext.createOscillator()
    const gainNode1 = this.audioContext.createGain()
    
    oscillator1.type = 'sawtooth'
    oscillator1.frequency.setValueAtTime(200, now)
    oscillator1.frequency.exponentialRampToValueAtTime(50, now + 0.3)
    
    gainNode1.gain.setValueAtTime(0, now)
    gainNode1.gain.linearRampToValueAtTime(0.3, now + 0.01)
    gainNode1.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    
    oscillator1.connect(gainNode1)
    gainNode1.connect(this.gainNode)
    
    oscillator1.start(now)
    oscillator1.stop(now + 0.3)
    
    // Som de impacto
    setTimeout(() => {
      this.createOscillator(150, 'square', 0.1, 0.2)
    }, 200)
  }

  // Som de compra de carta
  cardDraw() {
    this.init()
    const now = this.audioContext.currentTime
    
    // Som de slide
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(400, now)
    oscillator.frequency.linearRampToValueAtTime(600, now + 0.2)
    
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
    
    oscillator.connect(gainNode)
    gainNode.connect(this.gainNode)
    
    oscillator.start(now)
    oscillator.stop(now + 0.2)
  }

  // Som de habilidade especial
  abilityUsed() {
    this.init()
    const now = this.audioContext.currentTime
    
    // Corda mágica
    const frequencies = [220, 277, 330, 440] // A3, C#4, E4, A4
    
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        this.createOscillator(freq, 'sine', 0.3, 0.15)
      }, index * 50)
    })
  }

  // Som de vitória
  victory() {
    this.init()
    const now = this.audioContext.currentTime
    
    // Fanfarra simples
    const melody = [523, 659, 784, 1047] // C5, E5, G5, C6
    
    melody.forEach((freq, index) => {
      setTimeout(() => {
        this.createOscillator(freq, 'sine', 0.4, 0.3)
      }, index * 200)
    })
  }

  // Som de derrota
  defeat() {
    this.init()
    const now = this.audioContext.currentTime
    
    // Tom descendente
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(300, now)
    oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.8)
    
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8)
    
    oscillator.connect(gainNode)
    gainNode.connect(this.gainNode)
    
    oscillator.start(now)
    oscillator.stop(now + 0.8)
  }

  // Som de erro
  error() {
    this.init()
    const now = this.audioContext.currentTime
    
    // Buzzer
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(200, now)
    
    // Tremolo
    const tremolo = this.audioContext.createOscillator()
    const tremoloGain = this.audioContext.createGain()
    
    tremolo.type = 'sine'
    tremolo.frequency.setValueAtTime(10, now)
    tremoloGain.gain.setValueAtTime(0.5, now)
    
    tremolo.connect(tremoloGain)
    tremoloGain.connect(gainNode.gain)
    
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    
    oscillator.connect(gainNode)
    gainNode.connect(this.gainNode)
    
    oscillator.start(now)
    oscillator.stop(now + 0.3)
    tremolo.start(now)
    tremolo.stop(now + 0.3)
  }

  // Som de combo
  combo(count) {
    this.init()
    const now = this.audioContext.currentTime
    
    // Som baseado no número do combo
    const baseFreq = 200 + (count * 50)
    const duration = 0.1 + (count * 0.05)
    
    this.createOscillator(baseFreq, 'square', duration, 0.2)
  }

  // Som de conquista desbloqueada
  achievement() {
    this.init()
    const now = this.audioContext.currentTime
    
    // Som de sino
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(800, now)
    oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.1)
    oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.5)
    
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
    
    oscillator.connect(gainNode)
    gainNode.connect(this.gainNode)
    
    oscillator.start(now)
    oscillator.stop(now + 0.5)
  }

  // Som de notificação
  notification() {
    this.init()
    const now = this.audioContext.currentTime
    
    // Bip suave
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(1000, now)
    
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
    
    oscillator.connect(gainNode)
    gainNode.connect(this.gainNode)
    
    oscillator.start(now)
    oscillator.stop(now + 0.1)
  }

  // Som de transição de página
  pageTransition() {
    this.init()
    const now = this.audioContext.currentTime
    
    // Sweep suave
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(200, now)
    oscillator.frequency.linearRampToValueAtTime(800, now + 0.3)
    
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    
    oscillator.connect(gainNode)
    gainNode.connect(this.gainNode)
    
    oscillator.start(now)
    oscillator.stop(now + 0.3)
  }

  // Som de carta especial (Rei, Coringa)
  specialCard() {
    this.init()
    const now = this.audioContext.currentTime
    
    // Corda especial
    const frequencies = [330, 440, 554, 659] // E4, A4, C#5, E5
    
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        this.createOscillator(freq, 'sine', 0.2, 0.2)
      }, index * 100)
    })
  }

  // Som de validação (sucesso)
  validationSuccess() {
    this.init()
    const now = this.audioContext.currentTime
    
    // Bip de confirmação
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(600, now)
    oscillator.frequency.linearRampToValueAtTime(800, now + 0.1)
    
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
    
    oscillator.connect(gainNode)
    gainNode.connect(this.gainNode)
    
    oscillator.start(now)
    oscillator.stop(now + 0.1)
  }

  // Som de validação (erro)
  validationError() {
    this.init()
    const now = this.audioContext.currentTime
    
    // Bip de erro
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(300, now)
    
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
    
    oscillator.connect(gainNode)
    gainNode.connect(this.gainNode)
    
    oscillator.start(now)
    oscillator.stop(now + 0.15)
  }

  // Definir volume global
  setVolume(volume) {
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime)
    }
  }

  // Pausar todos os sons
  pause() {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend()
    }
  }

  // Retomar todos os sons
  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }
}

// Instância singleton
const soundGenerator = new SoundGenerator()

export default soundGenerator
