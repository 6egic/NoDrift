/** Adaptive concurrency controller. */

import { getLogger } from './logger';

const logger = getLogger();

export interface AdaptiveOptions {
  minConcurrency: number;
  maxConcurrency: number;
  targetLatency: number;
  adjustmentInterval: number;
}

export class AdaptiveConcurrency {
  private currentConcurrency: number;
  private minConcurrency: number;
  private maxConcurrency: number;
  private targetLatency: number;
  private adjustmentInterval: number;
  private latencies: number[] = [];
  private lastAdjustment = Date.now();

  constructor(options: AdaptiveOptions) {
    this.minConcurrency = options.minConcurrency;
    this.maxConcurrency = options.maxConcurrency;
    this.currentConcurrency = Math.floor((options.minConcurrency + options.maxConcurrency) / 2);
    this.targetLatency = options.targetLatency;
    this.adjustmentInterval = options.adjustmentInterval;
  }

  /**
   * Record task latency for adaptive adjustment.
   */
  recordLatency(latencyMs: number): void {
    this.latencies.push(latencyMs);
    
    // Keep only recent latencies (last 100)
    if (this.latencies.length > 100) {
      this.latencies.shift();
    }

    // Adjust concurrency if interval elapsed
    if (Date.now() - this.lastAdjustment > this.adjustmentInterval) {
      this.adjust();
      this.lastAdjustment = Date.now();
    }
  }

  /**
   * Adjust concurrency based on observed latencies.
   */
  private adjust(): void {
    if (this.latencies.length < 10) return;

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p95Latency = sorted[Math.floor(sorted.length * 0.95)];

    if (p95Latency > this.targetLatency * 1.5) {
      // Latency too high, decrease concurrency
      const newConcurrency = Math.max(
        this.minConcurrency,
        Math.floor(this.currentConcurrency * 0.8)
      );
      
      if (newConcurrency !== this.currentConcurrency) {
        logger.info(`Decreasing concurrency: ${this.currentConcurrency} → ${newConcurrency} (p95: ${p95Latency}ms)`);
        this.currentConcurrency = newConcurrency;
      }
    } else if (p95Latency < this.targetLatency * 0.5) {
      // Latency low, increase concurrency
      const newConcurrency = Math.min(
        this.maxConcurrency,
        Math.floor(this.currentConcurrency * 1.2)
      );
      
      if (newConcurrency !== this.currentConcurrency) {
        logger.info(`Increasing concurrency: ${this.currentConcurrency} → ${newConcurrency} (p95: ${p95Latency}ms)`);
        this.currentConcurrency = newConcurrency;
      }
    }

    // Clear latencies after adjustment
    this.latencies = [];
  }

  /**
   * Get current concurrency level.
   */
  getConcurrency(): number {
    return this.currentConcurrency;
  }

  /**
   * Get statistics.
   */
  getStats() {
    const avgLatency = this.latencies.length > 0
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0;

    return {
      currentConcurrency: this.currentConcurrency,
      minConcurrency: this.minConcurrency,
      maxConcurrency: this.maxConcurrency,
      averageLatency: avgLatency,
      targetLatency: this.targetLatency,
    };
  }
}
