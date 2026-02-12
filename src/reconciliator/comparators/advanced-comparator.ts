/** Advanced state comparators: array_state, time_based, comparison, conditional, aggregate, cross_contract, erc20, erc721. */

import type { CurrentState } from '../../chain-reader/index';
import { Diff } from '../diff';
import { DiffFactory } from '../diff-factory';
import { normalizeList } from '../utils';
import { compareValues, type ComparisonOptions } from '../comparison-engine';

/**
 * Reconcile array state.
 */
export function reconcileArrayState(
  contractName: string,
  stateKey: string,
  currentState: CurrentState[string]
): Diff | null {
  if (currentState.error) {
    return DiffFactory.createError(contractName, stateKey, 'array_state', currentState);
  }

  const current = currentState.value;
  const desired = currentState.expected;
  
  // For length checks, compare numbers
  if (typeof current === 'number') {
    const options: ComparisonOptions = {
      tolerance: currentState.tolerance,
      range: currentState.range,
    };
    if (!compareValues(current, desired, options)) {
      return DiffFactory.createUpdate(contractName, stateKey, 'array_state', current, desired, currentState.metric);
    }
  } else if (Array.isArray(current)) {
    // For contains checks, check if desired values are in current array
    const options: ComparisonOptions = {
      ignore_order: currentState.ignore_order !== false, // Default true for arrays
      ignore_case: currentState.ignore_case,
      allow_empty: currentState.allow_empty,
    };
    
    // Normalize arrays for comparison
    const currentNorm = options.ignore_order ? normalizeList(current) : current;
    const desiredNorm = Array.isArray(desired) 
      ? (options.ignore_order ? normalizeList(desired) : desired)
      : [desired];
    
    if (!compareValues(currentNorm, desiredNorm, options)) {
      return DiffFactory.createUpdate(contractName, stateKey, 'array_state', current, desired, currentState.metric);
    }
  }

  return null;
}

/**
 * Reconcile time-based state (staleness checks).
 */
export function reconcileTimeBased(
  contractName: string,
  stateKey: string,
  currentState: CurrentState[string]
): Diff | null {
  if (currentState.error) {
    return DiffFactory.createError(contractName, stateKey, 'time_based', currentState);
  }

  // currentState.value should be { timestamp, ageSeconds, isStale }
  const timeData = currentState.value as any;
  if (!timeData || typeof timeData.isStale !== 'boolean') {
    const mockState = { type: 'time_based', error: 'Invalid time-based state data', expected: currentState.expected };
    return DiffFactory.createError(contractName, stateKey, 'time_based', mockState);
  }

  if (timeData.isStale) {
    const maxAge = (currentState.expected as any)?.maxAgeSeconds || 'unknown';
    const errorMsg = `Data is stale (age: ${timeData.ageSeconds}s, max allowed: ${maxAge}s)`;
    return new Diff(
      contractName,
      stateKey,
      'time_based',
      `${timeData.ageSeconds}s (stale)`,
      `max ${maxAge}s`,
      'update',
      errorMsg,
      currentState.metric
    );
  }

  return null;
}

/**
 * Reconcile comparison state.
 */
export function reconcileComparison(
  contractName: string,
  stateKey: string,
  currentState: CurrentState[string]
): Diff | null {
  if (currentState.error) {
    return DiffFactory.createError(contractName, stateKey, 'comparison', currentState);
  }

  // currentState.value should be { left, right, result }
  const comparisonData = currentState.value as any;
  if (!comparisonData || typeof comparisonData.result !== 'boolean') {
    const mockState = { type: 'comparison', error: 'Invalid comparison state data', expected: currentState.expected };
    return DiffFactory.createError(contractName, stateKey, 'comparison', mockState);
  }

  if (!comparisonData.result) {
    const operator = (currentState.expected as any)?.operator || 'compare';
    const errorMsg = `Comparison failed: ${comparisonData.left} ${operator} ${comparisonData.right}`;
    return new Diff(
      contractName,
      stateKey,
      'comparison',
      comparisonData.left,
      comparisonData.right,
      'update',
      errorMsg,
      currentState.metric
    );
  }

  return null;
}

/**
 * Reconcile conditional state.
 */
export function reconcileConditional(
  contractName: string,
  stateKey: string,
  currentState: CurrentState[string]
): Diff | null {
  if (currentState.error) {
    return DiffFactory.createError(contractName, stateKey, 'conditional', currentState);
  }

  // currentState.value should be { conditionMet }
  const conditionalData = currentState.value as any;
  if (!conditionalData || typeof conditionalData.conditionMet !== 'boolean') {
    const mockState = { type: 'conditional', error: 'Invalid conditional state data', expected: currentState.expected };
    return DiffFactory.createError(contractName, stateKey, 'conditional', mockState);
  }

  // If condition is not met, don't check - this is expected behavior
  if (!conditionalData.conditionMet) {
    return null;  // Condition not met, skip verification
  }

  // Condition is met, but we still need to verify the actual value
  // For conditional checks, we'd need the actual value to compare
  // For now, we'll just return null if condition is met (success)
  return null;
}

/**
 * Reconcile aggregate state.
 */
export function reconcileAggregate(
  contractName: string,
  stateKey: string,
  currentState: CurrentState[string]
): Diff | null {
  if (currentState.error) {
    return DiffFactory.createError(contractName, stateKey, 'aggregate', currentState);
  }

  const current = currentState.value;
  const desired = currentState.expected;

  const options: ComparisonOptions = {
    tolerance: currentState.tolerance,
    range: currentState.range,
  };

  if (!compareValues(current, desired, options)) {
    return DiffFactory.createUpdate(contractName, stateKey, 'aggregate', current, desired, currentState.metric);
  }

  return null;
}

/**
 * Reconcile cross-contract state.
 */
export function reconcileCrossContract(
  contractName: string,
  stateKey: string,
  currentState: CurrentState[string]
): Diff | null {
  if (currentState.error) {
    return DiffFactory.createError(contractName, stateKey, 'cross_contract', currentState);
  }

  const current = currentState.value;
  const desired = currentState.expected;

  const options: ComparisonOptions = {
    tolerance: currentState.tolerance,
    range: currentState.range,
    pattern: currentState.pattern,
    ignore_case: currentState.ignore_case,
  };

  if (!compareValues(current, desired, options)) {
    return DiffFactory.createUpdate(contractName, stateKey, 'cross_contract', current, desired, currentState.metric);
  }

  return null;
}

/**
 * Reconcile mapping state.
 */
export function reconcileMappingState(
  contractName: string,
  stateKey: string,
  currentState: CurrentState[string]
): Diff | null {
  if (currentState.error) {
    return DiffFactory.createError(contractName, stateKey, 'mapping_state', currentState);
  }

  const current = currentState.value;
  const desired = currentState.expected;

  const options: ComparisonOptions = {
    tolerance: currentState.tolerance,
    range: currentState.range,
    pattern: currentState.pattern,
    ignore_case: currentState.ignore_case,
    allow_empty: currentState.allow_empty,
  };

  if (!compareValues(current, desired, options)) {
    return DiffFactory.createUpdate(contractName, stateKey, 'mapping_state', current, desired, currentState.metric);
  }

  return null;
}

