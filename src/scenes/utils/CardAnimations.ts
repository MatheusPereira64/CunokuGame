import Phaser from 'phaser';
import { Card } from '../../game/models/Card';

/**
 * Utilitários para animações de cartas
 */
export class CardAnimations {
  /**
   * Anima compra de carta (carta aparece do baralho)
   */
  static animateCardDraw(
    scene: Phaser.Scene,
    card: Phaser.GameObjects.Container,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    duration: number = 500
  ): Phaser.Tweens.Tween {
    // Posiciona no ponto inicial
    card.setPosition(fromX, fromY);
    card.setScale(0);
    card.setAlpha(0);

    // Anima para posição final
    return scene.tweens.add({
      targets: card,
      x: toX,
      y: toY,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration,
      ease: 'Power2',
    });
  }

  /**
   * Anima descarte de carta (carta move para pilha)
   */
  static animateCardDiscard(
    scene: Phaser.Scene,
    card: Phaser.GameObjects.Container,
    toX: number,
    toY: number,
    duration: number = 400,
    onComplete?: () => void
  ): Phaser.Tweens.Tween {
    return scene.tweens.add({
      targets: card,
      x: toX,
      y: toY,
      scaleX: 0.8,
      scaleY: 0.8,
      alpha: 0,
      duration,
      ease: 'Power2',
      onComplete: () => {
        if (onComplete) {
          onComplete();
        }
      },
    });
  }

  /**
   * Anima substituição de carta (troca suave)
   */
  static animateCardReplace(
    scene: Phaser.Scene,
    oldCard: Phaser.GameObjects.Container,
    newCard: Phaser.GameObjects.Container,
    x: number,
    y: number,
    duration: number = 300
  ): void {
    // Anima carta antiga saindo
    scene.tweens.add({
      targets: oldCard,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: duration / 2,
      ease: 'Power2',
      onComplete: () => {
        oldCard.setVisible(false);
      },
    });

    // Anima carta nova entrando
    newCard.setPosition(x, y);
    newCard.setScale(0);
    newCard.setAlpha(0);
    newCard.setVisible(true);

    scene.tweens.add({
      targets: newCard,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: duration / 2,
      delay: duration / 2,
      ease: 'Power2',
    });
  }

  /**
   * Anima hover em carta (destaque)
   */
  static animateCardHover(
    scene: Phaser.Scene,
    card: Phaser.GameObjects.Container,
    isHovering: boolean
  ): void {
    if (isHovering) {
      scene.tweens.add({
        targets: card,
        scaleX: 1.1,
        scaleY: 1.1,
        y: card.y - 10,
        duration: 200,
        ease: 'Power2',
      });
    } else {
      scene.tweens.add({
        targets: card,
        scaleX: 1,
        scaleY: 1,
        y: card.y + 10,
        duration: 200,
        ease: 'Power2',
      });
    }
  }

  /**
   * Anima pulso (para indicar ação)
   */
  static animatePulse(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    duration: number = 300,
    repeat: number = 1
  ): Phaser.Tweens.Tween {
    return scene.tweens.add({
      targets: target,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: duration / 2,
      yoyo: true,
      repeat,
      ease: 'Power2',
    });
  }

  /**
   * Anima shake (para erro)
   */
  static animateShake(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    intensity: number = 10,
    duration: number = 200
  ): Phaser.Tweens.Tween {
    const startX = (target as any).x;
    const startY = (target as any).y;

    return scene.tweens.add({
      targets: target,
      x: {
        from: startX - intensity,
        to: startX + intensity,
      },
      y: {
        from: startY - intensity,
        to: startY + intensity,
      },
      duration,
      yoyo: true,
      repeat: 2,
      ease: 'Power1',
      onComplete: () => {
        (target as any).x = startX;
        (target as any).y = startY;
      },
    });
  }
}

