import Phaser from 'phaser';
import { Player } from '../game/models/Player';
import { Card } from '../game/models/Card';
import { TableSceneData } from './TableSceneData';
import { AbilityMenu } from './components/AbilityMenu';
import { Ability } from '../game/enums/Ability';
import { GameStartData } from './types/SceneData';
import { AudioManager } from '../game/utils/AudioManager';
import { CardAnimations } from './utils/CardAnimations';
import { VisualEffects } from './utils/VisualEffects';

/**
 * Interface para representar um jogador visual na mesa
 */
interface PlayerVisual {
  /** Container do jogador */
  container: Phaser.GameObjects.Container;
  /** Ícone/avatar do jogador */
  icon: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
  /** Nome do jogador */
  nameText: Phaser.GameObjects.Text;
  /** Cartas do jogador (containers) */
  cards: Phaser.GameObjects.Container[];
  /** Indicador de jogador ativo */
  activeIndicator: Phaser.GameObjects.Graphics | null;
  /** Contador de cartas */
  cardCountText: Phaser.GameObjects.Text | null;
  /** ID do jogador */
  playerId: string;
}

/**
 * Cena da mesa de jogo do Cunoku
 * 
 * Renderiza a mesa estilo poker com tema japonês, jogadores ao redor,
 * cartas viradas, áreas de compra/descarte e indicadores visuais.
 * 
 * Esta cena é puramente visual e não contém lógica de regras.
 */
export class TableScene extends Phaser.Scene {
  private players: Player[] = [];
  private currentPlayerId: string | null = null;
  private turnNumber: number = 0;
  private deckCount: number = 0;
  private discardTopCard: Card | null = null;
  private isFinalRound: boolean = false;

  // Referências visuais
  private playerVisuals: Map<string, PlayerVisual> = new Map();
  private tableGraphics: Phaser.GameObjects.Graphics | null = null;
  private deckVisual: Phaser.GameObjects.Container | null = null;
  private discardVisual: Phaser.GameObjects.Container | null = null;
  private turnIndicator: Phaser.GameObjects.Text | null = null;
  private activePlayerGlow: Phaser.GameObjects.Graphics | null = null;
  private abilityMenu: AbilityMenu | null = null;
  private rulesEngine: any = null; // Será tipado quando RulesEngine for importado
  private audioManager: AudioManager | null = null;

  constructor() {
    super({ key: 'TableScene' });
  }

  /**
   * Método chamado quando a cena é criada
   */
  create(data?: TableSceneData | GameStartData): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Fade in
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Inicializa dados se fornecidos
    if (data) {
      // Se for GameStartData (início de partida)
      if ('players' in data && 'humanPlayerId' in data) {
        const gameData = data as GameStartData;
        this.players = gameData.players;
        this.currentPlayerId = gameData.humanPlayerId;
        this.turnNumber = 1;
        this.deckCount = 30; // Estimativa inicial
        this.discardTopCard = null;
        this.isFinalRound = false;
      } else {
        // Se for TableSceneData (atualização)
        const sceneData = data as TableSceneData;
        this.players = sceneData.players || [];
        this.currentPlayerId = sceneData.currentPlayerId || null;
        this.turnNumber = sceneData.turnNumber || 0;
        this.deckCount = sceneData.deckCount || 0;
        this.discardTopCard = sceneData.discardTopCard || null;
        this.isFinalRound = sceneData.isFinalRound || false;
      }
    }

    // Renderiza fundo e mesa
    this.renderBackground(centerX, centerY, width, height);
    this.renderTable(centerX, centerY);

    // Renderiza áreas de compra e descarte
    this.renderDeckArea(centerX - 150, centerY);
    this.renderDiscardArea(centerX + 150, centerY);

    // Renderiza jogadores
    this.renderPlayers(centerX, centerY);

    // Renderiza indicadores
    this.renderTurnIndicator(centerX, 50);
    this.updateActivePlayerIndicator();

    // Inicializa menu de habilidades
    this.abilityMenu = new AbilityMenu(this, {
      onSuccess: (ability, data) => this.handleAbilitySuccess(ability, data),
      onError: (error) => this.handleAbilityError(error),
      onClose: () => {},
      onCancel: () => {},
    });

    // Inicializa AudioManager
    this.audioManager = new AudioManager();

