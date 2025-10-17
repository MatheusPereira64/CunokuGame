// Sistema de internacionalização para Cunoku Online
import { ref, computed } from 'vue'

// Idioma atual (padrão: português)
const currentLanguage = ref(localStorage.getItem('cunoku-language') || 'pt')

// Traduções
const translations = {
  pt: {
    // Menu Principal
    gameTitle: 'Cunoku Online',
    hostRoom: 'Hostear Sala',
    joinRoom: 'Entrar em Sala',
    playAgainstBots: 'Jogar contra Bots',
    
    // Formulário Host
    hostRoomTitle: 'Hostear Sala',
    playerName: 'Nome do Jogador',
    playerNamePlaceholder: 'Seu nome',
    roomName: 'Nome da Sala',
    roomNamePlaceholder: 'Ex: minha-sala-123',
    numberOfPlayers: 'Número de Jogadores',
    createRoom: 'Criar Sala',
    back: 'Voltar',
    
    // Formulário Join
    joinRoomTitle: 'Entrar em Sala',
    enterRoomName: 'Digite o nome da sala',
    join: 'Entrar',
    availableLobbies: 'Lobbys Disponíveis',
    loadingLobbies: 'Carregando lobbys...',
    noLobbiesAvailable: 'Nenhum lobby disponível',
    
    // Formulário Bots
    playBotsTitle: 'Jogar contra Bots',
    yourName: 'Seu nome',
    numberOfBots: 'Número de Bots',
    difficulty: 'Dificuldade',
    easy: 'Fácil',
    medium: 'Médio',
    hard: 'Difícil',
    startAgainstBots: 'Iniciar Contra Bots',
    
    // Jogo
    gameStart: 'Início',
    waitingPlayers: 'Aguardando jogadores...',
    yourTurn: 'Sua vez!',
    playerTurn: 'Vez do {player}',
    gameOver: 'Fim de Jogo',
    winner: 'Vencedor: {player}',
    playAgain: 'Jogar Novamente',
    leaveGame: 'Sair do Jogo',
    
    // Cartas e Ações
    drawCard: 'Comprar Carta',
    playCard: 'Jogar Carta',
    pass: 'Passar',
    uno: 'UNO!',
    chooseColor: 'Escolha uma cor',
    red: 'Vermelho',
    blue: 'Azul',
    green: 'Verde',
    yellow: 'Amarelo',
    
    // Status e Mensagens
    connected: 'Conectado',
    disconnected: 'Desconectado',
    reconnecting: 'Reconectando...',
    connectionError: 'Erro de conexão',
    roomFull: 'Sala lotada',
    roomNotFound: 'Sala não encontrada',
    invalidMove: 'Jogada inválida',
    
    // Botões gerais
    start: 'Iniciar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    close: 'Fechar',
    save: 'Salvar',
    load: 'Carregar'
  },
  
  en: {
    // Main Menu
    gameTitle: 'Cunoku Online',
    hostRoom: 'Host Room',
    joinRoom: 'Join Room',
    playAgainstBots: 'Play Against Bots',
    
    // Host Form
    hostRoomTitle: 'Host Room',
    playerName: 'Player Name',
    playerNamePlaceholder: 'Your name',
    roomName: 'Room Name',
    roomNamePlaceholder: 'Ex: my-room-123',
    numberOfPlayers: 'Number of Players',
    createRoom: 'Create Room',
    back: 'Back',
    
    // Join Form
    joinRoomTitle: 'Join Room',
    enterRoomName: 'Enter room name',
    join: 'Join',
    availableLobbies: 'Available Lobbies',
    loadingLobbies: 'Loading lobbies...',
    noLobbiesAvailable: 'No lobbies available',
    
    // Bots Form
    playBotsTitle: 'Play Against Bots',
    yourName: 'Your name',
    numberOfBots: 'Number of Bots',
    difficulty: 'Difficulty',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    startAgainstBots: 'Start Against Bots',
    
    // Game
    gameStart: 'Start',
    waitingPlayers: 'Waiting for players...',
    yourTurn: 'Your turn!',
    playerTurn: "{player}'s turn",
    gameOver: 'Game Over',
    winner: 'Winner: {player}',
    playAgain: 'Play Again',
    leaveGame: 'Leave Game',
    
    // Cards and Actions
    drawCard: 'Draw Card',
    playCard: 'Play Card',
    pass: 'Pass',
    uno: 'UNO!',
    chooseColor: 'Choose a color',
    red: 'Red',
    blue: 'Blue',
    green: 'Green',
    yellow: 'Yellow',
    
    // Status and Messages
    connected: 'Connected',
    disconnected: 'Disconnected',
    reconnecting: 'Reconnecting...',
    connectionError: 'Connection error',
    roomFull: 'Room is full',
    roomNotFound: 'Room not found',
    invalidMove: 'Invalid move',
    
    // General Buttons
    start: 'Start',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    save: 'Save',
    load: 'Load'
  }
}

// Função para trocar idioma
function setLanguage(lang) {
  currentLanguage.value = lang
  localStorage.setItem('cunoku-language', lang)
}

// Função para traduzir textos
function t(key, params = {}) {
  let text = translations[currentLanguage.value]?.[key] || translations.pt[key] || key
  
  // Substituir parâmetros no texto (ex: {player} -> nome do jogador)
  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`{${param}}`, 'g'), params[param])
  })
  
  return text
}

// Computed para reatividade
const currentTranslations = computed(() => translations[currentLanguage.value] || translations.pt)

export {
  currentLanguage,
  translations,
  setLanguage,
  t,
  currentTranslations
}
