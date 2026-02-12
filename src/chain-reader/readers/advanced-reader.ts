/** Advanced state readers: cross_contract, aggregate, conditional, time_based, comparison, array_state, mapping_state. */

import { ethers } from 'ethers';
import { StateReadError } from '../../common/exceptions';
import type { StateEntry, ComparisonSource, ConditionalConfig } from '../../config/schema';
import { RpcClient } from '../../services/rpc-client';
import { readVariable, readFunctionCall } from './basic-reader';
import { readStorageSlot } from './storage-reader';
import { compareValues as compareWithOperator } from '../helpers/comparison';
import { getKnownStorageSlot } from '../helpers/storage-slots';
import { getLogger } from '../../common/logger';
import type { ABI } from '../../common/types';
import type { CurrentState } from '../types';

const logger = getLogger();

export interface AdvancedReaderContext {
  rpcClient: RpcClient;
  provider: ethers.JsonRpcProvider;
  getContract: (address: string, abi: ABI) => ethers.Contract;
}

/**
 * Read value from a comparison source.
 */
export async function readComparisonSource(
  contract: ethers.Contract,
  source: ComparisonSource,
  context: AdvancedReaderContext,
  allContracts?: Record<string, { address: string; abi: ABI }>
): Promise<unknown> {
  if (source.type === 'variable') {
    const variableName = source.variable || '';
    return await readVariable(contract, variableName, context);
  } else if (source.type === 'function_call') {
    const funcName = source.function || '';
    const args = (source.args || []) as unknown[];
    return await readFunctionCall(contract, funcName, args, context);
  } else if (source.type === 'constant') {
    return source.value;
  } else if (source.type === 'cross_contract' && allContracts && source.source_contract && source.source_function) {
    const targetContract = allContracts[source.source_contract];
    if (!targetContract) {
      throw new StateReadError(`Source contract '${source.source_contract}' not found`);
    }
    const targetContractInstance = context.getContract(targetContract.address, targetContract.abi);
    const sourceArgs = (source.source_args || []) as unknown[];
    return await readFunctionCall(targetContractInstance, source.source_function, sourceArgs, context);
  } else {
    throw new StateReadError(`Unknown comparison source type: ${source.type}`);
  }
}

/**
 * Evaluate a conditional configuration.
 */
export async function evaluateCondition(
  contract: ethers.Contract,
  contractAddress: string,
  condition: ConditionalConfig,
  context: AdvancedReaderContext,
  allContracts?: Record<string, { address: string; abi: ABI }>
): Promise<boolean> {
  let conditionValue: unknown;
  
  if (condition.type === 'variable') {
    conditionValue = await readVariable(contract, condition.variable || '', context);
  } else if (condition.type === 'function_call') {
    const args = (condition.args || []) as unknown[];
    conditionValue = await readFunctionCall(contract, condition.function || '', args, context);
  } else if (condition.type === 'storage_slot') {
    let slot = condition.slot;
    if (condition.slot_name) {
      slot = getKnownStorageSlot(condition.slot_name);
    }
    if (slot) {
      const slotValue = await readStorageSlot(contractAddress, slot, context);
      const address = '0x' + slotValue.slice(-40);
      conditionValue = ethers.getAddress(address);
    }
  } else if (condition.type === 'cross_contract' && allContracts && condition.source_contract && condition.source_function) {
    const targetContract = allContracts[condition.source_contract];
    if (!targetContract) {
      throw new StateReadError(`Source contract '${condition.source_contract}' not found`);
    }
    const targetContractInstance = context.getContract(targetContract.address, targetContract.abi);
    const sourceArgs = (condition.source_args || []) as unknown[];
    conditionValue = await readFunctionCall(targetContractInstance, condition.source_function, sourceArgs, context);
  } else {
    throw new StateReadError(`Unknown condition type: ${condition.type}`);
  }
  
  // Compare condition value
  let compareTo: unknown = condition.value;
  if (condition.compare_to === 'block_timestamp') {
    const blockNumber = await context.rpcClient.callWithRetry(
      () => context.provider.getBlockNumber(),
      'getBlockNumber (condition)',
      contractAddress
    );
    const block = await context.rpcClient.callWithRetry(
      () => context.provider.getBlock(blockNumber),
      'getBlock (condition)',
      contractAddress
    );
    compareTo = block?.timestamp || Math.floor(Date.now() / 1000);
  } else if (condition.compare_to === 'block_number') {
    compareTo = await context.rpcClient.callWithRetry(
      () => context.provider.getBlockNumber(),
      'getBlockNumber (condition)',
      contractAddress
    );
  }
  
  return compareWithOperator(conditionValue, compareTo, condition.operator);
}

/**
 * Read comparison state.
 */