    console.log('TableScene criada com', this.players.length, 'jogadores');
  }

  /**
   * Define referência ao RulesEngine para integração
   */
  setRulesEngine(rulesEngine: any): void {
    this.rulesEngine = rulesEngine;
  }

  /**
   * Mostra menu de habilidades quando carta com habilidade é comprada
   */
  showAbilityMenu(card: Card): void {
    if (this.abilityMenu && card.hasAbility()) {
      this.abilityMenu.updatePlayers(this.players);
      this.abilityMenu.show(card, this.players, this.currentPlayerId || '');
    }
  }

  /**
   * Esconde menu de habilidades
   */
  hideAbilityMenu(): void {
    if (this.abilityMenu) {
      this.abilityMenu.hide();
    }
  }

  /**
   * Trata sucesso no uso de habilidade
   */
  private handleAbilitySuccess(ability: Ability, data: Record<string, any>): void {
    if (!this.rulesEngine || !this.currentPlayerId) {
      return;
    }

    // Executa habilidade via RulesEngine
    // TODO: Implementar chamadas específicas baseadas no tipo de habilidade
    console.log('Habilidade usada:', ability, data);

    // Feedback visual de sucesso
    if (this.audioManager) {
      this.audioManager.playSuccess();
    }
    const { width, height } = this.scale;
    VisualEffects.createSuccessEffect(this, width / 2, height / 2);
  }

  /**
   * Trata erro no uso de habilidade
   */
  private handleAbilityError(error: string): void {
    console.error('Erro ao usar habilidade:', error);
    // Mostra feedback visual de erro
    if (this.audioManager) {
      this.audioManager.playError();
    }
    const { width, height } = this.scale;
    VisualEffects.createErrorEffect(this, width / 2, height / 2);
  }

  /**
   * Renderiza o fundo com tema japonês
   */
  private renderBackground(centerX: number, centerY: number, width: number, height: number): void {
    // Fundo principal (cor escura com tom japonês)
    this.add.rectangle(centerX, centerY, width, height, 0x1a1a1a);

    // Padrão decorativo (seigaiha simplificado)
    const patternGraphics = this.add.graphics();
    patternGraphics.fillStyle(0x2a2a2a, 0.3);
    
    // Desenha ondas simples
    for (let i = 0; i < 5; i++) {
      const y = centerY - 200 + i * 100;
      patternGraphics.fillCircle(centerX - 300, y, 30);
      patternGraphics.fillCircle(centerX - 200, y, 25);
      patternGraphics.fillCircle(centerX - 100, y, 20);
      patternGraphics.fillCircle(centerX, y, 15);
      patternGraphics.fillCircle(centerX + 100, y, 20);
      patternGraphics.fillCircle(centerX + 200, y, 25);
      patternGraphics.fillCircle(centerX + 300, y, 30);
    }
  }

  /**
   * Renderiza a mesa estilo poker
   */
  private renderTable(centerX: number, centerY: number): void {
    const tableGraphics = this.add.graphics();

    // Mesa principal (oval)
    tableGraphics.fillStyle(0x2d1810, 1);
    tableGraphics.fillEllipse(centerX, centerY, 800, 500);

    // Borda da mesa
    tableGraphics.lineStyle(4, 0x8b4513, 1);
    tableGraphics.strokeEllipse(centerX, centerY, 800, 500);

    // Detalhes decorativos (padrão japonês)
    tableGraphics.lineStyle(2, 0xd4af37, 0.5);
    tableGraphics.strokeEllipse(centerX, centerY, 750, 450);

    // Linhas decorativas internas
    for (let i = 0; i < 3; i++) {
      const radius = 300 - i * 50;
      tableGraphics.strokeEllipse(centerX, centerY, radius * 2, radius * 1.2);
    }

    this.tableGraphics = tableGraphics;
  }

  /**
   * Renderiza área de compra (baralho)
   */
  private renderDeckArea(x: number, y: number): void {
    const container = this.add.container(x, y);

    // Pilha de cartas (baralho)
    const cardWidth = 60;
    const cardHeight = 84;
    const cardOffset = 2;

    // Desenha pilha empilhada
    for (let i = 0; i < 5; i++) {
      const card = this.add.rectangle(
        i * cardOffset,
        -i * cardOffset,
        cardWidth,
        cardHeight,
        0x1a1a2e
      );
      card.setStrokeStyle(2, 0xffffff);
      container.add(card);
    }

    // Texto com contagem
    const countText = this.add.text(0, cardHeight / 2 + 10, `Baralho\n${this.deckCount}`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
    });
    countText.setOrigin(0.5);
    container.add(countText);

    this.deckVisual = container;
  }

  /**
   * Renderiza área de descarte (pilha)
   */
  private renderDiscardArea(x: number, y: number): void {
    const container = this.add.container(x, y);

    // Carta do topo da pilha
    const cardWidth = 60;
    const cardHeight = 84;

    if (this.discardTopCard) {
      // Carta visível (pode mostrar valor no futuro)
      const card = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x2a2a2a);
      card.setStrokeStyle(2, 0xffd700);
      container.add(card);

      // Texto com nome da carta (temporário)
      const cardText = this.add.text(0, 0, this.discardTopCard.nome, {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#ffffff',
      });
      cardText.setOrigin(0.5);
      container.add(cardText);
    } else {
      // Área vazia
      const emptyArea = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x1a1a1a, 0.5);
      emptyArea.setStrokeStyle(2, 0x666666, 0.5);
      container.add(emptyArea);
    }

    // Label
    const labelText = this.add.text(0, cardHeight / 2 + 10, 'Descarte', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    labelText.setOrigin(0.5);
    container.add(labelText);

    this.discardVisual = container;
  }

  /**
   * Calcula posições dos jogadores em círculo
   */
  private calculatePlayerPositions(
    centerX: number,
    centerY: number,
    numPlayers: number
  ): Array<{ x: number; y: number; angle: number }> {
    const radius = 280;
    const positions: Array<{ x: number; y: number; angle: number }> = [];

    for (let i = 0; i < numPlayers; i++) {
      // Ângulo em radianos (começa do topo)
      const angle = (i / numPlayers) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      positions.push({ x, y, angle });
    }

    return positions;
  }

  /**
   * Renderiza todos os jogadores ao redor da mesa
   */
  private renderPlayers(centerX: number, centerY: number): void {
    const numPlayers = this.players.length;
    if (numPlayers === 0) return;

    const positions = this.calculatePlayerPositions(centerX, centerY, numPlayers);

    this.players.forEach((player, index) => {
      const pos = positions[index];
      this.createPlayerVisual(player, pos.x, pos.y, pos.angle);
    });
  }

  /**
   * Cria visual de um jogador
   */
  private createPlayerVisual(
    player: Player,
    x: number,
    y: number,
    angle: number
  ): void {
    const container = this.add.container(x, y);

    // Ícone do jogador (círculo colorido)
    const iconSize = 50;
    const iconColor = this.getPlayerColor(player.id);
    const icon = this.add.circle(0, -60, iconSize / 2, iconColor);
    icon.setStrokeStyle(3, 0xffffff);
    container.add(icon);

    // Nome do jogador
    const nameText = this.add.text(0, -30, player.nome, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0.5);
    container.add(nameText);

    // Cartas do jogador (viradas)
    const cards = this.createPlayerCards(player, 0, 20);
    cards.forEach((card) => container.add(card));

    // Contador de cartas
    const cardCountText = this.add.text(0, 60, `${player.getMaoSize()}`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#cccccc',
    });
    cardCountText.setOrigin(0.5);
    container.add(cardCountText);

    // Indicador de jogador ativo (inicialmente oculto)
    const activeIndicator = this.add.graphics();
    activeIndicator.lineStyle(4, 0xffd700, 1);
    activeIndicator.strokeCircle(0, -60, iconSize / 2 + 5);
    activeIndicator.setVisible(false);
    container.add(activeIndicator);

    // Rotaciona container para ficar de frente para o centro
    container.setRotation(angle + Math.PI / 2);

    const playerVisual: PlayerVisual = {
      container,
      icon,
      nameText,
      cards,
      activeIndicator,
      cardCountText,
      playerId: player.id,
    };

    this.playerVisuals.set(player.id, playerVisual);
  }

  /**
   * Cria visual das cartas de um jogador (viradas)
   */
  private createPlayerCards(player: Player, x: number, y: number): Phaser.GameObjects.Container[] {
    const cards: Phaser.GameObjects.Container[] = [];
    const cardCount = player.getMaoSize();
    const cardWidth = 40;
    const cardHeight = 56;
    const cardSpacing = 8;
    const startX = x - ((cardCount - 1) * cardSpacing) / 2;

    for (let i = 0; i < cardCount; i++) {
      const cardContainer = this.add.container(startX + i * cardSpacing, y);

      // Carta virada (verso)
      const cardBack = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x1a1a2e);
      cardBack.setStrokeStyle(2, 0xffffff);
      cardContainer.add(cardBack);

      // Padrão do verso (simples)
      const pattern = this.add.graphics();
      pattern.lineStyle(1, 0x4a4a4a, 0.5);
      pattern.strokeRect(-cardWidth / 2 + 5, -cardHeight / 2 + 5, cardWidth - 10, cardHeight - 10);
      cardContainer.add(pattern);

      cards.push(cardContainer);
    }

    return cards;
  }

  /**
   * Gera cor única para cada jogador
   */
  private getPlayerColor(playerId: string): number {
    // Hash simples para gerar cor consistente
    let hash = 0;
    for (let i = 0; i < playerId.length; i++) {
      hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Cores com tema japonês (tons de vermelho, azul, verde, dourado)
    const colors = [0xc41e3a, 0x1e3a8a, 0x166534, 0xd4af37, 0x7c2d12, 0x581c87];
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Renderiza indicador de turno
   */
  private renderTurnIndicator(centerX: number, y: number): void {
    this.turnIndicator = this.add.text(centerX, y, `Turno: ${this.turnNumber}`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.turnIndicator.setOrigin(0.5);

    if (this.isFinalRound) {
      const finalRoundText = this.add.text(centerX, y + 30, 'RODADA FINAL', {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#ffd700',
        fontStyle: 'bold',
      });
      finalRoundText.setOrigin(0.5);
    }
  }

  /**
   * Atualiza indicador de jogador ativo
   */
  private updateActivePlayerIndicator(): void {
    // Remove indicador anterior
    if (this.activePlayerGlow) {
      this.activePlayerGlow.destroy();
      this.activePlayerGlow = null;
    }

    // Atualiza indicadores de todos os jogadores
    this.playerVisuals.forEach((visual, playerId) => {
      const isActive = playerId === this.currentPlayerId;
      if (visual.activeIndicator) {
        visual.activeIndicator.setVisible(isActive);
      }

      // Destaque no nome
      if (isActive) {
        visual.nameText.setColor('#ffd700');
        visual.nameText.setFontStyle('bold');
      } else {
        visual.nameText.setColor('#ffffff');
        visual.nameText.setFontStyle('normal');
      }
    });

    // Cria brilho adicional no jogador ativo
    if (this.currentPlayerId) {
      const visual = this.playerVisuals.get(this.currentPlayerId);
      if (visual) {
        this.activePlayerGlow = this.add.graphics();
        this.activePlayerGlow.lineStyle(3, 0xffd700, 0.8);
        this.activePlayerGlow.strokeCircle(
          visual.container.x,
          visual.container.y - 60,
          30
        );
      }
    }
  }

  /**
   * Atualiza lista de jogadores
   */
  updatePlayers(players: Player[]): void {
    this.players = players;
    // Recria visualização (simplificado - em produção seria mais eficiente)
    this.playerVisuals.forEach((visual) => visual.container.destroy());
    this.playerVisuals.clear();

    const { width, height } = this.scale;
    this.renderPlayers(width / 2, height / 2);
    this.updateActivePlayerIndicator();
  }

  /**
   * Define jogador ativo
   */
  setCurrentPlayer(playerId: string | null): void {
    const previousPlayerId = this.currentPlayerId;
    this.currentPlayerId = playerId;
    this.updateActivePlayerIndicator();

    // Animação quando muda jogador ativo
    if (playerId && playerId !== previousPlayerId) {
      const visual = this.playerVisuals.get(playerId);
      if (visual && visual.container) {
        CardAnimations.animatePulse(this, visual.container, 400, 2);
      }
    }
  }

  /**
   * Atualiza contagem do baralho
   */
  updateDeck(count: number): void {
    const previousCount = this.deckCount;
    this.deckCount = count;
    
    if (this.deckVisual) {
      // Atualiza texto de contagem
      const countText = this.deckVisual.list[this.deckVisual.list.length - 1] as Phaser.GameObjects.Text;
      if (countText) {
        countText.setText(`Baralho\n${count}`);
      }

      // Animação quando carta é comprada
      if (count < previousCount && this.audioManager) {
        this.audioManager.playCardDraw();
        CardAnimations.animatePulse(this, this.deckVisual, 200, 1);
      }
    }
  }

  /**
   * Atualiza carta do topo da pilha de descarte
   */
  updateDiscardPile(card: Card | null): void {
    const hadCard = this.discardTopCard !== null;
    this.discardTopCard = card;
    
    if (this.discardVisual) {
      this.discardVisual.destroy();
    }

    const { width, height } = this.scale;
    this.renderDiscardArea(width / 2 + 150, height / 2);

    // Animação e som quando carta é descartada
    if (card && !hadCard && this.audioManager) {
      this.audioManager.playCardDiscard();
      if (this.discardVisual) {
        CardAnimations.animatePulse(this, this.discardVisual, 300, 1);
      }
    }
  }

  /**
   * Atualiza número do turno
   */
  updateTurnNumber(turnNumber: number): void {
    this.turnNumber = turnNumber;
    if (this.turnIndicator) {
      this.turnIndicator.setText(`Turno: ${turnNumber}`);
      // Animação sutil ao mudar turno
      CardAnimations.animatePulse(this, this.turnIndicator, 300, 1);
    }
  }

  /**
   * Atualiza status de rodada final
   */
  setFinalRound(isFinalRound: boolean): void {
    this.isFinalRound = isFinalRound;
    // Recria indicador de turno para incluir status
    if (this.turnIndicator) {
      this.turnIndicator.destroy();
    }
    const { width } = this.scale;
    this.renderTurnIndicator(width / 2, 50);
  }
}

