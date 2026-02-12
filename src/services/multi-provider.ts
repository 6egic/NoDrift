/** Multi-provider with automatic fallback. */

import { ethers } from 'ethers';
import { getLogger } from '../common/logger';

const logger = getLogger();

export interface ProviderConfig {
  url: string;
  priority: number;
  weight: number;
}

export class MultiProvider {
  private providers: Map<string, ethers.JsonRpcProvider>;
  private healthStatus: Map<string, boolean>;
  private failureCount: Map<string, number>;
  private configs: ProviderConfig[];

  constructor(configs: ProviderConfig[], chainId: number) {
    this.configs = configs.sort((a, b) => a.priority - b.priority);
    this.providers = new Map();
    this.healthStatus = new Map();
    this.failureCount = new Map();

    // Initialize providers
    for (const config of configs) {
      const provider = new ethers.JsonRpcProvider(config.url, chainId, {
        batchMaxCount: 1,
      });
      this.providers.set(config.url, provider);
      this.healthStatus.set(config.url, true);
      this.failureCount.set(config.url, 0);
    }
  }

  /**
   * Get the best available provider based on health and priority.
   */
  getProvider(): ethers.JsonRpcProvider {
    // Try providers in priority order
    for (const config of this.configs) {
      if (this.healthStatus.get(config.url)) {
        return this.providers.get(config.url)!;
      }
    }

    // All providers unhealthy, return highest priority
    logger.warning('All providers unhealthy, using fallback');
    return this.providers.get(this.configs[0].url)!;
  }

  /**
   * Execute operation with automatic fallback.
   */
  async executeWithFallback<T>(
    operation: (provider: ethers.JsonRpcProvider) => Promise<T>
  ): Promise<T> {
    const errors: Error[] = [];

    for (const config of this.configs) {
      if (!this.healthStatus.get(config.url)) {
        continue;
      }

      try {
        const provider = this.providers.get(config.url)!;
        const result = await operation(provider);
        
        // Reset failure count on success
        this.failureCount.set(config.url, 0);
        
        return result;
      } catch (error) {
        logger.warning(`Provider ${config.url} failed: ${error}`);
        errors.push(error as Error);
        
        // Increment failure count
        const failures = this.failureCount.get(config.url)! + 1;
        this.failureCount.set(config.url, failures);
        
        // Mark as unhealthy after 3 failures
        if (failures >= 3) {
          this.healthStatus.set(config.url, false);
          logger.error(`Provider ${config.url} marked as unhealthy`);
          
          // Schedule health check
          this.scheduleHealthCheck(config.url);
        }
      }
    }

    throw new Error(`All providers failed: ${errors.map(e => e.message).join(', ')}`);
  }

  /**
   * Schedule periodic health check for unhealthy provider.
   */
  private scheduleHealthCheck(url: string): void {
    setTimeout(async () => {
      try {
        const provider = this.providers.get(url)!;
        await provider.getBlockNumber();
        
        // Provider is healthy again
        this.healthStatus.set(url, true);
        this.failureCount.set(url, 0);
        logger.info(`Provider ${url} recovered`);
      } catch {
        // Still unhealthy, schedule another check
        this.scheduleHealthCheck(url);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get health status of all providers.
   */
  getHealthStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [url, healthy] of this.healthStatus.entries()) {
      status[url] = healthy;
    }
    return status;
  }
}
