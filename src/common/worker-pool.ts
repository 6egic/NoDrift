/** Worker pool for controlled parallel execution. */

import { getLogger } from './logger';

const logger = getLogger();

export interface Task<T> {
  id: string;
  priority: number;
  execute: () => Promise<T>;
  timeout?: number;
}

export interface WorkerPoolOptions {
  concurrency: number;
  timeout?: number;
  onTaskComplete?: (taskId: string, duration: number) => void;
  onTaskError?: (taskId: string, error: Error) => void;
}

export class WorkerPool<T> {
  private queue: Task<T>[] = [];
  private running = 0;
  private concurrency: number;
  private timeout: number;
  private results = new Map<string, T>();
  private errors = new Map<string, Error>();
  private onTaskComplete?: (taskId: string, duration: number) => void;
  private onTaskError?: (taskId: string, error: Error) => void;

  constructor(options: WorkerPoolOptions) {
    this.concurrency = options.concurrency;
    this.timeout = options.timeout || 30000;
    this.onTaskComplete = options.onTaskComplete;
    this.onTaskError = options.onTaskError;
  }

  /**
   * Add task to the queue.
   */
  addTask(task: Task<T>): void {
    this.queue.push(task);
    // Sort by priority (higher priority first)
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Add multiple tasks to the queue.
   */
  addTasks(tasks: Task<T>[]): void {
    for (const task of tasks) {
      this.addTask(task);
    }
  }

  /**
   * Execute all queued tasks with concurrency control.
   */
  async execute(): Promise<Map<string, T>> {
    return new Promise((resolve) => {
      const checkComplete = () => {
        if (this.queue.length === 0 && this.running === 0) {
          if (this.errors.size > 0) {
            logger.warning(`Completed with ${this.errors.size} errors`);
          }
          resolve(this.results);
        }
      };

      const runNext = () => {
        if (this.queue.length === 0 || this.running >= this.concurrency) {
          checkComplete();
          return;
        }

        const task = this.queue.shift()!;
        this.running++;

        const startTime = Date.now();
        const taskTimeout = task.timeout || this.timeout;

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Task ${task.id} timed out after ${taskTimeout}ms`));
          }, taskTimeout);
        });

        // Execute task with timeout
        Promise.race([task.execute(), timeoutPromise])
          .then((result) => {
            this.results.set(task.id, result);
            const duration = Date.now() - startTime;
            
            if (this.onTaskComplete) {
              this.onTaskComplete(task.id, duration);
            }
            
            logger.debug(`Task ${task.id} completed in ${duration}ms`);
          })
          .catch((error) => {
            this.errors.set(task.id, error);
            
            if (this.onTaskError) {
              this.onTaskError(task.id, error);
            }
            
            logger.error(`Task ${task.id} failed: ${error.message}`);
          })
          .finally(() => {
            this.running--;
            runNext();
          });

        // Start next task immediately if slots available
        if (this.running < this.concurrency) {
          runNext();
        }
      };

      // Start initial batch of workers
      for (let i = 0; i < this.concurrency; i++) {
        runNext();
      }
    });
  }

  /**
   * Get execution statistics.
   */
  getStats() {
    return {
      completed: this.results.size,
      failed: this.errors.size,
      queued: this.queue.length,
      running: this.running,
    };
  }

  /**
   * Get errors that occurred during execution.
   */
  getErrors(): Map<string, Error> {
    return this.errors;
  }
}
