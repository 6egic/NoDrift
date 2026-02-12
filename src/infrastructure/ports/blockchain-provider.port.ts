/** Port interface for blockchain providers (Hexagonal Architecture). */

import type { ABI } from '../../common/types';

/**
 * Blockchain provider port interface.
 * This abstraction allows swapping between different blockchain libraries
 * (ethers, viem, web3.js, etc.) without changing core business logic.
 */
export interface IBlockchainProvider {
  /**
   * Get the chain ID of the connected network.
   */
  getChainId(): Promise<number>;

  /**
   * Get the current block number.
   */
  getBlockNumber(): Promise<number>;

  /**
   * Get the bytecode at an address.
   */
  getCode(address: string): Promise<string>;

  /**
   * Get the balance of an address.
   */
  getBalance(address: string): Promise<bigint>;

  /**
   * Read storage at a specific slot.
   */
  getStorageAt(address: string, slot: string): Promise<string>;

  /**
   * Call a contract function (read-only).
   */
  call(params: CallParams): Promise<string>;

  /**
   * Get transaction receipt.
   */
  getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null>;

  /**
   * Estimate gas for a transaction.
   */
  estimateGas(params: CallParams): Promise<bigint>;

  /**
   * Get network information.
   */
  getNetwork(): Promise<NetworkInfo>;

  /**
   * Check if provider is connected.
   */
  isConnected(): Promise<boolean>;

  /**
   * Disconnect from provider.
   */
  disconnect(): Promise<void>;
}

/**
 * Contract interaction port interface.
 */
export interface IContractReader {
  /**
   * Read a public variable from a contract.
   */
  readVariable(
    address: string,
    abi: ABI,
    variableName: string
  ): Promise<unknown>;

  /**
   * Call a view/pure function on a contract.
   */
  callFunction(
    address: string,
    abi: ABI,
    functionName: string,
    args: unknown[]
  ): Promise<unknown>;

  /**
   * Batch read multiple values from a contract.
   */
  batchRead(
    address: string,
    abi: ABI,
    calls: ReadCall[]
  ): Promise<unknown[]>;

  /**
   * Check if an address is a contract.
   */
  isContract(address: string): Promise<boolean>;

  /**
   * Get contract ABI from address (if available).
   */
  getContractABI(address: string): Promise<ABI | null>;
}

/**
 * Call parameters for contract interactions.
 */
export interface CallParams {
  to: string;
  data?: string;
  from?: string;
  value?: bigint;
  gasLimit?: bigint;
  gasPrice?: bigint;
}

/**
 * Transaction receipt information.
 */
export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  from: string;
  to: string | null;
  gasUsed: bigint;
  status: number;
  logs: Log[];
}

/**
 * Event log information.
 */
export interface Log {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

/**
 * Network information.
 */
export interface NetworkInfo {
  chainId: number;
  name: string;
  ensAddress?: string;
}

/**
 * Read call specification for batch operations.
 */
export interface ReadCall {
  type: 'variable' | 'function';
  name: string;
  args?: unknown[];
}

/**
 * Provider configuration.
 */
export interface ProviderConfig {
  rpcUrl: string;
  chainId: number;
  timeout?: number;
  retries?: number;
  batchSize?: number;
}

/**
 * Provider factory interface.
 */
export interface IProviderFactory {
  /**
   * Create a blockchain provider from configuration.
   */
  createProvider(config: ProviderConfig): Promise<IBlockchainProvider>;

  /**
   * Create a contract reader from configuration.
   */
  createContractReader(config: ProviderConfig): Promise<IContractReader>;

  /**
   * Get supported provider types.
   */
  getSupportedTypes(): string[];
}
