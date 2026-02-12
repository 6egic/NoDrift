/** RPC response caching with TTL and LRU eviction. */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
}

export interface CacheOptions {
  ttl?: number;           // Time to live in milliseconds
  maxSize?: number;       // Maximum cache entries
  enableStats?: boolean;  // Track cache statistics
}

export class RpcCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private ttl: number;
  private maxSize: number;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl || 60000; // 1 minute default
    this.maxSize = options.maxSize || 1000;
  }

  /**
   * Generate cache key from operation details.
   */
  generateKey(
    contractAddress: string,
    method: string,
    args: unknown[]
  ): string {
    const argsStr = JSON.stringify(args);
    return `${contractAddress}:${method}:${argsStr}`;
  }

  /**
   * Get cached value if available and not expired.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.value as T;
  }

  /**
   * Set cache value with LRU eviction.
   */
  set<T>(key: string, value: T): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Find oldest cache entry for LRU eviction.
   */
  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.cache.size,
    };
  }
}
