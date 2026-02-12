/** Priority queue for task scheduling. */

export interface PriorityItem<T> {
  value: T;
  priority: number;
}

export class PriorityQueue<T> {
  private items: PriorityItem<T>[] = [];

  /**
   * Add item to queue with priority.
   */
  enqueue(value: T, priority: number): void {
    const item: PriorityItem<T> = { value, priority };
    
    // Insert in priority order (higher priority first)
    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (priority > this.items[i].priority) {
        this.items.splice(i, 0, item);
        added = true;
        break;
      }
    }
    
    if (!added) {
      this.items.push(item);
    }
  }

  /**
   * Remove and return highest priority item.
   */
  dequeue(): T | undefined {
    const item = this.items.shift();
    return item?.value;
  }

  /**
   * Peek at highest priority item without removing.
   */
  peek(): T | undefined {
    return this.items[0]?.value;
  }

  /**
   * Get queue size.
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Check if queue is empty.
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Clear all items.
   */
  clear(): void {
    this.items = [];
  }
}
