/** Domain-Driven Design patterns. */

import type { Diff } from '../reconciliator/diff';
import type { CurrentState } from '../chain-reader/index';

// Value Objects (immutable)
export class Address {
  private constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new Error(`Invalid address: ${value}`);
    }
  }

  static create(value: string): Address {
    return new Address(value.toLowerCase());
  }

  private isValid(value: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(value);
  }

  equals(other: Address): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class ChainId {
  private constructor(private readonly value: number) {
    if (value < 1) {
      throw new Error(`Invalid chain ID: ${value}`);
    }
  }

  static create(value: number): ChainId {
    return new ChainId(value);
  }

  equals(other: ChainId): boolean {
    return this.value === other.value;
  }

  toNumber(): number {
    return this.value;
  }
}

// Entity (has identity)
export class Contract {
  constructor(
    private readonly id: string,
    private address: Address,
    private chainId: ChainId,
    private state: CurrentState
  ) {}

  getId(): string {
    return this.id;
  }

  getAddress(): Address {
    return this.address;
  }

  getChainId(): ChainId {
    return this.chainId;
  }

  getState(): CurrentState {
    return this.state;
  }

  updateState(newState: CurrentState): void {
    // Business logic for state updates
    this.state = newState;
  }

  verify(expectedState: CurrentState): Diff[] {
    // Domain logic for verification
    const diffs: Diff[] = [];
    
    for (const [key, expected] of Object.entries(expectedState)) {
      const current = this.state[key];
      
      if (!current || current.value !== expected.value) {
        // Create diff (simplified)
        // In real implementation, use proper Diff class
      }
    }
    
    return diffs;
  }
}

// Aggregate Root
export class VerificationSession {
  private contracts: Map<string, Contract> = new Map();
  private events: any[] = [];
  private status: 'pending' | 'in_progress' | 'completed' | 'failed' = 'pending';

  constructor(private readonly sessionId: string) {}

  /**
   * Add contract to verification session.
   */
  addContract(contract: Contract): void {
    if (this.status !== 'pending') {
      throw new Error('Cannot add contracts to active session');
    }

    this.contracts.set(contract.getId(), contract);
    this.addEvent({
      type: 'ContractAdded',
      sessionId: this.sessionId,
      contractId: contract.getId(),
      timestamp: new Date(),
    });
  }

  /**
   * Start verification session.
   */
  start(): void {
    if (this.status !== 'pending') {
      throw new Error('Session already started');
    }

    if (this.contracts.size === 0) {
      throw new Error('No contracts to verify');
    }

    this.status = 'in_progress';
    this.addEvent({
      type: 'SessionStarted',
      sessionId: this.sessionId,
      contractCount: this.contracts.size,
      timestamp: new Date(),
    });
  }

  /**
   * Complete verification session.
   */
  complete(results: Map<string, Diff[]>): void {
    if (this.status !== 'in_progress') {
      throw new Error('Session not in progress');
    }

    this.status = 'completed';
    this.addEvent({
      type: 'SessionCompleted',
      sessionId: this.sessionId,
      results,
      timestamp: new Date(),
    });
  }

  /**
   * Get domain events.
   */
  getEvents(): any[] {
    return [...this.events];
  }

  /**
   * Clear events (after persisting).
   */
  clearEvents(): void {
    this.events = [];
  }

  private addEvent(event: any): void {
    this.events.push(event);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getStatus(): string {
    return this.status;
  }

  getContracts(): Map<string, Contract> {
    return this.contracts;
  }
}

// Repository (persistence abstraction)
export interface IVerificationSessionRepository {
  save(session: VerificationSession): Promise<void>;
  findById(sessionId: string): Promise<VerificationSession | null>;
  findAll(): Promise<VerificationSession[]>;
}

export class InMemoryVerificationSessionRepository implements IVerificationSessionRepository {
  private sessions = new Map<string, VerificationSession>();

  async save(session: VerificationSession): Promise<void> {
    // Persist domain events
    const events = session.getEvents();
    for (const event of events) {
      await this.persistEvent(event);
    }
    
    session.clearEvents();
    this.sessions.set(session.getSessionId(), session);
  }

  async findById(sessionId: string): Promise<VerificationSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async findAll(): Promise<VerificationSession[]> {
    return Array.from(this.sessions.values());
  }

  private async persistEvent(event: any): Promise<void> {
    // Persist to event store
    console.log('Persisting event:', event);
  }
}
