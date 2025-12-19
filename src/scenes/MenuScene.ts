import Phaser from 'phaser';

/**
 * Cena do menu principal do jogo
 * Tela inicial com opções de jogo
 */
export class MenuScene extends Phaser.Scene {
  private buttons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  /**
   * Método chamado quando a cena é criada
   */
  create(): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Fundo com tema japonês
    this.renderBackground(centerX, centerY, width, height);

    // Título do jogo
    const titulo = this.add.text(centerX, centerY - 200, 'CUNOKU', {
      fontSize: '72px',
      fontFamily: 'Arial',
      color: '#ffd700',
      fontStyle: 'bold',
    });
    titulo.setOrigin(0.5);
    titulo.setStroke('#000000', 4);

    // Subtítulo
    const subtitulo = this.add.text(centerX, centerY - 130, 'Jogo de Cartas', {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    subtitulo.setOrigin(0.5);

    // Botões do menu
    const buttonY = centerY - 20;
    const buttonSpacing = 80;

    // Botão "Jogar contra Bots"
    const botaoBots = this.createMenuButton(
      centerX,
      buttonY,
      'Jogar contra Bots',
      0x2d1810,
      0xffd700,
      () => this.startBotGame()
    );
    this.buttons.push(botaoBots);

    // Botão "Criar Sala"
    const botaoCriarSala = this.createMenuButton(
      centerX,
      buttonY + buttonSpacing,
      'Criar Sala',
      0x2d1810,
      0xffd700,
      () => this.showComingSoon('Criar Sala')
    );
    this.buttons.push(botaoCriarSala);

    // Botão "Entrar em Sala"
    const botaoEntrarSala = this.createMenuButton(
      centerX,
      buttonY + buttonSpacing * 2,
      'Entrar em Sala',
      0x2d1810,
      0xffd700,
      () => this.showComingSoon('Entrar em Sala')
    );
    this.buttons.push(botaoEntrarSala);

    // Texto de informação
    const info = this.add.text(centerX, height - 30, 'Versão 2.0 - Phaser 3 + TypeScript', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#666666',
    });
    info.setOrigin(0.5);
  }

  /**
   * Renderiza fundo com tema japonês
   */
  private renderBackground(centerX: number, centerY: number, width: number, height: number): void {
    // Fundo principal
    this.add.rectangle(centerX, centerY, width, height, 0x1a1a1a);

    // Padrão decorativo
    const pattern = this.add.graphics();
    pattern.fillStyle(0x2a2a2a, 0.3);
    
    // Desenha padrão seigaiha simplificado
    for (let i = 0; i < 8; i++) {
      const y = centerY - 300 + i * 80;
      for (let j = 0; j < 10; j++) {
        const x = centerX - 400 + j * 80;
        const size = 20 + (i % 3) * 5;
        pattern.fillCircle(x, y, size);
      }
    }
  }

  /**
   * Cria um botão do menu
   */
  private createMenuButton(
    x: number,
    y: number,
    text: string,
    bgColor: number,
    borderColor: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Fundo do botão
    const buttonBg = this.add.rectangle(0, 0, 300, 60, bgColor);
    buttonBg.setStrokeStyle(3, borderColor);
    buttonBg.setInteractive({ useHandCursor: true });

    // Texto do botão
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    buttonText.setOrigin(0.5);

    // Efeitos hover
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x3d2810);
      buttonBg.setScale(1.05);
      this.tweens.add({
        targets: buttonBg,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: 'Power2',
      });
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(bgColor);
      this.tweens.add({
        targets: buttonBg,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Power2',
      });
    });

    // Ação do botão
    buttonBg.on('pointerdown', () => {
      this.tweens.add({
        targets: buttonBg,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        ease: 'Power2',
        onComplete: () => {
          this.tweens.add({
            targets: buttonBg,
            scaleX: 1,
            scaleY: 1,
            duration: 100,
            ease: 'Power2',
          });
          callback();
        },
      });
    });

    container.add([buttonBg, buttonText]);
    return container;
  }

  /**
   * Inicia jogo contra bots
   */
  private startBotGame(): void {
    // Transição suave para cena de configuração
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('BotSetupScene');
    });
  }

  /**
   * Mostra mensagem "Em breve" para funcionalidades futuras
   */
  private showComingSoon(feature: string): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Overlay
    const overlay = this.add.rectangle(centerX, centerY, width, height, 0x000000, 0.7);
    
    // Painel
    const panel = this.add.rectangle(centerX, centerY, 400, 200, 0x2a2a2a);
    panel.setStrokeStyle(3, 0xffd700);

    // Texto
    const title = this.add.text(centerX, centerY - 40, feature, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const message = this.add.text(centerX, centerY + 20, 'Em breve...', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#cccccc',
    });
    message.setOrigin(0.5);

    // Botão fechar
    const closeBtn = this.add.rectangle(centerX, centerY + 60, 120, 40, 0x666666);
    closeBtn.setStrokeStyle(2, 0xffffff);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0x777777));
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(0x666666));
    closeBtn.on('pointerdown', () => {
      overlay.destroy();
      panel.destroy();
      title.destroy();
      message.destroy();
      closeBtn.destroy();
    });

    const closeText = this.add.text(centerX, centerY + 60, 'Fechar', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    closeText.setOrigin(0.5);
    closeBtn.on('pointerdown', () => {
      overlay.destroy();
      panel.destroy();
      title.destroy();
      message.destroy();
      closeBtn.destroy();
      closeText.destroy();
    });
  }
}
