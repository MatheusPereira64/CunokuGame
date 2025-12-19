import Phaser from 'phaser';
import { BotDifficulty } from '../game/ai/BotPlayer';
import { BotPlayer } from '../game/ai/BotPlayer';
import { Player } from '../game/models/Player';
import { GameStartData } from './types/SceneData';

/**
 * Cena de configuração de partida contra bots
 */
export class BotSetupScene extends Phaser.Scene {
  private numBots: number = 2;
  private botDifficulty: BotDifficulty = BotDifficulty.MEDIUM;
  private playerName: string = 'Jogador';

  constructor() {
    super({ key: 'BotSetupScene' });
  }

  /**
   * Método chamado quando a cena é criada
   */
  create(): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Fade in
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Fundo
    this.add.rectangle(centerX, centerY, width, height, 0x1a1a1a);

    // Título
    const titulo = this.add.text(centerX, 100, 'Configurar Partida', {
      fontSize: '36px',
      fontFamily: 'Arial',
      color: '#ffd700',
      fontStyle: 'bold',
    });
    titulo.setOrigin(0.5);

    // Nome do jogador
    this.createPlayerNameInput(centerX, centerY - 100);

    // Número de bots
    this.createBotCountSelector(centerX, centerY - 20);

    // Dificuldade dos bots
    this.createDifficultySelector(centerX, centerY + 60);

    // Botão iniciar
    this.createStartButton(centerX, centerY + 150);

