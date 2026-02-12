/** YAML schema definitions and validation for Nodrift. */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ConfigurationError, ValidationError } from '../common/exceptions';
import { getLogger } from '../common/logger';
import { processConfig } from './config-loader';

const logger = getLogger();

// Re-export types from types.ts to maintain backward compatibility
export type {
  StateType,
  NetworkConfig,
  ComparisonOperator,
  ConditionalConfig,
  ComparisonSource,
  StateEntry,
  ContractConfig,
  NodriftConfig,
} from './types';

// Import types for internal use
import type {
  StateType,
  ContractConfig,
  NodriftConfig,
} from './types';

export class SchemaValidator {
  private static readonly REQUIRED_TOP_LEVEL_KEYS = ['network', 'contracts'];

  static validateTopLevel(config: any): void {
    /** Validate top-level config structure including optional fields. */
    // Check required keys
    for (const key of this.REQUIRED_TOP_LEVEL_KEYS) {
      if (!(key in config)) {
        throw new ValidationError(`Configuration must have '${key}' section`);
      }
    }

    // Validate optional imports/includes
    if (config.imports !== undefined) {
      if (!Array.isArray(config.imports)) {
        throw new ValidationError("'imports' must be an array of file paths");
      }
      for (const importPath of config.imports) {
        if (typeof importPath !== 'string') {
          throw new ValidationError("'imports' must contain only string file paths");
        }
      }
    }

    if (config.includes !== undefined) {
      if (!Array.isArray(config.includes)) {
        throw new ValidationError("'includes' must be an array of file paths");
      }
      for (const includePath of config.includes) {
        if (typeof includePath !== 'string') {
          throw new ValidationError("'includes' must contain only string file paths");
        }
      }
    }

    // Validate optional templates
    if (config.templates !== undefined) {
      if (typeof config.templates !== 'object' || config.templates === null || Array.isArray(config.templates)) {
        throw new ValidationError("'templates' must be an object");
      }
    }
  }

  static validateNetwork(network: any): void {
    /** Validate network configuration. */
    if (typeof network !== 'object' || network === null) {
      throw new ValidationError('Network configuration must be an object');
    }

    if (!network.rpc_url) {
      throw new ValidationError("Network must have 'rpc_url'");
    }

    const rpcUrl = network.rpc_url;
    if (typeof rpcUrl !== 'string' || !rpcUrl) {
      throw new ValidationError("Network 'rpc_url' must be a non-empty string");
    }

    // Support environment variable substitution
    // Note: We don't check if env var is set here - that happens during resolution
    // This validation just checks the format is correct

    if (typeof network.chain_id !== 'number' || network.chain_id < 1) {
      throw new ValidationError("Network 'chain_id' must be a positive integer");
    }
  }

