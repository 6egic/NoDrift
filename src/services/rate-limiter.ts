/** Token bucket rate limiter for RPC requests. */

export interface RateLimiterOptions {
  requestsPerSecond: number;
  burstSize?: number;
}

export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefill: number;
  private queue: Array<() => void> = [];

  constructor(options: RateLimiterOptions) {
    this.maxTokens = options.burstSize || options.requestsPerSecond;
    this.tokens = this.maxTokens;
    this.refillRate = options.requestsPerSecond / 1000; // tokens per ms
    this.lastRefill = Date.now();
  }

  /**
   * Acquire a token, waiting if necessary.
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Wait for token to become available
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.scheduleRefill();
    });
  }

  /**
   * Refill tokens based on elapsed time.
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;

    // Process queued requests
    while (this.queue.length > 0 && this.tokens >= 1) {
      this.tokens -= 1;
      const resolve = this.queue.shift()!;
      resolve();
    }
  }

  /**
   * Schedule next refill check.
   */
  private scheduleRefill(): void {
    if (this.queue.length === 0) return;

    const timeToNextToken = (1 - this.tokens) / this.refillRate;
    setTimeout(() => {
      this.refill();
    }, Math.max(0, timeToNextToken));
  }

  /**
   * Get current token count.
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get queue size.
   */
  getQueueSize(): number {
    return this.queue.length;
  }
}
