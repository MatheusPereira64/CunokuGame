import Phaser from 'phaser'

export default class ParticleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ParticleScene' })
  }

  preload() {
    this.createTextures()
  }

  create() {
    // Nada específico na criação
  }

  createTextures() {
    // Partícula dourada grande
    const goldBig = this.make.graphics({ x: 0, y: 0 })
    goldBig.fillStyle(0xffd700, 1)
    goldBig.fillCircle(16, 16, 16)
    goldBig.generateTexture('gold-big', 32, 32)
    goldBig.destroy()

    // Confetti
    const confetti = this.make.graphics({ x: 0, y: 0 })
    confetti.fillStyle(0xffffff, 1)
    confetti.fillRect(0, 0, 12, 6)
    confetti.generateTexture('confetti', 12, 6)
    confetti.destroy()

    // Faísca (estrela de 4 pontas)
    const spark = this.make.graphics({ x: 0, y: 0 })
    spark.fillStyle(0xffffff, 1)
    const cx = 8, cy = 8, outerR = 7, innerR = 3, points = 4
    spark.beginPath()
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerR : innerR
      const angle = (i * Math.PI / points) - Math.PI / 2
      const x = cx + radius * Math.cos(angle)
      const y = cy + radius * Math.sin(angle)
      if (i === 0) {
        spark.moveTo(x, y)
      } else {
        spark.lineTo(x, y)
      }
    }
    spark.closePath()
    spark.fillPath()
    spark.generateTexture('spark', 16, 16)
    spark.destroy()

    // Círculo de energia
    const ring = this.make.graphics({ x: 0, y: 0 })
    ring.lineStyle(4, 0xffd700, 1)
    ring.strokeCircle(50, 50, 45)
    ring.generateTexture('ring', 100, 100)
    ring.destroy()

    // Raio de luz
    const ray = this.make.graphics({ x: 0, y: 0 })
    ray.fillStyle(0xffd700, 0.6)
    ray.fillTriangle(0, 200, 20, 200, 10, 0)
    ray.generateTexture('ray', 20, 200)
    ray.destroy()
  }

  // Celebração de CUNOKU!
  playCunokuCelebration(x, y) {
    const centerX = x || this.cameras.main.centerX
    const centerY = y || this.cameras.main.centerY

    // Texto CUNOKU gigante
    const cunokuText = this.add.text(centerX, centerY, '🎴 CUNOKU! 🎴', {
      fontSize: '64px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffd700',
      stroke: '#8b0000',
      strokeThickness: 8,
      shadow: {
        color: '#000000',
        blur: 20,
        fill: true
      }
    })
    cunokuText.setOrigin(0.5)
    cunokuText.setScale(0)
    cunokuText.setDepth(300)

    // Anéis de energia expandindo
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 200, () => {
        const ring = this.add.image(centerX, centerY, 'ring')
        ring.setScale(0.5)
        ring.setAlpha(1)
        ring.setDepth(250)
        ring.setTint(i % 2 === 0 ? 0xffd700 : 0xff4500)
        
        this.tweens.add({
          targets: ring,
          scale: 5,
          alpha: 0,
          duration: 1000,
          ease: 'Sine.easeOut',
          onComplete: () => ring.destroy()
        })
      })
    }

    // Animação do texto
    this.tweens.add({
      targets: cunokuText,
      scale: 1.2,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Pulsação
        this.tweens.add({
          targets: cunokuText,
          scale: { from: 1.2, to: 1.0 },
          yoyo: true,
          repeat: 3,
          duration: 200
        })
      }
    })

    // Confetti caindo
    this.createConfetti(centerX, centerY - 200, 50)

    // Fogos de artifício
    this.time.delayedCall(300, () => {
      this.createFirework(centerX - 150, centerY - 100)
    })
    this.time.delayedCall(500, () => {
      this.createFirework(centerX + 150, centerY - 100)
    })
    this.time.delayedCall(700, () => {
      this.createFirework(centerX, centerY - 150)
    })

    // Raios de luz
    this.createLightRays(centerX, centerY)

    // Cleanup
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: cunokuText,
        alpha: 0,
        scale: 2,
        duration: 500,
        onComplete: () => cunokuText.destroy()
      })
    })
  }

  // Explosão de partículas douradas
  playGoldenBurst(x, y) {
    // Partículas grandes
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2
      const speed = 80 + Math.random() * 60
      const targetX = x + Math.cos(angle) * speed
      const targetY = y + Math.sin(angle) * speed

      const particle = this.add.image(x, y, 'gold-big')
      particle.setScale(0.3 + Math.random() * 0.4)
      particle.setAlpha(1)
      particle.setBlendMode(Phaser.BlendModes.ADD)
      particle.setDepth(200)

      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0,
        rotation: Math.random() * Math.PI * 4,
        duration: 600 + Math.random() * 400,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      })
    }

    // Faíscas
    for (let i = 0; i < 10; i++) {
      const spark = this.add.image(x, y, 'spark')
      spark.setScale(0.5)
      spark.setTint(0xffd700)
      spark.setBlendMode(Phaser.BlendModes.ADD)
      spark.setDepth(201)

      const angle = Math.random() * Math.PI * 2
      const distance = 40 + Math.random() * 60

      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        rotation: Math.random() * Math.PI * 2,
        duration: 400,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy()
      })
    }

    // Flash central
    const flash = this.add.graphics()
    flash.fillStyle(0xffffff, 0.8)
    flash.fillCircle(x, y, 30)
    flash.setDepth(199)
    flash.setBlendMode(Phaser.BlendModes.ADD)

    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 300,
      onComplete: () => flash.destroy()
    })
  }

  // Efeito de habilidade
  playAbilityEffect(abilityType, x, y) {
    const centerX = x || this.cameras.main.centerX
    const centerY = y || this.cameras.main.centerY

    const abilityConfig = {
      'own-card': {
        color: 0x00ffff,
        icon: '👁️',
        text: 'Ver Carta'
      },
      'opponent-card': {
        color: 0xff1493,
        icon: '🔍',
        text: 'Espiar'
      },
      'swap-cards': {
        color: 0x00ff00,
        icon: '🔄',
        text: 'Trocar'
      }
    }

    const config = abilityConfig[abilityType] || {
      color: 0xffd700,
      icon: '✨',
      text: 'Habilidade'
    }

    // Círculo de energia
    const energyCircle = this.add.graphics()
    energyCircle.lineStyle(4, config.color, 1)
    energyCircle.strokeCircle(centerX, centerY, 50)
    energyCircle.setAlpha(0)
    energyCircle.setDepth(250)

    this.tweens.add({
      targets: energyCircle,
      alpha: 1,
      duration: 200,
      onComplete: () => {
        this.tweens.add({
          targets: energyCircle,
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          duration: 400,
          onComplete: () => energyCircle.destroy()
        })
      }
    })

    // Ícone grande
    const iconText = this.add.text(centerX, centerY, config.icon, {
      fontSize: '64px'
    })
    iconText.setOrigin(0.5)
    iconText.setScale(0)
    iconText.setDepth(260)

    this.tweens.add({
      targets: iconText,
      scale: 1.5,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: iconText,
          alpha: 0,
          scale: 2,
          duration: 400,
          onComplete: () => iconText.destroy()
        })
      }
    })

    // Partículas coloridas
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const particle = this.add.graphics()
      particle.fillStyle(config.color, 1)
      particle.fillCircle(0, 0, 6)
      particle.setPosition(centerX, centerY)
      particle.setDepth(255)

      const distance = 80
      this.tweens.add({
        targets: particle,
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        alpha: 0,
        duration: 500,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      })
    }

    // Texto da habilidade
    const abilityText = this.add.text(centerX, centerY + 80, config.text, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    })
    abilityText.setOrigin(0.5)
    abilityText.setAlpha(0)
    abilityText.setDepth(260)

    this.tweens.add({
      targets: abilityText,
      alpha: 1,
      y: centerY + 70,
      duration: 300,
      onComplete: () => {
        this.time.delayedCall(800, () => {
          this.tweens.add({
            targets: abilityText,
            alpha: 0,
            duration: 300,
            onComplete: () => abilityText.destroy()
          })
        })
      }
    })
  }

  // Criar confetti
  createConfetti(x, y, count) {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffd700]

    for (let i = 0; i < count; i++) {
      const confetti = this.add.image(
        x + Phaser.Math.Between(-200, 200),
        y,
        'confetti'
      )
      confetti.setTint(Phaser.Utils.Array.GetRandom(colors))
      confetti.setScale(0.5 + Math.random() * 0.5)
      confetti.setDepth(280)

      // Movimento de queda
      this.tweens.add({
        targets: confetti,
        y: y + 400 + Math.random() * 200,
        x: confetti.x + Phaser.Math.Between(-100, 100),
        rotation: Math.random() * Math.PI * 4,
        duration: 2000 + Math.random() * 1000,
        ease: 'Sine.easeIn',
        onComplete: () => confetti.destroy()
      })

      // Fade out
      this.tweens.add({
        targets: confetti,
        alpha: 0,
        delay: 1500,
        duration: 500
      })
    }
  }

  // Criar fogos de artifício
  createFirework(x, y) {
    const colors = [0xffd700, 0xff4500, 0xff0000, 0x00ff00, 0x00ffff, 0xff00ff]
    const color = Phaser.Utils.Array.GetRandom(colors)

    // Flash inicial
    const flash = this.add.graphics()
    flash.fillStyle(0xffffff, 1)
    flash.fillCircle(x, y, 10)
    flash.setDepth(290)
    flash.setBlendMode(Phaser.BlendModes.ADD)

    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 100,
      onComplete: () => flash.destroy()
    })

    // Partículas do fogo de artifício
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2
      const speed = 60 + Math.random() * 80

      const particle = this.add.graphics()
      particle.fillStyle(color, 1)
      particle.fillCircle(0, 0, 4)
      particle.setPosition(x, y)
      particle.setDepth(285)
      particle.setBlendMode(Phaser.BlendModes.ADD)

      const targetX = x + Math.cos(angle) * speed
      const targetY = y + Math.sin(angle) * speed

      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY + 30, // Gravidade sutil
        alpha: 0,
        duration: 800 + Math.random() * 400,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      })
    }

    // Faíscas secundárias
    this.time.delayedCall(100, () => {
      for (let i = 0; i < 10; i++) {
        const spark = this.add.image(x, y, 'spark')
        spark.setTint(color)
        spark.setScale(0.4)
        spark.setBlendMode(Phaser.BlendModes.ADD)
        spark.setDepth(286)

        const angle = Math.random() * Math.PI * 2
        const dist = 30 + Math.random() * 50

        this.tweens.add({
          targets: spark,
          x: x + Math.cos(angle) * dist,
          y: y + Math.sin(angle) * dist + 20,
          alpha: 0,
          rotation: Math.random() * Math.PI,
          duration: 500,
          onComplete: () => spark.destroy()
        })
      }
    })
  }

  // Criar raios de luz
  createLightRays(x, y) {
    for (let i = 0; i < 8; i++) {
      const ray = this.add.image(x, y, 'ray')
      ray.setOrigin(0.5, 1)
      ray.setRotation((i / 8) * Math.PI * 2)
      ray.setAlpha(0)
      ray.setScale(0.5, 0)
      ray.setDepth(240)
      ray.setBlendMode(Phaser.BlendModes.ADD)
      ray.setTint(0xffd700)

      this.tweens.add({
        targets: ray,
        alpha: 0.6,
        scaleY: 1.5,
        duration: 500,
        delay: i * 50,
        yoyo: true,
        repeat: 1,
        onComplete: () => ray.destroy()
      })
    }
  }
}

