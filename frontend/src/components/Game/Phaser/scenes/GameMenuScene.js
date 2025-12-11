import Phaser from 'phaser'

export default class GameMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameMenuScene' })
    this.buttons = []
    this.isVisible = false
  }

  preload() {
    // Criar texturas para botões e elementos do menu
    this.createMenuTextures()
  }

  create() {
    // Container principal do menu
    this.menuContainer = this.add.container(0, 0)
    this.menuContainer.setVisible(false)
    
    // Background semi-transparente
    this.createBackground()
    
    // Criar elementos do menu
    this.createMenuElements()
    
    // Escalar para diferentes tamanhos de tela
    this.scaleMenu()
    
    // Listener para resize
    this.scale.on('resize', this.scaleMenu, this)
  }

  createMenuTextures() {
    // Botão padrão
    const buttonBg = this.make.graphics({ x: 0, y: 0 })
    buttonBg.fillStyle(0x1a1a2e, 1)
    buttonBg.fillRoundedRect(0, 0, 200, 60, 12)
    buttonBg.lineStyle(3, 0xd4af37, 1)
    buttonBg.strokeRoundedRect(0, 0, 200, 60, 12)
    buttonBg.generateTexture('button-bg', 200, 60)
    buttonBg.destroy()

    // Botão hover
    const buttonHover = this.make.graphics({ x: 0, y: 0 })
    buttonHover.fillStyle(0x2a2a4e, 1)
    buttonHover.fillRoundedRect(0, 0, 200, 60, 12)
    buttonHover.lineStyle(3, 0xffd700, 1)
    buttonHover.strokeRoundedRect(0, 0, 200, 60, 12)
    buttonHover.generateTexture('button-hover', 200, 60)
    buttonHover.destroy()

    // Background do menu
    const menuBg = this.make.graphics({ x: 0, y: 0 })
    menuBg.fillStyle(0x0a0a1a, 0.95)
    menuBg.fillRoundedRect(0, 0, 400, 500, 20)
    menuBg.lineStyle(4, 0xd4af37, 1)
    menuBg.strokeRoundedRect(0, 0, 400, 500, 20)
    menuBg.generateTexture('menu-bg', 400, 500)
    menuBg.destroy()
  }

  createBackground() {
    const { width, height } = this.cameras.main
    this.bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
    this.bg.setInteractive({ useHandCursor: false })
    // Fechar menu ao clicar no background
    this.bg.on('pointerdown', () => {
      this.hide()
    })
    this.bg.setDepth(100)
    this.menuContainer.add(this.bg)
  }

  createMenuElements() {
    const { width, height } = this.cameras.main
    
    // Container do menu central
    const menuWidth = Math.min(400, width * 0.9)
    const menuHeight = Math.min(500, height * 0.9)
    
    // Background do menu
    this.menuBg = this.add.image(width / 2, height / 2, 'menu-bg')
    this.menuBg.setDisplaySize(menuWidth, menuHeight)
    this.menuBg.setDepth(101)
    this.menuContainer.add(this.menuBg)

    // Título
    this.title = this.add.text(width / 2, height / 2 - menuHeight / 2 + 40, '🎴 Ações do Jogo', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    })
    this.title.setOrigin(0.5)
    this.title.setDepth(102)
    this.menuContainer.add(this.title)

    // Botões
    const buttonY = height / 2 - menuHeight / 2 + 120
    const buttonSpacing = 80
    const buttonWidth = Math.min(200, menuWidth * 0.7)
    const buttonHeight = 60

    // Botão Comprar Carta
    this.createButton(
      width / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      '🃏 Comprar Carta',
      () => this.emitAction('draw-card')
    )

    // Botão Descartar
    this.createButton(
      width / 2,
      buttonY + buttonSpacing,
      buttonWidth,
      buttonHeight,
      '🗑️ Descartar',
      () => this.emitAction('discard')
    )

    // Botão Substituir
    this.createButton(
      width / 2,
      buttonY + buttonSpacing * 2,
      buttonWidth,
      buttonHeight,
      '🔄 Substituir',
      () => this.emitAction('substitute')
    )

    // Botão Habilidade
    this.createButton(
      width / 2,
      buttonY + buttonSpacing * 3,
      buttonWidth,
      buttonHeight,
      '✨ Habilidade',
      () => this.emitAction('ability')
    )

    // Botão Declarar Fim
    this.createButton(
      width / 2,
      buttonY + buttonSpacing * 4,
      buttonWidth,
      buttonHeight,
      '🏁 Declarar Fim',
      () => this.emitAction('declare-end')
    )

    // Botão Fechar
    this.closeButton = this.add.text(width / 2, height / 2 + menuHeight / 2 - 40, '✕ Fechar', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#ff6b6b',
      stroke: '#000000',
      strokeThickness: 3
    })
    this.closeButton.setOrigin(0.5)
    this.closeButton.setDepth(102)
    this.closeButton.setInteractive({ useHandCursor: true })
    this.closeButton.on('pointerdown', () => this.hide())
    this.closeButton.on('pointerover', () => {
      this.closeButton.setTint(0xffaaaa)
      this.closeButton.setScale(1.1)
    })
    this.closeButton.on('pointerout', () => {
      this.closeButton.clearTint()
      this.closeButton.setScale(1)
    })
    this.menuContainer.add(this.closeButton)
  }

  createButton(x, y, width, height, text, callback) {
    // Background do botão
    const bg = this.add.image(x, y, 'button-bg')
    bg.setDisplaySize(width, height)
    bg.setDepth(102)
    bg.setInteractive({ useHandCursor: true })

    // Texto do botão
    const buttonText = this.add.text(x, y, text, {
      fontSize: `${Math.min(18, width / 10)}px`,
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
      wordWrap: { width: width - 20 }
    })
    buttonText.setOrigin(0.5)
    buttonText.setDepth(103)

    // Hover effects
    bg.on('pointerover', () => {
      bg.setTexture('button-hover')
      bg.setScale(1.05)
      buttonText.setScale(1.05)
    })

    bg.on('pointerout', () => {
      bg.setTexture('button-bg')
      bg.setScale(1)
      buttonText.setScale(1)
    })

    bg.on('pointerdown', () => {
      bg.setScale(0.95)
      buttonText.setScale(0.95)
      this.time.delayedCall(100, () => {
        bg.setScale(1)
        buttonText.setScale(1)
        if (callback) callback()
      })
    })

    this.menuContainer.add([bg, buttonText])
    this.buttons.push({ bg, text: buttonText })
  }

  scaleMenu() {
    if (!this.menuContainer) return
    
    const { width, height } = this.cameras.main
    const scale = Math.min(width / 1920, height / 1080, 1)
    
    // Ajustar tamanho do background
    if (this.bg) {
      this.bg.setSize(width, height)
      this.bg.setPosition(width / 2, height / 2)
    }

    // Ajustar menu
    const menuWidth = Math.min(400, width * 0.9)
    const menuHeight = Math.min(500, height * 0.9)
    
    if (this.menuBg) {
      this.menuBg.setDisplaySize(menuWidth, menuHeight)
      this.menuBg.setPosition(width / 2, height / 2)
    }

    // Reposicionar elementos
    if (this.title) {
      this.title.setPosition(width / 2, height / 2 - menuHeight / 2 + 40)
      this.title.setFontSize(Math.min(32, width / 20))
    }

    if (this.closeButton) {
      this.closeButton.setPosition(width / 2, height / 2 + menuHeight / 2 - 40)
      this.closeButton.setFontSize(Math.min(24, width / 25))
    }

    // Reposicionar botões
    const buttonY = height / 2 - menuHeight / 2 + 120
    const buttonSpacing = Math.min(80, height * 0.08)
    const buttonWidth = Math.min(200, menuWidth * 0.7)
    const buttonHeight = Math.min(60, height * 0.06)

    this.buttons.forEach((button, index) => {
      const y = buttonY + buttonSpacing * index
      button.bg.setPosition(width / 2, y)
      button.bg.setDisplaySize(buttonWidth, buttonHeight)
      button.text.setPosition(width / 2, y)
      button.text.setFontSize(Math.min(18, buttonWidth / 10))
    })
  }

  show() {
    if (this.isVisible) return
    this.isVisible = true
    this.menuContainer.setVisible(true)
    this.scaleMenu()
    
    // Animação de entrada
    this.tweens.add({
      targets: this.menuContainer,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.8, to: 1 },
      duration: 300,
      ease: 'Back.easeOut'
    })
  }

  hide() {
    if (!this.isVisible) return
    this.isVisible = false
    
    // Animação de saída
    this.tweens.add({
      targets: this.menuContainer,
      alpha: 0,
      scale: 0.8,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.menuContainer.setVisible(false)
      }
    })
  }

  toggle() {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show()
    }
  }

  emitAction(action) {
    // Emitir evento através do game events
    this.game.events.emit('menu-action', action)
    this.hide()
  }

  update() {
    // Menu não precisa de update contínuo - desabilitar para performance
  }
  
  // Otimização: não renderizar quando não visível
  render() {
    if (!this.isVisible) {
      return
    }
  }
}

