/** Basic state comparators: owner, role, variable, function_call. */

import type { CurrentState } from '../../chain-reader/index';
import { Diff } from '../diff';
import { DiffFactory } from '../diff-factory';
import { normalizeAddress, normalizeList } from '../utils';
import { compareValues, type ComparisonOptions } from '../comparison-engine';

/**
 * Reconcile owner state.
 */
export function reconcileOwner(
  contractName: string,
  stateKey: string,
  currentState: CurrentState[string]
): Diff | null {
  if (currentState.error) {
    return DiffFactory.createError(contractName, stateKey, 'owner', currentState);
  }

  const current = normalizeAddress(currentState.value);
  const desired = normalizeAddress(currentState.expected);

  if (!compareValues(current, desired)) {
    return DiffFactory.createUpdate(contractName, stateKey, 'owner', current, desired, currentState.metric);
  }

  return null;
}

/**
 * Reconcile role state.
 */
export function reconcileRole(
  contractName: string,
  stateKey: string,
  currentState: CurrentState[string]
): Diff[] {
  const diffs: Diff[] = [];

  if (currentState.error) {
    return [
      DiffFactory.createError(contractName, stateKey, 'role', currentState)
    ];
  }

  const currentMembers = normalizeList(Array.isArray(currentState.value) ? currentState.value : []);
  const desiredMembers = normalizeList(Array.isArray(currentState.expected) ? currentState.expected : []);

  const currentSet = new Set(currentMembers);
  const desiredSet = new Set(desiredMembers);

  // Members to add
  const toAdd = desiredMembers.filter((m) => !currentSet.has(m));
  if (toAdd.length > 0) {
    diffs.push(
      DiffFactory.createAdd(contractName, stateKey, 'role', desiredMembers, currentState.metric)
    );
  }

  // Members to remove
  const toRemove = currentMembers.filter((m) => !desiredSet.has(m));
  if (toRemove.length > 0) {
    diffs.push(
      DiffFactory.createRemove(contractName, stateKey, 'role', currentMembers, currentState.metric)
    );
  }

  return diffs;
}

/**
 * Reconcile variable state.
 */
export function reconcileVariable(
  contractName: string,
  stateKey: string,
  currentState: CurrentState[string]
): Diff | null {
  if (currentState.error) {
    return DiffFactory.createError(contractName, stateKey, 'variable', currentState);
  }

  let current = currentState.value;
  let desired = currentState.expected;

  // Normalize addresses in values
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
    ignore_order: currentState.ignore_order,
    allow_empty: currentState.allow_empty,
  };
  
  if (!compareValues(current, desired, options)) {
    return DiffFactory.createUpdate(contractName, stateKey, 'variable', current, desired, currentState.metric);
  }

  return null;
}

/**
 * Reconcile function call state.
 */
export function reconcileFunctionCall(
  contractName: string,
  stateKey: string,
  currentState: CurrentState[string]
): Diff | null {
  if (currentState.error) {
    return DiffFactory.createError(contractName, stateKey, 'function_call', currentState);
  }

  const current = currentState.value;
  const desired = currentState.expected;

  const options: ComparisonOptions = {
    tolerance: currentState.tolerance,
    range: currentState.range,
    pattern: currentState.pattern,
    ignore_case: currentState.ignore_case,
    ignore_order: currentState.ignore_order,
    allow_empty: currentState.allow_empty,
  };

  if (!compareValues(current, desired, options)) {
    return DiffFactory.createUpdate(contractName, stateKey, 'function_call', current, desired, currentState.metric);
  }

  return null;
}

