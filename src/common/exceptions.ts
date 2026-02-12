/** Custom exceptions for Nodrift. */

export class NodriftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConfigurationError extends NodriftError {
  /** Raised when configuration is invalid. */
}

export class ValidationError extends NodriftError {
  /** Raised when schema validation fails. */
}

export class ConnectionError extends NodriftError {
  /** Raised when unable to connect to RPC endpoint. */
}

export class ContractError extends NodriftError {
  /** Raised when contract interaction fails. */
}

export class StateReadError extends ContractError {
  /** Raised when unable to read contract state. */
}