    // Botão voltar
    this.createBackButton(centerX, height - 50);
  }

  /**
   * Cria input para nome do jogador
   */
  private createPlayerNameInput(x: number, y: number): void {
    const label = this.add.text(x - 150, y, 'Seu Nome:', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    label.setOrigin(1, 0.5);

    // Input visual (simulado - em produção usaria input HTML)
    const inputBg = this.add.rectangle(x + 50, y, 200, 40, 0x2a2a2a);
    inputBg.setStrokeStyle(2, 0xffffff);
    inputBg.setInteractive({ useHandCursor: true });

    const inputText = this.add.text(x + 50, y, this.playerName, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    inputText.setOrigin(0.5);

    // Placeholder para input real
    inputBg.on('pointerdown', () => {
      const name = prompt('Digite seu nome:', this.playerName);
      if (name && name.trim()) {
        this.playerName = name.trim();
        inputText.setText(this.playerName);
      }
    });
  }

  /**
   * Cria seletor de número de bots
   */
  private createBotCountSelector(x: number, y: number): void {
    const label = this.add.text(x, y - 40, 'Número de Bots:', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    label.setOrigin(0.5);

    // Botão menos
    const btnMenos = this.createNumberButton(x - 60, y, '-', () => {
      if (this.numBots > 1) {
        this.numBots--;
        this.updateBotCountDisplay(x, y);
      }
    });

    // Display
    const display = this.add.text(x, y, `${this.numBots}`, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffd700',
      fontStyle: 'bold',
    });
    display.setOrigin(0.5);
    display.setData('value', this.numBots);

    // Botão mais
    const btnMais = this.createNumberButton(x + 60, y, '+', () => {
      if (this.numBots < 5) {
        this.numBots++;
        this.updateBotCountDisplay(x, y);
      }
    });

    this.updateBotCountDisplay(x, y);
  }

  /**
   * Atualiza display de número de bots
   */
  private updateBotCountDisplay(x: number, y: number): void {
    const display = this.children.getByName('botCountDisplay') as Phaser.GameObjects.Text;
    if (display) {
      display.setText(`${this.numBots}`);
      display.setData('value', this.numBots);
    } else {
      const newDisplay = this.add.text(x, y, `${this.numBots}`, {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffd700',
        fontStyle: 'bold',
      });
      newDisplay.setOrigin(0.5);
      newDisplay.setName('botCountDisplay');
    }
  }

  /**
   * Cria botão de número
   */
  private createNumberButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const btn = this.add.rectangle(0, 0, 40, 40, 0x4a4a4a);
    btn.setStrokeStyle(2, 0xffffff);
    btn.setInteractive({ useHandCursor: true });

    const btnText = this.add.text(0, 0, text, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    btnText.setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x5a5a5a));
    btn.on('pointerout', () => btn.setFillStyle(0x4a4a4a));
    btn.on('pointerdown', callback);

    container.add([btn, btnText]);
    return container;
  }

  /**
   * Cria seletor de dificuldade
   */
  private createDifficultySelector(x: number, y: number): void {
    const label = this.add.text(x, y - 40, 'Dificuldade dos Bots:', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    label.setOrigin(0.5);

    const difficulties = [
      { value: BotDifficulty.EASY, label: 'Fácil', color: 0x00ff00 },
      { value: BotDifficulty.MEDIUM, label: 'Médio', color: 0xffaa00 },
      { value: BotDifficulty.HARD, label: 'Difícil', color: 0xff0000 },
    ];

    const buttonWidth = 120;
    const spacing = 20;
    const totalWidth = difficulties.length * buttonWidth + (difficulties.length - 1) * spacing;
    const startX = x - totalWidth / 2 + buttonWidth / 2;

    difficulties.forEach((diff, index) => {
      const btnX = startX + index * (buttonWidth + spacing);
      const isSelected = this.botDifficulty === diff.value;

      const btn = this.add.rectangle(btnX, y, buttonWidth, 50, isSelected ? diff.color : 0x4a4a4a);
      btn.setStrokeStyle(2, isSelected ? 0xffd700 : 0xffffff);
      btn.setInteractive({ useHandCursor: true });

      const btnText = this.add.text(btnX, y, diff.label, {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      btnText.setOrigin(0.5);

      btn.on('pointerover', () => {
        if (!isSelected) {
          btn.setFillStyle(0x5a5a5a);
        }
      });

      btn.on('pointerout', () => {
        if (!isSelected) {
          btn.setFillStyle(0x4a4a4a);
        }
      });

      btn.on('pointerdown', () => {
        this.botDifficulty = diff.value;
        this.updateDifficultyButtons(x, y, difficulties);
      });
    });
  }

  /**
   * Atualiza botões de dificuldade
   */
  private updateDifficultyButtons(x: number, y: number, difficulties: Array<{ value: BotDifficulty; label: string; color: number }>): void {
    // Recria seletor (simplificado - em produção seria mais eficiente)
    this.children.list.forEach((child) => {
      if (child.getData && child.getData('difficultyButton')) {
        child.destroy();
      }
    });
    this.createDifficultySelector(x, y);
  }

  /**
   * Cria botão de iniciar partida
   */
  private createStartButton(x: number, y: number): void {
    const btn = this.add.rectangle(x, y, 250, 60, 0x2d1810);
    btn.setStrokeStyle(3, 0xffd700);
    btn.setInteractive({ useHandCursor: true });

    const btnText = this.add.text(x, y, 'Iniciar Partida', {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    btnText.setOrigin(0.5);

    btn.on('pointerover', () => {
      btn.setFillStyle(0x3d2810);
      btn.setScale(1.05);
    });

    btn.on('pointerout', () => {
      btn.setFillStyle(0x2d1810);
      btn.setScale(1);
    });

    btn.on('pointerdown', () => {
      this.startGame();
    });
  }

  /**
   * Cria botão de voltar
   */
  private createBackButton(x: number, y: number): void {
    const btn = this.add.rectangle(x, y, 150, 40, 0x666666);
    btn.setStrokeStyle(2, 0xffffff);
    btn.setInteractive({ useHandCursor: true });

    const btnText = this.add.text(x, y, 'Voltar', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    btnText.setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x777777));
    btn.on('pointerout', () => btn.setFillStyle(0x666666));
    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    });
  }

  /**
   * Inicia a partida
   */
  private startGame(): void {
    // Cria jogadores
    const players: Player[] = [];
    
    // Jogador humano
    const humanPlayer = new Player('human', this.playerName, false);
    players.push(humanPlayer);

    // Bots
    const botNames = ['Naldo', 'Hulk', 'Sanfona', 'Noku', 'Superlombra'];
    for (let i = 0; i < this.numBots; i++) {
      const bot = new BotPlayer(`bot${i}`, botNames[i] || `Bot ${i + 1}`, this.botDifficulty);
      players.push(bot);
    }

    // Prepara dados para TableScene
    const gameData: GameStartData = {
      players,
      humanPlayerId: 'human',
      gameConfig: {
        numBots: this.numBots,
        botDifficulty: this.botDifficulty,
      },
    };

    // Transição para TableScene
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('TableScene', gameData);
    });
  }
}