  static validateContract(contract: any, contractName: string): void {
    /** Validate contract configuration. */
    if (typeof contract !== 'object' || contract === null) {
      throw new ValidationError(
        `Contract '${contractName}' configuration must be an object`
      );
    }

    if (!contract.address) {
      throw new ValidationError(`Contract '${contractName}' must have 'address'`);
    }

    const address = contract.address;
    if (typeof address !== 'string') {
      throw new ValidationError(
        `Contract '${contractName}' address must be a string`
      );
    }

    // Support environment variable substitution for addresses
    // Note: We don't check if env var is set here - that happens during resolution
    // This validation just checks the format is correct
    // Only validate address format if it's not an env var placeholder
    if (!address.startsWith('${') || !address.endsWith('}')) {
      if (!address.startsWith('0x')) {
        throw new ValidationError(
          `Contract '${contractName}' address must be a valid Ethereum address (0x...)`
        );
      }
    }

    // Validate template field if present
    if (contract.template !== undefined && typeof contract.template !== 'string') {
      throw new ValidationError(
        `Contract '${contractName}' 'template' field must be a string`
      );
    }

    // Validate preset field if present
    if (contract.preset !== undefined) {
      if (typeof contract.preset !== 'string') {
        throw new ValidationError(
          `Contract '${contractName}' 'preset' field must be a string`
        );
      }
      const validPresets = ['erc20', 'erc721', 'erc1155', 'erc4626', 'diamond', 'proxy', 'accessControl'];
      if (!validPresets.includes(contract.preset)) {
        throw new ValidationError(
          `Contract '${contractName}' has invalid preset '${contract.preset}'. ` +
          `Must be one of: ${validPresets.join(', ')}`
        );
      }
      // Preset and template are mutually exclusive
      if (contract.template) {
        throw new ValidationError(
          `Contract '${contractName}' cannot have both 'preset' and 'template' fields. Use one or the other.`
        );
      }
    }

    // Validate ABI field (can be array or string file reference)
    if (contract.abi !== undefined) {
      if (typeof contract.abi === 'string') {
        // File reference - validate format
        if (!contract.abi.startsWith('${file:') || !contract.abi.endsWith('}')) {
          throw new ValidationError(
            `Contract '${contractName}' ABI file reference must use format: ${'${file:./path.json}'}`
          );
        }
      } else if (!Array.isArray(contract.abi)) {
        throw new ValidationError(
          `Contract '${contractName}' 'abi' must be an array or file reference string`
        );
      }
    }

    // State is optional if using preset (presets provide their own state)
    if (!contract.state && !contract.preset) {
      throw new ValidationError(`Contract '${contractName}' must have 'state' section (or use a preset)`);
    }

    if (contract.state && (typeof contract.state !== 'object' || contract.state === null)) {
      throw new ValidationError(`Contract '${contractName}' state must be an object`);
    }

    const state = contract.state || {};

    // Validate state entries (if state is provided)
    for (const [key, value] of Object.entries(state)) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new ValidationError(
          `State entry '${key}' in '${contractName}' must be an object`
        );
      }

      const stateEntry = value as any;

      if (!stateEntry.type) {
        throw new ValidationError(
          `State entry '${key}' in '${contractName}' must have 'type'`
        );
      }

      const validTypes: StateType[] = [
        'owner', 'role', 'variable', 'function_call',
        'storage_slot', 'cross_contract', 'aggregate', 'conditional',
        'time_based', 'comparison', 'array_state', 'mapping_state',
        'proxy'
      ];
      const stateType = stateEntry.type;
      if (!validTypes.includes(stateType)) {
        throw new ValidationError(
          `State entry '${key}' in '${contractName}' has invalid type '${stateType}'. ` +
            `Must be one of: ${validTypes.join(', ')}`
        );
      }

