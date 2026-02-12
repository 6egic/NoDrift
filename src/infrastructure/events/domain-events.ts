/** Domain events for verification lifecycle. */

import type { DomainEvent } from './event-bus';
import type { CurrentState } from '../../chain-reader/types';
import type { Diff } from '../../reconciliator/diff';

/**
 * Verification session started.
 */
export interface VerificationStartedEvent extends DomainEvent {
  type: 'verification.started';
  sessionId: string;
  contractCount: number;
  configFile: string;
}

/**
 * Contract state reading started.
 */
export interface ContractReadStartedEvent extends DomainEvent {
  type: 'contract.read.started';
  sessionId: string;
  contractName: string;
  address: string;
  chainId: number;
}

/**
 * Contract state reading completed.
 */
export interface ContractReadCompletedEvent extends DomainEvent {
  type: 'contract.read.completed';
  sessionId: string;
  contractName: string;
  address: string;
  chainId: number;
  duration: number;
  stateCount: number;
}

/**
 * Contract state reading failed.
 */
export interface ContractReadFailedEvent extends DomainEvent {
  type: 'contract.read.failed';
  sessionId: string;
  contractName: string;
  address: string;
  chainId: number;
  error: string;
}

/**
 * All contract states read.
 */
export interface StatesReadEvent extends DomainEvent {
  type: 'states.read';
  sessionId: string;
  contractCount: number;
  successCount: number;
  failureCount: number;
  duration: number;
}

/**
 * Reconciliation started.
 */
export interface ReconciliationStartedEvent extends DomainEvent {
  type: 'reconciliation.started';
  sessionId: string;
  contractCount: number;
}

/**
 * Reconciliation completed.
 */
export interface ReconciliationCompletedEvent extends DomainEvent {
  type: 'reconciliation.completed';
  sessionId: string;
  driftCount: number;
  duration: number;
}

/**
 * Drift detected.
 */
export interface DriftDetectedEvent extends DomainEvent {
  type: 'drift.detected';
  sessionId: string;
  contractName: string;
  diff: Diff;
}

/**
 * Verification completed.
 */
export interface VerificationCompletedEvent extends DomainEvent {
  type: 'verification.completed';
  sessionId: string;
  success: boolean;
  driftCount: number;
  duration: number;
  summary: {
    totalContracts: number;
    successfulReads: number;
    failedReads: number;
    totalDrifts: number;
  };
}

/**
 * Verification failed.
 */
export interface VerificationFailedEvent extends DomainEvent {
  type: 'verification.failed';
  sessionId: string;
  error: string;
  duration: number;
}

/**
 * RPC call started.
 */
export interface RpcCallStartedEvent extends DomainEvent {
  type: 'rpc.call.started';
  sessionId: string;
  method: string;
  params?: unknown[];
}

/**
 * RPC call completed.
 */
export interface RpcCallCompletedEvent extends DomainEvent {
  type: 'rpc.call.completed';
  sessionId: string;
  method: string;
  duration: number;
  cached: boolean;
}

/**
 * RPC call failed.
 */
export interface RpcCallFailedEvent extends DomainEvent {
  type: 'rpc.call.failed';
  sessionId: string;
  method: string;
  error: string;
  retryCount: number;
}

/**
 * Cache hit.
 */
export interface CacheHitEvent extends DomainEvent {
  type: 'cache.hit';
  sessionId: string;
  key: string;
}

/**
 * Cache miss.
 */
export interface CacheMissEvent extends DomainEvent {
  type: 'cache.miss';
  sessionId: string;
  key: string;
}

/**
 * Plugin loaded.
 */
export interface PluginLoadedEvent extends DomainEvent {
  type: 'plugin.loaded';
  pluginName: string;
  pluginVersion: string;
}

/**
 * Plugin error.
 */
export interface PluginErrorEvent extends DomainEvent {
  type: 'plugin.error';
  pluginName: string;
  error: string;
  hook?: string;
}

/**
 * Configuration loaded.
 */
export interface ConfigLoadedEvent extends DomainEvent {
  type: 'config.loaded';
  configFile: string;
  contractCount: number;
  hasPresets: boolean;
}

/**
 * Configuration validation failed.
 */
export interface ConfigValidationFailedEvent extends DomainEvent {
  type: 'config.validation.failed';
  configFile: string;
  errors: string[];
}

/**
 * Union type of all domain events.
 */
export type AllDomainEvents =
  | VerificationStartedEvent
  | ContractReadStartedEvent
  | ContractReadCompletedEvent
  | ContractReadFailedEvent
  | StatesReadEvent
  | ReconciliationStartedEvent
  | ReconciliationCompletedEvent
  | DriftDetectedEvent
  | VerificationCompletedEvent
  | VerificationFailedEvent
  | RpcCallStartedEvent
  | RpcCallCompletedEvent
  | RpcCallFailedEvent
  | CacheHitEvent
  | CacheMissEvent
  | PluginLoadedEvent
  | PluginErrorEvent
  | ConfigLoadedEvent
  | ConfigValidationFailedEvent;

/**
 * Helper to create domain events with common fields.
 */
export function createEvent<T extends DomainEvent>(
  type: T['type'],
  data: Omit<T, 'type' | 'timestamp'>,
  correlationId?: string
): T {
  return {
    type,
    timestamp: Date.now(),
    correlationId,
    ...data,
  } as T;
}
