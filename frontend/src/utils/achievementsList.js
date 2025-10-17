// Lista de conquistas para o jogo Cunoku
// Estrutura: id, nome, descrição, ícone, condição, recompensa, categoria

export const ACHIEVEMENTS = {
  // Conquistas de Primeira Vez
  FIRST_GAME: {
    id: 'first_game',
    name: 'Primeira Partida',
    description: 'Jogue sua primeira partida',
    icon: '🎮',
    condition: { type: 'games_played', value: 1 },
    reward: { xp: 50, title: 'Iniciante' },
    category: 'milestone',
    rarity: 'common'
  },

  FIRST_WIN: {
    id: 'first_win',
    name: 'Primeira Vitória',
    description: 'Ganhe sua primeira partida',
    icon: '🏆',
    condition: { type: 'wins', value: 1 },
    reward: { xp: 100, title: 'Vencedor' },
    category: 'milestone',
    rarity: 'common'
  },

  FIRST_BOT_WIN: {
    id: 'first_bot_win',
    name: 'Domador de Bots',
    description: 'Ganhe contra bots pela primeira vez',
    icon: '🤖',
    condition: { type: 'bot_wins', value: 1 },
    reward: { xp: 75, title: 'Domador' },
    category: 'milestone',
    rarity: 'common'
  },

  // Conquistas de Vitórias
  WIN_STREAK_3: {
    id: 'win_streak_3',
    name: 'Sequência de 3',
    description: 'Ganhe 3 partidas seguidas',
    icon: '🔥',
    condition: { type: 'win_streak', value: 3 },
    reward: { xp: 150, title: 'Em Chamas' },
    category: 'streak',
    rarity: 'uncommon'
  },

  WIN_STREAK_5: {
    id: 'win_streak_5',
    name: 'Sequência de 5',
    description: 'Ganhe 5 partidas seguidas',
    icon: '⚡',
    condition: { type: 'win_streak', value: 5 },
    reward: { xp: 300, title: 'Relâmpago' },
    category: 'streak',
    rarity: 'rare'
  },

  WIN_STREAK_10: {
    id: 'win_streak_10',
    name: 'Sequência de 10',
    description: 'Ganhe 10 partidas seguidas',
    icon: '💎',
    condition: { type: 'win_streak', value: 10 },
    reward: { xp: 500, title: 'Lendário' },
    category: 'streak',
    rarity: 'epic'
  },

  WINNER_10: {
    id: 'winner_10',
    name: '10 Vitórias',
    description: 'Ganhe 10 partidas no total',
    icon: '🥇',
    condition: { type: 'wins', value: 10 },
    reward: { xp: 200, title: 'Campeão' },
    category: 'victory',
    rarity: 'uncommon'
  },

  WINNER_50: {
    id: 'winner_50',
    name: '50 Vitórias',
    description: 'Ganhe 50 partidas no total',
    icon: '👑',
    condition: { type: 'wins', value: 50 },
    reward: { xp: 500, title: 'Rei' },
    category: 'victory',
    rarity: 'rare'
  },

  WINNER_100: {
    id: 'winner_100',
    name: '100 Vitórias',
    description: 'Ganhe 100 partidas no total',
    icon: '🏅',
    condition: { type: 'wins', value: 100 },
    reward: { xp: 1000, title: 'Lenda' },
    category: 'victory',
    rarity: 'epic'
  },

  // Conquistas de Habilidades
  ABILITY_MASTER: {
    id: 'ability_master',
    name: 'Mestre das Habilidades',
    description: 'Use 100 habilidades especiais',
    icon: '✨',
    condition: { type: 'abilities_used', value: 100 },
    reward: { xp: 300, title: 'Mago' },
    category: 'skill',
    rarity: 'uncommon'
  },

  CARD_SEEKER: {
    id: 'card_seeker',
    name: 'Buscador de Cartas',
    description: 'Use a habilidade "Ver Carta" 50 vezes',
    icon: '👁️',
    condition: { type: 'see_card_used', value: 50 },
    reward: { xp: 200, title: 'Vidente' },
    category: 'skill',
    rarity: 'uncommon'
  },

  CARD_SWAPPER: {
    id: 'card_swapper',
    name: 'Trocador de Cartas',
    description: 'Use a habilidade "Trocar Cartas" 30 vezes',
    icon: '🔄',
    condition: { type: 'swap_cards_used', value: 30 },
    reward: { xp: 200, title: 'Trocador' },
    category: 'skill',
    rarity: 'uncommon'
  },

  // Conquistas de Combos
  COMBO_MASTER: {
    id: 'combo_master',
    name: 'Mestre do Combo',
    description: 'Faça um combo de 5 descartes em sequência',
    icon: '🎯',
    condition: { type: 'max_combo', value: 5 },
    reward: { xp: 250, title: 'Combo Master' },
    category: 'combo',
    rarity: 'rare'
  },

  COMBO_LEGEND: {
    id: 'combo_legend',
    name: 'Lenda do Combo',
    description: 'Faça um combo de 10 descartes em sequência',
    icon: '💥',
    condition: { type: 'max_combo', value: 10 },
    reward: { xp: 500, title: 'Combo Legend' },
    category: 'combo',
    rarity: 'epic'
  },

  // Conquistas de Tempo
  SPEED_DEMON: {
    id: 'speed_demon',
    name: 'Demônio da Velocidade',
    description: 'Ganhe uma partida em menos de 2 minutos',
    icon: '⚡',
    condition: { type: 'fast_win', value: 120 }, // 2 minutos em segundos
    reward: { xp: 200, title: 'Veloz' },
    category: 'speed',
    rarity: 'rare'
  },

  MARATHON_PLAYER: {
    id: 'marathon_player',
    name: 'Jogador Maratona',
    description: 'Jogue por mais de 2 horas em uma sessão',
    icon: '🏃',
    condition: { type: 'session_time', value: 7200 }, // 2 horas em segundos
    reward: { xp: 300, title: 'Maratonista' },
    category: 'endurance',
    rarity: 'uncommon'
  },

  // Conquistas de Dificuldade
  BOT_DESTROYER: {
    id: 'bot_destroyer',
    name: 'Destruidor de Bots',
    description: 'Ganhe contra 3 bots difíceis',
    icon: '💀',
    condition: { type: 'hard_bot_wins', value: 3 },
    reward: { xp: 400, title: 'Exterminador' },
    category: 'difficulty',
    rarity: 'rare'
  },

  PERFECT_GAME: {
    id: 'perfect_game',
    name: 'Jogo Perfeito',
    description: 'Ganhe sem errar nenhum descarte',
    icon: '💯',
    condition: { type: 'perfect_win', value: 1 },
    reward: { xp: 500, title: 'Perfeito' },
    category: 'perfection',
    rarity: 'epic'
  },

  // Conquistas de Cartas
  CARD_COLLECTOR: {
    id: 'card_collector',
    name: 'Colecionador de Cartas',
    description: 'Descarte 1000 cartas no total',
    icon: '🃏',
    condition: { type: 'cards_discarded', value: 1000 },
    reward: { xp: 300, title: 'Colecionador' },
    category: 'cards',
    rarity: 'uncommon'
  },

  KING_MASTER: {
    id: 'king_master',
    name: 'Mestre dos Reis',
    description: 'Descarte 50 cartas Rei',
    icon: '♔',
    condition: { type: 'kings_discarded', value: 50 },
    reward: { xp: 200, title: 'Rei dos Reis' },
    category: 'cards',
    rarity: 'uncommon'
  },

  JOKER_MASTER: {
    id: 'joker_master',
    name: 'Mestre dos Coringas',
    description: 'Descarte 25 cartas Coringa',
    icon: '🃏',
    condition: { type: 'jokers_discarded', value: 25 },
    reward: { xp: 250, title: 'Coringa' },
    category: 'cards',
    rarity: 'rare'
  },

  // Conquistas de Multiplayer
  SOCIAL_PLAYER: {
    id: 'social_player',
    name: 'Jogador Social',
    description: 'Jogue 20 partidas multiplayer',
    icon: '👥',
    condition: { type: 'multiplayer_games', value: 20 },
    reward: { xp: 200, title: 'Social' },
    category: 'social',
    rarity: 'uncommon'
  },

  ROOM_CREATOR: {
    id: 'room_creator',
    name: 'Criador de Salas',
    description: 'Crie 10 salas de jogo',
    icon: '🏠',
    condition: { type: 'rooms_created', value: 10 },
    reward: { xp: 150, title: 'Anfitrião' },
    category: 'social',
    rarity: 'common'
  },

  // Conquistas de Nível
  LEVEL_10: {
    id: 'level_10',
    name: 'Nível 10',
    description: 'Alcance o nível 10',
    icon: '🔟',
    condition: { type: 'level', value: 10 },
    reward: { xp: 0, title: 'Experiente' },
    category: 'level',
    rarity: 'common'
  },

  LEVEL_25: {
    id: 'level_25',
    name: 'Nível 25',
    description: 'Alcance o nível 25',
    icon: '2️⃣5️⃣',
    condition: { type: 'level', value: 25 },
    reward: { xp: 0, title: 'Veterano' },
    category: 'level',
    rarity: 'uncommon'
  },

  LEVEL_50: {
    id: 'level_50',
    name: 'Nível 50',
    description: 'Alcance o nível 50',
    icon: '5️⃣0️⃣',
    condition: { type: 'level', value: 50 },
    reward: { xp: 0, title: 'Mestre Supremo' },
    category: 'level',
    rarity: 'epic'
  },

  // Conquistas Especiais
  LUCKY_PLAYER: {
    id: 'lucky_player',
    name: 'Jogador Sortudo',
    description: 'Ganhe 3 partidas seguidas com sorte',
    icon: '🍀',
    condition: { type: 'lucky_wins', value: 3 },
    reward: { xp: 300, title: 'Sortudo' },
    category: 'special',
    rarity: 'rare'
  },

  NIGHT_OWL: {
    id: 'night_owl',
    name: 'Coruja Noturna',
    description: 'Jogue entre 23h e 5h da manhã',
    icon: '🦉',
    condition: { type: 'night_games', value: 10 },
    reward: { xp: 200, title: 'Noturno' },
    category: 'special',
    rarity: 'uncommon'
  },

  EARLY_BIRD: {
    id: 'early_bird',
    name: 'Madrugador',
    description: 'Jogue entre 5h e 8h da manhã',
    icon: '🐦',
    condition: { type: 'morning_games', value: 10 },
    reward: { xp: 200, title: 'Madrugador' },
    category: 'special',
    rarity: 'uncommon'
  }
}

