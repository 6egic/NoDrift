/** RPC client with retry logic and timeout handling. */

import { ethers } from 'ethers';
import { StateReadError } from '../common/exceptions';
import { getLogger } from '../common/logger';
import { getErrorMessage } from '../common/types';
import {
  DEFAULT_RPC_RETRIES,
  DEFAULT_RPC_TIMEOUT_MS,
  DEFAULT_RETRY_DELAY_MS,
} from '../common/constants';
import { RpcCache } from './rpc-cache';

const logger = getLogger();

export interface RpcClientOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  cacheTtl?: number;
  cacheSize?: number;
}

export class RpcClient {
  private provider: ethers.JsonRpcProvider;
  private retries: number;
  private retryDelay: number;
  private timeout: number;
  private cache: RpcCache;

  constructor(rpcUrl: string, chainId: number, options: RpcClientOptions = {}) {
    // Create provider with batching disabled for free tier RPC providers
    // that limit batch sizes (e.g., drpc.live free tier limits to 3 requests per batch)
    this.provider = new ethers.JsonRpcProvider(rpcUrl, chainId, {
      batchMaxCount: 1,  // Disable batching - send requests individually
    });
    this.retries = options.retries ?? DEFAULT_RPC_RETRIES;
    this.retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY_MS;
    this.timeout = options.timeout ?? DEFAULT_RPC_TIMEOUT_MS;
    
    // Initialize cache
    this.cache = new RpcCache({
      ttl: options.cacheTtl || 60000,
      maxSize: options.cacheSize || 1000,
    });
    
    logger.info(`Initializing RPC connection (chain_id: ${chainId}, retries: ${this.retries}, timeout: ${this.timeout}ms, cache enabled)`);
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Execute RPC operation with retry logic and timeout.
   * Uses exponential backoff for retries and skips retries for validation errors.
   * 
   * @param operation - Async function to execute
   * @param operationName - Name of operation for logging
   * @param contractAddress - Optional contract address for context in error messages
   * @returns Result of the operation
   * @throws {StateReadError} If all retries are exhausted
   */
  async callWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    contractAddress?: string
  ): Promise<T> {
    let lastError: unknown = null;
    
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        // Wrap operation with timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Operation timeout after ${this.timeout}ms`)), this.timeout);
        });

        const result = await Promise.race([operation(), timeoutPromise]);
        return result;
      } catch (error: unknown) {
        lastError = error;
        
        // Don't retry on certain errors (validation errors, etc.)
        const errorMessage = getErrorMessage(error);
        if (errorMessage.includes('not found') || 
            errorMessage.includes('invalid') ||
            errorMessage.includes('revert') ||
            errorMessage.includes('execution reverted')) {
          throw error;
        }

        // If this was the last attempt, throw
        if (attempt === this.retries) {
          break;
        }

        // Calculate exponential backoff delay
        const delay = this.retryDelay * Math.pow(2, attempt);
        const context = contractAddress ? ` for contract ${contractAddress.slice(0, 10)}...` : '';
        logger.warning(
          `${operationName} failed${context}, retrying in ${delay}ms (attempt ${attempt + 1}/${this.retries + 1}): ${errorMessage}`
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries exhausted
    const context = contractAddress ? ` for contract ${contractAddress}` : '';
    const finalErrorMessage = lastError ? getErrorMessage(lastError) : 'Unknown error';
    throw new StateReadError(
      `${operationName} failed after ${this.retries + 1} attempts${context}: ${finalErrorMessage}`
    );
  }

  /**
   * Execute RPC operation with caching support.
   */
  async callWithCache<T>(
    cacheKey: string,
    operation: () => Promise<T>,
    operationName: string,
    contractAddress?: string
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get<T>(cacheKey);
    if (cached !== null) {
      logger.debug(`Cache hit for ${operationName}`);
      return cached;
    }

    // Execute with retry logic
    const result = await this.callWithRetry(operation, operationName, contractAddress);
    
    // Cache the result
    this.cache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Get cache statistics.
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear cache.
   */
  clearCache(): void {
    this.cache.clear();
  }
}

