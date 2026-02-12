/** Built-in metrics collection plugin. */

import type { IPlugin, PluginContext } from '../plugin-system';
import type { CurrentState } from '../../../chain-reader/types';
import type { Diff } from '../../../reconciliator/diff';
import type { VerificationResult } from '../../../core';

/**
 * Metrics collected during verification.
 */
export interface VerificationMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  contractsRead: number;
  contractsFailed: number;
  totalDrifts: number;
  driftsByContract: Record<string, number>;
  rpcCalls: number;
  cacheHits: number;
  cacheMisses: number;
  errors: string[];
}

/**
 * Plugin that collects metrics during verification.
 */
export class MetricsPlugin implements IPlugin {
  name = 'metrics';
  version = '1.0.0';
  description = 'Collects verification metrics and statistics';
  author = 'Nodrift Team';

  private metrics: VerificationMetrics | null = null;

  async onInit(context: PluginContext): Promise<void> {
    context.logger.info('Metrics plugin initialized');
  }

  async onBeforeVerification(context: PluginContext): Promise<void> {
    this.metrics = {
      sessionId: context.sessionId,
      startTime: Date.now(),
      contractsRead: 0,
      contractsFailed: 0,
      totalDrifts: 0,
      driftsByContract: {},
      rpcCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: [],
    };

    // Subscribe to events for metrics collection
    context.eventBus.on('rpc.call.completed', () => {
      if (this.metrics) this.metrics.rpcCalls++;
    });

    context.eventBus.on('cache.hit', () => {
      if (this.metrics) this.metrics.cacheHits++;
    });

    context.eventBus.on('cache.miss', () => {
      if (this.metrics) this.metrics.cacheMisses++;
    });
  }

  async onAfterContractRead(
    context: PluginContext,
    contractName: string,
    state: CurrentState
  ): Promise<void> {
    if (this.metrics) {
      this.metrics.contractsRead++;
    }
  }

  async onContractReadError(
    context: PluginContext,
    contractName: string,
    error: Error
  ): Promise<void> {
    if (this.metrics) {
      this.metrics.contractsFailed++;
      this.metrics.errors.push(`${contractName}: ${error.message}`);
    }
  }

  async onDriftDetected(
    context: PluginContext,
    contractName: string,
    diff: Diff
  ): Promise<void> {
    if (this.metrics) {
      this.metrics.totalDrifts++;
      this.metrics.driftsByContract[contractName] =
        (this.metrics.driftsByContract[contractName] || 0) + 1;
    }
  }

  async onVerificationComplete(
    context: PluginContext,
    result: VerificationResult
  ): Promise<void> {
    if (this.metrics) {
      this.metrics.endTime = Date.now();
      this.metrics.duration = this.metrics.endTime - this.metrics.startTime;

      // Log metrics summary
      context.logger.info('Verification Metrics:', {
        duration: `${this.metrics.duration}ms`,
        contractsRead: this.metrics.contractsRead,
        contractsFailed: this.metrics.contractsFailed,
        totalDrifts: this.metrics.totalDrifts,
        rpcCalls: this.metrics.rpcCalls,
        cacheHitRate: this.getCacheHitRate(),
      });
    }
  }

  /**
   * Get collected metrics.
   */
  getMetrics(): VerificationMetrics | null {
    return this.metrics;
  }

  /**
   * Get cache hit rate as percentage.
   */
  private getCacheHitRate(): string {
    if (!this.metrics) return '0%';
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    if (total === 0) return '0%';
    return `${((this.metrics.cacheHits / total) * 100).toFixed(1)}%`;
  }
}
