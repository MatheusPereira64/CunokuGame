import Phaser from 'phaser';
import { Card } from '../../game/models/Card';
import { Ability } from '../../game/enums/Ability';
import { Player } from '../../game/models/Player';
import {
  AbilityMenuState,
  AbilityMenuCallbacks,
  AbilityMenuConfig,
  SeeOpponentData,
  SeeOwnData,
  SwapCardsData,
} from './AbilityMenuTypes';

/**
 * Componente de menu de habilidades
 * 
 * Renderiza menu contextual para uso de habilidades das cartas.
 * Aparece quando jogador compra carta com habilidade.
 */
export class AbilityMenu {
  private scene: Phaser.Scene;
  private state: AbilityMenuState;
  private callbacks: AbilityMenuCallbacks;
  private config: AbilityMenuConfig;

  // Referências visuais
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private panel: Phaser.GameObjects.Container | null = null;
  private players: Player[] = [];
  private currentPlayerId: string | null = null;

  constructor(
    scene: Phaser.Scene,
    callbacks: AbilityMenuCallbacks = {},
    config?: Partial<AbilityMenuConfig>
  ) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.config = {
      overlayColor: 0x000000,
      overlayAlpha: 0.7,
      panelColor: 0x2a2a2a,
      textColor: 0xffffff,
      successColor: 0x00ff00,
      errorColor: 0xff0000,
      ...config,
    };