      // Type-specific validations
      if (stateType === 'role') {
        // Role can have either 'role' (hash) or 'role_name' (human-readable)
        if (!stateEntry.role && !stateEntry.role_name) {
          throw new ValidationError(
            `Role entry '${key}' in '${contractName}' must have either 'role' (hash) or 'role_name' field`
          );
        }
        if (!stateEntry.members) {
          throw new ValidationError(
            `Role entry '${key}' in '${contractName}' must have 'members' array`
          );
        }
      } else if (stateType === 'variable') {
        // Variable should have value for comparison
        if (stateEntry.value === undefined) {
          throw new ValidationError(
            `Variable entry '${key}' in '${contractName}' should have 'value' field for comparison`
          );
        }
      } else if (stateType === 'function_call') {
        // Function call should have function name and expected value
        if (!stateEntry.function && stateEntry.type === 'function_call') {
          throw new ValidationError(
            `Function call entry '${key}' in '${contractName}' should specify 'function' name`
          );
        }
        if (stateEntry.value === undefined) {
          throw new ValidationError(
            `Function call entry '${key}' in '${contractName}' must have 'value' (expected return value)`
          );
        }
      } else if (stateType === 'storage_slot') {
        if (!stateEntry.slot && !stateEntry.slot_name) {
          throw new ValidationError(
            `Storage slot entry '${key}' in '${contractName}' must have either 'slot' (hex) or 'slot_name' field`
          );
        }
        if (stateEntry.value === undefined) {
          throw new ValidationError(
            `Storage slot entry '${key}' in '${contractName}' must have 'value' field`
          );
        }
      } else if (stateType === 'cross_contract') {
        if (!stateEntry.source_contract || !stateEntry.source_function) {
          throw new ValidationError(
            `Cross-contract entry '${key}' in '${contractName}' must have 'source_contract' and 'source_function' fields`
          );
        }
        if (!stateEntry.target_contract) {
          throw new ValidationError(
            `Cross-contract entry '${key}' in '${contractName}' must have 'target_contract' field`
          );
        }
      } else if (stateType === 'aggregate') {
        if (!stateEntry.operation || !stateEntry.function) {
          throw new ValidationError(
            `Aggregate entry '${key}' in '${contractName}' must have 'operation' and 'function' fields`
          );
        }
      } else if (stateType === 'conditional') {
        if (!stateEntry.condition) {
          throw new ValidationError(
            `Conditional entry '${key}' in '${contractName}' must have 'condition' field`
          );
        }
      } else if (stateType === 'time_based') {
        if (!stateEntry.function || stateEntry.max_age_seconds === undefined) {
          throw new ValidationError(
            `Time-based entry '${key}' in '${contractName}' must have 'function' and 'max_age_seconds' fields`
          );
        }
      } else if (stateType === 'comparison') {
        if (!stateEntry.left || !stateEntry.right || !stateEntry.operator) {
          throw new ValidationError(
            `Comparison entry '${key}' in '${contractName}' must have 'left', 'right', and 'operator' fields`
          );
        }
      } else if (stateType === 'array_state') {
        if (!stateEntry.function || !stateEntry.check) {
          throw new ValidationError(
            `Array state entry '${key}' in '${contractName}' must have 'function' and 'check' fields`
          );
        }
      } else if (stateType === 'mapping_state') {
        if (!stateEntry.function || stateEntry.key === undefined) {
          throw new ValidationError(
            `Mapping state entry '${key}' in '${contractName}' must have 'function' and 'key' fields`
          );
        }
      } else if (stateType === 'proxy') {
        if (!stateEntry.proxy_pattern || !stateEntry.proxy_check) {
          throw new ValidationError(
            `Proxy entry '${key}' in '${contractName}' must have 'proxy_pattern' and 'proxy_check' fields`
          );
        }
        if (stateEntry.value === undefined) {
          throw new ValidationError(
            `Proxy entry '${key}' in '${contractName}' must have 'value' field`
          );
        }
      }
    }
  }

  static validate(config: any): void {
    /** Validate entire configuration schema. */
    // Validate top-level structure (including optional fields)
    this.validateTopLevel(config);

    // Validate network
    this.validateNetwork(config.network);

    // Validate contracts
    if (typeof config.contracts !== 'object' || config.contracts === null) {
      throw new ValidationError("'contracts' must be an object");
    }

    for (const [contractName, contractConfig] of Object.entries(config.contracts)) {
      this.validateContract(contractConfig, contractName);
    }
  }
}

export function loadSchema(filePath: string): NodriftConfig {
  /**
   * Load and validate YAML schema from file.
   * Throws ConfigurationError or ValidationError with helpful messages.
   * Supports enhanced features: file loading, includes, templates, variable resolution.
   */
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

  // Note: We keep templates, imports, includes for validation
  // They're processed by processConfig but validated here

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

  // Type assertion: After processing, ABIs are guaranteed to be arrays
  // processConfig converts all string ABIs to arrays
  const processedConfig = config as Omit<NodriftConfig, 'contracts'> & {
    contracts: Record<string, Omit<ContractConfig, 'abi'> & { abi: any[] }>;
  };

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
  
  // Return with proper types (ABIs are arrays after processing)
  return processedConfig as NodriftConfig;
}

