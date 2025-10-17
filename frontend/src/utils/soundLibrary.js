// Biblioteca de sons para o jogo Cunoku
// Sons gerados programaticamente usando Web Audio API

import soundGenerator from './soundGenerator.js'

export const SOUNDS = {
  // Efeitos de interface
  BUTTON_CLICK: {
    type: 'generated',
    generator: () => soundGenerator.buttonClick(),
    volume: 0.6,
    category: 'sfx',
    description: 'Clique de botão'
  },
  
  BUTTON_HOVER: {
    type: 'generated',
    generator: () => soundGenerator.buttonHover(),
    volume: 0.4,
    category: 'sfx',
    description: 'Hover de botão'
  },

  // Efeitos de cartas
  CARD_DRAW: {
    type: 'generated',
    generator: () => soundGenerator.cardDraw(),
    volume: 0.7,
    type: 'sfx',
    description: 'Comprar carta'
  },

  CARD_DISCARD: {
    type: 'generated',
    generator: () => soundGenerator.cardDiscard(),
    volume: 0.8,
    type: 'sfx',
    description: 'Descartar carta'
  },

  CARD_FLIP: {
    type: 'generated',
    generator: () => soundGenerator.cardDiscard(), // Reutiliza som de descarte
    volume: 0.6,
    type: 'sfx',
    description: 'Virar carta'
  },

  CARD_SHUFFLE: {
    type: 'generated',
    generator: () => soundGenerator.cardDraw(), // Reutiliza som de compra
    volume: 0.5,
    type: 'sfx',
    description: 'Embaralhar cartas'
  },

  // Efeitos de habilidades
  ABILITY_SEE_CARD: {
    type: 'generated',
    generator: () => soundGenerator.abilityUsed(),
    volume: 0.7,
    type: 'sfx',
    description: 'Habilidade: Ver carta'
  },

  ABILITY_SWAP_CARDS: {
    type: 'generated',
    generator: () => soundGenerator.abilityUsed(),
    volume: 0.8,
    type: 'sfx',
    description: 'Habilidade: Trocar cartas'
  },

  ABILITY_SPECIAL: {
    type: 'generated',
    generator: () => soundGenerator.specialCard(),
    volume: 0.9,
    type: 'sfx',
    description: 'Habilidade especial'
  },

  // Efeitos de jogo
  TURN_START: {
    type: 'generated',
    generator: () => soundGenerator.notification(),
    volume: 0.5,
    type: 'sfx',
    description: 'Início do turno'
  },

  TURN_END: {
    type: 'generated',
    generator: () => soundGenerator.notification(),
    volume: 0.5,
    type: 'sfx',
    description: 'Fim do turno'
  },

  COMBO_SUCCESS: {
    type: 'generated',
    generator: (count = 1) => soundGenerator.combo(count),
    volume: 0.8,
    type: 'sfx',
    description: 'Combo bem-sucedido'
  },

  COMBO_FAIL: {
    type: 'generated',
    generator: () => soundGenerator.validationError(),
    volume: 0.7,
    type: 'sfx',
    description: 'Combo falhou'
  },

  // Efeitos de resultado
  GAME_WIN: {
    type: 'generated',
    generator: () => soundGenerator.victory(),
    volume: 1.0,
    type: 'sfx',
    description: 'Vitória'
  },

  GAME_LOSE: {
    type: 'generated',
    generator: () => soundGenerator.defeat(),
    volume: 0.8,
    type: 'sfx',
    description: 'Derrota'
  },

  ACHIEVEMENT_UNLOCK: {
    type: 'generated',
    generator: () => soundGenerator.achievement(),
    volume: 0.9,
    type: 'sfx',
    description: 'Conquista desbloqueada'
  },

  LEVEL_UP: {
    type: 'generated',
    generator: () => soundGenerator.achievement(),
    volume: 0.9,
    type: 'sfx',
    description: 'Subir de nível'
  },

  // Efeitos de erro
  ERROR: {
    type: 'generated',
    generator: () => soundGenerator.error(),
    volume: 0.6,
    type: 'sfx',
    description: 'Erro'
  },

  INVALID_MOVE: {
    type: 'generated',
    generator: () => soundGenerator.validationError(),
    volume: 0.5,
    type: 'sfx',
    description: 'Movimento inválido'
  },

  // Músicas de fundo
  BACKGROUND_MUSIC: {
    src: new URL('../../assets/audio/elevator.mp3', import.meta.url).href,
    volume: 0.3,
    type: 'music',
    description: 'Música de fundo principal'
  },

  MENU_MUSIC: {
    type: 'generated',
    generator: () => soundGenerator.pageTransition(),
    volume: 0.4,
    type: 'music',
    description: 'Música do menu'
  },

  GAME_MUSIC: {
    type: 'generated',
    generator: () => soundGenerator.pageTransition(),
    volume: 0.3,
    type: 'music',
    description: 'Música do jogo'
  },

  VICTORY_MUSIC: {
    type: 'generated',
    generator: () => soundGenerator.victory(),
    volume: 0.5,
    type: 'music',
    description: 'Música de vitória'
  }
}

// Sons críticos para preload
export const CRITICAL_SOUNDS = [
  'BUTTON_CLICK',
  'BUTTON_HOVER',
  'CARD_DRAW',
  'CARD_DISCARD',
  'GAME_WIN',
  'GAME_LOSE',
  'ERROR'
]

// Sons de interface
export const UI_SOUNDS = [
  'BUTTON_CLICK',
  'BUTTON_HOVER',
  'ERROR',
  'INVALID_MOVE'
]

// Sons de cartas
export const CARD_SOUNDS = [
  'CARD_DRAW',
  'CARD_DISCARD',
  'CARD_FLIP',
  'CARD_SHUFFLE'
]

// Sons de habilidades
export const ABILITY_SOUNDS = [
  'ABILITY_SEE_CARD',
  'ABILITY_SWAP_CARDS',
  'ABILITY_SPECIAL'
]

// Sons de resultado
export const RESULT_SOUNDS = [
  'GAME_WIN',
  'GAME_LOSE',
  'ACHIEVEMENT_UNLOCK',
  'LEVEL_UP'
]

// Músicas
export const MUSIC_SOUNDS = [
  'BACKGROUND_MUSIC',
  'MENU_MUSIC',
  'GAME_MUSIC',
  'VICTORY_MUSIC'
]

// Função para obter configuração de som
export function getSoundConfig(soundKey) {
  return SOUNDS[soundKey] || null
}

// Função para obter todos os sons de uma categoria
export function getSoundsByCategory(category) {
  const categoryMap = {
    ui: UI_SOUNDS,
    card: CARD_SOUNDS,
    ability: ABILITY_SOUNDS,
    result: RESULT_SOUNDS,
    music: MUSIC_SOUNDS
  }
  
  const soundKeys = categoryMap[category] || []
  return soundKeys.map(key => ({ key, ...SOUNDS[key] }))
}

// Função para validar se um som existe
export function isValidSound(soundKey) {
  return soundKey in SOUNDS
}

// Função para tocar som gerado
export const playGeneratedSound = (soundKey, ...args) => {
  const sound = SOUNDS[soundKey]
  if (sound && sound.type === 'generated' && sound.generator) {
    // Definir volume antes de tocar
    soundGenerator.setVolume(sound.volume)
    sound.generator(...args)
  }
}

// Função para verificar se um som é gerado
export const isGeneratedSound = (soundKey) => {
  const sound = SOUNDS[soundKey]
  return sound && sound.type === 'generated'
}
