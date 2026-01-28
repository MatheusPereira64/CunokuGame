import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  AnimationEvent, 
  AnimationOrchestratorState, 
  generateAnimationId,
  AnimationConfig,
  getAnimationDuration
} from './types';

interface UseAnimationQueueOptions {
  config?: Partial<AnimationConfig>;
  onAnimationStart?: (event: AnimationEvent) => void;
  onAnimationComplete?: (event: AnimationEvent) => void;
}

const DEFAULT_CONFIG: AnimationConfig = {
  enabled: true,
  reducedMotion: false,
  speed: 'normal',
  soundEnabled: true,
};

export function useAnimationQueue(options: UseAnimationQueueOptions = {}) {
  const { 
    config: userConfig, 
    onAnimationStart, 
    onAnimationComplete 
  } = options;

  const config: AnimationConfig = { ...DEFAULT_CONFIG, ...userConfig };
  
  const [state, setState] = useState<AnimationOrchestratorState>({
    currentAnimation: null,
    queue: [],
    isPlaying: false,
  });

  const processingRef = useRef(false);
  const queueRef = useRef<AnimationEvent[]>([]);

  // Sincroniza ref com state
  useEffect(() => {
    queueRef.current = state.queue;
  }, [state.queue]);

  // Processa próxima animação da fila
  const processNext = useCallback(() => {
    if (processingRef.current) return;
    
    const queue = queueRef.current;
    if (queue.length === 0) {
      setState(prev => ({ ...prev, currentAnimation: null, isPlaying: false }));
      return;
    }

    processingRef.current = true;
    
    // Ordena por prioridade e pega o primeiro
    const sortedQueue = [...queue].sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10));
    const nextAnimation = sortedQueue[0];
    const remainingQueue = sortedQueue.slice(1);

    setState({
      currentAnimation: nextAnimation,
      queue: remainingQueue,
      isPlaying: true,
    });

    onAnimationStart?.(nextAnimation);
    processingRef.current = false;
  }, [onAnimationStart]);

  // Adiciona animação à fila
  const enqueue = useCallback((
    event: Omit<AnimationEvent, 'id'> & { id?: string }
  ) => {
    if (!config.enabled) {
      // Se animações desabilitadas, executa callback imediatamente
      event.onComplete?.();
      return;
    }

    const fullEvent: AnimationEvent = {
      ...event,
      id: event.id ?? generateAnimationId(),
    };

    setState(prev => ({
      ...prev,
      queue: [...prev.queue, fullEvent],
    }));
  }, [config.enabled]);

  // Adiciona múltiplas animações
  const enqueueMultiple = useCallback((
    events: (Omit<AnimationEvent, 'id'> & { id?: string })[]
  ) => {
    events.forEach(event => enqueue(event));
  }, [enqueue]);

  // Completa a animação atual
  const completeCurrentAnimation = useCallback(() => {
    const current = state.currentAnimation;
    if (current) {
      onAnimationComplete?.(current);
      current.onComplete?.();
    }
    
    setState(prev => ({
      ...prev,
      currentAnimation: null,
      isPlaying: false,
    }));

    // Processa próxima após pequeno delay
    setTimeout(processNext, 50);
  }, [state.currentAnimation, onAnimationComplete, processNext]);

  // Limpa toda a fila
  const clearQueue = useCallback(() => {
    setState({
      currentAnimation: null,
      queue: [],
      isPlaying: false,
    });
  }, []);

  // Remove animação específica da fila
  const removeFromQueue = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      queue: prev.queue.filter(e => e.id !== id),
    }));
  }, []);

  // Pula animação atual
  const skipCurrent = useCallback(() => {
    const current = state.currentAnimation;
    if (current) {
      current.onComplete?.();
    }
    completeCurrentAnimation();
  }, [state.currentAnimation, completeCurrentAnimation]);

  // Efeito para iniciar processamento quando há itens na fila e não está playing
  useEffect(() => {
    if (state.queue.length > 0 && !state.isPlaying && !state.currentAnimation) {
      processNext();
    }
  }, [state.queue.length, state.isPlaying, state.currentAnimation, processNext]);

  // Calcula duração para tipo de animação
  const getDuration = useCallback((type: AnimationEvent['type']) => {
    return getAnimationDuration(type, config);
  }, [config]);

  return {
    // Estado
    currentAnimation: state.currentAnimation,
    queue: state.queue,
    isPlaying: state.isPlaying,
    queueLength: state.queue.length,
    
    // Ações
    enqueue,
    enqueueMultiple,
    completeCurrentAnimation,
    clearQueue,
    removeFromQueue,
    skipCurrent,
    
    // Helpers
    getDuration,
    config,
  };
}
