/** YAML schema definitions and validation for Nodrift using Zod. */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import { ConfigurationError, ValidationError } from '../common/exceptions';
import { getLogger } from '../common/logger';
import { processConfig } from './config-loader';
import {
  NodriftConfigSchema,
  NetworkConfigSchema,
  ContractConfigSchema,
  StateEntrySchema,
} from './zod-schemas';

const logger = getLogger();

// Re-export types from zod-schemas for backward compatibility
export type {
  StateType,
  NetworkConfig,
  ComparisonOperator,
  ConditionalConfig,
  ComparisonSource,
  StateEntry,
  ContractConfig,
  NodriftConfig,
  MetricSeverity,
  MetricCategory,
  MetricConfig,
} from './zod-schemas';

/**
 * Enhanced schema validator using Zod for type-safe validation.
 * Provides better error messages and automatic type inference.
 */
export class SchemaValidator {
  /**
   * Validate top-level configuration structure.
   * @throws {ValidationError} if validation fails
   */
  static validateTopLevel(config: unknown): void {
    try {
      // Validate basic structure
      const basicSchema = z.object({
        network: z.unknown(),
        contracts: z.unknown(),
        imports: z.array(z.string()).optional(),
        includes: z.array(z.string()).optional(),
        templates: z.record(z.string(), z.unknown()).optional(),
      });
      
      basicSchema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map((err: z.ZodIssue) => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        throw new ValidationError(`Configuration validation failed:\n  - ${messages.join('\n  - ')}`);
      }
      throw error;
    }
  }

  /**
   * Validate network configuration.
   * @throws {ValidationError} if validation fails
   */
  static validateNetwork(network: unknown): void {
    try {
      NetworkConfigSchema.parse(network);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map((err: z.ZodIssue) => {
          const path = err.path.join('.');
          return path ? `network.${path}: ${err.message}` : `network: ${err.message}`;
        });
        throw new ValidationError(`Network configuration validation failed:\n  - ${messages.join('\n  - ')}`);
      }
      throw error;
    }
  }

  /**
   * Validate contract configuration.
   * @throws {ValidationError} if validation fails
   */
  static validateContract(contract: unknown, contractName: string): void {
    try {
      ContractConfigSchema.parse(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map((err: z.ZodIssue) => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        throw new ValidationError(
          `Contract '${contractName}' validation failed:\n  - ${messages.join('\n  - ')}`
        );
      }
      throw error;
    }
  }

  /**
   * Validate state entry.
   * @throws {ValidationError} if validation fails
   */
  static validateStateEntry(stateEntry: unknown, entryName: string, contractName: string): void {
    try {
      StateEntrySchema.parse(stateEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map((err: z.ZodIssue) => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        throw new ValidationError(
          `State entry '${entryName}' in contract '${contractName}' validation failed:\n  - ${messages.join('\n  - ')}`
        );
      }
      throw error;
    }
  }

  /**
   * Validate entire configuration schema.
   * @throws {ValidationError} if validation fails
   */
  static validate(config: unknown): void {
    try {
      NodriftConfigSchema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map((err: z.ZodIssue) => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        throw new ValidationError(
          `Configuration validation failed:\n  - ${messages.join('\n  - ')}`
        );
      }
      throw error;
    }
  }

  /**
   * Safe parse that returns result instead of throwing.
   * Useful for validation checks without exceptions.
   */
  static safeParse(config: unknown) {
    return NodriftConfigSchema.safeParse(config);
  }
}

/**
 * Load and validate YAML schema from file.
 * Throws ConfigurationError or ValidationError with helpful messages.
 * Supports enhanced features: file loading, includes, templates, variable resolution.
 */
export function loadSchema(filePath: string): z.infer<typeof NodriftConfigSchema> {
  const baseDir = path.dirname(path.resolve(filePath));
  let config: any;
  
  try {
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    config = yaml.load(fileContents);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new ConfigurationError(
        `Configuration file not found: ${filePath}\n` +
        `  Tip: Use an absolute path or check that the file exists.`
      );
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'YAMLException') {
      const yamlError = error as unknown as { message: string; mark?: { line: number; column: number } };
      const lineInfo = yamlError.mark 
        ? ` at line ${yamlError.mark.line + 1}, column ${yamlError.mark.column + 1}`
        : '';
      throw new ConfigurationError(
        `Invalid YAML in configuration file${lineInfo}: ${yamlError.message}\n` +
        `  Tip: Check your YAML syntax, ensure proper indentation, and verify all quotes are closed.`
      );
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ConfigurationError(
      `Error reading configuration file: ${errorMessage}\n` +
      `  File: ${filePath}`
    );
  }

  if (config === null || config === undefined) {
    throw new ValidationError('Configuration file is empty');
  }

  if (typeof config !== 'object') {
    throw new ValidationError('Configuration file must contain an object');
  }

  // Process config with enhanced features (includes, templates, file loading, variable resolution)
  try {
    config = processConfig(config, baseDir);
  } catch (error: unknown) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ConfigurationError(`Config processing failed: ${errorMessage}`);
  }

  // Validate using Zod schema
  try {
    SchemaValidator.validate(config);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Configuration validation failed: ${error}`);
  }

  // After processing and validation, ensure ABIs are arrays (not strings)
  // processConfig should have converted file references to arrays, but ensure type safety
  if (config.contracts) {
    for (const contractName of Object.keys(config.contracts)) {
      const contract = config.contracts[contractName];
      if (contract.abi !== undefined) {
        if (typeof contract.abi === 'string') {
          // This shouldn't happen after processConfig, but handle it gracefully
          throw new ConfigurationError(
            `Contract '${contractName}' ABI file reference was not resolved. Please ensure the ABI file exists and is accessible.`
          );
        }
        // Ensure abi is array
        if (!Array.isArray(contract.abi)) {
          contract.abi = [];
        }
      }
    }
  }

  // Validate that required environment variables are set (after processing)
  // This is done after processConfig since it handles variable resolution
  if (config.network && config.network.rpc_url) {
    const rpcUrl = config.network.rpc_url;
    if (typeof rpcUrl === 'string' && (rpcUrl.startsWith('${') || !rpcUrl.startsWith('http'))) {
      throw new ValidationError(
        `Network 'rpc_url' must be resolved to a valid URL. Check environment variables.`
      );
    }
  }

  // Validate contract addresses after resolution
  if (config.contracts) {
    for (const contractName of Object.keys(config.contracts)) {
      const contract = config.contracts[contractName];
      
      if (contract.address && typeof contract.address === 'string') {
        // Check if still unresolved
        if (contract.address.startsWith('${') && contract.address.endsWith('}')) {
          const envVar = contract.address.slice(2, -1);
          throw new ValidationError(
            `Environment variable '${envVar}' not set (used in contract '${contractName}' address)`
          );
        }
        // Validate resolved address format
        if (!contract.address.startsWith('0x')) {
          throw new ValidationError(
            `Contract '${contractName}' address must be a valid Ethereum address (0x...)`
          );
        }
      }
    }
  }

  logger.info(`Successfully loaded configuration from ${filePath}`);
  
  // Return validated config with proper types
  return config as z.infer<typeof NodriftConfigSchema>;
}
