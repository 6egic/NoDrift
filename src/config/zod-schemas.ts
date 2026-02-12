/** Zod schemas for configuration validation with type inference. */

import { z } from 'zod';
import type { ABI } from '../common/types';

// State type enum
export const StateTypeSchema = z.enum([
  'owner',
  'role',
  'variable',
  'function_call',
  'storage_slot',
  'cross_contract',
  'aggregate',
  'conditional',
  'time_based',
  'comparison',
  'array_state',
  'mapping_state',
  'proxy',
]);

// Comparison operator enum
export const ComparisonOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'greater_than',
  'less_than',
  'greater_than_or_equal',
  'less_than_or_equal',
  'contains',
  'contains_all',
  'contains_any',
  'starts_with',
  'ends_with',
]);

// Metric schemas
export const MetricSeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export const MetricCategorySchema = z.enum([
  'integrity',
  'solvency',
  'liquidity',
  'risk',
  'supply',
  'governance',
]);

export const MetricConfigSchema = z.object({
  name: z.string(),
  category: MetricCategorySchema,
  severity: MetricSeveritySchema,
  description: z.string(),
});

// Network configuration schema
export const NetworkConfigSchema = z.object({
  rpc_url: z.string().min(1, 'RPC URL must be a non-empty string'),
  chain_id: z.number().int().positive('Chain ID must be a positive integer'),
});

// Conditional configuration schema
export const ConditionalConfigSchema = z.object({
  type: z.enum(['variable', 'function_call', 'storage_slot', 'cross_contract']),
  variable: z.string().optional(),
  function: z.string().optional(),
  args: z.array(z.unknown()).optional(),
  slot: z.string().optional(),
  slot_name: z.string().optional(),
  source_contract: z.string().optional(),
  source_function: z.string().optional(),
  source_args: z.array(z.unknown()).optional(),
  operator: ComparisonOperatorSchema,
  value: z.unknown().optional(),
  compare_to: z.enum(['block_timestamp', 'block_number']).optional(),
});

// Comparison source schema
export const ComparisonSourceSchema = z.object({
  type: z.enum(['variable', 'function_call', 'cross_contract', 'constant', 'aggregate']),
  variable: z.string().optional(),
  function: z.string().optional(),
  args: z.array(z.unknown()).optional(),
  source_contract: z.string().optional(),
  source_function: z.string().optional(),
  source_args: z.array(z.unknown()).optional(),
  operation: z.enum(['sum', 'average', 'count', 'min', 'max']).optional(),
  args_source: z.enum(['list', 'function']).optional(),
  args_function: z.string().optional(),
  value: z.unknown().optional(),
});

// State entry schema with comprehensive validation
export const StateEntrySchema = z.object({
  type: StateTypeSchema,
  
  // Common fields
  value: z.unknown().optional(),
  variable: z.string().optional(),
  function: z.string().optional(),
  args: z.array(z.unknown()).optional(),
  
  // Comparison options
  tolerance: z.union([z.number(), z.string()]).optional(),
  range: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
  pattern: z.union([z.string(), z.boolean()]).optional(),
  ignore_case: z.boolean().optional(),
  allow_empty: z.boolean().optional(),
  ignore_order: z.boolean().optional(),
  
  // Storage slot fields
  slot: z.string().optional(),
  slot_name: z.string().optional(),
  
  // Aggregate fields
  operation: z.enum(['sum', 'average', 'count', 'min', 'max']).optional(),
  args_source: z.enum(['list', 'function']).optional(),
  args_function: z.string().optional(),
  filter: z.object({
    field: z.string(),
    operator: ComparisonOperatorSchema,
    value: z.unknown(),
  }).optional(),
  
  // Conditional fields
  condition: ConditionalConfigSchema.optional(),
  
  // Comparison fields
  left: ComparisonSourceSchema.optional(),
  right: ComparisonSourceSchema.optional(),
  operator: ComparisonOperatorSchema.optional(),
  
  // Array/mapping fields
  check: z.string().optional(),
  key: z.unknown().optional(),
  
  // Time-based fields
  max_age_seconds: z.number().optional(),
  stale_action: z.enum(['error', 'warning']).optional(),
  time_bounds: z.object({
    min_age: z.number().optional(),
    max_age: z.number().optional(),
  }).optional(),
  
  // Cross-contract fields
  source_contract: z.string().optional(),
  source_function: z.string().optional(),
  target_contract: z.string().optional(),
  target_field: z.string().optional(),
  source_args: z.array(z.unknown()).optional(),
  
  // Proxy fields
  proxy_pattern: z.enum(['erc1967', 'eip1822', 'beacon', 'custom']).optional(),
  proxy_check: z.enum(['implementation', 'admin', 'beacon']).optional(),
  
  // Role fields
  role: z.string().optional(),
  role_name: z.string().optional(),
  members: z.array(z.string()).optional(),
  
  // ABI field
  abi: z.unknown().optional(),
  
  // Metric field
  metric: MetricConfigSchema.optional(),
  
  // Options field
  options: z.object({
    tolerance: z.union([z.number(), z.string()]).optional(),
    range: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
    pattern: z.union([z.string(), z.boolean()]).optional(),
    ignore_case: z.boolean().optional(),
    allow_empty: z.boolean().optional(),
    ignore_order: z.boolean().optional(),
    comparison: z.enum(['greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal']).optional(),
    description: z.string().optional(),
  }).optional(),
})
.refine((data) => {
  // Type-specific validations
  if (data.type === 'role') {
    return (data.role || data.role_name) && data.members;
  }
  if (data.type === 'variable') {
    return data.value !== undefined;
  }
  if (data.type === 'function_call') {
    return data.function && data.value !== undefined;
  }
  if (data.type === 'storage_slot') {
    return (data.slot || data.slot_name) && data.value !== undefined;
  }
  if (data.type === 'cross_contract') {
    return data.source_contract && data.source_function && data.target_contract;
  }
  if (data.type === 'aggregate') {
    return data.operation && data.function;
  }
  if (data.type === 'conditional') {
    return data.condition;
  }
  if (data.type === 'time_based') {
    return data.function && data.max_age_seconds !== undefined;
  }
  if (data.type === 'comparison') {
    return data.left && data.right && data.operator;
  }
  if (data.type === 'array_state') {
    return data.function && data.check;
  }
  if (data.type === 'mapping_state') {
    return data.function && data.key !== undefined;
  }
  if (data.type === 'proxy') {
    return data.proxy_pattern && data.proxy_check && data.value !== undefined;
  }
  return true;
}, {
  message: 'State entry missing required fields for its type',
});