export async function readComparisonState(
  contract: ethers.Contract,
  config: StateEntry,
  context: AdvancedReaderContext,
  allContracts?: Record<string, { address: string; abi: ABI }>
): Promise<CurrentState[string]> {
  if (!config.left || !config.right || !config.operator) {
    throw new StateReadError('Comparison entry must have left, right, and operator fields');
  }
  
  const leftValue = await readComparisonSource(contract, config.left!, context, allContracts);
  const rightValue = await readComparisonSource(contract, config.right!, context, allContracts);
  
  const comparisonResult = compareWithOperator(leftValue, rightValue, config.operator);
  
  return {
    type: 'comparison',
    value: { left: leftValue, right: rightValue, result: comparisonResult },
    expected: { operator: config.operator, shouldPass: true },
    tolerance: config.tolerance,
    range: config.range,
  };
}

/**
 * Read conditional state.
 */
export async function readConditionalState(
  contract: ethers.Contract,
  config: StateEntry,
  context: AdvancedReaderContext,
  allContracts?: Record<string, { address: string; abi: ABI }>
): Promise<CurrentState[string]> {
  if (!config.condition) {
    throw new StateReadError('Conditional entry must have condition field');
  }
  
  const contractAddr = await contract.getAddress();
  const conditionMet = await evaluateCondition(contract, contractAddr, config.condition, context, allContracts);
  
  return {
    type: 'conditional',
    value: { conditionMet },
    expected: config.value,
    tolerance: config.tolerance,
    range: config.range,
    pattern: config.pattern,
    ignore_case: config.ignore_case,
    ignore_order: config.ignore_order,
    allow_empty: config.allow_empty,
  };
}

/**
 * Read time-based state.
 */
export async function readTimeBasedState(
  contract: ethers.Contract,
  config: StateEntry,
  context: AdvancedReaderContext
): Promise<CurrentState[string]> {
  if (!config.function || config.max_age_seconds === undefined) {
    throw new StateReadError('Time-based entry must have function and max_age_seconds');
  }
  
  const timestampValue = await readFunctionCall(contract, config.function, config.args || [], context);
  const timestamp = typeof timestampValue === 'bigint' ? Number(timestampValue) : Number(timestampValue);
  
  // Get current block timestamp
  const contractAddress = await contract.getAddress();
  const blockNumber = await context.rpcClient.callWithRetry(
    () => context.provider.getBlockNumber(),
    'getBlockNumber',
    contractAddress
  );
  const block = await context.rpcClient.callWithRetry(
    () => context.provider.getBlock(blockNumber),
    'getBlock',
    contractAddress
  );
  const currentTimestamp = block?.timestamp || Math.floor(Date.now() / 1000);
  
  const ageSeconds = currentTimestamp - timestamp;
  const isStale = ageSeconds > config.max_age_seconds;
  
  return {
    type: 'time_based',
    value: { timestamp, ageSeconds, isStale },
    expected: { maxAgeSeconds: config.max_age_seconds },
    tolerance: config.tolerance,
    range: config.range,
  };
}

/**
 * Read aggregate state.
 */
