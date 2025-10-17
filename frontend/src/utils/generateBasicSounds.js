// Gerador de sons básicos usando Web Audio API
// Para desenvolvimento - sons reais devem ser baixados posteriormente

export function generateBasicSounds() {
  const sounds = {}
  
  // Função para gerar tom simples
  function generateTone(frequency, duration, type = 'sine') {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
    oscillator.type = type
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + duration)
    
    return audioContext
  }

  // Sons básicos
  sounds.buttonClick = () => generateTone(800, 0.1, 'square')
  sounds.buttonHover = () => generateTone(600, 0.05, 'sine')
  sounds.cardDraw = () => generateTone(400, 0.2, 'sawtooth')
  sounds.cardDiscard = () => generateTone(300, 0.15, 'triangle')
  sounds.gameWin = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notes = [523, 659, 784, 1047] // C, E, G, C
    notes.forEach((freq, i) => {
      setTimeout(() => generateTone(freq, 0.3, 'sine'), i * 150)
    })
    return ctx
  }
  sounds.gameLose = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notes = [400, 350, 300] // Descending
    notes.forEach((freq, i) => {
      setTimeout(() => generateTone(freq, 0.4, 'sawtooth'), i * 200)
    })
    return ctx
  }
  sounds.error = () => generateTone(200, 0.5, 'square')
  sounds.achievement = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notes = [523, 659, 784, 1047, 1319] // Ascending
    notes.forEach((freq, i) => {
      setTimeout(() => generateTone(freq, 0.2, 'sine'), i * 100)
    })
    return ctx
  }

  return sounds
}

// Função para criar arquivos de áudio temporários
export function createTemporaryAudioFiles() {
  const sounds = generateBasicSounds()
  const audioFiles = {}
  
  // Converter sons para data URLs (simplificado para desenvolvimento)
  // Em produção, usar arquivos MP3 reais
  Object.keys(sounds).forEach(key => {
    audioFiles[key] = {
      src: `data:audio/wav;base64,`, // Placeholder
      volume: 0.7,
      type: 'sfx'
    }
  })
  
  return audioFiles
}
