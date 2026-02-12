/** Tests for Event Bus */

import { EventBus, getEventBus, resetEventBus, type DomainEvent } from '../event-bus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.clear();
    eventBus.clearHistory();
  });

  describe('on', () => {
    it('should subscribe to event type', async () => {
      const handler = jest.fn();
      eventBus.on('test-event', handler);

      const event: DomainEvent = {
        type: 'test-event',
        timestamp: Date.now(),
      };

      await eventBus.emit(event);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should allow multiple handlers for same event', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);

      const event: DomainEvent = {
        type: 'test-event',
        timestamp: Date.now(),
      };

      await eventBus.emit(event);
      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    it('should return subscription that can be unsubscribed', async () => {
      const handler = jest.fn();
      const subscription = eventBus.on('test-event', handler);

      const event: DomainEvent = {
        type: 'test-event',
        timestamp: Date.now(),
      };

      await eventBus.emit(event);
      expect(handler).toHaveBeenCalledTimes(1);

      subscription.unsubscribe();
      await eventBus.emit(event);
      expect(handler).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  describe('onAny', () => {
    it('should subscribe to all events', async () => {
      const handler = jest.fn();
      eventBus.onAny(handler);

      const event1: DomainEvent = { type: 'event-1', timestamp: Date.now() };
      const event2: DomainEvent = { type: 'event-2', timestamp: Date.now() };

      await eventBus.emit(event1);
      await eventBus.emit(event2);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith(event1);
      expect(handler).toHaveBeenCalledWith(event2);
    });
  });

  describe('onMany', () => {
    it('should subscribe to multiple event types', async () => {
      const handler = jest.fn();
      eventBus.onMany(['event-1', 'event-2'], handler);

      const event1: DomainEvent = { type: 'event-1', timestamp: Date.now() };
      const event2: DomainEvent = { type: 'event-2', timestamp: Date.now() };
      const event3: DomainEvent = { type: 'event-3', timestamp: Date.now() };

      await eventBus.emit(event1);
      await eventBus.emit(event2);
      await eventBus.emit(event3);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith(event1);
      expect(handler).toHaveBeenCalledWith(event2);
    });

    it('should unsubscribe from all event types', async () => {
      const handler = jest.fn();
      const subscription = eventBus.onMany(['event-1', 'event-2'], handler);

      const event1: DomainEvent = { type: 'event-1', timestamp: Date.now() };
      await eventBus.emit(event1);
      expect(handler).toHaveBeenCalledTimes(1);

      subscription.unsubscribe();
      await eventBus.emit(event1);
      expect(handler).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  describe('onPattern', () => {
    it('should subscribe to events matching pattern', async () => {
      const handler = jest.fn();
      eventBus.onPattern(/^contract\./, handler);

      const event1: DomainEvent = { type: 'contract.created', timestamp: Date.now() };
      const event2: DomainEvent = { type: 'contract.updated', timestamp: Date.now() };
      const event3: DomainEvent = { type: 'user.created', timestamp: Date.now() };

      await eventBus.emit(event1);
      await eventBus.emit(event2);
      await eventBus.emit(event3);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith(event1);
      expect(handler).toHaveBeenCalledWith(event2);
    });
  });

  describe('emit', () => {
    it('should emit event to subscribers', async () => {
      const handler = jest.fn();
      eventBus.on('test-event', handler);

      const event: DomainEvent = {
        type: 'test-event',
        timestamp: Date.now(),
        correlationId: 'test-123',
        metadata: { key: 'value' },
      };

      await eventBus.emit(event);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should add event to history', async () => {
      const event: DomainEvent = { type: 'test-event', timestamp: Date.now() };
      await eventBus.emit(event);

      const history = eventBus.getHistory();
      expect(history).toContainEqual(event);
    });

    it('should handle handler errors gracefully', async () => {
      const errorHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
      const successHandler = jest.fn();

      eventBus.on('test-event', errorHandler);
      eventBus.on('test-event', successHandler);

      const event: DomainEvent = { type: 'test-event', timestamp: Date.now() };
      
      // Should not throw
      await expect(eventBus.emit(event)).resolves.not.toThrow();
      
      // Success handler should still be called
      expect(successHandler).toHaveBeenCalled();
    });
  });

  describe('emitSync', () => {
    it('should emit event asynchronously', () => {
      const handler = jest.fn();
      eventBus.on('test-event', handler);

      const event: DomainEvent = { type: 'test-event', timestamp: Date.now() };
      eventBus.emitSync(event);

      // Handler may not be called immediately
      expect(handler).toHaveBeenCalledTimes(0);
    });
  });

  describe('emitMany', () => {
    it('should emit multiple events', async () => {
      const handler = jest.fn();
      eventBus.onAny(handler);

      const events: DomainEvent[] = [
        { type: 'event-1', timestamp: Date.now() },
        { type: 'event-2', timestamp: Date.now() },
        { type: 'event-3', timestamp: Date.now() },
      ];

      await eventBus.emitMany(events);
      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  describe('waitFor', () => {
    it('should wait for specific event', async () => {
      const event: DomainEvent = { type: 'test-event', timestamp: Date.now() };

      // Emit event after a delay
      setTimeout(() => eventBus.emit(event), 100);

      const receivedEvent = await eventBus.waitFor('test-event', 1000);
      expect(receivedEvent).toEqual(event);
    });

    it('should timeout if event not received', async () => {
      await expect(
        eventBus.waitFor('non-existent-event', 100)
      ).rejects.toThrow('Timeout waiting for event');
    });
  });

  describe('getHistory', () => {
    it('should return all events', async () => {
      const event1: DomainEvent = { type: 'event-1', timestamp: Date.now() };
      const event2: DomainEvent = { type: 'event-2', timestamp: Date.now() };

      await eventBus.emit(event1);
      await eventBus.emit(event2);

      const history = eventBus.getHistory();
      expect(history).toHaveLength(2);
      expect(history).toContainEqual(event1);
      expect(history).toContainEqual(event2);
    });

    it('should filter by event type', async () => {
      const event1: DomainEvent = { type: 'event-1', timestamp: Date.now() };
      const event2: DomainEvent = { type: 'event-2', timestamp: Date.now() };

      await eventBus.emit(event1);
      await eventBus.emit(event2);

      const history = eventBus.getHistory('event-1');
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(event1);
    });
  });

  describe('clearHistory', () => {
    it('should clear event history', async () => {
      const event: DomainEvent = { type: 'test-event', timestamp: Date.now() };
      await eventBus.emit(event);

      expect(eventBus.getHistory()).toHaveLength(1);
      
      eventBus.clearHistory();
      expect(eventBus.getHistory()).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return event bus statistics', () => {
      eventBus.on('event-1', jest.fn());
      eventBus.on('event-1', jest.fn());
      eventBus.on('event-2', jest.fn());
      eventBus.onAny(jest.fn());

      const stats = eventBus.getStats();
      expect(stats.handlerCount).toBe(3);
      expect(stats.wildcardHandlerCount).toBe(1);
      expect(stats.eventTypes).toContain('event-1');
      expect(stats.eventTypes).toContain('event-2');
    });
  });

  describe('clear', () => {
    it('should clear all handlers', async () => {
      const handler = jest.fn();
      eventBus.on('test-event', handler);
      eventBus.onAny(handler);

      eventBus.clear();

      const event: DomainEvent = { type: 'test-event', timestamp: Date.now() };
      await eventBus.emit(event);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Global Event Bus', () => {
    afterEach(() => {
      resetEventBus();
    });

    it('should return singleton instance', () => {
      const bus1 = getEventBus();
      const bus2 = getEventBus();
      expect(bus1).toBe(bus2);
    });

    it('should reset global instance', () => {
      const bus1 = getEventBus();
      resetEventBus();
      const bus2 = getEventBus();
      expect(bus1).not.toBe(bus2);
    });
  });
});