// Preset enum
export const PresetSchema = z.enum([
  'erc20',
  'erc721',
  'erc1155',
  'erc4626',
  'diamond',
  'proxy',
  'accessControl',
]);

// ABI schema - accepts array of unknown (will be validated at runtime by ethers)
const ABISchema = z.array(z.record(z.string(), z.unknown())) as z.ZodType<ABI>;

// Contract configuration schema
export const ContractConfigSchema = z.object({
  address: z.string()
    .min(1, 'Contract address must be a non-empty string')
    .refine(
      (addr) => addr.startsWith('0x') || (addr.startsWith('${') && addr.endsWith('}')),
      'Contract address must be a valid Ethereum address (0x...) or environment variable'
    ),
  abi: z.union([
    ABISchema,
    z.string().refine(
      (str) => str.startsWith('${file:') && str.endsWith('}'),
      'ABI file reference must use format: ${file:./path.json}'
    ),
  ]).optional() as z.ZodType<ABI | string | undefined>,
  state: z.union([
    z.array(StateEntrySchema),
    z.record(z.string(), StateEntrySchema),
  ]).optional(),
  network: NetworkConfigSchema.optional(),
  template: z.string().optional(),
  preset: PresetSchema.optional(),
})
.refine((data) => {
  // Preset and template are mutually exclusive
  return !(data.preset && data.template);
}, {
  message: 'Contract cannot have both preset and template fields',
})
.refine((data) => {
  // State is optional if using preset
  return data.state || data.preset;
}, {
  message: 'Contract must have state section or use a preset',
});

// Top-level configuration schema
export const NodriftConfigSchema = z.object({
  network: NetworkConfigSchema,
  contracts: z.record(z.string(), ContractConfigSchema)
    .refine((contracts) => Object.keys(contracts).length > 0, {
      message: 'At least one contract must be defined',
    }),
  imports: z.array(z.string()).optional(),
  includes: z.array(z.string()).optional(),
  templates: z.record(z.string(), z.unknown()).optional(),
});

// Type inference from schemas
export type StateType = z.infer<typeof StateTypeSchema>;
export type ComparisonOperator = z.infer<typeof ComparisonOperatorSchema>;
export type MetricSeverity = z.infer<typeof MetricSeveritySchema>;
export type MetricCategory = z.infer<typeof MetricCategorySchema>;
export type MetricConfig = z.infer<typeof MetricConfigSchema>;
export type NetworkConfig = z.infer<typeof NetworkConfigSchema>;
export type ConditionalConfig = z.infer<typeof ConditionalConfigSchema>;
export type ComparisonSource = z.infer<typeof ComparisonSourceSchema>;
export type StateEntry = z.infer<typeof StateEntrySchema>;
export type ContractConfig = z.infer<typeof ContractConfigSchema>;
export type NodriftConfig = z.infer<typeof NodriftConfigSchema>;