// Categorias de conquistas
export const ACHIEVEMENT_CATEGORIES = {
  milestone: { name: 'Marco', color: '#D4AF37', icon: '🎯' },
  victory: { name: 'Vitória', color: '#DC143C', icon: '🏆' },
  streak: { name: 'Sequência', color: '#FFD700', icon: '🔥' },
  skill: { name: 'Habilidade', color: '#00A86B', icon: '✨' },
  combo: { name: 'Combo', color: '#FFB7C5', icon: '💥' },
  speed: { name: 'Velocidade', color: '#191970', icon: '⚡' },
  endurance: { name: 'Resistência', color: '#8B0000', icon: '🏃' },
  difficulty: { name: 'Dificuldade', color: '#800080', icon: '💀' },
  perfection: { name: 'Perfeição', color: '#FF69B4', icon: '💯' },
  cards: { name: 'Cartas', color: '#FF4500', icon: '🃏' },
  social: { name: 'Social', color: '#32CD32', icon: '👥' },
  level: { name: 'Nível', color: '#4169E1', icon: '📈' },
  special: { name: 'Especial', color: '#FF1493', icon: '⭐' }
}

// Raridades de conquistas
export const ACHIEVEMENT_RARITIES = {
  common: { name: 'Comum', color: '#808080', multiplier: 1 },
  uncommon: { name: 'Incomum', color: '#00FF00', multiplier: 1.5 },
  rare: { name: 'Raro', color: '#0080FF', multiplier: 2 },
  epic: { name: 'Épico', color: '#8000FF', multiplier: 3 },
  legendary: { name: 'Lendário', color: '#FF8000', multiplier: 5 }
}

