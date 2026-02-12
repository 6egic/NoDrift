/** Shared types for chain reader modules. */

import type { MetricConfig } from '../config/types';

export interface CurrentState {
  [key: string]: {
    type: string;
    value?: unknown;
    expected?: unknown;
    error?: string;
    role?: string;
    // Comparison options from StateEntry
    tolerance?: number | string;
    range?: { min?: number; max?: number };
    pattern?: string | boolean;
    ignore_case?: boolean;
    ignore_order?: boolean;
    allow_empty?: boolean;
    // Metric from StateEntry
    metric?: MetricConfig;
  };
}
