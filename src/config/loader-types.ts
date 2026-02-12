/** Type definitions for config loader module. */

import type { ABI } from '../common/types';
import type { ContractConfig, NodriftConfig } from './types';

export interface YAMLData {
  [key: string]: unknown;
}

export interface IncludedConfig {
  contracts?: Record<string, unknown>;
  networks?: Record<string, unknown>;
  templates?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PresetOptions {
  address: string;
  network?: {
    rpc_url?: string;
    chain_id?: number;
  };
  additionalState?: Record<string, unknown>;
  implementationAddress?: string;
  roles?: string[];
  facets?: string[];
  facetSelectors?: Record<string, string[]>;
}

export interface ProcessedContractConfig extends Omit<ContractConfig, 'abi'> {
  abi: ABI;
}

export interface ProcessedConfig extends Omit<NodriftConfig, 'contracts'> {
  contracts: Record<string, ProcessedContractConfig>;
}
