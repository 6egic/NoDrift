/** Backpressure controller for queue management. */

import { getLogger } from './logger';

const logger = getLogger();

export interface BackpressureOptions {
  highWaterMark: number;
  lowWaterMark: number;
  onPressure?: () => void;
  onRelief?: () => void;
}

export class BackpressureController {
  private queueSize = 0;
  private highWaterMark: number;
  private lowWaterMark: number;
  private isPressured = false;
  private onPressure?: () => void;
  private onRelief?: () => void;

  constructor(options: BackpressureOptions) {
    this.highWaterMark = options.highWaterMark;
    this.lowWaterMark = options.lowWaterMark;
    this.onPressure = options.onPressure;
    this.onRelief = options.onRelief;
  }

  /**
   * Increment queue size and check for backpressure.
   */
  increment(): void {
    this.queueSize++;
    
    if (!this.isPressured && this.queueSize >= this.highWaterMark) {
      this.isPressured = true;
      logger.warning(`Backpressure activated (queue size: ${this.queueSize})`);
      
      if (this.onPressure) {
        this.onPressure();
      }
    }
  }

  /**
   * Decrement queue size and check for relief.
   */
  decrement(): void {
    this.queueSize = Math.max(0, this.queueSize - 1);
    
    if (this.isPressured && this.queueSize <= this.lowWaterMark) {
      this.isPressured = false;
      logger.info(`Backpressure relieved (queue size: ${this.queueSize})`);
      
      if (this.onRelief) {
        this.onRelief();
      }
    }
  }

  /**
   * Check if currently under backpressure.
   */
  isUnderPressure(): boolean {
    return this.isPressured;
  }

  /**
   * Get current queue size.
   */
  getQueueSize(): number {
    return this.queueSize;
  }

  /**
   * Wait for backpressure to be relieved.
   */
  async waitForRelief(): Promise<void> {
    if (!this.isPressured) return;

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isPressured) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }
}
