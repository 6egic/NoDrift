/** Factory for creating Diff objects with consistent metric handling. */

import { Diff } from './diff';
import type { MetricConfig } from '../config/types';
import type { CurrentState } from '../chain-reader/types';

/**
 * Factory class for creating Diff objects.
 * Centralizes Diff creation logic and ensures metrics are properly attached.
 */
export class DiffFactory {
  /**
   * Create an error diff from a state entry.
   * 
   * @param contractName - Name of the contract
   * @param stateKey - Key of the state entry
   * @param stateType - Type of state check
   * @param currentState - Current state object (may contain error and metric)
   * @returns Diff object representing the error
   */
  static createError(
    contractName: string,
    stateKey: string,
    stateType: string,
    currentState: CurrentState[string]
  ): Diff {
    return new Diff(
      contractName,
      stateKey,
      stateType,
      null,
      currentState.expected,
      'error',
      currentState.error,
      currentState.metric
    );
  }

  /**
   * Create an update diff when values don't match.
   * 
   * @param contractName - Name of the contract
   * @param stateKey - Key of the state entry
   * @param stateType - Type of state check
   * @param currentValue - Current on-chain value
   * @param desiredValue - Expected value from config
   * @param metric - Optional metric configuration
   * @returns Diff object representing the mismatch
   */
  static createUpdate(
    contractName: string,
    stateKey: string,
    stateType: string,
    currentValue: unknown,
    desiredValue: unknown,
    metric?: MetricConfig
  ): Diff {
    return new Diff(
      contractName,
      stateKey,
      stateType,
      currentValue,
      desiredValue,
      'update',
      undefined,
      metric
    );
  }

  /**
   * Create an add diff when a value is missing.
   * 
   * @param contractName - Name of the contract
   * @param stateKey - Key of the state entry
   * @param stateType - Type of state check
   * @param desiredValue - Expected value that's missing
   * @param metric - Optional metric configuration
   * @returns Diff object representing the missing value
   */
  static createAdd(
    contractName: string,
    stateKey: string,
    stateType: string,
    desiredValue: unknown,
    metric?: MetricConfig
  ): Diff {
    return new Diff(
      contractName,
      stateKey,
      stateType,
      null,
      desiredValue,
      'add',
      undefined,
      metric
    );
  }

  /**
   * Create a remove diff when a value should not exist.
   * 
   * @param contractName - Name of the contract
   * @param stateKey - Key of the state entry
   * @param stateType - Type of state check
   * @param currentValue - Current value that should be removed
   * @param metric - Optional metric configuration
   * @returns Diff object representing the extra value
   */
  static createRemove(
    contractName: string,
    stateKey: string,
    stateType: string,
    currentValue: unknown,
    metric?: MetricConfig
  ): Diff {
    return new Diff(
      contractName,
      stateKey,
      stateType,
      currentValue,
      null,
      'remove',
      undefined,
      metric
    );
  }

  /**
   * Create a diff from a current state entry.
   * Automatically extracts metric from the state entry.
   * 
   * @param contractName - Name of the contract
   * @param stateKey - Key of the state entry
   * @param stateType - Type of state check
   * @param currentValue - Current on-chain value
   * @param desiredValue - Expected value from config
   * @param action - Diff action (update, add, remove, error)
   * @param currentState - Current state object (contains metric)
   * @param error - Optional error message
   * @returns Diff object with metric attached
   */
  static fromState(
    contractName: string,
    stateKey: string,
    stateType: string,
    currentValue: unknown,
    desiredValue: unknown,
    action: string,
    currentState: CurrentState[string],
    error?: string
  ): Diff {
    return new Diff(
      contractName,
      stateKey,
      stateType,
      currentValue,
      desiredValue,
      action,
      error,
      currentState.metric
    );
  }
}
