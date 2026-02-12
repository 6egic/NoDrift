/** Circuit breaker pattern for fault tolerance. */

import { getLogger } from '../common/logger';

const logger = getLogger();

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenRequests?: number;
}

export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private threshold: number;
  private timeout: number;
  private halfOpenRequests: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.threshold = options.failureThreshold || 5;
    this.timeout = options.resetTimeout || 60000;
    this.halfOpenRequests = options.halfOpenRequests || 3;
  }

  /**
   * Execute operation with circuit breaker protection.
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        logger.info('Circuit breaker transitioning to HALF_OPEN');
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation.
   */
  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenRequests) {
        logger.info('Circuit breaker transitioning to CLOSED');
        this.state = 'CLOSED';
      }
    }
  }

  /**
   * Handle failed operation.
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      logger.error(`Circuit breaker transitioning to OPEN (${this.failureCount} failures)`);
      this.state = 'OPEN';
    }
  }

  /**
   * Get current state.
   */
  getState(): string {
    return this.state;
  }

  /**
   * Get statistics.
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Reset circuit breaker.
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}
