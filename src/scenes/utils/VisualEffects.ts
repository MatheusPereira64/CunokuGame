import Phaser from 'phaser';

/**
 * Utilitários para efeitos visuais
 */
export class VisualEffects {
  /**
   * Cria efeito de brilho verde (sucesso)
   */
  static createSuccessEffect(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number = 50
  ): Phaser.GameObjects.Graphics {
    const graphics = scene.add.graphics();
    graphics.lineStyle(4, 0x00ff00, 1);
    graphics.strokeCircle(x, y, radius);

    scene.tweens.add({
      targets: graphics,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        graphics.destroy();
      },
    });

    return graphics;
  }

  /**
   * Cria efeito de erro (vermelho)
   */
  static createErrorEffect(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number = 50
  ): Phaser.GameObjects.Graphics {
    const graphics = scene.add.graphics();
    graphics.lineStyle(4, 0xff0000, 1);
    graphics.strokeCircle(x, y, radius);

    scene.tweens.add({
      targets: graphics,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        graphics.destroy();
      },
    });

    return graphics;
  }

  /**
   * Cria indicador de ação (seta ou destaque)
   */
  static createActionIndicator(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: 'arrow' | 'glow' = 'glow'
  ): Phaser.GameObjects.Graphics {
    const graphics = scene.add.graphics();

    if (type === 'arrow') {
      graphics.lineStyle(3, 0xffd700, 1);
      graphics.beginPath();
      graphics.moveTo(x, y - 20);
      graphics.lineTo(x, y + 20);
      graphics.moveTo(x - 10, y + 10);
      graphics.lineTo(x, y + 20);
      graphics.lineTo(x + 10, y + 10);
      graphics.strokePath();
    } else {
      graphics.lineStyle(3, 0xffd700, 0.8);
      graphics.strokeCircle(x, y, 30);
    }

    scene.tweens.add({
      targets: graphics,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return graphics;
  }

  /**
   * Cria flash de cor (feedback rápido)
   */
  static createFlash(
    scene: Phaser.Scene,
    color: number,
    duration: number = 200
  ): void {
    const { width, height } = scene.scale;
    const flash = scene.add.rectangle(width / 2, height / 2, width, height, color, 0.3);
    
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      ease: 'Power2',
      onComplete: () => {
        flash.destroy();
      },
    });
  }
}

