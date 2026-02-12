/** Garbage collection manager for memory optimization. */

export class GCManager {
  private lastGC = Date.now();
  private minInterval = 10000; // 10 seconds

  /**
   * Trigger GC if available and interval elapsed.
   */
  tryCollect(): void {
    if (!global.gc) {
      return;
    }

    const now = Date.now();
    if (now - this.lastGC < this.minInterval) {
      return;
    }

    global.gc();
    this.lastGC = now;
  }

  /**
   * Force GC regardless of interval.
   */
  forceCollect(): void {
    if (global.gc) {
      global.gc();
      this.lastGC = Date.now();
    }
  }

  /**
   * Get time since last GC.
   */
  getTimeSinceLastGC(): number {
    return Date.now() - this.lastGC;
  }
}
