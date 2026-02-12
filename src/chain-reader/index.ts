/** Main ChainReader class - orchestrates all state readers. */

import { ethers } from 'ethers';
import { StateReadError } from '../common/exceptions';
import type { StateEntry } from '../config/schema';
import { RpcClient } from '../services/rpc-client';
import type { ABI } from '../common/types';
import { readOwner, readRoleMembers, readVariable, readFunctionCall } from './readers/basic-reader';
import type { BasicReaderContext } from './readers/basic-reader';
import { readStorageSlot, readProxySlot } from './readers/storage-reader';
import type { StorageReaderContext } from './readers/storage-reader';
import {
  readComparisonState,
  readConditionalState,
  readTimeBasedState,
  readAggregateState,
  readCrossContractState,
  readArrayState,
  readMappingState,
} from './readers/advanced-reader';
import type { AdvancedReaderContext } from './readers/advanced-reader';
import type { CurrentState } from './types';
import { getKnownStorageSlot } from './helpers/storage-slots';

export type { CurrentState };

/**
 * Main ChainReader class for reading on-chain state.
 */
export class ChainReader {
  private rpcClient: RpcClient;
  private provider: ethers.JsonRpcProvider;

  constructor(rpcUrl: string, chainId: number, retries: number = 3, timeout: number = 30000) {
    this.rpcClient = new RpcClient(rpcUrl, chainId, { retries, timeout });
    this.provider = this.rpcClient.getProvider();
  }

  private getContract(address: string, abi: ABI): ethers.Contract {
    address = ethers.getAddress(address); // Checksum address
    return new ethers.Contract(address, abi, this.provider);
  }

  private getBasicContext(): BasicReaderContext {
    return {
      rpcClient: this.rpcClient,
      getContract: this.getContract.bind(this),
    };
  }

  private getStorageContext(): StorageReaderContext {
    return {
      rpcClient: this.rpcClient,
      provider: this.provider,
    };
  }

  private getAdvancedContext(): AdvancedReaderContext {
    return {
      rpcClient: this.rpcClient,
      provider: this.provider,
      getContract: this.getContract.bind(this),
    };
  }

  async readState(
    contractAddress: string,
    contractAbi: ABI,
    stateConfig: Record<string, StateEntry>,
    allContracts?: Record<string, { address: string; abi: ABI }>
  ): Promise<CurrentState> {
    const contract = this.getContract(contractAddress, contractAbi);
    const currentState: CurrentState = {};
    const basicContext = this.getBasicContext();
    const storageContext = this.getStorageContext();
    const advancedContext = this.getAdvancedContext();

    for (const [key, config] of Object.entries(stateConfig)) {
      const stateType = config.type;

      try {
        if (stateType === 'owner') {
          const owner = await readOwner(contract, basicContext);
          currentState[key] = {
            type: 'owner',
            value: owner,
            expected: config.value,
            metric: config.metric,
          };
        } else if (stateType === 'role') {
          let roleHash = config.role;
          if (!roleHash) {
            const roleName = config.role_name || '';
            if (roleName) {
              roleHash = ethers.id(roleName);
            } else {
              throw new Error('Role entry must have either role or role_name');
            }
          }

          const members = await readRoleMembers(contract, roleHash, basicContext);
          currentState[key] = {
            type: 'role',
            value: members,
            expected: config.members || [],
            role: roleHash,
            metric: config.metric,
          };
        } else if (stateType === 'variable') {
          const variableName = config.variable || key;
          let value = await readVariable(contract, variableName, basicContext, config.abi);

          // Normalize address values
          if (typeof value === 'string' && value.startsWith('0x')) {
            value = ethers.getAddress(value);
          }

          currentState[key] = {
            type: 'variable',
            value: value,
            expected: config.value,
            tolerance: config.tolerance || config.options?.tolerance,
            range: config.range || config.options?.range,
            pattern: config.pattern || config.options?.pattern,
            ignore_case: config.ignore_case || config.options?.ignore_case,
            ignore_order: config.ignore_order || config.options?.ignore_order,
            allow_empty: config.allow_empty || config.options?.allow_empty,
            metric: config.metric,
          };
        } else if (stateType === 'function_call') {
          const funcName = config.function || key;
          const args = config.args || [];
          let value = await readFunctionCall(contract, funcName, args, basicContext, config.abi);

          // Normalize address values
          if (typeof value === 'string' && value.startsWith('0x') && value.length === 42) {
            value = ethers.getAddress(value);
          }

          currentState[key] = {
            type: 'function_call',
            value: value,
            expected: config.value,
            tolerance: config.tolerance || config.options?.tolerance,
            range: config.range || config.options?.range,
            pattern: config.pattern || config.options?.pattern,
            ignore_case: config.ignore_case || config.options?.ignore_case,
            ignore_order: config.ignore_order || config.options?.ignore_order,
            allow_empty: config.allow_empty || config.options?.allow_empty,
            metric: config.metric,
          };
        } else if (stateType === 'storage_slot') {
          let slot = config.slot;
          if (config.slot_name) {
            slot = getKnownStorageSlot(config.slot_name);
          }
          if (!slot) {
            throw new StateReadError('Storage slot entry must have slot or slot_name');
          }

          const slotValue = await readStorageSlot(contractAddress, slot, storageContext);
          const address = '0x' + slotValue.slice(-40);
          const value = ethers.getAddress(address);

          currentState[key] = {
            type: 'storage_slot',
            value: value,
            expected: config.value,
            tolerance: config.tolerance,
            range: config.range,
            pattern: config.pattern,
            ignore_case: config.ignore_case,
          };
        } else if (stateType === 'proxy') {
          if (!config.proxy_pattern || !config.proxy_check) {
            throw new StateReadError('Proxy entry must have proxy_pattern and proxy_check');
          }

          const slotValue = await readProxySlot(contractAddress, config.proxy_pattern, config.proxy_check, storageContext);
          const address = '0x' + slotValue.slice(-40);
          const value = ethers.getAddress(address);

          currentState[key] = {
            type: 'proxy',
            value: value,
            expected: config.value,
            tolerance: config.tolerance,
            range: config.range,
            pattern: config.pattern,
            ignore_case: config.ignore_case,
          };
        } else if (stateType === 'comparison') {
          currentState[key] = await readComparisonState(contract, config, advancedContext, allContracts);
        } else if (stateType === 'conditional') {
          currentState[key] = await readConditionalState(contract, config, advancedContext, allContracts);
        } else if (stateType === 'time_based') {
          currentState[key] = await readTimeBasedState(contract, config, advancedContext);
        } else if (stateType === 'aggregate') {
          currentState[key] = await readAggregateState(contract, config, advancedContext);
        } else if (stateType === 'cross_contract') {
          currentState[key] = await readCrossContractState(contract, config, advancedContext, allContracts);
        } else if (stateType === 'array_state') {
          currentState[key] = await readArrayState(contract, config, advancedContext);
        } else if (stateType === 'mapping_state') {
          currentState[key] = await readMappingState(contract, config, advancedContext);
        } else {
          throw new StateReadError(`Unknown state type: ${stateType}`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        currentState[key] = {
          type: stateType,
          error: errorMessage,
          expected:
            stateType === 'role'
              ? config.members || []
              : stateType === 'owner' || stateType === 'variable' || stateType === 'function_call'
              ? config.value
              : undefined,
        };
      }
    }

    return currentState;
  }
}