// Função para obter conquista por ID
export function getAchievement(id) {
  return ACHIEVEMENTS[id] || null
}

// Função para obter conquistas por categoria
export function getAchievementsByCategory(category) {
  return Object.values(ACHIEVEMENTS).filter(achievement => achievement.category === category)
}

// Função para obter conquistas por raridade
export function getAchievementsByRarity(rarity) {
  return Object.values(ACHIEVEMENTS).filter(achievement => achievement.rarity === rarity)
}

// Função para obter todas as conquistas
export function getAllAchievements() {
  return Object.values(ACHIEVEMENTS)
}

// Função para obter conquistas desbloqueadas
export function getUnlockedAchievements(unlockedIds) {
  return unlockedIds.map(id => ACHIEVEMENTS[id]).filter(Boolean)
}

// Função para obter conquistas bloqueadas
export function getLockedAchievements(unlockedIds) {
  return Object.values(ACHIEVEMENTS).filter(achievement => !unlockedIds.includes(achievement.id))
}

// Função para verificar se uma conquista está desbloqueada
export function isAchievementUnlocked(achievementId, unlockedIds) {
  return unlockedIds.includes(achievementId)
}

// Função para obter progresso de uma conquista
export function getAchievementProgress(achievementId, stats) {
  const achievement = ACHIEVEMENTS[achievementId]
  if (!achievement) return { current: 0, target: 0, percentage: 0 }

  const current = stats[achievement.condition.type] || 0
  const target = achievement.condition.value
  const percentage = Math.min((current / target) * 100, 100)

  return { current, target, percentage }
}
