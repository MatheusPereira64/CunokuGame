import Phaser from 'phaser';

/**
 * Cena de inicialização do jogo
 * Carrega assets essenciais e configura o jogo antes de ir para o menu
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  /**
   * Método chamado quando a cena é criada
   */
  create(): void {
    // Configurações básicas do jogo
    const { width, height } = this.scale;

    // Por enquanto, apenas transiciona para o menu
    // Futuramente aqui será carregado assets essenciais
    console.log('BootScene: Inicializando jogo...');
    console.log(`Dimensões: ${width}x${height}`);

    // Aguarda um frame antes de transicionar
    this.time.delayedCall(100, () => {
      this.scene.start('MenuScene');
    });
  }
}

