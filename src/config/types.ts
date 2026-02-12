/** Shared types for configuration modules. */

import type { ABI } from '../common/types';

export type StateType = 
  | 'owner' 
  | 'role' 
  | 'variable' 
  | 'function_call'
  | 'storage_slot'
  | 'cross_contract'
  | 'aggregate'
  | 'conditional'
  | 'time_based'
  | 'comparison'
  | 'array_state'
  | 'mapping_state'
  | 'proxy';

export interface NetworkConfig {
  rpc_url: string;
  chain_id: number;
}

export type ComparisonOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'greater_than' 
  | 'less_than' 
  | 'greater_than_or_equal' 
  | 'less_than_or_equal'
  | 'contains'
  | 'contains_all'
  | 'contains_any'
  | 'starts_with'
  | 'ends_with';

export type MetricSeverity = 'critical' | 'high' | 'medium' | 'low';
export type MetricCategory = 'integrity' | 'solvency' | 'liquidity' | 'risk' | 'supply' | 'governance';

export interface MetricConfig {
  name: string;
  category: MetricCategory;
  severity: MetricSeverity;
  description: string;
}

export interface ConditionalConfig {
  type: 'variable' | 'function_call' | 'storage_slot' | 'cross_contract';
  variable?: string;
  function?: string;
  args?: unknown[];
  slot?: string;
  slot_name?: string;
  source_contract?: string;
  source_function?: string;
  source_args?: unknown[];
  operator: ComparisonOperator;
  value?: unknown;
  compare_to?: 'block_timestamp' | 'block_number';
}

export interface ComparisonSource {
  type: 'variable' | 'function_call' | 'cross_contract' | 'constant' | 'aggregate';
  variable?: string;
  function?: string;
  args?: unknown[];
  source_contract?: string;
  source_function?: string;
  source_args?: unknown[];
  operation?: 'sum' | 'average' | 'count' | 'min' | 'max';
  args_source?: 'list' | 'function';
  args_function?: string;
  value?: unknown;
}

export interface StateEntry {
  type: StateType;
  
  // Common fields
  value?: unknown;
  variable?: string;
  function?: string;
  args?: unknown[];
  
  // Comparison options
  tolerance?: number | string;  // e.g., 0.01 (1%), "1%" for percentage, or absolute value
  range?: { min?: number; max?: number };  // Acceptable range
  pattern?: string | boolean;  // Regex pattern for string matching (or true to enable)
  ignore_case?: boolean;  // Case-insensitive string comparison
  allow_empty?: boolean;  // Allow empty arrays/strings even if value is specified
  ignore_order?: boolean;  // For arrays, ignore order
  
  // Storage slot fields
  slot?: string;  // Storage slot (hex)
  slot_name?: string;  // Named storage slot (common patterns)
  
  // Aggregate fields
  operation?: 'sum' | 'average' | 'count' | 'min' | 'max';
  args_source?: 'list' | 'function';
  args_function?: string;
  filter?: {
    field: string;
    operator: ComparisonOperator;
    value: unknown;
  };
  
  // Conditional fields
  condition?: ConditionalConfig;
  
  // Comparison fields
  left?: ComparisonSource;
  right?: ComparisonSource;
  operator?: ComparisonOperator;
  
  // Array/mapping fields
  check?: string;  // For array_state: "length", "contains", "contains_all", "contains_any"
  key?: unknown;  // For mapping_state: the key to check
  
  // Time-based fields
  max_age_seconds?: number;
  stale_action?: 'error' | 'warning';
  time_bounds?: {
    min_age?: number;
    max_age?: number;
  };
  
  // Cross-contract fields
  source_contract?: string;
  target_contract?: string;
  target_field?: string;
  source_args?: unknown[];
  
  // Proxy fields
  proxy_pattern?: 'erc1967' | 'eip1822' | 'beacon' | 'custom';
  proxy_check?: 'implementation' | 'admin' | 'beacon';
  
  
  // Role fields (existing)
  role?: string;
  role_name?: string;
  members?: string[];
  
  // ABI field
  abi?: unknown;
  
  // Metric field
  metric?: MetricConfig;
  
  // Options field (for comparison options)
  options?: {
    tolerance?: number | string;
    range?: { min?: number; max?: number };
    pattern?: string | boolean;
    ignore_case?: boolean;
    allow_empty?: boolean;
    ignore_order?: boolean;
    comparison?: 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal';
    description?: string;
  };
}

export interface ContractConfig {
  address: string;
  abi?: ABI | string;  // Array or file reference string (${file:./path.json})
  state: StateEntry[] | Record<string, StateEntry>;  // Support both array and object formats
  network?: NetworkConfig;  // Optional: override global network for this contract
  template?: string;  // Optional: YAML template name to use
  preset?: string;  // Optional: TypeScript preset name to use (erc20, erc721, erc1155, erc4626, diamond, proxy, accessControl)
}

export interface NodriftConfig {
  network: NetworkConfig;
  contracts: Record<string, ContractConfig>;
  imports?: string[];  // Optional: list of config files to import
  includes?: string[];  // Optional: alias for imports
  templates?: Record<string, unknown>;  // Optional: contract templates
}
