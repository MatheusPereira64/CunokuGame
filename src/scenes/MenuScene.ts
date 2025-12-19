import Phaser from 'phaser';

/**
 * Cena do menu principal do jogo
 * Tela inicial com opções de jogo
 */
export class MenuScene extends Phaser.Scene {
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

    // Fundo simples (cor sólida por enquanto)
    this.add.rectangle(centerX, centerY, width, height, 0x1a1a2e);

    // Título do jogo
    const titulo = this.add.text(centerX, centerY - 150, 'CUNOKU', {
      fontSize: '64px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    titulo.setOrigin(0.5);

    // Subtítulo
    const subtitulo = this.add.text(centerX, centerY - 80, 'Jogo de Cartas', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#cccccc',
    });
    subtitulo.setOrigin(0.5);

    // Botão "Iniciar Jogo" (placeholder)
    const botaoIniciar = this.add.rectangle(centerX, centerY + 50, 200, 60, 0x16213e);
    botaoIniciar.setStrokeStyle(2, 0x0f3460);
    botaoIniciar.setInteractive({ useHandCursor: true });

    const textoBotao = this.add.text(centerX, centerY + 50, 'Iniciar Jogo', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    textoBotao.setOrigin(0.5);

    // Efeito hover no botão
    botaoIniciar.on('pointerover', () => {
      botaoIniciar.setFillStyle(0x0f3460);
    });

    botaoIniciar.on('pointerout', () => {
      botaoIniciar.setFillStyle(0x16213e);
    });

    // Ação do botão (placeholder)
    botaoIniciar.on('pointerdown', () => {
      console.log('Botão Iniciar Jogo clicado');
      // Futuramente: transicionar para GameScene ou menu de opções
      this.cameras.main.flash(200, 255, 255, 255);
    });

    // Texto de informação
    const info = this.add.text(centerX, height - 50, 'Versão 2.0 - Phaser 3 + TypeScript', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#666666',
    });
    info.setOrigin(0.5);
  }
}

