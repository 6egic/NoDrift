/** Integration tests for Core orchestration */

import { isOk, isErr } from '../../src/common/result-type';

describe('Core Integration Tests', () => {
  describe('Result Type Integration', () => {
    it('should work with async operations', async () => {
      const { fromPromise } = await import('../../src/common/result-type');
      
      const result = await fromPromise(Promise.resolve(42));
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    it('should handle errors in async operations', async () => {
      const { fromPromise } = await import('../../src/common/result-type');
      
      const result = await fromPromise(Promise.reject(new Error('test error')));
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('test error');
      }
    });
  });

  describe('Event Bus Integration', () => {
    it('should emit and receive events', async () => {
      const { getEventBus, resetEventBus } = await import('../../src/infrastructure/events/event-bus');
      
      resetEventBus();
      const eventBus = getEventBus();
      
      const received: any[] = [];
      eventBus.on('test-event', (event) => {
        received.push(event);
      });

      await eventBus.emit({
        type: 'test-event',
        timestamp: Date.now(),
      });

      expect(received).toHaveLength(1);
      expect(received[0].type).toBe('test-event');
      
      resetEventBus();
    });

    it('should handle multiple subscribers', async () => {
      const { getEventBus, resetEventBus } = await import('../../src/infrastructure/events/event-bus');
      
      resetEventBus();
      const eventBus = getEventBus();
      
      const received1: any[] = [];
      const received2: any[] = [];
      
      eventBus.on('test-event', (event) => { received1.push(event); });
      eventBus.on('test-event', (event) => { received2.push(event); });

      await eventBus.emit({
        type: 'test-event',
        timestamp: Date.now(),
      });

      expect(received1).toHaveLength(1);
      expect(received2).toHaveLength(1);
      
      resetEventBus();
    });
  });

  describe('DDD Patterns Integration', () => {
    it('should create and manage verification session', async () => {
      const { VerificationSession, Contract, Address, ChainId } = await import('../../src/patterns/ddd');
      
      const session = new VerificationSession('test-session');
      const contract = new Contract(
        'test-contract',
        Address.create('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'),
        ChainId.create(1),
        {}
      );

      session.addContract(contract);
      session.start();

      expect(session.getStatus()).toBe('in_progress');
      expect(session.getContracts().size).toBe(1);
    });

    it('should track domain events', async () => {
      const { VerificationSession, Contract, Address, ChainId } = await import('../../src/patterns/ddd');
      
      const session = new VerificationSession('test-session');
      const contract = new Contract(
        'test-contract',
        Address.create('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'),
        ChainId.create(1),
        {}
      );

      session.addContract(contract);
      session.start();

      const events = session.getEvents();
      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'ContractAdded')).toBe(true);
      expect(events.some(e => e.type === 'SessionStarted')).toBe(true);
    });
  });

  describe('Comparison Engine Integration', () => {
    it('should compare values with different options', async () => {
      const { compareValues } = await import('../../src/reconciliator/comparison-engine');
      
      // Exact comparison
      expect(compareValues('test', 'test')).toBe(true);
      
      // Case-insensitive
      expect(compareValues('TEST', 'test', { ignore_case: true })).toBe(true);
      
      // Pattern matching
      expect(compareValues('TOKEN-V2', 'TOKEN', { pattern: '^TOKEN.*' })).toBe(true);
      
      // Numeric tolerance
      expect(compareValues(1050, 1000, { tolerance: '10%' })).toBe(true);
    });

    it('should handle address comparison', async () => {
      const { compareValues } = await import('../../src/reconciliator/comparison-engine');
      
      const addr1 = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const addr2 = '0x742D35CC6634C0532925A3B844BC9E7595F0BEB';
      
      expect(compareValues(addr1, addr2)).toBe(true);
    });
  });

  describe('Module Integration', () => {
    it('should import all core modules without errors', async () => {
      await expect(import('../../src/common/result-type')).resolves.toBeDefined();
      await expect(import('../../src/patterns/ddd')).resolves.toBeDefined();
      await expect(import('../../src/infrastructure/events/event-bus')).resolves.toBeDefined();
      await expect(import('../../src/reconciliator/comparison-engine')).resolves.toBeDefined();
    });

    it('should have consistent exports', async () => {
      const resultModule = await import('../../src/common/result-type');
      expect(resultModule.Ok).toBeDefined();
      expect(resultModule.Err).toBeDefined();
      expect(resultModule.isOk).toBeDefined();
      expect(resultModule.isErr).toBeDefined();

      const dddModule = await import('../../src/patterns/ddd');
      expect(dddModule.Address).toBeDefined();
      expect(dddModule.ChainId).toBeDefined();
      expect(dddModule.Contract).toBeDefined();
      expect(dddModule.VerificationSession).toBeDefined();

      const eventModule = await import('../../src/infrastructure/events/event-bus');
      expect(eventModule.EventBus).toBeDefined();
      expect(eventModule.getEventBus).toBeDefined();

      const comparisonModule = await import('../../src/reconciliator/comparison-engine');
      expect(comparisonModule.compareValues).toBeDefined();
    });
  });
});
