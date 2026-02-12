/** Storage state comparators: storage_slot, proxy. */

import type { CurrentState } from '../../chain-reader/index';
import { Diff } from '../diff';
import { DiffFactory } from '../diff-factory';
import { normalizeAddress } from '../utils';
import { compareValues, type ComparisonOptions } from '../comparison-engine';

/**
 * Reconcile storage slot state.
 */
export function reconcileStorageSlot(
  contractName: string,
  stateKey: string,
  currentState: CurrentState[string]
): Diff | null {
  if (currentState.error) {
    return DiffFactory.createError(contractName, stateKey, 'storage_slot', currentState);
  }

  let current = currentState.value;
  let desired = currentState.expected;

  // Normalize addresses if they look like addresses
  if (typeof current === 'string' && current.startsWith('0x')) {
    if (current.length === 42) {
      current = normalizeAddress(current);
    }
  }
  if (typeof desired === 'string' && desired.startsWith('0x')) {
    if (desired.length === 42) {
      desired = normalizeAddress(desired);
    }
  }

  const options: ComparisonOptions = {
    tolerance: currentState.tolerance,
    range: currentState.range,
    pattern: currentState.pattern,
    ignore_case: currentState.ignore_case,
  };

  if (!compareValues(current, desired, options)) {
    return DiffFactory.createUpdate(contractName, stateKey, 'storage_slot', current, desired, currentState.metric);
  }

  return null;
}

/**
 * Reconcile proxy state.
 */
export function reconcileProxy(
  contractName: string,
  stateKey: string,
  currentState: CurrentState[string]
): Diff | null {
  if (currentState.error) {
    return DiffFactory.createError(contractName, stateKey, 'proxy', currentState);
  }

  let current = currentState.value;
  let desired = currentState.expected;

  // Normalize addresses
  if (typeof current === 'string' && current.startsWith('0x')) {
    current = normalizeAddress(current);
  }
  if (typeof desired === 'string' && desired.startsWith('0x')) {
    desired = normalizeAddress(desired);
  }

  const options: ComparisonOptions = {
    tolerance: currentState.tolerance,
    range: currentState.range,
    pattern: currentState.pattern,
    ignore_case: currentState.ignore_case,
  };

  if (!compareValues(current, desired, options)) {
    return DiffFactory.createUpdate(contractName, stateKey, 'proxy', current, desired, currentState.metric);
  }

  return null;
}

