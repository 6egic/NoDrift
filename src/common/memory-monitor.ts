/** Real-time memory monitoring. */

import { getLogger } from './logger';

const logger = getLogger();

export interface MemoryThresholds {
  warning: number;  // MB
  critical: number; // MB
}

export class MemoryMonitor {
  private interval?: NodeJS.Timeout;
  private thresholds: MemoryThresholds;
  private samples: number[] = [];

  constructor(thresholds: MemoryThresholds = { warning: 400, critical: 800 }) {
    this.thresholds = thresholds;
  }

  /**
   * Start monitoring memory usage.
   */
  start(intervalMs: number = 5000): void {
    this.interval = setInterval(() => {
      this.check();
    }, intervalMs);
  }

  /**
   * Stop monitoring.
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  /**
   * Check current memory usage.
   */
  private check(): void {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;

    this.samples.push(heapUsedMB);
    if (this.samples.length > 100) {
      this.samples.shift();
    }

    if (heapUsedMB > this.thresholds.critical) {
      logger.error(`Critical memory usage: ${heapUsedMB.toFixed(2)} MB`);
      
      // Force GC if available
      if (global.gc) {
        global.gc();
      }
    } else if (heapUsedMB > this.thresholds.warning) {
      logger.warning(`High memory usage: ${heapUsedMB.toFixed(2)} MB`);
    }
  }

  /**
   * Get memory statistics.
   */
  getStats() {
    const usage = process.memoryUsage();
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length || 0;
    const max = Math.max(...this.samples, 0);

    return {
      current: {
        heapUsedMB: usage.heapUsed / 1024 / 1024,
        heapTotalMB: usage.heapTotal / 1024 / 1024,
        rssMB: usage.rss / 1024 / 1024,
        externalMB: usage.external / 1024 / 1024,
      },
      average: avg,
      peak: max,
      thresholds: this.thresholds,
    };
  }
}
