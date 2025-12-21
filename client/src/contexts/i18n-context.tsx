import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "pt" | "es" | "en";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("cunoku_language") as Language;
    return saved && ["pt", "es", "en"].includes(saved) ? saved : "pt";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("cunoku_language", lang);
  };

  const t = (key: string): string => {
    const translations = getTranslations(language);
    return translations[key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

function getTranslations(lang: Language): Record<string, string> {
  const translations: Record<Language, Record<string, string>> = {
    pt: {
      // Menu principal
      "menu.title": "Cunoku",
      "menu.subtitle": "Um Jogo de Estratégia e Enganação",
      "menu.createGame": "Criar Nova Partida",
      "menu.playBots": "Jogar Contra Bots",
      "menu.joinRoom": "Entrar em uma Sala",
      "menu.rules": "Regras",
      "menu.language": "Idioma",
      "menu.copyright": "© 2025 Cunoku Card Game. Mínimo 2 jogadores.",
      
      // Diálogo criar partida
      "create.title": "Iniciar uma Nova Mesa",
      "create.description": "Crie uma sala multiplayer para amigos entrarem",
      "create.yourName": "Seu Nome",
      "create.namePlaceholder": "Digite seu nome...",
      "create.maxPlayers": "Número Máximo de Jogadores",
      "create.players": "Jogadores",
      "create.addBots": "Adicionar Bots para preencher vagas",
      "create.botCount": "Número de Bots (máx: {max})",
      "create.bot": "Bot",
      "create.bots": "Bots",
      "create.botDifficulty": "Dificuldade dos Bots",
      "create.difficulty.easy": "Fácil",
      "create.difficulty.medium": "Médio",
      "create.difficulty.hard": "Difícil",
      "create.createRoom": "Criar Sala",
      "create.botCountAdjusted": "Número de bots ajustado para {max} (máx de jogadores: {total})",
      
      // Diálogo jogar contra bots
      "bots.title": "Jogar Contra Bots",
      "bots.description": "Inicie uma partida com oponentes de IA",
      "bots.yourName": "Seu Nome",
      "bots.namePlaceholder": "Digite seu nome...",
      "bots.botCount": "Número de Bots",
      "bots.bot": "Bot",
      "bots.bots": "Bots",
      "bots.botDifficulty": "Dificuldade dos Bots",
      "bots.startGame": "Iniciar Partida",
      
      // Diálogo entrar em sala
      "join.title": "Entrar em uma Mesa",
      "join.description": "Digite o código da sala para entrar em uma partida existente",
      "join.yourName": "Seu Nome",
      "join.namePlaceholder": "Digite seu nome...",
      "join.roomCode": "Código da Sala",
      "join.roomCodePlaceholder": "ex: A4B2",
      "join.joinRoom": "Entrar na Sala",
      
      // Regras
      "rules.title": "Regras do Jogo",
      "rules.objective": "Objetivo do jogo: ter a menor soma de cartas ao final da partida",
      "rules.queen": "Rainha: 12",
      "rules.ace": "Às: 1",
      "rules.jack": "Valete: 11",
      "rules.king": "Rei: 0",
      "rules.joker": "Coringa: -1",
      "rules.nineTen": "Nove e Dez: Faça 2 jogadores trocarem 1 carta (Pode ser entre o próprio jogador e outro player, ou entre dois jogadores que aquele player escolher)",
      "rules.sevenEight": "Sete e Oito: Permitem que você veja 1 carta sua (Fica visível para o jogador por 20 segundos depois é virada novamente)",
      "rules.fiveSix": "Cinco e Seis: Permitem ver a carta de um oponente",
      "rules.discard": "Regras de descarte: Um jogador pode descartar uma carta da sua mão se ela for igual ao mesmo valor da carta em cima da pilha de descarte ex: 7=7, quando o jogador comprar uma carta ele pode escolher ficar com ela e substituir uma de sua mão ou descartar a carta direto para a pilha de descarte, os jogadores que souberem que possuem a mesma carta podem descartar a mesma (O descarte é possível independente do Naipe, só precisa ser o mesmo número ou letra na carta)",
      "rules.draw": "Regras de compra: Compre uma carta olhe o valor e decida o que fazer com a habilidade pode ser usada",
      "rules.endGame": "Final de partida: pode ocorrer a qualquer momento depois de 5 turnos, quando um jogador estiver satisfeito com seu deck e declarar o fim do jogo. A partir daí, haverá mais uma rodada de descarte e/ou poderes até chegar no jogador que declarou o fim do jogo. Então os jogadores revelam suas cartas e somam seus pontos. O jogador com menos pontos é o vencedor",
      "rules.punishment": "Regra de punição: Se um jogador descartar errado uma carta de valor diferente com a de cima da pilha, ele deve comprar duas cartas como punição, adicionando a sua mão",
      "rules.maxPlayers": "Limite máximo de jogadores é 6 e o mínimo é 2",
      "rules.theme": "Tema geral do jogo \"Jogo de cartas de mesa com tema japonês\"",
      "rules.playersDisplay": "Todos os jogadores que estão na partida devem ter seus ícones aparecendo na mesa e suas cartas (Cartas sempre do lado avesso para ninguém ver)",
      "rules.punishmentSix": "Se um jogador tiver 6 cartas, a regra de punição muda e ele apenas perde a vez, ao invés de comprar 2 cartas como punição",
      "rules.mainActions": "Ações principais que o Jogador sempre faz durante a rodada (importante): ter a opção de comprar uma carta da pilha, olhar e decidir se quer substituir por uma de sua mão ou usar a habilidade daquela carta, caso ela tenha.",
      
      // Erros e validações
      "error.nameRequired": "Nome obrigatório",
      "error.nameRequiredDesc": "Por favor, digite seu nome",
      "error.missingDetails": "Detalhes faltando",
      "error.missingDetailsDesc": "Por favor, digite nome e código da sala",
      "error.generic": "Erro",
      "error.failedToStart": "Falha ao iniciar partida offline",
      
      // Game - Geral
      "game.yourTurn": "SUA VEZ",
      "game.drawFromDeck": "Comprar do Baralho ou Descarte",
      "game.drawFromDeckShort": "Comprar Baralho/Descarte",
      "game.replaceOrDiscard": "Selecione uma carta para substituir ou Descartar",
      "game.replaceOrDiscardShort": "Substituir ou Descartar",
      "game.round": "Rodada",
      "game.roundOf": "de",
      "game.cunokuAfterRound5": "Cunoku disponível após rodada 5",
      "game.cunokuAfterRound5Short": "Cunoku após R5",
      "game.turn": "Vez",
      "game.exit": "Sair",
      "game.roomCode": "CÓDIGO DA SALA",
      "game.copied": "Copiado!",
      "game.copiedDesc": "Código da sala copiado para a área de transferência",
      "game.loading": "Carregando Partida...",
      "game.settingUp": "Configurando partida offline",
      "game.invalidUrl": "URL de jogo inválida",
      "game.deck": "BARALHO",
      "game.clickToDraw": "Clique para Comprar",
      "game.empty": "VAZIO",
      "game.drawnCard": "CARTA COMPRADA",
      "game.useAbility": "Usar Habilidade",
      "game.ability": "Habilidade",
      "game.discard": "Descartar",
      "game.discardPile": "Pilha de Descarte",
      "game.fromDiscardNoAbility": "Carta da pilha de descarte - não pode usar habilidade",
      "game.fromDiscardNoAbilityShort": "Carta do descarte - sem habilidade",
      "game.known": "Conhecida",
      "game.match": "Corresponde!",
      "game.discardSafe": "✓ Descartar",
      "game.discardRisk": "⚠ Tentar Descartar",
      "game.punishmentRisk": "Risco de punição!",
      "game.canDiscardMatch": "Você pode descartar uma carta igual!",
      "game.canDiscardMatchShort": "Pode descartar igual!",
      "game.cunoku": "CUNOKU",
      "game.cunokuShort": "CUN",
      "game.cunokuDeclared": "🔥 CUNOKU Declarado!",
      "game.cunokuDeclaredDesc": "{player} declarou fim de jogo! Rodada final iniciada.",
      
      // Game - Habilidades
      "game.abilityTitle": "Usar Habilidade",
      "game.abilityCard": "Habilidade da Carta",
      "game.abilityClickToUse": "Clique no botão \"Usar Habilidade\" para ativar",
      "game.abilityPeekOpponent": "Ver carta de um oponente",
      "game.abilityPeekOwn": "Ver uma de suas cartas",
      "game.abilitySwap": "Trocar cartas entre 2 jogadores",
      "game.selectCard": "Selecione uma carta",
      "game.selectCardDesc": "Selecione uma carta da sua mão para ver",
      "game.selectTarget": "Selecione alvo",
      "game.selectTargetDesc": "Selecione um jogador e uma carta",
      "game.selectPlayer": "Selecione o jogador:",
      "game.selectCardNumber": "Selecione a carta (1-4):",
      "game.selectYourCard": "Selecione sua carta para ver:",
      "game.swapMode": "Modo de troca:",
      "game.swapMeAndOther": "Entre você e outro",
      "game.swapMeAndOtherShort": "Você e outro",
      "game.swapTwoOthers": "Entre dois outros",
      "game.swapTwoOthersShort": "Dois outros",
      "game.yourCard": "Sua carta:",
      "game.otherPlayer": "Outro jogador:",
      "game.otherPlayerCard": "Carta do outro jogador (1-4):",
      "game.firstPlayer": "Primeiro jogador:",
      "game.firstPlayerCard": "Carta do primeiro jogador (1-4):",
      "game.confirmFirstPlayer": "Confirmar Primeiro Jogador",
      "game.firstPlayerSelected": "Primeiro jogador: {name} - Carta {card}",
      "game.secondPlayer": "Segundo jogador:",
      "game.secondPlayerCard": "Carta do segundo jogador (1-4):",
      "game.back": "Voltar",
      "game.cancel": "Cancelar",
      "game.confirm": "Confirmar",
      
      // Game - Dicas
      "game.hintTitle": "Dica de Jogada",
      "game.hintReplace": "Clique em uma carta da sua mão para substituir pela carta puxada",
      "game.hintHighlighted": "As cartas da sua mão estão destacadas em verde",
      
      // Game - Carta Revelada
      "game.cardRevealed": "Carta Revelada!",
      "game.playerHas": "{player} tem:",
      "game.visibleFor20s": "Esta carta ficará visível por 20 segundos",
      
      // Game - Fim de Jogo
      "game.gameOver": "Fim de Jogo",
      "game.winnerIs": "O vencedor é {player}!",
      "game.backToHome": "Voltar ao Menu",
      "game.points": "pts",
      
      // Game - Erros
      "game.errorInvalidState": "Estado de jogo inválido. Por favor, inicie uma nova partida.",
      "game.errorFailedToLoad": "Falha ao carregar partida. Por favor, inicie uma nova partida.",
      "game.errorNotFound": "Partida não encontrada. Por favor, inicie uma nova partida.",
      
      // Idiomas
      "lang.pt": "Português",
      "lang.es": "Español",
      "lang.en": "English",
    },
    es: {
      // Menu principal
      "menu.title": "Cunoku",
      "menu.subtitle": "Un Juego de Estrategia y Engaño",
      "menu.createGame": "Crear Nueva Partida",
      "menu.playBots": "Jugar Contra Bots",
      "menu.joinRoom": "Unirse a una Sala",
      "menu.rules": "Reglas",
      "menu.language": "Idioma",
      "menu.copyright": "© 2025 Cunoku Card Game. Mínimo 2 jugadores.",
      
      // Diálogo crear partida
      "create.title": "Iniciar una Nueva Mesa",
      "create.description": "Crea una sala multijugador para que tus amigos se unan",
      "create.yourName": "Tu Nombre",
      "create.namePlaceholder": "Ingresa tu nombre...",
      "create.maxPlayers": "Número Máximo de Jugadores",
      "create.players": "Jugadores",
      "create.addBots": "Agregar Bots para llenar espacios vacíos",
      "create.botCount": "Número de Bots (máx: {max})",
      "create.bot": "Bot",
      "create.bots": "Bots",
      "create.botDifficulty": "Dificultad de los Bots",
      "create.difficulty.easy": "Fácil",
      "create.difficulty.medium": "Medio",
      "create.difficulty.hard": "Difícil",
      "create.createRoom": "Crear Sala",
      "create.botCountAdjusted": "Número de bots ajustado a {max} (máx de jugadores: {total})",
      
      // Diálogo jugar contra bots
      "bots.title": "Jugar Contra Bots",
      "bots.description": "Inicia una partida con oponentes de IA",
      "bots.yourName": "Tu Nombre",
      "bots.namePlaceholder": "Ingresa tu nombre...",
      "bots.botCount": "Número de Bots",
      "bots.bot": "Bot",
      "bots.bots": "Bots",
      "bots.botDifficulty": "Dificultad de los Bots",
      "bots.startGame": "Iniciar Partida",
      
      // Diálogo unirse a sala
      "join.title": "Unirse a una Mesa",
      "join.description": "Ingresa el código de la sala para unirte a una partida existente",
      "join.yourName": "Tu Nombre",
      "join.namePlaceholder": "Ingresa tu nombre...",
      "join.roomCode": "Código de la Sala",
      "join.roomCodePlaceholder": "ej: A4B2",
      "join.joinRoom": "Unirse a la Sala",
      
      // Reglas
      "rules.title": "Reglas del Juego",
      "rules.objective": "Objetivo del juego: tener la menor suma de cartas al final de la partida",
      "rules.queen": "Reina: 12",
      "rules.ace": "As: 1",
      "rules.jack": "Jota: 11",
      "rules.king": "Rey: 0",
      "rules.joker": "Comodín: -1",
      "rules.nineTen": "Nueve y Diez: Haz que 2 jugadores intercambien 1 carta (Puede ser entre el propio jugador y otro player, o entre dos jugadores que ese player elija)",
      "rules.sevenEight": "Siete y Ocho: Te permiten ver 1 carta tuya (Queda visible para el jugador por 20 segundos y luego se voltea nuevamente)",
      "rules.fiveSix": "Cinco y Seis: Permiten ver la carta de un oponente",
      "rules.discard": "Reglas de descarte: Un jugador puede descartar una carta de su mano si es igual al mismo valor de la carta en la parte superior de la pila de descarte ej: 7=7, cuando el jugador compre una carta puede elegir quedarse con ella y reemplazar una de su mano o descartar la carta directamente a la pila de descarte, los jugadores que sepan que tienen la misma carta pueden descartar la misma (El descarte es posible independientemente del Palo, solo necesita ser el mismo número o letra en la carta)",
      "rules.draw": "Reglas de compra: Compra una carta mira el valor y decide qué hacer con la habilidad puede ser usada",
      "rules.endGame": "Final de partida: puede ocurrir en cualquier momento después de 5 turnos, cuando un jugador esté satisfecho con su mazo y declare el fin del juego. A partir de ahí, habrá una ronda más de descarte y/o poderes hasta llegar al jugador que declaró el fin del juego. Entonces los jugadores revelan sus cartas y suman sus puntos. El jugador con menos puntos es el ganador",
      "rules.punishment": "Regla de castigo: Si un jugador descarta incorrectamente una carta de valor diferente a la de la parte superior de la pila, debe comprar dos cartas como castigo, agregándolas a su mano",
      "rules.maxPlayers": "El límite máximo de jugadores es 6 y el mínimo es 2",
      "rules.theme": "Tema general del juego \"Juego de cartas de mesa con tema japonés\"",
      "rules.playersDisplay": "Todos los jugadores que están en la partida deben tener sus íconos apareciendo en la mesa y sus cartas (Las cartas siempre del lado reverso para que nadie las vea)",
      "rules.punishmentSix": "Si un jugador tiene 6 cartas, la regla de castigo cambia y solo pierde el turno, en lugar de comprar 2 cartas como castigo",
      "rules.mainActions": "Acciones principales que el Jugador siempre hace durante la ronda (importante): tener la opción de comprar una carta de la pila, mirar y decidir si quiere reemplazarla por una de su mano o usar la habilidad de esa carta, si la tiene.",
      
      // Errores y validaciones
      "error.nameRequired": "Nombre requerido",
      "error.nameRequiredDesc": "Por favor, ingresa tu nombre",
      "error.missingDetails": "Detalles faltantes",
      "error.missingDetailsDesc": "Por favor, ingresa nombre y código de la sala",
      "error.generic": "Error",
      "error.failedToStart": "Error al iniciar partida offline",
      
      // Game - Geral
      "game.yourTurn": "TU TURNO",
      "game.drawFromDeck": "Robar del Mazo o Descarte",
      "game.drawFromDeckShort": "Robar Mazo/Descarte",
      "game.replaceOrDiscard": "Selecciona una carta para reemplazar o Descartar",
      "game.replaceOrDiscardShort": "Reemplazar o Descartar",
      "game.round": "Ronda",
      "game.roundOf": "de",
      "game.cunokuAfterRound5": "Cunoku disponible después de la ronda 5",
      "game.cunokuAfterRound5Short": "Cunoku después de R5",
      "game.turn": "Turno",
      "game.exit": "Salir",
      "game.roomCode": "CÓDIGO DE SALA",
      "game.copied": "¡Copiado!",
      "game.copiedDesc": "Código de sala copiado al portapapeles",
      "game.loading": "Cargando Partida...",
      "game.settingUp": "Configurando partida offline",
      "game.invalidUrl": "URL de juego inválida",
      "game.deck": "MAZO",
      "game.clickToDraw": "Clic para Robar",
      "game.empty": "VACÍO",
      "game.drawnCard": "CARTA ROBADA",
      "game.useAbility": "Usar Habilidad",
      "game.ability": "Habilidad",
      "game.discard": "Descartar",
      "game.discardPile": "Pila de Descarte",
      "game.fromDiscardNoAbility": "Carta de la pila de descarte - no se puede usar habilidad",
      "game.fromDiscardNoAbilityShort": "Carta del descarte - sin habilidad",
      "game.known": "Conocida",
      "game.match": "¡Coincide!",
      "game.discardSafe": "✓ Descartar",
      "game.discardRisk": "⚠ Intentar Descartar",
      "game.punishmentRisk": "¡Riesgo de castigo!",
      "game.canDiscardMatch": "¡Puedes descartar una carta igual!",
      "game.canDiscardMatchShort": "¡Puede descartar igual!",
      "game.cunoku": "CUNOKU",
      "game.cunokuShort": "CUN",
      "game.cunokuDeclared": "🔥 ¡CUNOKU Declarado!",
      "game.cunokuDeclaredDesc": "¡{player} declaró fin de juego! Ronda final iniciada.",
      
      // Game - Habilidades
      "game.abilityTitle": "Usar Habilidad",
      "game.abilityCard": "Habilidad de la Carta",
      "game.abilityClickToUse": "Haz clic en el botón \"Usar Habilidad\" para activar",
      "game.abilityPeekOpponent": "Ver carta de un oponente",
      "game.abilityPeekOwn": "Ver una de tus cartas",
      "game.abilitySwap": "Intercambiar cartas entre 2 jugadores",
      "game.selectCard": "Selecciona una carta",
      "game.selectCardDesc": "Selecciona una carta de tu mano para ver",
      "game.selectTarget": "Selecciona objetivo",
      "game.selectTargetDesc": "Selecciona un jugador y una carta",
      "game.selectPlayer": "Selecciona el jugador:",
      "game.selectCardNumber": "Selecciona la carta (1-4):",
      "game.selectYourCard": "Selecciona tu carta para ver:",
      "game.swapMode": "Modo de intercambio:",
      "game.swapMeAndOther": "Entre tú y otro",
      "game.swapMeAndOtherShort": "Tú y otro",
      "game.swapTwoOthers": "Entre dos otros",
      "game.swapTwoOthersShort": "Dos otros",
      "game.yourCard": "Tu carta:",
      "game.otherPlayer": "Otro jugador:",
      "game.otherPlayerCard": "Carta del otro jugador (1-4):",
      "game.firstPlayer": "Primer jugador:",
      "game.firstPlayerCard": "Carta del primer jugador (1-4):",
      "game.confirmFirstPlayer": "Confirmar Primer Jugador",
      "game.firstPlayerSelected": "Primer jugador: {name} - Carta {card}",
      "game.secondPlayer": "Segundo jugador:",
      "game.secondPlayerCard": "Carta del segundo jugador (1-4):",
      "game.back": "Volver",
      "game.cancel": "Cancelar",
      "game.confirm": "Confirmar",
      
      // Game - Dicas
      "game.hintTitle": "Consejo de Jugada",
      "game.hintReplace": "Haz clic en una carta de tu mano para reemplazarla por la carta robada",
      "game.hintHighlighted": "Las cartas de tu mano están resaltadas en verde",
      
      // Game - Carta Revelada
      "game.cardRevealed": "¡Carta Revelada!",
      "game.playerHas": "{player} tiene:",
      "game.visibleFor20s": "Esta carta será visible por 20 segundos",
      
      // Game - Fim de Jogo
      "game.gameOver": "Fin de Juego",
      "game.winnerIs": "¡El ganador es {player}!",
      "game.backToHome": "Volver al Menú",
      "game.points": "pts",
      
      // Game - Erros
      "game.errorInvalidState": "Estado de juego inválido. Por favor, inicia una nueva partida.",
      "game.errorFailedToLoad": "Error al cargar partida. Por favor, inicia una nueva partida.",
      "game.errorNotFound": "Partida no encontrada. Por favor, inicia una nueva partida.",
      
      // Idiomas
      "lang.pt": "Português",
      "lang.es": "Español",
      "lang.en": "English",
    },
    en: {
      // Main menu
      "menu.title": "Cunoku",
      "menu.subtitle": "A Game of Strategy & Deception",
      "menu.createGame": "Create New Game",
      "menu.playBots": "Play Against Bots",
      "menu.joinRoom": "Join Existing Room",
      "menu.rules": "Rules",
      "menu.language": "Language",
      "menu.copyright": "© 2025 Cunoku Card Game. Minimum 2 players.",
      
      // Create game dialog
      "create.title": "Start a New Table",
      "create.description": "Create a multiplayer room for friends to join",
      "create.yourName": "Your Name",
      "create.namePlaceholder": "Enter your name...",
      "create.maxPlayers": "Maximum Number of Players",
      "create.players": "Players",
      "create.addBots": "Add Bots to fill empty slots",
      "create.botCount": "Number of Bots (max: {max})",
      "create.bot": "Bot",
      "create.bots": "Bots",
      "create.botDifficulty": "Bot Difficulty",
      "create.difficulty.easy": "Easy",
      "create.difficulty.medium": "Medium",
      "create.difficulty.hard": "Hard",
      "create.createRoom": "Create Room",
      "create.botCountAdjusted": "Bot count adjusted to {max} (max players: {total})",
      
      // Play against bots dialog
      "bots.title": "Play Against Bots",
      "bots.description": "Start a game with AI opponents",
      "bots.yourName": "Your Name",
      "bots.namePlaceholder": "Enter your name...",
      "bots.botCount": "Number of Bots",
      "bots.bot": "Bot",
      "bots.bots": "Bots",
      "bots.botDifficulty": "Bot Difficulty",
      "bots.startGame": "Start Game",
      
      // Join room dialog
      "join.title": "Join a Table",
      "join.description": "Enter the room code to join an existing game",
      "join.yourName": "Your Name",
      "join.namePlaceholder": "Enter your name...",
      "join.roomCode": "Room Code",
      "join.roomCodePlaceholder": "e.g. A4B2",
      "join.joinRoom": "Join Room",
      
      // Rules
      "rules.title": "Game Rules",
      "rules.objective": "Game objective: have the lowest sum of cards at the end of the game",
      "rules.queen": "Queen: 12",
      "rules.ace": "Ace: 1",
      "rules.jack": "Jack: 11",
      "rules.king": "King: 0",
      "rules.joker": "Joker: -1",
      "rules.nineTen": "Nine and Ten: Make 2 players swap 1 card (Can be between the player themselves and another player, or between two players that the player chooses)",
      "rules.sevenEight": "Seven and Eight: Allow you to see 1 of your cards (Visible to the player for 20 seconds then flipped again)",
      "rules.fiveSix": "Five and Six: Allow seeing an opponent's card",
      "rules.discard": "Discard rules: A player can discard a card from their hand if it matches the same value as the card on top of the discard pile ex: 7=7, when a player draws a card they can choose to keep it and replace one from their hand or discard the card directly to the discard pile, players who know they have the same card can discard it (Discarding is possible regardless of Suit, it just needs to be the same number or letter on the card)",
      "rules.draw": "Draw rules: Draw a card look at the value and decide what to do with it, the ability can be used",
      "rules.endGame": "End of game: can occur at any time after 5 turns, when a player is satisfied with their deck and declares the end of the game. From then on, there will be one more round of discarding and/or powers until reaching the player who declared the end of the game. Then players reveal their cards and sum their points. The player with the fewest points is the winner",
      "rules.punishment": "Punishment rule: If a player incorrectly discards a card of different value than the one on top of the pile, they must draw two cards as punishment, adding them to their hand",
      "rules.maxPlayers": "Maximum player limit is 6 and minimum is 2",
      "rules.theme": "General game theme \"Japanese-themed table card game\"",
      "rules.playersDisplay": "All players in the game must have their icons appearing on the table and their cards (Cards always face down so no one can see)",
      "rules.punishmentSix": "If a player has 6 cards, the punishment rule changes and they only lose their turn, instead of drawing 2 cards as punishment",
      "rules.mainActions": "Main actions that the Player always does during the round (important): have the option to draw a card from the pile, look and decide if they want to replace it with one from their hand or use that card's ability, if it has one.",
      
      // Errors and validations
      "error.nameRequired": "Name required",
      "error.nameRequiredDesc": "Please enter your player name",
      "error.missingDetails": "Missing details",
      "error.missingDetailsDesc": "Please enter name and room code",
      "error.generic": "Error",
      "error.failedToStart": "Failed to start offline game",
      
      // Game - General
      "game.yourTurn": "YOUR TURN",
      "game.drawFromDeck": "Draw from Deck or Discard",
      "game.drawFromDeckShort": "Draw Deck/Discard",
      "game.replaceOrDiscard": "Select a card to replace or Discard drawn",
      "game.replaceOrDiscardShort": "Replace card or Discard",
      "game.round": "Round",
      "game.roundOf": "of",
      "game.cunokuAfterRound5": "Cunoku available after round 5",
      "game.cunokuAfterRound5Short": "Cunoku after R5",
      "game.turn": "Turn",
      "game.exit": "Exit",
      "game.roomCode": "ROOM CODE",
      "game.copied": "Copied!",
      "game.copiedDesc": "Room code copied to clipboard.",
      "game.loading": "Loading Game...",
      "game.settingUp": "Setting up offline match",
      "game.invalidUrl": "Invalid game URL",
      "game.deck": "DECK",
      "game.clickToDraw": "Click to Draw",
      "game.empty": "EMPTY",
      "game.drawnCard": "DRAWN CARD",
      "game.useAbility": "Use Ability",
      "game.ability": "Ability",
      "game.discard": "Discard",
      "game.discardPile": "Discard Pile",
      "game.fromDiscardNoAbility": "Card from discard pile - cannot use ability",
      "game.fromDiscardNoAbilityShort": "Card from discard - no ability",
      "game.known": "Known",
      "game.match": "Match!",
      "game.discardSafe": "✓ Discard",
      "game.discardRisk": "⚠ Try Discard",
      "game.punishmentRisk": "Punishment risk!",
      "game.canDiscardMatch": "You can discard a matching card!",
      "game.canDiscardMatchShort": "Can discard match!",
      "game.cunoku": "CUNOKU",
      "game.cunokuShort": "CUN",
      "game.cunokuDeclared": "🔥 CUNOKU Declared!",
      "game.cunokuDeclaredDesc": "{player} declared end of game! Final round started.",
      
      // Game - Abilities
      "game.abilityTitle": "Use Ability",
      "game.abilityCard": "Card Ability",
      "game.abilityClickToUse": "Click the \"Use Ability\" button to activate",
      "game.abilityPeekOpponent": "See an opponent's card",
      "game.abilityPeekOwn": "See one of your cards",
      "game.abilitySwap": "Swap cards between 2 players",
      "game.selectCard": "Select a card",
      "game.selectCardDesc": "Select a card from your hand to see",
      "game.selectTarget": "Select target",
      "game.selectTargetDesc": "Select a player and a card",
      "game.selectPlayer": "Select the player:",
      "game.selectCardNumber": "Select the card (1-4):",
      "game.selectYourCard": "Select your card to see:",
      "game.swapMode": "Swap mode:",
      "game.swapMeAndOther": "Between you and another",
      "game.swapMeAndOtherShort": "You and another",
      "game.swapTwoOthers": "Between two others",
      "game.swapTwoOthersShort": "Two others",
      "game.yourCard": "Your card:",
      "game.otherPlayer": "Other player:",
      "game.otherPlayerCard": "Other player's card (1-4):",
      "game.firstPlayer": "First player:",
      "game.firstPlayerCard": "First player's card (1-4):",
      "game.confirmFirstPlayer": "Confirm First Player",
      "game.firstPlayerSelected": "First player: {name} - Card {card}",
      "game.secondPlayer": "Second player:",
      "game.secondPlayerCard": "Second player's card (1-4):",
      "game.back": "Back",
      "game.cancel": "Cancel",
      "game.confirm": "Confirm",
      
      // Game - Hints
      "game.hintTitle": "Play Hint",
      "game.hintReplace": "Click on a card from your hand to replace it with the drawn card",
      "game.hintHighlighted": "Your hand cards are highlighted in green",
      
      // Game - Revealed Card
      "game.cardRevealed": "Card Revealed!",
      "game.playerHas": "{player} has:",
      "game.visibleFor20s": "This card will be visible for 20 seconds",
      
      // Game - Game Over
      "game.gameOver": "Game Over",
      "game.winnerIs": "The winner is {player}!",
      "game.backToHome": "Back to Home",
      "game.points": "pts",
      
      // Game - Errors
      "game.errorInvalidState": "Invalid game state. Please start a new game.",
      "game.errorFailedToLoad": "Failed to load game. Please start a new game.",
      "game.errorNotFound": "Game not found. Please start a new game.",
      
      // Languages
      "lang.pt": "Português",
      "lang.es": "Español",
      "lang.en": "English",
    },
  };

  return translations[lang] || translations.pt;
}

