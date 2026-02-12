/** Event Sourcing implementation for verification history. */

import type { Diff } from '../reconciliator/diff';

// Domain Events
export type DomainEvent =
  | { type: 'VerificationStarted'; timestamp: Date; contractName: string; chainId: number }
  | { type: 'StateRead'; timestamp: Date; contractName: string; stateKey: string; value: any }
  | { type: 'DriftDetected'; timestamp: Date; contractName: string; diff: Diff }
  | { type: 'VerificationCompleted'; timestamp: Date; contractName: string; duration: number }
  | { type: 'VerificationFailed'; timestamp: Date; contractName: string; error: Error };

// Event Store
export class EventStore {
  private events: DomainEvent[] = [];
  private snapshots = new Map<string, any>();
  private snapshotInterval = 100; // Snapshot every 100 events

  /**
   * Append event to store.
   */
  append(event: DomainEvent): void {
    this.events.push(event);
    
    // Create snapshot periodically
    if (this.events.length % this.snapshotInterval === 0) {
      this.createSnapshot();
    }
  }

  /**
   * Get all events for an aggregate.
   */
  getEvents(aggregateId: string, fromVersion?: number): DomainEvent[] {
    return this.events.filter((event, index) => {
      if ('contractName' in event && event.contractName === aggregateId) {
        return fromVersion === undefined || index >= fromVersion;
      }
      return false;
    });
  }

  /**
   * Replay events to rebuild state.
   */
  replay(aggregateId: string): any {
    // Start from snapshot if available
    const snapshot = this.snapshots.get(aggregateId);
    const startVersion = snapshot?.version || 0;
    
    const events = this.getEvents(aggregateId, startVersion);
    let state = snapshot?.state || {};

    // Apply events
    for (const event of events) {
      state = this.applyEvent(state, event);
    }

    return state;
  }

  /**
   * Apply event to state.
   */
  private applyEvent(state: any, event: DomainEvent): any {
    switch (event.type) {
      case 'VerificationStarted':
        return {
          ...state,
          status: 'in_progress',
          startTime: event.timestamp,
        };
      
      case 'StateRead':
        return {
          ...state,
          states: {
            ...state.states,
            [event.stateKey]: event.value,
          },
        };
      
      case 'DriftDetected':
        return {
          ...state,
          drifts: [...(state.drifts || []), event.diff],
        };
      
      case 'VerificationCompleted':
        return {
          ...state,
          status: 'completed',
          duration: event.duration,
          endTime: event.timestamp,
        };
      
      case 'VerificationFailed':
        return {
          ...state,
          status: 'failed',
          error: event.error,
          endTime: event.timestamp,
        };
      
      default:
        return state;
    }
  }

  /**
   * Create snapshot for performance.
   */
  private createSnapshot(): void {
    // Group events by aggregate
    const aggregates = new Map<string, DomainEvent[]>();
    
    for (const event of this.events) {
      if ('contractName' in event) {
        const id = event.contractName;
        if (!aggregates.has(id)) {
          aggregates.set(id, []);
        }
        aggregates.get(id)!.push(event);
      }
    }

    // Create snapshots
    for (const [id, events] of aggregates.entries()) {
      let state = {};
      for (const event of events) {
        state = this.applyEvent(state, event);
      }
      
      this.snapshots.set(id, {
        version: events.length,
        state,
      });
    }
  }

  /**
   * Query events by criteria.
   */
  query(predicate: (event: DomainEvent) => boolean): DomainEvent[] {
    return this.events.filter(predicate);
  }
}

// CQRS - Command Side
export class VerificationCommandHandler {
  constructor(private eventStore: EventStore) {}

  async startVerification(contractName: string, chainId: number): Promise<void> {
    this.eventStore.append({
      type: 'VerificationStarted',
      timestamp: new Date(),
      contractName,
      chainId,
    });
  }

  async recordStateRead(contractName: string, stateKey: string, value: any): Promise<void> {
    this.eventStore.append({
      type: 'StateRead',
      timestamp: new Date(),
      contractName,
      stateKey,
      value,
    });
  }

  async recordDrift(contractName: string, diff: Diff): Promise<void> {
    this.eventStore.append({
      type: 'DriftDetected',
      timestamp: new Date(),
      contractName,
      diff,
    });
  }

  async completeVerification(contractName: string, duration: number): Promise<void> {
    this.eventStore.append({
      type: 'VerificationCompleted',
      timestamp: new Date(),
      contractName,
      duration,
    });
  }
}

// CQRS - Query Side (Read Model)
export class VerificationQueryHandler {
  constructor(private eventStore: EventStore) {}

  /**
   * Get current state of contract verification.
   */
  getContractState(contractName: string): any {
    return this.eventStore.replay(contractName);
  }

  /**
   * Get verification history.
   */
  getHistory(contractName: string): DomainEvent[] {
    return this.eventStore.getEvents(contractName);
  }

  /**
   * Get all drifts detected.
   */
  getAllDrifts(): DomainEvent[] {
    return this.eventStore.query(event => event.type === 'DriftDetected');
  }

  /**
   * Get verification statistics.
   */
  getStatistics(): {
    total: number;
    completed: number;
    failed: number;
    averageDuration: number;
  } {
    const completed = this.eventStore.query(e => e.type === 'VerificationCompleted');
    const failed = this.eventStore.query(e => e.type === 'VerificationFailed');
    
    const durations = completed
      .filter((e): e is Extract<DomainEvent, { type: 'VerificationCompleted' }> => 
        e.type === 'VerificationCompleted')
      .map(e => e.duration);
    
    return {
      total: completed.length + failed.length,
      completed: completed.length,
      failed: failed.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
    };
  }
}
