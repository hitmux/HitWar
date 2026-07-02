/**
 * Network Event Emitter
 * Simple typed event system for network events
 */

type EventCallback = (...args: unknown[]) => void;

export class NetworkEventEmitter {
  private listeners: Map<string, EventCallback[]> = new Map();

  /**
   * Register an event listener
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Register a one-time event listener
   */
  once(event: string, callback: EventCallback): () => void {
    const wrapper: EventCallback = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    return this.on(event, wrapper);
  }

  /**
   * Remove an event listener
   */
  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   */
  emit(event: string, ...args: unknown[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of [...callbacks]) {
        try {
          callback(...args);
        } catch (error) {
          console.error(`[NetworkEvent] Error in handler for "${event}":`, error);
        }
      }
    }
  }

  /**
   * Remove all listeners
   */
  removeAll(): void {
    this.listeners.clear();
  }

  /**
   * Remove all listeners for a specific event
   */
  removeAllFor(event: string): void {
    this.listeners.delete(event);
  }
}
