/** Enhanced exit codes for better CI/CD integration. */

import {
  NodriftError,
  ConfigurationError,
  ConnectionError,
  ValidationError,
  StateReadError,
  ContractError,
} from './exceptions';

/**
 * Exit codes used by Nodrift for CI/CD integration.
 */
export enum ExitCode {
  /** Success, no drift detected */
  SUCCESS = 0,
  /** Drift detected (if --fail-on-drift is set) */
  DRIFT_DETECTED = 1,
  /** Configuration error (invalid YAML, missing fields, etc.) */
  CONFIGURATION_ERROR = 2,
  /** RPC connection error (network issues, timeout) */
  CONNECTION_ERROR = 3,
  /** Contract read error (contract not found, ABI mismatch, state read failure) */
  CONTRACT_ERROR = 4,
  /** Validation error (schema validation failed) */
  VALIDATION_ERROR = 5,
  /** File system error (cannot read config, cannot write output) */
  FILE_SYSTEM_ERROR = 6,
}

/**
 * Determine the appropriate exit code based on error type and drift status.
 * 
 * @param error - The error that occurred (if any)
 * @param hasDrift - Whether drift was detected
 * @param failOnDrift - Whether to fail on drift (from --fail-on-drift flag)
 * @returns The exit code to use
 */
export function getExitCode(
  error: unknown,
  hasDrift: boolean,
  failOnDrift: boolean
): ExitCode {
  if (error) {
    if (error instanceof ConfigurationError) {
      return ExitCode.CONFIGURATION_ERROR;
    }
    if (error instanceof ValidationError) {
      return ExitCode.VALIDATION_ERROR;
    }
    if (error instanceof ConnectionError) {
      return ExitCode.CONNECTION_ERROR;
    }
    if (error instanceof StateReadError || error instanceof ContractError) {
      return ExitCode.CONTRACT_ERROR;
    }
    // Check for file system errors
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code: string }).code;
      if (code === 'ENOENT' || code === 'EACCES' || code === 'EISDIR') {
        return ExitCode.FILE_SYSTEM_ERROR;
      }
    }
    // Generic Nodrift error
    if (error instanceof NodriftError) {
      return ExitCode.DRIFT_DETECTED; // Use drift code for generic errors
    }
    return ExitCode.DRIFT_DETECTED; // Unknown error
  }
  
  // No error - check for drift
  if (hasDrift && failOnDrift) {
    return ExitCode.DRIFT_DETECTED;
  }
  
  return ExitCode.SUCCESS;
}

/**
 * Get a human-readable description of an exit code.
 */
export function getExitCodeDescription(code: ExitCode): string {
  const descriptions: Record<ExitCode, string> = {
    [ExitCode.SUCCESS]: 'Success, no drift detected',
    [ExitCode.DRIFT_DETECTED]: 'Drift detected',
    [ExitCode.CONFIGURATION_ERROR]: 'Configuration error',
    [ExitCode.CONNECTION_ERROR]: 'RPC connection error',
    [ExitCode.CONTRACT_ERROR]: 'Contract read error',
    [ExitCode.VALIDATION_ERROR]: 'Validation error',
    [ExitCode.FILE_SYSTEM_ERROR]: 'File system error',
  };
  return descriptions[code] || 'Unknown error';
}