export async function readAggregateState(
  contract: ethers.Contract,
  config: StateEntry,
  context: AdvancedReaderContext
): Promise<CurrentState[string]> {
  if (!config.operation || !config.function) {
    throw new StateReadError('Aggregate entry must have operation and function fields');
  }
  
  let argsList: unknown[][] = [];
  if (config.args_source === 'function' && config.args_function) {
    // Get args list from another function call
    const argsArray = await readFunctionCall(contract, config.args_function, config.args || [], context);
    if (!Array.isArray(argsArray)) {
      throw new StateReadError(`Function ${config.args_function} did not return an array`);
    }
    argsList = argsArray.map((arg: unknown) => [arg]);
  } else {
    // Use args as list of arguments (each arg is an array)
    argsList = (config.args || []).map((arg: unknown) => Array.isArray(arg) ? arg : [arg]);
  }
  
  // Call function for each set of args
  const values: unknown[] = [];
  for (const args of argsList) {
    try {
      const value = await readFunctionCall(contract, config.function, args, context);
      // Apply filter if specified
      if (config.filter) {
        if (typeof value === 'object' && value !== null) {
          const fieldValue = (value as any)[config.filter.field];
          const filterPasses = compareWithOperator(
            fieldValue,
            config.filter.value,
            config.filter.operator
          );
          if (!filterPasses) continue;
        }
      }
      values.push(value);
    } catch (error) {
      logger.warning(`Failed to call ${config.function} with args ${args}: ${error}`);
    }
  }
  
  // Aggregate values
  let aggregatedValue: unknown;
  if (config.operation === 'sum') {
    aggregatedValue = (values as number[]).reduce((sum, val) => {
      const num = typeof val === 'bigint' ? Number(val) : Number(val);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  } else if (config.operation === 'average') {
    const sum = (values as number[]).reduce((acc: number, val: unknown) => {
      const num = typeof val === 'bigint' ? Number(val) : Number(val);
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
    aggregatedValue = values.length > 0 ? sum / values.length : 0;
  } else if (config.operation === 'count') {
    aggregatedValue = values.length;
  } else if (config.operation === 'min') {
    aggregatedValue = Math.min(...values.map(val => typeof val === 'bigint' ? Number(val) : Number(val)));
  } else if (config.operation === 'max') {
    aggregatedValue = Math.max(...values.map(val => typeof val === 'bigint' ? Number(val) : Number(val)));
  } else {
    throw new StateReadError(`Unknown aggregate operation: ${config.operation}`);
  }
  
  return {
    type: 'aggregate',
    value: aggregatedValue,
    expected: config.value,
    tolerance: config.tolerance,
    range: config.range,
  };
}

/**
 * Read cross-contract state.
 */
export async function readCrossContractState(
  contract: ethers.Contract,
  config: StateEntry,
  context: AdvancedReaderContext,
  allContracts?: Record<string, { address: string; abi: ABI }>
): Promise<CurrentState[string]> {
  const configAny = config as unknown as Record<string, unknown>;
  const sourceContract = configAny.source_contract as string | undefined;
  const sourceFunction = configAny.source_function as string | undefined;
  const targetContractName = configAny.target_contract as string | undefined;
  const targetField = configAny.target_field as string | undefined;
  
  if (!sourceContract || !sourceFunction || !targetContractName || !allContracts) {
    throw new StateReadError('Cross-contract entry requires source_contract, source_function, target_contract, and allContracts context');
  }
  
  const targetContract = allContracts[targetContractName];
  if (!targetContract) {
    throw new StateReadError(`Target contract '${targetContractName}' not found`);
  }
  
  // Read value from source contract
  const sourceArgs = (configAny.source_args as unknown[]) || [];
  const sourceValue = await readFunctionCall(contract, sourceFunction, sourceArgs, context);
  let normalizedSource = sourceValue;
  if (typeof sourceValue === 'string' && sourceValue.startsWith('0x') && sourceValue.length === 42) {
    normalizedSource = ethers.getAddress(sourceValue);
  }
  
  // Get target value (contract address or field value)
  let targetValue: unknown;
  if (targetField === 'address') {
    targetValue = ethers.getAddress(targetContract.address);
  } else if (targetField) {
    // Read field from target contract
    const targetContractInstance = context.getContract(targetContract.address, targetContract.abi);
    targetValue = await readFunctionCall(targetContractInstance, targetField, [], context);
    if (typeof targetValue === 'string' && targetValue.startsWith('0x') && targetValue.length === 42) {
      targetValue = ethers.getAddress(targetValue);
    }
  } else {
    targetValue = ethers.getAddress(targetContract.address);
  }
  
  return {
    type: 'cross_contract',
    value: normalizedSource,
    expected: targetValue,
    tolerance: config.tolerance,
    range: config.range,
    pattern: config.pattern,
    ignore_case: config.ignore_case,
  };
}

/**
 * Read array state.
 */
export async function readArrayState(
  contract: ethers.Contract,
  config: StateEntry,
  context: AdvancedReaderContext
): Promise<CurrentState[string]> {
  if (!config.function || !config.check) {
    throw new StateReadError('Array state entry must have function and check fields');
  }
  
  const arrayValue = await readFunctionCall(contract, config.function, config.args || [], context);
  
  if (!Array.isArray(arrayValue)) {
    throw new StateReadError(`Function ${config.function} did not return an array`);
  }
  
  let value: unknown;
  if (config.check === 'length') {
    value = arrayValue.length;
  } else if (config.check === 'contains' || config.check === 'contains_all' || config.check === 'contains_any') {
    // For contains checks, we'll compare the arrays themselves
    value = arrayValue;
  } else {
    throw new StateReadError(`Unknown array check type: ${config.check}`);
  }
  
  return {
    type: 'array_state',
    value: value,
    expected: config.value,
    tolerance: config.tolerance,
    range: config.range,
    pattern: config.pattern,
    ignore_case: config.ignore_case,
    ignore_order: config.ignore_order !== false, // Default to true for arrays
    allow_empty: config.allow_empty,
  };
}

/**
 * Read mapping state.
 */
export async function readMappingState(
  contract: ethers.Contract,
  config: StateEntry,
  context: AdvancedReaderContext
): Promise<CurrentState[string]> {
  if (!config.function || config.key === undefined) {
    throw new StateReadError('Mapping state entry must have function and key fields');
  }
  
  const value = await readFunctionCall(contract, config.function, [config.key], context);
  
  // Normalize addresses
  let normalizedValue = value;
  if (typeof value === 'string' && value.startsWith('0x') && value.length === 42) {
    normalizedValue = ethers.getAddress(value);
  }
  
  return {
    type: 'mapping_state',
    value: normalizedValue,
    expected: config.value,
    tolerance: config.tolerance,
    range: config.range,
    pattern: config.pattern,
    ignore_case: config.ignore_case,
    allow_empty: config.allow_empty,
  };
}


