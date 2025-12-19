/**
 * Sistema de eventos tipado para o jogo
 * Permite que classes emitam e escutem eventos de forma type-safe
 */
export class EventEmitter<T extends Record<string, any[]>> {
  private events: Map<keyof T, Function[]>;

  constructor() {
    this.events = new Map();
  }

  /**
   * Registra um listener para um evento
   * @param event Nome do evento
   * @param callback Função a ser chamada quando o evento for emitido
   */
  on<K extends keyof T>(event: K, callback: (...args: T[K]) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  /**
   * Remove um listener de um evento
   * @param event Nome do evento
   * @param callback Função a ser removida
   */
  off<K extends keyof T>(event: K, callback: Function): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emite um evento, chamando todos os listeners registrados
   * @param event Nome do evento
   * @param args Argumentos a serem passados para os listeners
   */
  emit<K extends keyof T>(event: K, ...args: T[K]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      // Cria uma cópia para evitar problemas se callbacks forem removidos durante execução
      const callbacksCopy = [...callbacks];
      callbacksCopy.forEach((callback) => {
        callback(...args);
      });
    }
  }

  /**
   * Remove todos os listeners de um evento específico
   * @param event Nome do evento (opcional, se não fornecido remove todos)
   */
  removeAllListeners<K extends keyof T>(event?: K): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * Retorna o número de listeners registrados para um evento
   * @param event Nome do evento
   * @returns Número de listeners
   */
  listenerCount<K extends keyof T>(event: K): number {
    return this.events.get(event)?.length ?? 0;
  }
}

