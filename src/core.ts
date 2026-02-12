/** Core orchestration logic for Nodrift. */

import { loadSchema, type NodriftConfig, type NetworkConfig, type ContractConfig } from './config/schema';
import { ChainReader, type CurrentState } from './chain-reader/index';
import { Reconciliator, type Diff } from './reconciliator/index';
import { ConnectionError, ConfigurationError } from './common/exceptions';
import { getLogger } from './common/logger';
import type { ABI } from './common/types';
import { getErrorMessage } from './common/types';
import {
  DEFAULT_RPC_RETRIES,
  DEFAULT_RPC_TIMEOUT_MS,
  MIN_RPC_TIMEOUT_MS,
  ENV_RPC_RETRIES,
  ENV_RPC_TIMEOUT,
} from './common/constants';

const logger = getLogger();

export interface VerificationResult {
  current_states: Record<string, CurrentState>;
  diffs: Diff[];
}

/**
 * Main Nodrift orchestrator for state verification.
 */
export class Nodrift {
  private network: NodriftConfig['network'];
  private contracts: NodriftConfig['contracts'];
  private readers: Map<string, ChainReader>;  // Cache readers per network

  /**
   * Initialize Nodrift with configuration.
   * 
   * @param config - The Nodrift configuration object
   */
  constructor(config: NodriftConfig) {
    this.network = config.network;
    this.contracts = config.contracts;
    this.readers = new Map();
  }

  /**
   * Resolve environment variables in network configuration.
   * 
   * @param network - Network configuration to resolve
   * @returns Resolved network configuration with validated RPC URL
   * @throws {ConfigurationError} If network configuration is invalid
   */
  private resolveNetworkConfig(network: NetworkConfig): NetworkConfig {
    if (!network.rpc_url || typeof network.rpc_url !== 'string') {
      throw new ConfigurationError('Network rpc_url must be a non-empty string');
    }
    
    if (!Number.isInteger(network.chain_id) || network.chain_id < 1) {
      throw new ConfigurationError(`Network chain_id must be a positive integer, got: ${network.chain_id}`);
    }
    
    let rpcUrl = network.rpc_url.trim();
    if (rpcUrl.length === 0) {
      throw new ConfigurationError('Network rpc_url cannot be empty');
    }
    
    if (rpcUrl.startsWith('${') && rpcUrl.endsWith('}')) {
      const envVar = rpcUrl.slice(2, -1).trim();
      if (envVar.length === 0) {
        throw new ConfigurationError('Environment variable name cannot be empty in rpc_url');
      }
      rpcUrl = process.env[envVar] || rpcUrl;
      if (!rpcUrl || rpcUrl.startsWith('${')) {
        throw new ConfigurationError(
          `Environment variable '${envVar}' not set (used in rpc_url)`
        );
      }
    }
    
    // Basic URL validation
    if (!rpcUrl.startsWith('http://') && !rpcUrl.startsWith('https://') && !rpcUrl.startsWith('ws://') && !rpcUrl.startsWith('wss://')) {
      throw new ConfigurationError(`Invalid RPC URL format: ${rpcUrl}. Must start with http://, https://, ws://, or wss://`);
    }
    
    return { rpc_url: rpcUrl, chain_id: network.chain_id };
  }

  /**
   * Get or create a reader for the specified network.
   * Readers are cached per network to improve performance.
   * 
   * @param network - Network configuration
   * @returns ChainReader instance for the network
   * @throws {ConnectionError} If unable to connect to RPC endpoint
   */
  private getReaderForNetwork(network: NetworkConfig): ChainReader {
    const networkKey = `${network.rpc_url}:${network.chain_id}`;

    // Reuse reader if we've seen this network before
    if (this.readers.has(networkKey)) {
      return this.readers.get(networkKey)!;
    }

    // Resolve environment variables
    const resolvedNetwork = this.resolveNetworkConfig(network);
    const rpcUrl = resolvedNetwork.rpc_url;
    const chainId = resolvedNetwork.chain_id;

    // Initialize chain reader with retry/timeout config
    // Allow customization via environment variables
    const retriesEnv = process.env[ENV_RPC_RETRIES];
    const retries = retriesEnv ? (() => {
      const parsed = parseInt(retriesEnv, 10);
      if (isNaN(parsed) || parsed < 0) {
        logger.warning(`Invalid ${ENV_RPC_RETRIES} value '${retriesEnv}', using default: ${DEFAULT_RPC_RETRIES}`);
        return DEFAULT_RPC_RETRIES;
      }
      return parsed;
    })() : DEFAULT_RPC_RETRIES;
    
    const timeoutEnv = process.env[ENV_RPC_TIMEOUT];
    const timeout = timeoutEnv ? (() => {
      const parsed = parseInt(timeoutEnv, 10);
      if (isNaN(parsed) || parsed < MIN_RPC_TIMEOUT_MS) {
        logger.warning(`Invalid ${ENV_RPC_TIMEOUT} value '${timeoutEnv}', using default: ${DEFAULT_RPC_TIMEOUT_MS}`);
        return DEFAULT_RPC_TIMEOUT_MS;
      }
      return parsed;
    })() : DEFAULT_RPC_TIMEOUT_MS;
    
    let reader: ChainReader;
    try {
      reader = new ChainReader(rpcUrl, chainId, retries, timeout);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ConnectionError(`Failed to connect to RPC endpoint (chain_id: ${chainId}): ${errorMessage}`);
    }

    this.readers.set(networkKey, reader);
    return reader;
  }

