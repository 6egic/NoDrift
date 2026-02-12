/** Constants used throughout the Nodrift application. */

/**
 * Default number of retries for RPC operations.
 */
export const DEFAULT_RPC_RETRIES = 3;

/**
 * Default timeout for RPC operations in milliseconds.
 */
export const DEFAULT_RPC_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Minimum timeout for RPC operations in milliseconds.
 */
export const MIN_RPC_TIMEOUT_MS = 1000; // 1 second

/**
 * Default retry delay for RPC operations in milliseconds.
 */
export const DEFAULT_RETRY_DELAY_MS = 1000; // 1 second

/**
 * Timeout for command execution in milliseconds.
 */
export const COMMAND_EXECUTION_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Environment variable name for custom RPC retries.
 */
export const ENV_RPC_RETRIES = 'NODRIFT_RPC_RETRIES';

/**
 * Environment variable name for custom RPC timeout.
 */
export const ENV_RPC_TIMEOUT = 'NODRIFT_RPC_TIMEOUT';

