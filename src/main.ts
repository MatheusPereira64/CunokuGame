import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { BotSetupScene } from './scenes/BotSetupScene';
import { TableScene } from './scenes/TableScene';

/**
 * Configuração principal do jogo Phaser
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scene: [BootScene, MenuScene, BotSetupScene, TableScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
};

/**
 * Inicializa o jogo Phaser
 */
const game = new Phaser.Game(config);

// Exporta para possível uso futuro
export default game;

