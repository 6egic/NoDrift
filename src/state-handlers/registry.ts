/** State handler registry for extensible state type support. */

import type { StateEntry } from '../config/schema';
import type { CurrentState } from '../chain-reader/index';
import { Diff } from '../reconciliator/diff';
import type { ChainReader } from '../chain-reader/index';

/**
 * Interface for state handlers that can read and reconcile state.
 */
export interface StateHandler {
  /** The state type this handler supports. */
  type: string;
  
  /**
   * Read state from the blockchain.
   */
  read(
    contract: any,
    contractAddress: string,
    config: StateEntry,
    reader: ChainReader,
    allContracts?: Record<string, { address: string; abi: any[] }>
  ): Promise<CurrentState[string]>;
  
  /**
   * Reconcile current state with desired state.
   */
  reconcile(
    contractName: string,
    stateKey: string,
    currentState: CurrentState[string]
  ): Diff | Diff[] | null;
}

/**
 * Registry for state handlers.
 */
export class StateHandlerRegistry {
  private handlers: Map<string, StateHandler> = new Map();
  
  /**
   * Register a state handler.
   */
  register(handler: StateHandler): void {
    this.handlers.set(handler.type, handler);
  }
  
  /**
   * Get a handler for a specific state type.
   */
  get(type: string): StateHandler | undefined {
    return this.handlers.get(type);
  }
  
  /**
   * Check if a handler exists for a state type.
   */
  has(type: string): boolean {
    return this.handlers.has(type);
  }
  
  /**
   * Get all registered handler types.
   */
  getTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

/**
 * Global state handler registry instance.
 */
export const stateHandlerRegistry = new StateHandlerRegistry();

