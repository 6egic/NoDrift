/** Main Reconciliator class - orchestrates all state comparators. */

import type { CurrentState } from '../chain-reader/index';
import { Diff } from './diff';
import { DiffFactory } from './diff-factory';
import { reconcileOwner, reconcileRole, reconcileVariable, reconcileFunctionCall } from './comparators/basic-comparator';
import { reconcileStorageSlot, reconcileProxy } from './comparators/storage-comparator';
import {
  reconcileArrayState,
  reconcileTimeBased,
  reconcileComparison,
  reconcileConditional,
  reconcileAggregate,
  reconcileCrossContract,
  reconcileMappingState,
} from './comparators/advanced-comparator';

/**
 * Main Reconciliator class for comparing desired state with on-chain state.
 */
export class Reconciliator {
  /**
   * Reconcile all states for all contracts.
   */
  static reconcileAll(currentStates: Record<string, CurrentState>): Diff[] {
    const allDiffs: Diff[] = [];

    for (const [contractName, states] of Object.entries(currentStates)) {
      for (const [stateKey, state] of Object.entries(states)) {
        const stateType = state.type;
        let diffs: Diff | Diff[] | null = null;

        try {
          if (stateType === 'owner') {
            diffs = reconcileOwner(contractName, stateKey, state);
          } else if (stateType === 'role') {
            diffs = reconcileRole(contractName, stateKey, state);
          } else if (stateType === 'variable') {
            diffs = reconcileVariable(contractName, stateKey, state);
          } else if (stateType === 'function_call') {
            diffs = reconcileFunctionCall(contractName, stateKey, state);
          } else if (stateType === 'storage_slot') {
            diffs = reconcileStorageSlot(contractName, stateKey, state);
          } else if (stateType === 'proxy') {
            diffs = reconcileProxy(contractName, stateKey, state);
          } else if (stateType === 'array_state') {
            diffs = reconcileArrayState(contractName, stateKey, state);
          } else if (stateType === 'mapping_state') {
            diffs = reconcileMappingState(contractName, stateKey, state);
          } else if (stateType === 'time_based') {
            diffs = reconcileTimeBased(contractName, stateKey, state);
          } else if (stateType === 'comparison') {
            diffs = reconcileComparison(contractName, stateKey, state);
          } else if (stateType === 'conditional') {
            diffs = reconcileConditional(contractName, stateKey, state);
          } else if (stateType === 'aggregate') {
            diffs = reconcileAggregate(contractName, stateKey, state);
          } else if (stateType === 'cross_contract') {
            diffs = reconcileCrossContract(contractName, stateKey, state);
          } else {
            // Unknown state type - create error diff
            const mockState = { type: stateType, error: `Unknown state type: ${stateType}`, expected: null };
            diffs = DiffFactory.createError(contractName, stateKey, stateType, mockState);
          }

          if (diffs) {
            if (Array.isArray(diffs)) {
              allDiffs.push(...diffs);
            } else {
              allDiffs.push(diffs);
            }
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const mockState = { type: stateType, error: errorMessage, expected: null };
          allDiffs.push(
            DiffFactory.createError(contractName, stateKey, stateType, mockState)
          );
        }
      }
    }

    return allDiffs;
  }
}

// Re-export Diff for convenience
export { Diff };

