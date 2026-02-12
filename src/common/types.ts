/** Common type definitions for Nodrift. */

/**
 * Ethereum ABI type definition.
 * Based on Solidity ABI specification.
 */
export interface ABIFunction {
  type: 'function';
  name: string;
  inputs: ABIInput[];
  outputs: ABIOutput[];
  stateMutability?: 'pure' | 'view' | 'nonpayable' | 'payable';
}

export interface ABIEvent {
  type: 'event';
  name: string;
  inputs: ABIInput[];
  anonymous?: boolean;
}

export interface ABIError {
  type: 'error';
  name: string;
  inputs: ABIInput[];
}

export interface ABIConstructor {
  type: 'constructor';
  inputs: ABIInput[];
  stateMutability?: 'payable' | 'nonpayable';
}

export interface ABIFallback {
  type: 'fallback' | 'receive';
  stateMutability?: 'payable' | 'nonpayable';
}

export interface ABIInput {
  name: string;
  type: string;
  internalType?: string;
  indexed?: boolean;
}

export interface ABIOutput {
  name?: string;
  type: string;
  internalType?: string;
}

/**
 * Complete ABI array type - can contain functions, events, errors, constructors, etc.
 */
export type ABIItem = ABIFunction | ABIEvent | ABIError | ABIConstructor | ABIFallback | Record<string, unknown>;

/**
 * ABI array type - array of ABI items.
 */
export type ABI = ABIItem[];

/**
 * Error with a message property (common pattern in JavaScript/TypeScript).
 */
export interface ErrorWithMessage {
  message: string;
  code?: string | number;
  stack?: string;
  name?: string;
}

/**
 * Type guard to check if an error has a message property.
 */
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ErrorWithMessage).message === 'string'
  );
}

/**
 * Safely extract error message from unknown error type.
 */
export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

/**
 * Safely extract error code from unknown error type.
 */
export function getErrorCode(error: unknown): string | number | undefined {
  if (isErrorWithMessage(error) && error.code !== undefined) {
    return error.code;
  }
  if (error instanceof Error && 'code' in error) {
    return (error as { code?: string | number }).code;
  }
  return undefined;
}

