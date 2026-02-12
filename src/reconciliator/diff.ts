/** Diff class representing a difference between desired and actual state. */

import type { MetricConfig } from '../config/types';

export class Diff {
  /** Represents a difference between desired and actual state. */
  contractName: string;
  stateKey: string;
  stateType: string;
  currentValue: unknown;
  desiredValue: unknown;
  action: string; // 'add', 'remove', 'update', 'error'
  error?: string;
  metric?: MetricConfig;

  constructor(
    contractName: string,
    stateKey: string,
    stateType: string,
    currentValue: unknown,
    desiredValue: unknown,
    action: string,
    error?: string,
    metric?: MetricConfig
  ) {
    this.contractName = contractName;
    this.stateKey = stateKey;
    this.stateType = stateType;
    this.currentValue = currentValue;
    this.desiredValue = desiredValue;
    this.action = action;
    this.error = error;
    this.metric = metric;
  }

  toString(): string {
    return `Diff(contract=${this.contractName}, key=${this.stateKey}, type=${this.stateType}, action=${this.action})`;
  }

  toDict(): Record<string, unknown> {
    /** Convert diff to dictionary for serialization. */
    return {
      contract: this.contractName,
      key: this.stateKey,
      type: this.stateType,
      current: this.currentValue,
      desired: this.desiredValue,
      action: this.action,
      error: this.error,
      metric: this.metric,
    };
  }
}

