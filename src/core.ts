/** Enhanced core orchestration with enterprise architecture patterns. */

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
import { getEventBus } from './infrastructure/events/event-bus';
import { getPluginManager, type PluginContext } from './infrastructure/plugins/plugin-system';
import {
  createEvent,
  type ContractReadStartedEvent,
  type ContractReadCompletedEvent,
  type ContractReadFailedEvent,
  type VerificationStartedEvent,
  type StatesReadEvent,
  type ReconciliationStartedEvent,
  type DriftDetectedEvent,
  type ReconciliationCompletedEvent,
  type VerificationCompletedEvent,
  type VerificationFailedEvent,
} from './infrastructure/events/domain-events';
import { SmartVerificationScheduler } from './patterns/dependency-graph';
import { WorkerPool } from './common/worker-pool';
import type { Result } from './common/result-type';
import { Ok, Err } from './common/result-type';
import { v4 as uuidv4 } from 'uuid';

const logger = getLogger();

export interface VerificationResult {
  current_states: Record<string, CurrentState>;
  diffs: Diff[];
}

/**
 * Enhanced Nodrift orchestrator with enterprise architecture.
 */
export class Nodrift {
  private config: NodriftConfig;
  private network: NodriftConfig['network'];
  private contracts: NodriftConfig['contracts'];
  private readers: Map<string, ChainReader>;
  private eventBus = getEventBus();
  private pluginManager = getPluginManager();
  private sessionId: string;
  private scheduler: SmartVerificationScheduler;
  private pluginManagerInitialized = false;
  private pluginContext: PluginContext;

  /**
   * Initialize Nodrift with configuration.
   *
   * @param config - The Nodrift configuration object
   */
  constructor(config: NodriftConfig) {
    this.config = config;
    this.network = config.network;
    this.contracts = config.contracts;
    this.readers = new Map();
    this.sessionId = uuidv4();
    this.scheduler = new SmartVerificationScheduler();
    
    // Initialize plugin context
    this.pluginContext = {
      config: this.config,
      sessionId: this.sessionId,
      eventBus: this.eventBus,
      logger,
    };

    // Build dependency graph for optimal ordering
    this.buildDependencyGraph();
  }

  /**
   * Build dependency graph from contract configurations.
   */
  private buildDependencyGraph(): void {
    const contractsMap = new Map(Object.entries(this.contracts));
    this.scheduler.buildGraph(contractsMap);

    // Detect circular dependencies
    const circular = this.scheduler.detectCircularDependencies();
    if (circular.length > 0) {
      logger.warning(`Circular dependencies detected: ${JSON.stringify(circular)}`);
    }

    // Log critical path
    const criticalPath = this.scheduler.getCriticalPath();
    logger.debug(`Critical path length: ${criticalPath.length}, path: ${JSON.stringify(criticalPath.path)}`);
  }

  /**
   * Resolve environment variables in network configuration.
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
   * Get network configuration for a contract.
   */
  private getNetworkForContract(contractConfig: ContractConfig): NetworkConfig {
    return contractConfig.network || this.network;
  }

