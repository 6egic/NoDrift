/** Tests for Domain-Driven Design patterns */

import {
  Address,
  ChainId,
  Contract,
  VerificationSession,
  InMemoryVerificationSessionRepository,
} from '../ddd';
import type { CurrentState } from '../../chain-reader/index';

describe('DDD Patterns', () => {
  describe('Address Value Object', () => {
    it('should create valid address', () => {
      const address = Address.create('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
      expect(address.toString()).toBe('0x742d35cc6634c0532925a3b844bc9e7595f0beb');
    });

    it('should normalize address to lowercase', () => {
      const address = Address.create('0x742D35CC6634C0532925A3B844BC9E7595F0BEB');
      expect(address.toString()).toBe('0x742d35cc6634c0532925a3b844bc9e7595f0beb');
    });

    it('should throw on invalid address', () => {
      expect(() => Address.create('invalid')).toThrow('Invalid address');
      expect(() => Address.create('0x123')).toThrow('Invalid address');
      expect(() => Address.create('742d35Cc6634C0532925a3b844Bc9e7595f0bEb')).toThrow('Invalid address');
    });

    it('should compare addresses correctly', () => {
      const addr1 = Address.create('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
      const addr2 = Address.create('0x742D35CC6634C0532925A3B844BC9E7595F0BEB');
      const addr3 = Address.create('0x1234567890123456789012345678901234567890');

      expect(addr1.equals(addr2)).toBe(true);
      expect(addr1.equals(addr3)).toBe(false);
    });
  });

  describe('ChainId Value Object', () => {
    it('should create valid chain ID', () => {
      const chainId = ChainId.create(1);
      expect(chainId.toNumber()).toBe(1);
    });

    it('should throw on invalid chain ID', () => {
      expect(() => ChainId.create(0)).toThrow('Invalid chain ID');
      expect(() => ChainId.create(-1)).toThrow('Invalid chain ID');
    });

    it('should compare chain IDs correctly', () => {
      const chain1 = ChainId.create(1);
      const chain2 = ChainId.create(1);
      const chain3 = ChainId.create(137);

      expect(chain1.equals(chain2)).toBe(true);
      expect(chain1.equals(chain3)).toBe(false);
    });
  });

  describe('Contract Entity', () => {
    const createTestContract = (): Contract => {
      const address = Address.create('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
      const chainId = ChainId.create(1);
      const state: CurrentState = {
        owner: { value: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', type: 'address' },
        totalSupply: { value: '1000000', type: 'uint256' },
      };
      return new Contract('test-contract', address, chainId, state);
    };

    it('should create contract with identity', () => {
      const contract = createTestContract();
      expect(contract.getId()).toBe('test-contract');
    });

    it('should get contract properties', () => {
      const contract = createTestContract();
      expect(contract.getAddress().toString()).toBe('0x742d35cc6634c0532925a3b844bc9e7595f0beb');
      expect(contract.getChainId().toNumber()).toBe(1);
      expect(contract.getState()).toHaveProperty('owner');
    });

    it('should update contract state', () => {
      const contract = createTestContract();
      const newState: CurrentState = {
        owner: { value: '0x1234567890123456789012345678901234567890', type: 'address' },
      };
      
      contract.updateState(newState);
      expect(contract.getState()).toEqual(newState);
    });
  });

  describe('VerificationSession Aggregate Root', () => {
    const createTestSession = (): VerificationSession => {
      return new VerificationSession('session-123');
    };

    const createTestContract = (id: string): Contract => {
      const address = Address.create('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
      const chainId = ChainId.create(1);
      const state: CurrentState = {};
      return new Contract(id, address, chainId, state);
    };

    it('should create session with ID', () => {
      const session = createTestSession();
      expect(session.getSessionId()).toBe('session-123');
      expect(session.getStatus()).toBe('pending');
    });

    it('should add contracts to session', () => {
      const session = createTestSession();
      const contract = createTestContract('contract-1');
      
      session.addContract(contract);
      expect(session.getContracts().size).toBe(1);
      expect(session.getContracts().get('contract-1')).toBe(contract);
    });

    it('should not allow adding contracts to active session', () => {
      const session = createTestSession();
      const contract1 = createTestContract('contract-1');
      const contract2 = createTestContract('contract-2');
      
      session.addContract(contract1);
      session.start();
      
      expect(() => session.addContract(contract2)).toThrow('Cannot add contracts to active session');
    });

    it('should start session', () => {
      const session = createTestSession();
      const contract = createTestContract('contract-1');
      
      session.addContract(contract);
      session.start();
      
      expect(session.getStatus()).toBe('in_progress');
    });

    it('should not start session without contracts', () => {
      const session = createTestSession();
      expect(() => session.start()).toThrow('No contracts to verify');
    });

    it('should not start session twice', () => {
      const session = createTestSession();
      const contract = createTestContract('contract-1');
      
      session.addContract(contract);
      session.start();
      
      expect(() => session.start()).toThrow('Session already started');
    });

    it('should complete session', () => {
      const session = createTestSession();
      const contract = createTestContract('contract-1');
      
      session.addContract(contract);
      session.start();
      session.complete(new Map());
      
      expect(session.getStatus()).toBe('completed');
    });

    it('should not complete session that is not in progress', () => {
      const session = createTestSession();
      expect(() => session.complete(new Map())).toThrow('Session not in progress');
    });

    it('should track domain events', () => {
      const session = createTestSession();
      const contract = createTestContract('contract-1');
      
      session.addContract(contract);
      session.start();
      
      const events = session.getEvents();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('ContractAdded');
      expect(events[1].type).toBe('SessionStarted');
    });

    it('should clear events', () => {
      const session = createTestSession();
      const contract = createTestContract('contract-1');
      
      session.addContract(contract);
      expect(session.getEvents().length).toBeGreaterThan(0);
      
      session.clearEvents();
      expect(session.getEvents().length).toBe(0);
    });
  });

  describe('InMemoryVerificationSessionRepository', () => {
    it('should save and retrieve session', async () => {
      const repository = new InMemoryVerificationSessionRepository();
      const session = new VerificationSession('session-123');
      
      await repository.save(session);
      const retrieved = await repository.findById('session-123');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.getSessionId()).toBe('session-123');
    });

    it('should return null for non-existent session', async () => {
      const repository = new InMemoryVerificationSessionRepository();
      const retrieved = await repository.findById('non-existent');
      
      expect(retrieved).toBeNull();
    });

    it('should find all sessions', async () => {
      const repository = new InMemoryVerificationSessionRepository();
      const session1 = new VerificationSession('session-1');
      const session2 = new VerificationSession('session-2');
      
      await repository.save(session1);
      await repository.save(session2);
      
      const all = await repository.findAll();
      expect(all.length).toBe(2);
    });

    it('should clear events after saving', async () => {
      const repository = new InMemoryVerificationSessionRepository();
      const session = new VerificationSession('session-123');
      const contract = new Contract(
        'contract-1',
        Address.create('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'),
        ChainId.create(1),
        {}
      );
      
      session.addContract(contract);
      expect(session.getEvents().length).toBeGreaterThan(0);
      
      await repository.save(session);
      expect(session.getEvents().length).toBe(0);
    });
  });
});
