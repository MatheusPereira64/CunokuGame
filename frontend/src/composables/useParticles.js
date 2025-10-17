import { ref, reactive, onMounted, onUnmounted } from 'vue'

// Estado global das partículas
const particleState = reactive({
  particles: [],
  maxParticles: 100,
  isRunning: false,
  canvas: null,
  ctx: null,
  animationId: null
})

export function useParticles() {
  const isInitialized = ref(false)
  const container = ref(null)

  // Classe de partícula
  class Particle {
    constructor(x, y, options = {}) {
      this.x = x
      this.y = y
      this.vx = options.vx || (Math.random() - 0.5) * 4
      this.vy = options.vy || (Math.random() - 0.5) * 4
      this.life = options.life || 1.0
      this.maxLife = options.maxLife || 1.0
      this.size = options.size || Math.random() * 4 + 2
      this.color = options.color || '#D4AF37'
      this.alpha = options.alpha || 1.0
      this.gravity = options.gravity || 0.1
      this.friction = options.friction || 0.98
      this.bounce = options.bounce || 0.8
      this.shape = options.shape || 'circle' // circle, square, star
      this.rotation = options.rotation || 0
      this.rotationSpeed = options.rotationSpeed || (Math.random() - 0.5) * 0.2
    }

    update() {
      // Aplicar física
      this.vy += this.gravity
      this.vx *= this.friction
      this.vy *= this.friction
      
      // Atualizar posição
      this.x += this.vx
      this.y += this.vy
      
      // Atualizar rotação
      this.rotation += this.rotationSpeed
      
      // Atualizar vida
      this.life -= 0.016 // ~60fps
      this.alpha = this.life / this.maxLife
      
      // Bounce nas bordas (opcional)
      if (this.bounce > 0) {
        if (this.x < 0 || this.x > particleState.canvas.width) {
          this.vx *= -this.bounce
          this.x = Math.max(0, Math.min(particleState.canvas.width, this.x))
        }
        if (this.y < 0 || this.y > particleState.canvas.height) {
          this.vy *= -this.bounce
          this.y = Math.max(0, Math.min(particleState.canvas.height, this.y))
        }
      }
    }

    draw(ctx) {
      if (this.alpha <= 0) return

      ctx.save()
      ctx.globalAlpha = this.alpha
      ctx.fillStyle = this.color
      ctx.translate(this.x, this.y)
      ctx.rotate(this.rotation)

      switch (this.shape) {
        case 'circle':
          ctx.beginPath()
          ctx.arc(0, 0, this.size, 0, Math.PI * 2)
          ctx.fill()
          break
        case 'square':
          ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2)
          break
        case 'star':
          this.drawStar(ctx, 0, 0, this.size, this.size * 0.5, 5)
          break
      }

      ctx.restore()
    }

    drawStar(ctx, x, y, outerRadius, innerRadius, points) {
      const angle = Math.PI / points
      ctx.beginPath()
      
      for (let i = 0; i < 2 * points; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius
        const currentAngle = i * angle
        const px = x + Math.cos(currentAngle) * radius
        const py = y + Math.sin(currentAngle) * radius
        
        if (i === 0) {
          ctx.moveTo(px, py)
        } else {
          ctx.lineTo(px, py)
        }
      }
      
      ctx.closePath()
      ctx.fill()
    }

    isDead() {
      return this.life <= 0
    }
  }

  // Inicializar canvas
  const initCanvas = (element) => {
    if (!element) return

    container.value = element
    particleState.canvas = document.createElement('canvas')
    particleState.ctx = particleState.canvas.getContext('2d')
    
    // Configurar canvas
    particleState.canvas.style.position = 'absolute'
    particleState.canvas.style.top = '0'
    particleState.canvas.style.left = '0'
    particleState.canvas.style.pointerEvents = 'none'
    particleState.canvas.style.zIndex = '1000'
    
    // Adicionar ao container
    element.appendChild(particleState.canvas)
    
    // Configurar tamanho
    resizeCanvas()
    
    // Adicionar listener de resize
    window.addEventListener('resize', resizeCanvas)
    
    isInitialized.value = true
  }

  // Redimensionar canvas
  const resizeCanvas = () => {
    if (!particleState.canvas || !container.value) return
    
    const rect = container.value.getBoundingClientRect()
    particleState.canvas.width = rect.width
    particleState.canvas.height = rect.height
  }

  // Loop de animação
  const animate = () => {
    if (!particleState.isRunning || !particleState.ctx) return

    // Limpar canvas
    particleState.ctx.clearRect(0, 0, particleState.canvas.width, particleState.canvas.height)

    // Atualizar e desenhar partículas
    for (let i = particleState.particles.length - 1; i >= 0; i--) {
      const particle = particleState.particles[i]
      particle.update()
      particle.draw(particleState.ctx)

      // Remover partículas mortas
      if (particle.isDead()) {
        particleState.particles.splice(i, 1)
      }
    }

    particleState.animationId = requestAnimationFrame(animate)
  }

  // Iniciar sistema
  const start = () => {
    if (!isInitialized.value) return
    
    particleState.isRunning = true
    animate()
  }

  // Parar sistema
  const stop = () => {
    particleState.isRunning = false
    if (particleState.animationId) {
      cancelAnimationFrame(particleState.animationId)
      particleState.animationId = null
    }
  }

  // Limpar todas as partículas
  const clear = () => {
    particleState.particles = []
  }

  // Adicionar partícula
  const addParticle = (x, y, options = {}) => {
    if (particleState.particles.length >= particleState.maxParticles) {
      particleState.particles.shift() // Remove a mais antiga
    }

    const particle = new Particle(x, y, options)
    particleState.particles.push(particle)
  }

  // Efeito de explosão
  const explode = (x, y, options = {}) => {
    const count = options.count || 20
    const colors = options.colors || ['#D4AF37', '#FFD700', '#DC143C', '#FFB7C5']
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const speed = options.speed || 3
      
      addParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: options.size || Math.random() * 6 + 2,
        life: options.life || 1.0,
        maxLife: options.life || 1.0,
        gravity: options.gravity || 0.1,
        friction: options.friction || 0.95,
        shape: options.shape || 'circle'
      })
    }
  }

  // Efeito de confetti
  const confetti = (x, y, options = {}) => {
    const count = options.count || 50
    const colors = options.colors || ['#D4AF37', '#FFD700', '#DC143C', '#FFB7C5', '#00A86B']
    
    for (let i = 0; i < count; i++) {
      addParticle(x, y, {
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * -8 - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 4 + 2,
        life: Math.random() * 2 + 1,
        maxLife: Math.random() * 2 + 1,
        gravity: 0.3,
        friction: 0.98,
        bounce: 0.6,
        shape: Math.random() > 0.5 ? 'square' : 'circle',
        rotationSpeed: (Math.random() - 0.5) * 0.3
      })
    }
  }

  // Efeito de faíscas
  const sparkle = (x, y, options = {}) => {
    const count = options.count || 10
    
    for (let i = 0; i < count; i++) {
      addParticle(x, y, {
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color: options.color || '#FFD700',
        size: Math.random() * 3 + 1,
        life: 0.5,
        maxLife: 0.5,
        gravity: 0,
        friction: 0.9,
        shape: 'star',
        rotationSpeed: (Math.random() - 0.5) * 0.5
      })
    }
  }

  // Efeito de fumaça
  const smoke = (x, y, options = {}) => {
    const count = options.count || 15
    
    for (let i = 0; i < count; i++) {
      addParticle(x, y, {
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * -3 - 1,
        color: options.color || 'rgba(200, 200, 200, 0.8)',
        size: Math.random() * 8 + 4,
        life: Math.random() * 3 + 2,
        maxLife: Math.random() * 3 + 2,
        gravity: -0.05,
        friction: 0.99,
        shape: 'circle'
      })
    }
  }

  // Efeito de chuva
  const rain = (options = {}) => {
    const count = options.count || 30
    const width = particleState.canvas?.width || window.innerWidth
    
    for (let i = 0; i < count; i++) {
      addParticle(
        Math.random() * width,
        -10,
        {
          vx: 0,
          vy: Math.random() * 5 + 3,
          color: options.color || 'rgba(100, 150, 255, 0.6)',
          size: Math.random() * 2 + 1,
          life: 10,
          maxLife: 10,
          gravity: 0,
          friction: 1,
          shape: 'circle'
        }
      )
    }
  }

  // Cleanup
  const cleanup = () => {
    stop()
    clear()
    
    if (particleState.canvas && container.value) {
      container.value.removeChild(particleState.canvas)
    }
    
    window.removeEventListener('resize', resizeCanvas)
    particleState.canvas = null
    particleState.ctx = null
    isInitialized.value = false
  }

  onUnmounted(() => {
    cleanup()
  })

  return {
    // Estado
    isInitialized,
    particleState: readonly(particleState),
    
    // Métodos
    initCanvas,
    start,
    stop,
    clear,
    addParticle,
    explode,
    confetti,
    sparkle,
    smoke,
    rain,
    cleanup
  }
}

// Função helper para readonly
function readonly(obj) {
  return new Proxy(obj, {
    get(target, prop) {
      return target[prop]
    },
    set() {
      console.warn('Tentativa de modificar estado readonly das partículas')
      return false
    }
  })
}