    this.state = {
      card: null as any,
      ability: Ability.NONE,
      visible: false,
      step: 0,
      data: {},
    };
  }

  /**
   * Mostra o menu para uma carta com habilidade
   */
  show(card: Card, players: Player[], currentPlayerId: string): void {
    if (!card.hasAbility()) {
      return;
    }

    this.state = {
      card,
      ability: card.habilidade,
      visible: true,
      step: 0,
      data: {},
    };

    this.players = players;
    this.currentPlayerId = currentPlayerId;

    this.render();
  }

  /**
   * Esconde o menu
   */
  hide(): void {
    this.state.visible = false;
    this.destroy();
    this.callbacks.onClose?.();
  }

  /**
   * Cancela a ação
   */
  cancel(): void {
    this.hide();
    this.callbacks.onCancel?.();
  }

  /**
   * Renderiza o menu
   */
  private render(): void {
    this.destroy();

    const { width, height } = this.scene.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Overlay semi-transparente
    this.overlay = this.scene.add.rectangle(
      centerX,
      centerY,
      width,
      height,
      this.config.overlayColor,
      this.config.overlayAlpha
    );
    this.overlay.setInteractive({ useHandCursor: false });
    this.overlay.on('pointerdown', () => {
      // Não fecha ao clicar no overlay (precisa clicar em cancelar)
    });

    // Painel principal
    const panelWidth = 500;
    const panelHeight = 400;
    const panel = this.scene.add.container(centerX, centerY);

    // Fundo do painel
    const panelBg = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, this.config.panelColor);
    panelBg.setStrokeStyle(3, 0xffd700);
    panel.add(panelBg);

    // Título
    const title = this.scene.add.text(0, -panelHeight / 2 + 30, 'Usar Habilidade', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffd700',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    panel.add(title);

    // Nome da carta
    const cardName = this.scene.add.text(0, -panelHeight / 2 + 60, `Carta: ${this.state.card.nome}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: this.config.textColor.toString(16),
    });
    cardName.setOrigin(0.5);
    panel.add(cardName);

    // Renderiza conteúdo baseado na habilidade
    this.renderAbilityContent(panel, panelWidth, panelHeight);

    // Botão Cancelar
    const cancelBtn = this.scene.add.rectangle(
      0,
      panelHeight / 2 - 30,
      120,
      40,
      0x666666
    );
    cancelBtn.setStrokeStyle(2, 0xffffff);
    cancelBtn.setInteractive({ useHandCursor: true });
    cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0x777777));
    cancelBtn.on('pointerout', () => cancelBtn.setFillStyle(0x666666));
    cancelBtn.on('pointerdown', () => this.cancel());
    panel.add(cancelBtn);

    const cancelText = this.scene.add.text(0, panelHeight / 2 - 30, 'Cancelar', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    cancelText.setOrigin(0.5);
    panel.add(cancelText);

    this.panel = panel;
  }

  /**
   * Renderiza conteúdo específico da habilidade
   */
  private renderAbilityContent(panel: Phaser.GameObjects.Container, width: number, height: number): void {
    switch (this.state.ability) {
      case Ability.SEE_OPPONENT:
        this.renderSeeOpponent(panel, width, height);
        break;
      case Ability.SEE_OWN:
        this.renderSeeOwn(panel, width, height);
        break;
      case Ability.SWAP_CARDS:
        this.renderSwapCards(panel, width, height);
        break;
      default:
        this.renderGeneric(panel, width, height);
    }
  }

  /**
   * Renderiza interface para "Ver Oponente"
   */
  private renderSeeOpponent(panel: Phaser.GameObjects.Container, width: number, height: number): void {
    if (this.state.step === 0) {
      // Seleção de oponente
      const label = this.scene.add.text(0, -100, 'Escolha um oponente:', {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: this.config.textColor.toString(16),
      });
      label.setOrigin(0.5);
      panel.add(label);

      const opponents = this.players.filter((p) => p.id !== this.currentPlayerId);
      const buttonWidth = 200;
      const buttonHeight = 50;
      const spacing = 60;
      const startY = -50;

      opponents.forEach((opponent, index) => {
        const y = startY + index * spacing;
        const btn = this.scene.add.rectangle(0, y, buttonWidth, buttonHeight, 0x4a4a4a);
        btn.setStrokeStyle(2, 0xffffff);
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setFillStyle(0x5a5a5a));
        btn.on('pointerout', () => btn.setFillStyle(0x4a4a4a));
        btn.on('pointerdown', () => {
          this.state.data.opponentId = opponent.id;
          this.state.step = 1;
          this.render();
        });
        panel.add(btn);

        const btnText = this.scene.add.text(0, y, opponent.nome, {
          fontSize: '16px',
          fontFamily: 'Arial',
          color: '#ffffff',
        });
        btnText.setOrigin(0.5);
        panel.add(btnText);
      });
    } else if (this.state.step === 1) {
      // Seleção de carta do oponente
      const opponent = this.players.find((p) => p.id === this.state.data.opponentId);
      if (!opponent) {
        this.cancel();
        return;
      }

      const label = this.scene.add.text(0, -100, `Escolha uma carta de ${opponent.nome}:`, {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: this.config.textColor.toString(16),
      });
      label.setOrigin(0.5);
      panel.add(label);

      const cardCount = opponent.getMaoSize();
      const cardWidth = 50;
      const cardHeight = 70;
      const spacing = 10;
      const totalWidth = cardCount * cardWidth + (cardCount - 1) * spacing;
      const startX = -totalWidth / 2 + cardWidth / 2;

      for (let i = 0; i < cardCount; i++) {
        const x = startX + i * (cardWidth + spacing);
        const cardBtn = this.scene.add.rectangle(x, 0, cardWidth, cardHeight, 0x1a1a2e);
        cardBtn.setStrokeStyle(2, 0xffffff);
        cardBtn.setInteractive({ useHandCursor: true });
        cardBtn.on('pointerover', () => cardBtn.setFillStyle(0x2a2a3e));
        cardBtn.on('pointerout', () => cardBtn.setFillStyle(0x1a1a2e));
        cardBtn.on('pointerdown', () => {
          this.state.data.cardIndex = i;
          this.executeAbility();
        });
        panel.add(cardBtn);

        const cardText = this.scene.add.text(x, 0, `${i + 1}`, {
          fontSize: '14px',
          fontFamily: 'Arial',
          color: '#ffffff',
        });
        cardText.setOrigin(0.5);
        panel.add(cardText);
      }
    }
  }

  /**
   * Renderiza interface para "Ver Própria"
   */
  private renderSeeOwn(panel: Phaser.GameObjects.Container, width: number, height: number): void {
    const currentPlayer = this.players.find((p) => p.id === this.currentPlayerId);
    if (!currentPlayer) {
      this.cancel();
      return;
    }

    const label = this.scene.add.text(0, -100, 'Escolha uma carta sua para ver:', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: this.config.textColor.toString(16),
    });
    label.setOrigin(0.5);
    panel.add(label);

    const cardCount = currentPlayer.getMaoSize();
    const cardWidth = 50;
    const cardHeight = 70;
    const spacing = 10;
    const totalWidth = cardCount * cardWidth + (cardCount - 1) * spacing;
    const startX = -totalWidth / 2 + cardWidth / 2;

    for (let i = 0; i < cardCount; i++) {
      const x = startX + i * (cardWidth + spacing);
      const cardBtn = this.scene.add.rectangle(x, 0, cardWidth, cardHeight, 0x1a1a2e);
      cardBtn.setStrokeStyle(2, 0xffffff);
      cardBtn.setInteractive({ useHandCursor: true });
      cardBtn.on('pointerover', () => cardBtn.setFillStyle(0x2a2a3e));
      cardBtn.on('pointerout', () => cardBtn.setFillStyle(0x1a1a2e));
      cardBtn.on('pointerdown', () => {
        this.state.data.cardIndex = i;
        this.executeAbility();
      });
      panel.add(cardBtn);

      const cardText = this.scene.add.text(x, 0, `${i + 1}`, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#ffffff',
      });
      cardText.setOrigin(0.5);
      panel.add(cardText);
    }
  }

  /**
   * Renderiza interface para "Trocar Cartas"
   */
  private renderSwapCards(panel: Phaser.GameObjects.Container, width: number, height: number): void {
    // Implementação simplificada - em produção seria multi-etapa
    const label = this.scene.add.text(0, -100, 'Trocar Cartas (Em desenvolvimento)', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: this.config.textColor.toString(16),
    });
    label.setOrigin(0.5);
    panel.add(label);

    // TODO: Implementar seleção de 2 jogadores e 2 cartas
  }

  /**
   * Renderiza interface genérica
   */
  private renderGeneric(panel: Phaser.GameObjects.Container, width: number, height: number): void {
    const label = this.scene.add.text(0, 0, 'Habilidade não implementada', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: this.config.textColor.toString(16),
    });
    label.setOrigin(0.5);
    panel.add(label);
  }

  /**
   * Executa a habilidade com os dados coletados
   */
  private executeAbility(): void {
    const data = { ...this.state.data };
    this.hide();
    this.callbacks.onSuccess?.(this.state.ability, data);
  }

  /**
   * Mostra feedback de sucesso
   */
  showSuccess(message: string): void {
    // Implementação de feedback visual
    console.log('Sucesso:', message);
  }

  /**
   * Mostra feedback de erro
   */
  showError(error: string): void {
    // Implementação de feedback visual
    console.error('Erro:', error);
    this.callbacks.onError?.(error);
  }

  /**
   * Destrói elementos visuais
   */
  private destroy(): void {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
  }

  /**
   * Verifica se o menu está visível
   */
  isVisible(): boolean {
    return this.state.visible;
  }

  /**
   * Atualiza lista de jogadores
   */
  updatePlayers(players: Player[]): void {
    this.players = players;
  }
}