  /**
   * Read state for a single contract with events.
   */
  private async readContractState(
    contractName: string,
    contractConfig: ContractConfig,
    contractsByNetwork: Map<string, Record<string, { address: string; abi: ABI }>>,
    index: number,
    total: number
  ): Promise<Result<{ contractName: string; state: CurrentState }, Error>> {
    const startTime = Date.now();
    const address = contractConfig.address;
    const network = this.getNetworkForContract(contractConfig);

    // Emit start event
    this.eventBus.emitSync(
      createEvent<ContractReadStartedEvent>('contract.read.started', {
        sessionId: this.sessionId,
        contractName,
        address,
        chainId: network.chain_id,
      }, this.sessionId)
    );

    // Execute plugin hook
    await this.pluginManager.executeHook('onBeforeContractRead', this.pluginContext, contractName, address);

    try {
      const abi = Array.isArray(contractConfig.abi) ? contractConfig.abi : [];
      const rawStateConfig = contractConfig.state || {};
      const stateConfig: Record<string, any> = Array.isArray(rawStateConfig)
        ? rawStateConfig.reduce((acc, entry, index) => {
            const key = entry.variable || entry.function || entry.slot || `state_${index}`;
            acc[key] = entry;
            return acc;
          }, {} as Record<string, any>)
        : rawStateConfig;

      const networkKey = `${network.rpc_url}:${network.chain_id}`;
      const reader = this.getReaderForNetwork(network);
      const contractsMap = contractsByNetwork.get(networkKey)!;

      logger.debug(`Reading state for contract ${index + 1}/${total}: ${contractName} (chain_id: ${network.chain_id})`);
      const currentState = await reader.readState(address, abi as ABI, stateConfig, contractsMap);

      const duration = Date.now() - startTime;

      // Emit completion event
      this.eventBus.emitSync(
        createEvent<ContractReadCompletedEvent>('contract.read.completed', {
          sessionId: this.sessionId,
          contractName,
          address,
          chainId: network.chain_id,
          duration,
          stateCount: Object.keys(currentState).length,
        }, this.sessionId)
      );

      // Execute plugin hook
      await this.pluginManager.executeHook('onAfterContractRead', this.pluginContext, contractName, currentState);

      return Ok({ contractName, state: currentState });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);

      // Emit failure event
      this.eventBus.emitSync(
        createEvent<ContractReadFailedEvent>('contract.read.failed', {
          sessionId: this.sessionId,
          contractName,
          address,
          chainId: network.chain_id,
          error: errorMessage,
        }, this.sessionId)
      );

      // Execute plugin hook
      await this.pluginManager.executeHook(
        'onContractReadError',
        this.pluginContext,
        contractName,
        error instanceof Error ? error : new Error(errorMessage)
      );

      logger.error(`Failed to read state for contract '${contractName}' (chain_id: ${network.chain_id}): ${errorMessage}`);
      return Err(new Error(`Contract '${contractName}': ${errorMessage}`));
    }
  }

  /**
   * Read all contract states using optimal ordering and worker pool.
   */
  async readAllStates(): Promise<Result<Record<string, CurrentState>, Error>> {
    const startTime = Date.now();
    const allStates: Record<string, CurrentState> = {};
    
    // Group contracts by network
    const contractsByNetwork = new Map<string, Record<string, { address: string; abi: ABI }>>();
    
    for (const [contractName, contractConfig] of Object.entries(this.contracts)) {
      const network = this.getNetworkForContract(contractConfig);
      const networkKey = `${network.rpc_url}:${network.chain_id}`;
      
      if (!contractsByNetwork.has(networkKey)) {
        contractsByNetwork.set(networkKey, {});
      }
      const abi = Array.isArray(contractConfig.abi) ? contractConfig.abi : [];
      contractsByNetwork.get(networkKey)![contractName] = {
        address: contractConfig.address,
        abi: abi as ABI,
      };
    }

    // Get optimal ordering from scheduler
    const optimalOrder = this.scheduler.getOptimalOrder();
    const contractNames = optimalOrder.length > 0 ? optimalOrder : Object.keys(this.contracts);

    // Create worker pool for parallel execution
    const workerPool = new WorkerPool<{ contractName: string; state: CurrentState }>({
      concurrency: 5, // Configurable
      timeout: 60000,
      onTaskComplete: (taskId, duration) => {
        logger.debug(`Task ${taskId} completed in ${duration}ms`);
      },
      onTaskError: (taskId, error) => {
        logger.error(`Task ${taskId} failed: ${error.message}`);
      },
    });

    // Add tasks to worker pool
    contractNames.forEach((contractName, index) => {
      const contractConfig = this.contracts[contractName];
      if (!contractConfig) return;

      workerPool.addTask({
        id: contractName,
        priority: 1,
        execute: async () => {
          const result = await this.readContractState(
            contractName,
            contractConfig,
            contractsByNetwork,
            index,
            contractNames.length
          );

          if (result.ok) {
            return result.value;
          } else {
            // Return empty state on error (non-blocking)
            return { contractName, state: {} as CurrentState };
          }
        },
      });
    });

    // Execute all tasks
    const results = await workerPool.execute();
    const errors: string[] = [];

    // Collect results
    for (const [contractName, result] of results.entries()) {
      allStates[contractName] = result.state;
    }

    // Collect errors from worker pool
    const workerErrors = workerPool.getErrors();
    for (const [contractName, error] of workerErrors.entries()) {
      errors.push(`Contract '${contractName}': ${error.message}`);
    }

    const duration = Date.now() - startTime;

    // Emit states read event
    this.eventBus.emitSync(
      createEvent<StatesReadEvent>('states.read', {
        sessionId: this.sessionId,
        contractCount: contractNames.length,
        successCount: results.size,
        failureCount: workerErrors.size,
        duration,
      }, this.sessionId)
    );

    // Execute plugin hook
    await this.pluginManager.executeHook('onStatesRead', this.pluginContext, allStates);

    if (errors.length > 0) {
      logger.warning(`Failed to read state for ${errors.length} contract(s):`);
      for (const error of errors) {
        logger.warning(`  - ${error}`);
      }
    }

    return Ok(allStates);
  }

  /**
   * Reconcile all contracts with events.
   */
  async reconcileAll(currentStates: Record<string, CurrentState>): Promise<Result<Diff[], Error>> {
    const startTime = Date.now();

    // Emit reconciliation started event
    this.eventBus.emitSync(
      createEvent<ReconciliationStartedEvent>('reconciliation.started', {
        sessionId: this.sessionId,
        contractCount: Object.keys(currentStates).length,
      }, this.sessionId)
    );

    // Execute plugin hook
    await this.pluginManager.executeHook('onBeforeReconciliation', this.pluginContext, currentStates);

    try {
      const diffs = Reconciliator.reconcileAll(currentStates);

      // Emit drift detected events
      for (const diff of diffs) {
        this.eventBus.emitSync(
          createEvent<DriftDetectedEvent>('drift.detected', {
            sessionId: this.sessionId,
            contractName: diff.contractName,
            diff,
          }, this.sessionId)
        );

        // Execute plugin hook for each drift
        await this.pluginManager.executeHook('onDriftDetected', this.pluginContext, diff.contractName, diff);
      }

      const duration = Date.now() - startTime;

      // Emit reconciliation completed event
      this.eventBus.emitSync(
        createEvent<ReconciliationCompletedEvent>('reconciliation.completed', {
          sessionId: this.sessionId,
          driftCount: diffs.length,
          duration,
        }, this.sessionId)
      );

      // Execute plugin hook
      await this.pluginManager.executeHook('onAfterReconciliation', this.pluginContext, diffs);

      return Ok(diffs);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      return Err(new Error(`Reconciliation failed: ${errorMessage}`));
    }
  }

  /**
   * Run state verification with full event lifecycle.
   */
  async run(): Promise<Result<VerificationResult, Error>> {
    const startTime = Date.now();

    // Initialize plugin manager if not already done
    if (!this.pluginManagerInitialized) {
      const context = {
        config: this.config,
        sessionId: this.sessionId,
        eventBus: this.eventBus,
        logger: logger,
      };
      await this.pluginManager.initialize(context);
      this.pluginManagerInitialized = true;
    }

    // Emit verification started event
    this.eventBus.emitSync(
      createEvent<VerificationStartedEvent>('verification.started', {
        sessionId: this.sessionId,
        contractCount: Object.keys(this.contracts).length,
        configFile: 'nodrift.yaml', // TODO: Pass from caller
      }, this.sessionId)
    );

    // Execute plugin hook
    await this.pluginManager.executeHook('onBeforeVerification', this.pluginContext);

    try {
      // Read current states
      const statesResult = await this.readAllStates();
      if (!statesResult.ok) {
        throw statesResult.error;
      }
      const currentStates = statesResult.value;

      // Reconcile
      const diffsResult = await this.reconcileAll(currentStates);
      if (!diffsResult.ok) {
        throw diffsResult.error;
      }
      const diffs = diffsResult.value;

      const duration = Date.now() - startTime;
      const result: VerificationResult = {
        current_states: currentStates,
        diffs: diffs,
      };

      // Emit verification completed event
      this.eventBus.emitSync(
        createEvent<VerificationCompletedEvent>('verification.completed', {
          sessionId: this.sessionId,
          success: diffs.length === 0,
          driftCount: diffs.length,
          duration,
          summary: {
            totalContracts: Object.keys(this.contracts).length,
            successfulReads: Object.keys(currentStates).length,
            failedReads: Object.keys(this.contracts).length - Object.keys(currentStates).length,
            totalDrifts: diffs.length,
          },
        }, this.sessionId)
      );

      // Execute plugin hook
      await this.pluginManager.executeHook('onVerificationComplete', this.pluginContext, result);

      return Ok(result);
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      // Emit verification failed event
      this.eventBus.emitSync(
        createEvent<VerificationFailedEvent>('verification.failed', {
          sessionId: this.sessionId,
          error: errorMessage,
          duration,
        }, this.sessionId)
      );

      // Execute plugin hook
      await this.pluginManager.executeHook(
        'onVerificationError',
        this.pluginContext,
        error instanceof Error ? error : new Error(errorMessage)
      );

      return Err(new Error(`Verification failed: ${errorMessage}`));
    }
  }

  /**
   * Get session ID.
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

/**
 * Load config from file and run Nodrift verification with enhanced architecture.
 */
export async function runFromFile(configFile: string): Promise<Result<VerificationResult, Error>> {
  try {
    const config = loadSchema(configFile);
    const nodrift = new Nodrift(config);
    return await nodrift.run();
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    return Err(new Error(`Failed to load config: ${errorMessage}`));
  }
}
