/** Connection pool for RPC providers. */

import { ethers } from 'ethers';
import { getLogger } from '../common/logger';

const logger = getLogger();

export interface PoolOptions {
  minSize?: number;
  maxSize?: number;
  idleTimeout?: number;
}

export class ConnectionPool {
  private pools = new Map<string, ethers.JsonRpcProvider[]>();
  private activeConnections = new Map<string, number>();
  private minSize: number;
  private maxSize: number;

  constructor(options: PoolOptions = {}) {
    this.minSize = options.minSize || 2;
    this.maxSize = options.maxSize || 10;
    // idleTimeout can be used for future cleanup implementation
  }

  /**
   * Get or create a provider from the pool.
   */
  async acquire(rpcUrl: string, chainId: number): Promise<ethers.JsonRpcProvider> {
    const key = `${rpcUrl}:${chainId}`;
    
    if (!this.pools.has(key)) {
      this.pools.set(key, []);
      this.activeConnections.set(key, 0);
    }

    const pool = this.pools.get(key)!;
    
    // Return existing provider if available
    if (pool.length > 0) {
      const provider = pool.pop()!;
      this.activeConnections.set(key, this.activeConnections.get(key)! + 1);
      logger.debug(`Acquired provider from pool (${pool.length} remaining)`);
      return provider;
    }

    // Create new provider if under max size
    const active = this.activeConnections.get(key)!;
    if (active < this.maxSize) {
      const provider = new ethers.JsonRpcProvider(rpcUrl, chainId, {
        batchMaxCount: 1,
      });
      this.activeConnections.set(key, active + 1);
      logger.debug(`Created new provider (${active + 1}/${this.maxSize})`);
      return provider;
    }

    // Wait for a provider to become available
    logger.warning(`Pool exhausted, waiting for available provider...`);
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (pool.length > 0) {
          clearInterval(checkInterval);
          const provider = pool.pop()!;
          this.activeConnections.set(key, this.activeConnections.get(key)! + 1);
          resolve(provider);
        }
      }, 100);
    });
  }

  /**
   * Return a provider to the pool.
   */
  release(rpcUrl: string, chainId: number, provider: ethers.JsonRpcProvider): void {
    const key = `${rpcUrl}:${chainId}`;
    const pool = this.pools.get(key);
    
    if (!pool) return;

    // Return to pool if under max size
    if (pool.length < this.maxSize) {
      pool.push(provider);
      this.activeConnections.set(key, this.activeConnections.get(key)! - 1);
      logger.debug(`Released provider to pool (${pool.length} available)`);
    } else {
      // Destroy excess connections
      this.activeConnections.set(key, this.activeConnections.get(key)! - 1);
      logger.debug(`Destroyed excess provider`);
    }
  }

  /**
   * Warm up the pool by creating minimum connections.
   */
  async warmup(rpcUrl: string, chainId: number): Promise<void> {
    const key = `${rpcUrl}:${chainId}`;
    const pool = this.pools.get(key) || [];
    
    for (let i = pool.length; i < this.minSize; i++) {
      const provider = new ethers.JsonRpcProvider(rpcUrl, chainId, {
        batchMaxCount: 1,
      });
      pool.push(provider);
    }
    
    this.pools.set(key, pool);
    logger.info(`Warmed up connection pool with ${this.minSize} connections`);
  }

  /**
   * Get pool statistics.
   */
  getStats(rpcUrl: string, chainId: number) {
    const key = `${rpcUrl}:${chainId}`;
    return {
      available: this.pools.get(key)?.length || 0,
      active: this.activeConnections.get(key) || 0,
      maxSize: this.maxSize,
    };
  }
}
