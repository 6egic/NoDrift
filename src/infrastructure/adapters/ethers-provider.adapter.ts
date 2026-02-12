/** Ethers.js adapter implementing blockchain provider port. */

import { ethers } from 'ethers';
import type {
  IBlockchainProvider,
  IContractReader,
  CallParams,
  TransactionReceipt,
  NetworkInfo,
  ReadCall,
  ProviderConfig,
} from '../ports/blockchain-provider.port';
import type { ABI } from '../../common/types';
import { getLogger } from '../../common/logger';

const logger = getLogger();

/**
 * Ethers.js implementation of blockchain provider port.
 */
export class EthersProviderAdapter implements IBlockchainProvider {
  private provider: ethers.JsonRpcProvider;

  constructor(private config: ProviderConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId, {
      batchMaxCount: config.batchSize || 1,
    });
  }

  async getChainId(): Promise<number> {
    const network = await this.provider.getNetwork();
    return Number(network.chainId);
  }

  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  async getCode(address: string): Promise<string> {
    return await this.provider.getCode(address);
  }

  async getBalance(address: string): Promise<bigint> {
    return await this.provider.getBalance(address);
  }

  async getStorageAt(address: string, slot: string): Promise<string> {
    return await this.provider.getStorage(address, slot);
  }

  async call(params: CallParams): Promise<string> {
    const tx: ethers.TransactionRequest = {
      to: params.to,
      data: params.data,
      from: params.from,
      value: params.value,
      gasLimit: params.gasLimit,
      gasPrice: params.gasPrice,
    };
    return await this.provider.call(tx);
  }

  async getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
    const receipt = await this.provider.getTransactionReceipt(txHash);
    if (!receipt) return null;

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      from: receipt.from,
      to: receipt.to,
      gasUsed: receipt.gasUsed,
      status: receipt.status || 0,
      logs: receipt.logs.map(log => ({
        address: log.address,
        topics: log.topics,
        data: log.data,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.index,
      })),
    };
  }

  async estimateGas(params: CallParams): Promise<bigint> {
    const tx: ethers.TransactionRequest = {
      to: params.to,
      data: params.data,
      from: params.from,
      value: params.value,
    };
    return await this.provider.estimateGas(tx);
  }

  async getNetwork(): Promise<NetworkInfo> {
    const network = await this.provider.getNetwork();
    return {
      chainId: Number(network.chainId),
      name: network.name,
      ensAddress: network.getPlugin('org.ethers.plugins.network.Ens')?.address,
    };
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.provider.getBlockNumber();
      return true;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    await this.provider.destroy();
  }

  /**
   * Get the underlying ethers provider (for compatibility).
   */
  getEthersProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }
}

/**
 * Ethers.js implementation of contract reader port.
 */
export class EthersContractReaderAdapter implements IContractReader {
  private provider: ethers.JsonRpcProvider;

  constructor(private config: ProviderConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId, {
      batchMaxCount: config.batchSize || 1,
    });
  }

  async readVariable(
    address: string,
    abi: ABI,
    variableName: string
  ): Promise<unknown> {
    const contract = new ethers.Contract(address, abi, this.provider);
    
    // Try as public variable (getter function)
    if (typeof contract[variableName] === 'function') {
      return await contract[variableName]();
    }
    
    throw new Error(`Variable ${variableName} not found in contract ABI`);
  }

  async callFunction(
    address: string,
    abi: ABI,
    functionName: string,
    args: unknown[]
  ): Promise<unknown> {
    const contract = new ethers.Contract(address, abi, this.provider);
    
    if (typeof contract[functionName] !== 'function') {
      throw new Error(`Function ${functionName} not found in contract ABI`);
    }
    
    return await contract[functionName](...args);
  }

  async batchRead(
    address: string,
    abi: ABI,
    calls: ReadCall[]
  ): Promise<unknown[]> {
    const contract = new ethers.Contract(address, abi, this.provider);
    const promises: Promise<unknown>[] = [];

    for (const call of calls) {
      if (call.type === 'variable') {
        promises.push(this.readVariable(address, abi, call.name));
      } else if (call.type === 'function') {
        promises.push(this.callFunction(address, abi, call.name, call.args || []));
      }
    }

    return await Promise.all(promises);
  }

  async isContract(address: string): Promise<boolean> {
    const code = await this.provider.getCode(address);
    return code !== '0x' && code !== '0x0';
  }

  async getContractABI(address: string): Promise<ABI | null> {
    // This would require integration with Etherscan or similar service
    // For now, return null as ABI discovery is not implemented
    logger.warning(`ABI discovery not implemented for address ${address}`);
    return null;
  }

  /**
   * Get the underlying ethers provider (for compatibility).
   */
  getEthersProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }
}

/**
 * Factory for creating Ethers.js adapters.
 */
export class EthersAdapterFactory {
  static createProvider(config: ProviderConfig): EthersProviderAdapter {
    return new EthersProviderAdapter(config);
  }

  static createContractReader(config: ProviderConfig): EthersContractReaderAdapter {
    return new EthersContractReaderAdapter(config);
  }
}
