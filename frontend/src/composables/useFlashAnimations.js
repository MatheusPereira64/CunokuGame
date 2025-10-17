import { ref, reactive, nextTick } from 'vue'

export function useFlashAnimations() {
  // Estado das animações
  const activeAnimations = ref(new Set())
  const animationQueue = ref([])
  const animationSettings = reactive({
    duration: 300,
    easing: 'ease-out',
    delay: 0,
    iterations: 1,
    direction: 'normal',
    fillMode: 'forwards'
  })
  
  // Configurações de animações Flash
  const flashAnimations = {
    // Animações de entrada
    fadeIn: {
      keyframes: [
        { opacity: 0, transform: 'translateY(20px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ],
      duration: 500,
      easing: 'ease-out'
    },
    
    slideInLeft: {
      keyframes: [
        { opacity: 0, transform: 'translateX(-100px)' },
        { opacity: 1, transform: 'translateX(0)' }
      ],
      duration: 400,
      easing: 'ease-out'
    },
    
    slideInRight: {
      keyframes: [
        { opacity: 0, transform: 'translateX(100px)' },
        { opacity: 1, transform: 'translateX(0)' }
      ],
      duration: 400,
      easing: 'ease-out'
    },
    
    slideInUp: {
      keyframes: [
        { opacity: 0, transform: 'translateY(100px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ],
      duration: 400,
      easing: 'ease-out'
    },
    
    slideInDown: {
      keyframes: [
        { opacity: 0, transform: 'translateY(-100px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ],
      duration: 400,
      easing: 'ease-out'
    },
    
    scaleIn: {
      keyframes: [
        { opacity: 0, transform: 'scale(0.8)' },
        { opacity: 1, transform: 'scale(1)' }
      ],
      duration: 300,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    },
    
    rotateIn: {
      keyframes: [
        { opacity: 0, transform: 'rotate(-180deg) scale(0.8)' },
        { opacity: 1, transform: 'rotate(0deg) scale(1)' }
      ],
      duration: 600,
      easing: 'ease-out'
    },
    
    flipIn: {
      keyframes: [
        { opacity: 0, transform: 'rotateY(-90deg)' },
        { opacity: 1, transform: 'rotateY(0deg)' }
      ],
      duration: 500,
      easing: 'ease-out'
    },
    
    // Animações de saída
    fadeOut: {
      keyframes: [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-20px)' }
      ],
      duration: 300,
      easing: 'ease-in'
    },
    
    slideOutLeft: {
      keyframes: [
        { opacity: 1, transform: 'translateX(0)' },
        { opacity: 0, transform: 'translateX(-100px)' }
      ],
      duration: 300,
      easing: 'ease-in'
    },
    
    slideOutRight: {
      keyframes: [
        { opacity: 1, transform: 'translateX(0)' },
        { opacity: 0, transform: 'translateX(100px)' }
      ],
      duration: 300,
      easing: 'ease-in'
    },
    
    slideOutUp: {
      keyframes: [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-100px)' }
      ],
      duration: 300,
      easing: 'ease-in'
    },
    
    slideOutDown: {
      keyframes: [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(100px)' }
      ],
      duration: 300,
      easing: 'ease-in'
    },
    
    scaleOut: {
      keyframes: [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(0.8)' }
      ],
      duration: 200,
      easing: 'ease-in'
    },
    
    // Animações de hover
    hoverScale: {
      keyframes: [
        { transform: 'scale(1)' },
        { transform: 'scale(1.05)' }
      ],
      duration: 200,
      easing: 'ease-out',
      iterations: 'infinite',
      direction: 'alternate'
    },
    
    hoverGlow: {
      keyframes: [
        { boxShadow: '0 0 5px rgba(255, 215, 0, 0.5)' },
        { boxShadow: '0 0 20px rgba(255, 215, 0, 0.8)' }
      ],
      duration: 1000,
      easing: 'ease-in-out',
      iterations: 'infinite',
      direction: 'alternate'
    },
    
    hoverRotate: {
      keyframes: [
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(5deg)' }
      ],
      duration: 300,
      easing: 'ease-out',
      iterations: 'infinite',
      direction: 'alternate'
    },
    
    // Animações de pulso
    pulse: {
      keyframes: [
        { transform: 'scale(1)' },
        { transform: 'scale(1.1)' },
        { transform: 'scale(1)' }
      ],
      duration: 1000,
      easing: 'ease-in-out',
      iterations: 'infinite'
    },
    
    pulseGlow: {
      keyframes: [
        { boxShadow: '0 0 5px rgba(255, 215, 0, 0.5)' },
        { boxShadow: '0 0 20px rgba(255, 215, 0, 1)' },
        { boxShadow: '0 0 5px rgba(255, 215, 0, 0.5)' }
      ],
      duration: 2000,
      easing: 'ease-in-out',
      iterations: 'infinite'
    },
    
    // Animações de shake
    shake: {
      keyframes: [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(0)' }
      ],
      duration: 500,
      easing: 'ease-in-out'
    },
    
    shakeVertical: {
      keyframes: [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-5px)' },
        { transform: 'translateY(5px)' },
        { transform: 'translateY(-5px)' },
        { transform: 'translateY(5px)' },
        { transform: 'translateY(0)' }
      ],
      duration: 500,
      easing: 'ease-in-out'
    },
    
    // Animações de brilho
    glow: {
      keyframes: [
        { boxShadow: '0 0 5px rgba(255, 215, 0, 0.5)' },
        { boxShadow: '0 0 20px rgba(255, 215, 0, 0.8)' },
        { boxShadow: '0 0 5px rgba(255, 215, 0, 0.5)' }
      ],
      duration: 2000,
      easing: 'ease-in-out',
      iterations: 'infinite'
    },
    
    glowPulse: {
      keyframes: [
        { boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)' },
        { boxShadow: '0 0 30px rgba(255, 215, 0, 1)' },
        { boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }
      ],
      duration: 1500,
      easing: 'ease-in-out',
      iterations: 'infinite'
    },
    
    // Animações de rotação
    rotate: {
      keyframes: [
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(360deg)' }
      ],
      duration: 1000,
      easing: 'linear',
      iterations: 'infinite'
    },
    
    rotatePulse: {
      keyframes: [
        { transform: 'rotate(0deg) scale(1)' },
        { transform: 'rotate(180deg) scale(1.1)' },
        { transform: 'rotate(360deg) scale(1)' }
      ],
      duration: 2000,
      easing: 'ease-in-out',
      iterations: 'infinite'
    },
    
    // Animações de bounce
    bounce: {
      keyframes: [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-20px)' },
        { transform: 'translateY(0)' }
      ],
      duration: 600,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      iterations: 'infinite'
    },
    
    bounceIn: {
      keyframes: [
        { opacity: 0, transform: 'scale(0.3)' },
        { opacity: 1, transform: 'scale(1.1)' },
        { opacity: 1, transform: 'scale(1)' }
      ],
      duration: 600,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    },
    
    // Animações de zoom
    zoomIn: {
      keyframes: [
        { opacity: 0, transform: 'scale(0.5)' },
        { opacity: 1, transform: 'scale(1)' }
      ],
      duration: 400,
      easing: 'ease-out'
    },
    
    zoomOut: {
      keyframes: [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(0.5)' }
      ],
      duration: 300,
      easing: 'ease-in'
    },
    
    // Animações de sweep
    sweep: {
      keyframes: [
        { transform: 'translateX(-100%)' },
        { transform: 'translateX(100%)' }
      ],
      duration: 1000,
      easing: 'ease-in-out',
      iterations: 'infinite'
    },
    
    sweepGlow: {
      keyframes: [
        { 
          transform: 'translateX(-100%)',
          boxShadow: '0 0 0 rgba(255, 215, 0, 0)'
        },
        { 
          transform: 'translateX(0%)',
          boxShadow: '0 0 20px rgba(255, 215, 0, 0.8)'
        },
        { 
          transform: 'translateX(100%)',
          boxShadow: '0 0 0 rgba(255, 215, 0, 0)'
        }
      ],
      duration: 2000,
      easing: 'ease-in-out',
      iterations: 'infinite'
    }
  }
  
  /**
   * Aplica uma animação a um elemento
   * @param {HTMLElement} element - Elemento a ser animado
   * @param {string} animationName - Nome da animação
   * @param {Object} options - Opções da animação
   */
  const animateElement = async (element, animationName, options = {}) => {
    if (!element || !flashAnimations[animationName]) {
      console.warn(`Animação não encontrada: ${animationName}`)
      return false
    }
    
    const animation = flashAnimations[animationName]
    const config = {
      ...animation,
      ...options
    }
    
    try {
      const animationId = `${animationName}_${Date.now()}_${Math.random()}`
      activeAnimations.value.add(animationId)
      
      // Aplicar keyframes
      const keyframes = config.keyframes.map(frame => ({
        ...frame,
        offset: frame.offset || (config.keyframes.indexOf(frame) / (config.keyframes.length - 1))
      }))
      
      const animationInstance = element.animate(keyframes, {
        duration: config.duration || animationSettings.duration,
        easing: config.easing || animationSettings.easing,
        delay: config.delay || animationSettings.delay,
        iterations: config.iterations || animationSettings.iterations,
        direction: config.direction || animationSettings.direction,
        fillMode: config.fillMode || animationSettings.fillMode
      })
      
      // Aguardar conclusão da animação
      await animationInstance.finished
      
      // Remover da lista de animações ativas
      activeAnimations.value.delete(animationId)
      
      return true
    } catch (error) {
      console.error(`Erro ao aplicar animação ${animationName}:`, error)
      return false
    }
  }
  
  /**
   * Aplica animação de entrada
   * @param {HTMLElement} element - Elemento a ser animado
   * @param {string} type - Tipo de animação de entrada
   * @param {Object} options - Opções da animação
   */
  const animateIn = async (element, type = 'fadeIn', options = {}) => {
    return await animateElement(element, type, options)
  }
  
  /**
   * Aplica animação de saída
   * @param {HTMLElement} element - Elemento a ser animado
   * @param {string} type - Tipo de animação de saída
   * @param {Object} options - Opções da animação
   */
  const animateOut = async (element, type = 'fadeOut', options = {}) => {
    return await animateElement(element, type, options)
  }
  
  /**
   * Aplica animação de hover
   * @param {HTMLElement} element - Elemento a ser animado
   * @param {string} type - Tipo de animação de hover
   * @param {Object} options - Opções da animação
   */
  const animateHover = async (element, type = 'hoverScale', options = {}) => {
    return await animateElement(element, type, options)
  }
  
  /**
   * Aplica animação de pulso
   * @param {HTMLElement} element - Elemento a ser animado
   * @param {Object} options - Opções da animação
   */
  const animatePulse = async (element, options = {}) => {
    return await animateElement(element, 'pulse', options)
  }
  
  /**
   * Aplica animação de shake
   * @param {HTMLElement} element - Elemento a ser animado
   * @param {Object} options - Opções da animação
   */
  const animateShake = async (element, options = {}) => {
    return await animateElement(element, 'shake', options)
  }
  
  /**
   * Aplica animação de brilho
   * @param {HTMLElement} element - Elemento a ser animado
   * @param {Object} options - Opções da animação
   */
  const animateGlow = async (element, options = {}) => {
    return await animateElement(element, 'glow', options)
  }
  
  /**
   * Aplica animação de rotação
   * @param {HTMLElement} element - Elemento a ser animado
   * @param {Object} options - Opções da animação
   */
  const animateRotate = async (element, options = {}) => {
    return await animateElement(element, 'rotate', options)
  }
  
  /**
   * Aplica animação de bounce
   * @param {HTMLElement} element - Elemento a ser animado
   * @param {Object} options - Opções da animação
   */
  const animateBounce = async (element, options = {}) => {
    return await animateElement(element, 'bounce', options)
  }
  
  /**
   * Aplica animação de zoom
   * @param {HTMLElement} element - Elemento a ser animado
   * @param {string} type - Tipo de zoom (zoomIn, zoomOut)
   * @param {Object} options - Opções da animação
   */
  const animateZoom = async (element, type = 'zoomIn', options = {}) => {
    return await animateElement(element, type, options)
  }
  
  /**
   * Aplica animação de sweep
   * @param {HTMLElement} element - Elemento a ser animado
   * @param {Object} options - Opções da animação
   */
  const animateSweep = async (element, options = {}) => {
    return await animateElement(element, 'sweep', options)
  }
  
  /**
   * Aplica sequência de animações
   * @param {HTMLElement} element - Elemento a ser animado
   * @param {Array} animations - Array de animações
   * @param {Object} options - Opções gerais
   */
  const animateSequence = async (element, animations, options = {}) => {
    if (!Array.isArray(animations) || animations.length === 0) return false
    
    const delay = options.delay || 100
    const results = []
    
    for (let i = 0; i < animations.length; i++) {
      const animation = animations[i]
      const result = await animateElement(element, animation.name, {
        ...animation.options,
        ...options
      })
      results.push(result)
      
      if (i < animations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    return results.every(result => result)
  }
  
  /**
   * Para todas as animações de um elemento
   * @param {HTMLElement} element - Elemento
   */
  const stopAnimations = (element) => {
    if (element && element.getAnimations) {
      element.getAnimations().forEach(animation => {
        animation.cancel()
      })
    }
  }
  
  /**
   * Para todas as animações ativas
   */
  const stopAllAnimations = () => {
    activeAnimations.value.clear()
    // Parar todas as animações CSS também
    document.querySelectorAll('*').forEach(element => {
      stopAnimations(element)
    })
  }
  
  /**
   * Verifica se uma animação está ativa
   * @param {string} animationId - ID da animação
   * @returns {boolean} Se a animação está ativa
   */
  const isAnimationActive = (animationId) => {
    return activeAnimations.value.has(animationId)
  }
  
  /**
   * Obtém lista de animações disponíveis
   * @returns {Array} Lista de nomes de animações
   */
  const getAvailableAnimations = () => {
    return Object.keys(flashAnimations)
  }
  
  /**
   * Obtém configuração de uma animação
   * @param {string} animationName - Nome da animação
   * @returns {Object} Configuração da animação
   */
  const getAnimationConfig = (animationName) => {
    return flashAnimations[animationName] || null
  }
  
  /**
   * Atualiza configurações globais de animação
   * @param {Object} settings - Novas configurações
   */
  const updateAnimationSettings = (settings) => {
    Object.assign(animationSettings, settings)
  }
  
  return {
    // Estado
    activeAnimations,
    animationSettings,
    
    // Métodos principais
    animateElement,
    animateIn,
    animateOut,
    animateHover,
    animatePulse,
    animateShake,
    animateGlow,
    animateRotate,
    animateBounce,
    animateZoom,
    animateSweep,
    animateSequence,
    
    // Controle
    stopAnimations,
    stopAllAnimations,
    isAnimationActive,
    
    // Utilitários
    getAvailableAnimations,
    getAnimationConfig,
    updateAnimationSettings,
    
    // Mapeamentos
    flashAnimations
  }
}
