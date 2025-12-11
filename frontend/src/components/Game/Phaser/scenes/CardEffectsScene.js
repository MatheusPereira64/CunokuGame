import Phaser from 'phaser'

export default class CardEffectsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CardEffectsScene' })
  }

  preload() {
    // Criar texturas de cartas programaticamente
    this.createCardTextures()
  }

  create() {
    // Container para efeitos
    this.effectsContainer = this.add.container(0, 0)
    
    // Pool de sprites para reutilização (otimização)
    this.cardPool = []
    this.particlePool = []
    this.maxPoolSize = 20 // Limitar tamanho do pool
    
    // Configurar tweens padrão
    this.tweens.timeScale = 1
    
    // Limpar objetos órfãos periodicamente (otimização)
    this.time.addEvent({
      delay: 5000,
      callback: this.cleanupOrphans,
      callbackScope: this,
      loop: true
    })
  }
  
  // Limpar objetos que não foram destruídos corretamente
  cleanupOrphans() {
    const children = this.children.getChildren()
    children.forEach(child => {
      if (child && child.active && child.alpha <= 0 && child.scaleX <= 0) {
        child.destroy()
      }
    })
  }

  createCardTextures() {
    // Criar textura da carta de costas
    const cardBack = this.make.graphics({ x: 0, y: 0 })
    cardBack.fillStyle(0x1e3a8a, 1)
    cardBack.fillRoundedRect(0, 0, 60, 84, 8)
    cardBack.lineStyle(3, 0xd4af37, 1)
    cardBack.strokeRoundedRect(0, 0, 60, 84, 8)
    
    // Padrão decorativo
    cardBack.fillStyle(0xd4af37, 0.3)
    cardBack.fillRoundedRect(8, 12, 44, 60, 4)
    
    cardBack.generateTexture('card-back', 60, 84)
    cardBack.destroy()

    // Criar textura de carta revelada (frente)
    const cardFront = this.make.graphics({ x: 0, y: 0 })
    cardFront.fillStyle(0xffffff, 1)
    cardFront.fillRoundedRect(0, 0, 60, 84, 8)
    cardFront.lineStyle(3, 0xd4af37, 1)
    cardFront.strokeRoundedRect(0, 0, 60, 84, 8)
    cardFront.generateTexture('card-front', 60, 84)
    cardFront.destroy()

    // Criar textura de brilho
    const glowTexture = this.make.graphics({ x: 0, y: 0 })
    glowTexture.fillStyle(0xffd700, 0.5)
    glowTexture.fillCircle(40, 40, 40)
    glowTexture.generateTexture('glow', 80, 80)
    glowTexture.destroy()

    // Criar textura de partícula
    const particle = this.make.graphics({ x: 0, y: 0 })
    particle.fillStyle(0xffd700, 1)
    particle.fillCircle(8, 8, 8)
    particle.generateTexture('particle-gold', 16, 16)
    particle.destroy()

    // Partícula azul
    const particleBlue = this.make.graphics({ x: 0, y: 0 })
    particleBlue.fillStyle(0x00ffff, 1)
    particleBlue.fillCircle(8, 8, 8)
    particleBlue.generateTexture('particle-blue', 16, 16)
    particleBlue.destroy()

    // Partícula rosa
    const particlePink = this.make.graphics({ x: 0, y: 0 })
    particlePink.fillStyle(0xff1493, 1)
    particlePink.fillCircle(8, 8, 8)
    particlePink.generateTexture('particle-pink', 16, 16)
    particlePink.destroy()

    // Partícula verde
    const particleGreen = this.make.graphics({ x: 0, y: 0 })
    particleGreen.fillStyle(0x00ff00, 1)
    particleGreen.fillCircle(8, 8, 8)
    particleGreen.generateTexture('particle-green', 16, 16)
    particleGreen.destroy()

    // Estrela (desenhada manualmente)
    const star = this.make.graphics({ x: 0, y: 0 })
    star.fillStyle(0xffd700, 1)
    // Desenhar estrela de 5 pontas manualmente
    const cx = 16, cy = 16, outerR = 14, innerR = 6, points = 5
    star.beginPath()
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerR : innerR
      const angle = (i * Math.PI / points) - Math.PI / 2
      const x = cx + radius * Math.cos(angle)
      const y = cy + radius * Math.sin(angle)
      if (i === 0) {
        star.moveTo(x, y)
      } else {
        star.lineTo(x, y)
      }
    }
    star.closePath()
    star.fillPath()
    star.generateTexture('star', 32, 32)
    star.destroy()
  }

  // Efeito de comprar carta (otimizado)
  playDrawCard(fromX, fromY, toX, toY) {
    // Reutilizar sprite do pool se disponível
    let card = this.cardPool.find(c => !c.active)
    if (!card) {
      card = this.add.image(fromX, fromY, 'card-back')
      if (this.cardPool.length < this.maxPoolSize) {
        this.cardPool.push(card)
      }
    } else {
      card.setPosition(fromX, fromY)
      card.setActive(true)
      card.setVisible(true)
    }
    
    card.setScale(0.5)
    card.setAlpha(0)
    card.setDepth(100)

    // Glow atrás da carta
    const glow = this.add.image(fromX, fromY, 'glow')
    glow.setScale(1.5)
    glow.setAlpha(0)
    glow.setBlendMode(Phaser.BlendModes.ADD)
    glow.setDepth(99)

    // Partículas ao comprar
    this.createTrailParticles(fromX, fromY, toX, toY, 'particle-gold')

    // Animação principal
    this.tweens.add({
      targets: [card, glow],
      alpha: 1,
      duration: 150,
      onComplete: () => {
        // Movimento para a mão
        this.tweens.add({
          targets: card,
          x: toX,
          y: toY,
          scale: 1,
          duration: 400,
          ease: 'Back.easeOut',
          onComplete: () => {
            // Flash final
            this.tweens.add({
              targets: card,
              alpha: 0,
              scale: 1.2,
              duration: 200,
              onComplete: () => {
                // Retornar ao pool ao invés de destruir
                card.setActive(false)
                card.setVisible(false)
              }
            })
          }
        })

        this.tweens.add({
          targets: glow,
          x: toX,
          y: toY,
          scale: 2,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            glow.destroy()
          }
        })
      }
    })
  }

  // Efeito de descartar carta
  playDiscardCard(fromX, fromY, toX, toY) {
    const card = this.add.image(fromX, fromY, 'card-back')
    card.setScale(1)
    card.setDepth(100)

    // Partículas de descarte
    this.createBurstParticles(fromX, fromY, 'particle-pink', 10)

    // Rotação + movimento
    this.tweens.add({
      targets: card,
      x: toX,
      y: toY,
      scale: 0.8,
      rotation: Phaser.Math.DegToRad(360),
      duration: 500,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        // Explosão final
        this.createBurstParticles(toX, toY, 'particle-gold', 15)
        
        this.tweens.add({
          targets: card,
          alpha: 0,
          scale: 0.3,
          duration: 150,
          onComplete: () => {
            card.destroy()
          }
        })
      }
    })
  }

  // Efeito de trocar cartas
  playSwapCards(pos1, pos2) {
    const card1 = this.add.image(pos1.x, pos1.y, 'card-back')
    const card2 = this.add.image(pos2.x, pos2.y, 'card-back')
    
    card1.setDepth(100)
    card2.setDepth(101)

    // Efeito de swap com arcos
    const midX = (pos1.x + pos2.x) / 2
    const midY = (pos1.y + pos2.y) / 2 - 50

    // Criar linha de conexão
    const line = this.add.graphics()
    line.lineStyle(3, 0x00ff00, 0.5)
    line.lineBetween(pos1.x, pos1.y, pos2.x, pos2.y)
    line.setDepth(98)

    // Partículas de conexão
    this.createConnectionParticles(pos1.x, pos1.y, pos2.x, pos2.y, 'particle-green')

    // Animação de troca
    this.tweens.add({
      targets: card1,
      x: pos2.x,
      y: [midY, pos2.y],
      scale: [1.2, 1],
      rotation: Phaser.Math.DegToRad(180),
      duration: 600,
      ease: 'Sine.easeInOut'
    })

    this.tweens.add({
      targets: card2,
      x: pos1.x,
      y: [midY, pos1.y],
      scale: [1.2, 1],
      rotation: Phaser.Math.DegToRad(-180),
      duration: 600,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        // Flash de conclusão
        this.createBurstParticles(pos1.x, pos1.y, 'particle-green', 8)
        this.createBurstParticles(pos2.x, pos2.y, 'particle-green', 8)
        
        this.tweens.add({
          targets: [card1, card2, line],
          alpha: 0,
          duration: 200,
          onComplete: () => {
            card1.destroy()
            card2.destroy()
            line.destroy()
          }
        })
      }
    })
  }

  // Efeito de revelar carta
  playRevealCard(x, y, value, suit) {
    const cardBack = this.add.image(x, y, 'card-back')
    cardBack.setDepth(100)

    // Glow intenso
    const glow = this.add.image(x, y, 'glow')
    glow.setScale(2)
    glow.setAlpha(0.8)
    glow.setTint(0x00ffff)
    glow.setBlendMode(Phaser.BlendModes.ADD)
    glow.setDepth(99)

    // Texto do valor da carta
    const suitEmojis = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }
    const suitColors = { hearts: '#ff0000', diamonds: '#ff0000', clubs: '#000000', spades: '#000000' }
    
    const cardText = this.add.text(x, y, `${value}\n${suitEmojis[suit] || '?'}`, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: suitColors[suit] || '#ffd700',
      align: 'center',
      fontStyle: 'bold'
    })
    cardText.setOrigin(0.5)
    cardText.setAlpha(0)
    cardText.setDepth(102)

    // Animação de flip
    this.tweens.add({
      targets: cardBack,
      scaleX: 0,
      duration: 200,
      ease: 'Sine.easeIn',
      onComplete: () => {
        cardBack.setTexture('card-front')
        cardText.setAlpha(1)
        
        this.tweens.add({
          targets: cardBack,
          scaleX: 1,
          duration: 200,
          ease: 'Sine.easeOut'
        })
      }
    })

    // Partículas ao revelar
    this.time.delayedCall(200, () => {
      this.createBurstParticles(x, y, 'particle-blue', 20)
    })

    // Glow pulsante
    this.tweens.add({
      targets: glow,
      scale: 3,
      alpha: 0,
      duration: 800,
      ease: 'Sine.easeOut'
    })

    // Cleanup após exibir
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: [cardBack, cardText],
        alpha: 0,
        scale: 0.5,
        duration: 300,
        onComplete: () => {
          cardBack.destroy()
          cardText.destroy()
          glow.destroy()
        }
      })
    })
  }

  // Efeito de mudança de turno
  playTurnChange(playerName) {
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY - 100

    // Texto animado
    const turnText = this.add.text(centerX, centerY, `🎴 Turno de ${playerName}`, {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        color: '#000000',
        blur: 10,
        fill: true
      }
    })
    turnText.setOrigin(0.5)
    turnText.setAlpha(0)
    turnText.setScale(0.5)
    turnText.setDepth(200)

    // Linhas decorativas
    const lineLeft = this.add.graphics()
    lineLeft.lineStyle(3, 0xd4af37, 1)
    lineLeft.lineBetween(centerX - 200, centerY, centerX - 100, centerY)
    lineLeft.setAlpha(0)
    lineLeft.setDepth(199)

    const lineRight = this.add.graphics()
    lineRight.lineStyle(3, 0xd4af37, 1)
    lineRight.lineBetween(centerX + 100, centerY, centerX + 200, centerY)
    lineRight.setAlpha(0)
    lineRight.setDepth(199)

    // Animação de entrada
    this.tweens.add({
      targets: turnText,
      alpha: 1,
      scale: 1,
      y: centerY - 20,
      duration: 400,
      ease: 'Back.easeOut'
    })

    this.tweens.add({
      targets: [lineLeft, lineRight],
      alpha: 1,
      duration: 300,
      delay: 200
    })

    // Partículas douradas
    this.time.delayedCall(300, () => {
      this.createBurstParticles(centerX - 150, centerY, 'star', 5)
      this.createBurstParticles(centerX + 150, centerY, 'star', 5)
    })

    // Fade out
    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: [turnText, lineLeft, lineRight],
        alpha: 0,
        y: centerY - 50,
        duration: 400,
        onComplete: () => {
          turnText.destroy()
          lineLeft.destroy()
          lineRight.destroy()
        }
      })
    })
  }

  // Criar partículas de rastro
  createTrailParticles(fromX, fromY, toX, toY, texture) {
    const steps = 10
    for (let i = 0; i < steps; i++) {
      const progress = i / steps
      const x = Phaser.Math.Linear(fromX, toX, progress)
      const y = Phaser.Math.Linear(fromY, toY, progress)
      
      this.time.delayedCall(i * 30, () => {
        const particle = this.add.image(x, y, texture)
        particle.setScale(0.3 + Math.random() * 0.3)
        particle.setAlpha(0.8)
        particle.setBlendMode(Phaser.BlendModes.ADD)
        particle.setDepth(50)
        
        this.tweens.add({
          targets: particle,
          alpha: 0,
          scale: 0,
          y: y - 20,
          duration: 400,
          onComplete: () => particle.destroy()
        })
      })
    }
  }

  // Criar explosão de partículas
  createBurstParticles(x, y, texture, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const speed = 50 + Math.random() * 50
      const targetX = x + Math.cos(angle) * speed
      const targetY = y + Math.sin(angle) * speed
      
      const particle = this.add.image(x, y, texture)
      particle.setScale(0.4 + Math.random() * 0.3)
      particle.setAlpha(1)
      particle.setBlendMode(Phaser.BlendModes.ADD)
      particle.setDepth(150)
      
      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0,
        rotation: Math.random() * Math.PI * 2,
        duration: 500 + Math.random() * 300,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      })
    }
  }

  // Criar partículas de conexão (para swap)
  createConnectionParticles(x1, y1, x2, y2, texture) {
    const steps = 8
    for (let i = 0; i < steps; i++) {
      this.time.delayedCall(i * 50, () => {
        const progress = i / steps
        const x = Phaser.Math.Linear(x1, x2, progress)
        const y = Phaser.Math.Linear(y1, y2, progress)
        
        const particle = this.add.image(x, y, texture)
        particle.setScale(0.5)
        particle.setBlendMode(Phaser.BlendModes.ADD)
        particle.setDepth(50)
        
        this.tweens.add({
          targets: particle,
          alpha: 0,
          scale: 0,
          duration: 400,
          onComplete: () => particle.destroy()
        })
      })
    }
  }
}

