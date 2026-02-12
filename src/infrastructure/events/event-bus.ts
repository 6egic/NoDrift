/** Event bus for domain events and cross-cutting concerns. */

import { getLogger } from '../../common/logger';

const logger = getLogger();

/**
 * Base domain event interface.
 */
export interface DomainEvent {
  type: string;
  timestamp: number;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Event handler function type.
 */
export type EventHandler<T extends DomainEvent = DomainEvent> = (
  event: T
) => void | Promise<void>;

/**
 * Event subscription.
 */
export interface EventSubscription {
  unsubscribe(): void;
}

/**
 * Event bus for publishing and subscribing to domain events.
 */
export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private wildcardHandlers = new Set<EventHandler>();
  private eventHistory: DomainEvent[] = [];
  private maxHistorySize = 1000;

  /**
   * Subscribe to a specific event type.
   */
  on<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): EventSubscription {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType)!.add(handler as EventHandler);

    return {
      unsubscribe: () => {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
          handlers.delete(handler as EventHandler);
          if (handlers.size === 0) {
            this.handlers.delete(eventType);
          }
        }
      },
    };
  }

  /**
   * Subscribe to all events (wildcard).
   */
  onAny(handler: EventHandler): EventSubscription {
    this.wildcardHandlers.add(handler);

    return {
      unsubscribe: () => {
        this.wildcardHandlers.delete(handler);
      },
    };
  }

  /**
   * Subscribe to multiple event types.
   */
  onMany(eventTypes: string[], handler: EventHandler): EventSubscription {
    const subscriptions = eventTypes.map(type => this.on(type, handler));

    return {
      unsubscribe: () => {
        subscriptions.forEach(sub => sub.unsubscribe());
      },
    };
  }

  /**
   * Subscribe to events matching a pattern.
   */
  onPattern(pattern: RegExp, handler: EventHandler): EventSubscription {
    const patternHandler: EventHandler = (event) => {
      if (pattern.test(event.type)) {
        handler(event);
      }
    };

    this.wildcardHandlers.add(patternHandler);

    return {
      unsubscribe: () => {
        this.wildcardHandlers.delete(patternHandler);
      },
    };
  }

  /**
   * Publish an event to all subscribers.
   */
  async emit<T extends DomainEvent>(event: T): Promise<void> {
    // Add to history
    this.addToHistory(event);

    // Log event
    logger.debug(`Event emitted: ${event.type}`, {
      correlationId: event.correlationId,
      timestamp: event.timestamp,
    });

    // Get handlers for this event type
    const handlers = this.handlers.get(event.type) || new Set();
    const allHandlers = [...handlers, ...this.wildcardHandlers];

    // Execute all handlers
    const promises = allHandlers.map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        logger.error(`Error in event handler for ${event.type}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Publish an event synchronously (fire and forget).
   */
  emitSync<T extends DomainEvent>(event: T): void {
    this.emit(event).catch(error => {
      logger.error(`Error emitting event ${event.type}:`, error);
    });
  }

  /**
   * Publish multiple events.
   */
  async emitMany(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map(event => this.emit(event)));
  }

  /**
   * Wait for a specific event.
   */
  waitFor<T extends DomainEvent>(
    eventType: string,
    timeout?: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;

      const subscription = this.on<T>(eventType, (event) => {
        if (timeoutId) clearTimeout(timeoutId);
        subscription.unsubscribe();
        resolve(event);
      });

      if (timeout) {
        timeoutId = setTimeout(() => {
          subscription.unsubscribe();
          reject(new Error(`Timeout waiting for event: ${eventType}`));
        }, timeout);
      }
    });
  }

  /**
   * Get event history.
   */
  getHistory(eventType?: string): DomainEvent[] {
    if (eventType) {
      return this.eventHistory.filter(e => e.type === eventType);
    }
    return [...this.eventHistory];
  }

  /**
   * Clear event history.
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get statistics about event bus.
   */
  getStats() {
    return {
      handlerCount: Array.from(this.handlers.values()).reduce(
        (sum, set) => sum + set.size,
        0
      ),
      wildcardHandlerCount: this.wildcardHandlers.size,
      eventTypes: Array.from(this.handlers.keys()),
      historySize: this.eventHistory.length,
    };
  }

  /**
   * Clear all handlers.
   */
  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
  }

  private addToHistory(event: DomainEvent): void {
    this.eventHistory.push(event);

    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }
}

/**
 * Global event bus instance.
 */
let globalEventBus: EventBus | null = null;

/**
 * Get or create global event bus.
 */
export function getEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
}

/**
 * Reset global event bus (useful for testing).
 */
export function resetEventBus(): void {
  globalEventBus = null;
}
