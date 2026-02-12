/** Observer pattern for verification events. */

import type { Diff } from '../reconciliator/diff';

export type VerificationEvent =
  | { type: 'contract.start'; contractName: string }
  | { type: 'contract.complete'; contractName: string; duration: number }
  | { type: 'contract.error'; contractName: string; error: Error }
  | { type: 'drift.detected'; contractName: string; diff: Diff }
  | { type: 'verification.complete'; totalContracts: number; totalDiffs: number };

export interface IVerificationObserver {
  onEvent(event: VerificationEvent): void;
}

export class VerificationEventEmitter {
  private observers: IVerificationObserver[] = [];

  /**
   * Subscribe to verification events.
   */
  subscribe(observer: IVerificationObserver): () => void {
    this.observers.push(observer);
    
    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  /**
   * Emit event to all observers.
   */
  emit(event: VerificationEvent): void {
    for (const observer of this.observers) {
      try {
        observer.onEvent(event);
      } catch (error) {
        console.error('Observer error:', error);
      }
    }
  }

  /**
   * Get observer count.
   */
  getObserverCount(): number {
    return this.observers.length;
  }

  /**
   * Clear all observers.
   */
  clearObservers(): void {
    this.observers = [];
  }
}

// Example observers
export class MetricsObserver implements IVerificationObserver {
  private metrics = new Map<string, number>();

  onEvent(event: VerificationEvent): void {
    switch (event.type) {
      case 'contract.complete':
        this.metrics.set(event.contractName, event.duration);
        break;
      case 'drift.detected':
        console.log(`Drift detected in ${event.contractName}`);
        break;
    }
  }

  getMetrics(): Map<string, number> {
    return this.metrics;
  }
}

export class LoggingObserver implements IVerificationObserver {
  constructor(private readonly logger: { info: (msg: string, ...args: unknown[]) => void }) {}

  onEvent(event: VerificationEvent): void {
    this.logger.info(`Event: ${event.type}`, event);
  }
}