  /**
   * Get network configuration for a contract (contract override or default).
   * 
   * @param contractConfig - Contract configuration
   * @returns Network configuration (contract-specific or default)
   */
  private getNetworkForContract(contractConfig: ContractConfig): NetworkConfig {
    return contractConfig.network || this.network;
  }

  /**
   * Read current state of all contracts in parallel for better performance.
   * 
   * @returns Record mapping contract names to their current on-chain states
   */
  async readAllStates(): Promise<Record<string, CurrentState>> {
    const allStates: Record<string, CurrentState> = {};
    
    // Group contracts by network for cross-contract access (only within same network)
    const contractsByNetwork = new Map<string, Record<string, { address: string; abi: ABI }>>();
    
    for (const [contractName, contractConfig] of Object.entries(this.contracts)) {
      const network = this.getNetworkForContract(contractConfig);
      const networkKey = `${network.rpc_url}:${network.chain_id}`;
      
      if (!contractsByNetwork.has(networkKey)) {
        contractsByNetwork.set(networkKey, {});
      }
      // After loadSchema processing, abi is guaranteed to be an array (file references are resolved)
      const abi = Array.isArray(contractConfig.abi) ? contractConfig.abi : [];
      contractsByNetwork.get(networkKey)![contractName] = {
        address: contractConfig.address,
        abi: abi,
      };
    }

    // Read all contracts in parallel for better performance
    const contractNames = Object.keys(this.contracts);
    const readPromises = Object.entries(this.contracts).map(async ([contractName, contractConfig], index) => {
      try {
        const address = contractConfig.address;
        // After loadSchema processing, abi is guaranteed to be an array (file references are resolved)
        const abi = Array.isArray(contractConfig.abi) ? contractConfig.abi : [];
        const rawStateConfig = contractConfig.state || {};
        // Convert array format to record format if needed
        const stateConfig: Record<string, any> = Array.isArray(rawStateConfig)
          ? rawStateConfig.reduce((acc, entry, index) => {
              // Use variable, function, or slot as key, fallback to index
              const key = entry.variable || entry.function || entry.slot || `state_${index}`;
              acc[key] = entry;
              return acc;
            }, {} as Record<string, any>)
          : rawStateConfig;
        const network = this.getNetworkForContract(contractConfig);
        const networkKey = `${network.rpc_url}:${network.chain_id}`;
        const reader = this.getReaderForNetwork(network);
        const contractsMap = contractsByNetwork.get(networkKey)!;

        logger.debug(`Reading state for contract ${index + 1}/${contractNames.length}: ${contractName} (chain_id: ${network.chain_id})`);
        const currentState = await reader.readState(address, abi, stateConfig, contractsMap);
        return { contractName, currentState, error: null, network: network.chain_id };
      } catch (error: unknown) {
        const network = this.getNetworkForContract(contractConfig);
        const errorMessage = getErrorMessage(error);
        logger.error(`Failed to read state for contract '${contractName}' (chain_id: ${network.chain_id}): ${errorMessage}`);
        // Return empty state with error for this contract
        return { contractName, currentState: {} as CurrentState, error: errorMessage, network: network.chain_id };
      }
    });

    const results = await Promise.all(readPromises);
    const errors: string[] = [];
    for (const { contractName, currentState, error, network } of results) {
      allStates[contractName] = currentState;
      if (error) {
        errors.push(`Contract '${contractName}' (chain_id: ${network}): ${error}`);
      }
    }
    
    if (errors.length > 0) {
      logger.warning(`Failed to read state for ${errors.length} contract(s):`);
      for (const error of errors) {
        logger.warning(`  - ${error}`);
      }
    }

    return allStates;
  }

  /**
   * Reconcile all contracts and return all diffs.
   * 
   * @param currentStates - Current on-chain states for all contracts
   * @returns Array of diffs found between expected and actual states
   */
  reconcileAll(currentStates: Record<string, CurrentState>): Diff[] {
    return Reconciliator.reconcileAll(currentStates);
  }


  /**
   * Run state verification - read and reconcile.
   * 
   * @returns Verification result with current states and detected diffs
   */
  async run(): Promise<VerificationResult> {
    // Read current states
    const currentStates = await this.readAllStates();

    // Reconcile
    const diffs = this.reconcileAll(currentStates);

    return {
      current_states: currentStates,
      diffs: diffs,
    };
  }
}

/**
 * Load config from file and run Nodrift verification.
 * 
 * @param configFile - Path to configuration file
 * @returns Verification result with current states and detected diffs
 */
export async function runFromFile(configFile: string): Promise<VerificationResult> {
  const config = loadSchema(configFile);
  const nodrift = new Nodrift(config);
  return await nodrift.run();
}


