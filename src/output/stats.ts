/** Statistics calculation for verification results. */

import { Diff } from '../reconciliator/diff';
import { VerificationResult } from '../core';
import type { MetricSeverity, MetricCategory } from '../config/types';

export interface MetricStats {
  bySeverity: Record<MetricSeverity, number>;
  byCategory: Record<MetricCategory, number>;
  totalWithMetrics: number;
  driftsBySeverity: Record<MetricSeverity, Diff[]>;
  driftsByCategory: Record<MetricCategory, Diff[]>;
}

export interface VerificationStats {
  totalDiffs: number;
  totalErrors: number;
  totalWarnings: number;
  totalContracts: number;
  numUpdates: number;
  numAdds: number;
  numRemoves: number;
  driftDetected: boolean;
  status: 'ok' | 'drift_detected';
  metrics?: MetricStats;
}

export interface PlanStats {
  numUpdates: number;
  numAdds: number;
  numRemoves: number;
  numErrors: number;
  numContracts: number;
}

/**
 * Calculate verification statistics from results.
 */
export function calculateStats(result: VerificationResult): VerificationStats {
  const totalDiffs = result.diffs.length;
  const totalErrors = result.diffs.filter((d: Diff) => d.action === 'error').length;
  const totalContracts = Object.keys(result.current_states).length;
  const totalWarnings = totalDiffs - totalErrors;
  
  const numUpdates = result.diffs.filter(
    (d: Diff) => d.action !== 'error' && d.action !== 'add' && d.action !== 'remove'
  ).length;
  const numAdds = result.diffs.filter((d: Diff) => d.action === 'add').length;
  const numRemoves = result.diffs.filter((d: Diff) => d.action === 'remove').length;
  
  // Calculate metric stats if any diffs have metrics
  const hasMetrics = result.diffs.some((d: Diff) => d.metric);
  const metrics = hasMetrics ? calculateMetricStats(result.diffs) : undefined;
  
  return {
    totalDiffs,
    totalErrors,
    totalWarnings,
    totalContracts,
    numUpdates,
    numAdds,
    numRemoves,
    driftDetected: totalDiffs > 0,
    status: totalDiffs > 0 ? 'drift_detected' : 'ok',
    metrics,
  };
}

/**
 * Calculate plan-specific statistics.
 */
export function calculatePlanStats(result: VerificationResult): PlanStats {
  const numUpdates = result.diffs.filter(
    (d: Diff) => d.action !== 'error' && d.action !== 'add' && d.action !== 'remove'
  ).length;
  const numAdds = result.diffs.filter((d: Diff) => d.action === 'add').length;
  const numRemoves = result.diffs.filter((d: Diff) => d.action === 'remove').length;
  const numErrors = result.diffs.filter((d: Diff) => d.action === 'error').length;
  const numContracts = Object.keys(result.current_states).length;
  
  return {
    numUpdates,
    numAdds,
    numRemoves,
    numErrors,
    numContracts,
  };
}

/**
 * Calculate metric-specific statistics from diffs.
 */
export function calculateMetricStats(diffs: Diff[]): MetricStats {
  const bySeverity: Record<MetricSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  
  const byCategory: Record<MetricCategory, number> = {
    integrity: 0,
    solvency: 0,
    liquidity: 0,
    risk: 0,
    supply: 0,
    governance: 0,
  };
  
  const driftsBySeverity: Record<MetricSeverity, Diff[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };
  
  const driftsByCategory: Record<MetricCategory, Diff[]> = {
    integrity: [],
    solvency: [],
    liquidity: [],
    risk: [],
    supply: [],
    governance: [],
  };
  
  let totalWithMetrics = 0;
  
  for (const diff of diffs) {
    if (diff.metric) {
      totalWithMetrics++;
      bySeverity[diff.metric.severity]++;
      byCategory[diff.metric.category]++;
      driftsBySeverity[diff.metric.severity].push(diff);
      driftsByCategory[diff.metric.category].push(diff);
    }
  }
  
  return {
    bySeverity,
    byCategory,
    totalWithMetrics,
    driftsBySeverity,
    driftsByCategory,
  };
}

