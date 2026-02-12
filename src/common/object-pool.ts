/** Object pool for reusing expensive objects. */

export interface Poolable {
  reset(): void;
}

export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private factory: () => T;
  private maxSize: number;

  constructor(factory: () => T, maxSize: number = 100) {
    this.factory = factory;
    this.maxSize = maxSize;
  }

  /**
   * Acquire object from pool or create new one.
   */
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  /**
   * Return object to pool for reuse.
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      obj.reset();
      this.pool.push(obj);
    }
    // Otherwise let it be garbage collected
  }

  /**
   * Get pool statistics.
   */
  getStats() {
    return {
      available: this.pool.length,
      maxSize: this.maxSize,
    };
  }

  /**
   * Clear the pool.
   */
  clear(): void {
    this.pool = [];
  }
}
