/**
 * Utilitários de performance
 */

/**
 * Pool de objetos para reutilização
 * Evita criação/destruição constante de objetos
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;

  constructor(createFn: () => T, resetFn?: (obj: T) => void, initialSize: number = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;

    // Pré-cria objetos
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  /**
   * Obtém objeto do pool ou cria novo
   */
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  /**
   * Retorna objeto ao pool
   */
  release(obj: T): void {
    if (this.resetFn) {
      this.resetFn(obj);
    }
    this.pool.push(obj);
  }

  /**
   * Limpa o pool
   */
  clear(): void {
    this.pool = [];
  }

  /**
   * Retorna tamanho do pool
   */
  size(): number {
    return this.pool.length;
  }
}

/**
 * Cache simples com TTL (Time To Live)
 */
export class TTLCache<K, V> {
  private cache: Map<K, { value: V; expires: number }> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL: number = 60000) {
    // TTL padrão: 60 segundos
    this.defaultTTL = defaultTTL;
  }

  /**
   * Obtém valor do cache
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Define valor no cache
   */
  set(key: K, value: V, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expires });
  }

  /**
   * Remove valor do cache
   */
  delete(key: K): void {
    this.cache.delete(key);
  }

  /**
   * Limpa cache expirado
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * Debounce function
 * Executa função apenas após delay sem novas chamadas
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

/**
 * Throttle function
 * Limita execução de função a uma vez por período
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

