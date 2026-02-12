/** Shared types for configuration modules - now using Zod for validation. */

// Re-export all types from zod-schemas for backward compatibility
export type {
  StateType,
  ComparisonOperator,
  MetricSeverity,
  MetricCategory,
  MetricConfig,
  NetworkConfig,
  ConditionalConfig,
  ComparisonSource,
  StateEntry,
  ContractConfig,
  NodriftConfig,
} from './zod-schemas';

// Re-export ABI type from common types
export type { ABI } from '../common/types';
