/** Configuration validation utilities using Zod. */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { loadSchema, SchemaValidator } from './schema';
import { ConfigurationError, ValidationError } from '../common/exceptions';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  contractCount: number;
  stateEntryCount: number;
}

/**
 * Validate a configuration file and return detailed results.
 * This is a more detailed version that provides warnings and suggestions.
 */
export function validateConfigFile(filePath: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check file exists
    if (!fs.existsSync(filePath)) {
      errors.push(`Configuration file not found: ${filePath}`);
      return { valid: false, errors, warnings, contractCount: 0, stateEntryCount: 0 };
    }

    // Check file is readable
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch {
      errors.push(`Configuration file is not readable: ${filePath}`);
      return { valid: false, errors, warnings, contractCount: 0, stateEntryCount: 0 };
    }

    // Try to load and validate
    try {
      const config = loadSchema(filePath);
      
      // Count contracts and state entries
      const contractCount = Object.keys(config.contracts).length;
      let stateEntryCount = 0;
      for (const contract of Object.values(config.contracts)) {
        if (contract.state) {
          if (Array.isArray(contract.state)) {
            stateEntryCount += contract.state.length;
          } else {
            stateEntryCount += Object.keys(contract.state).length;
          }
        }
      }

      // Additional validation checks
      // Check for common issues
      if (contractCount === 0) {
        warnings.push('No contracts defined in configuration');
      }

      // Check for contracts with no state entries
      for (const [contractName, contract] of Object.entries(config.contracts)) {
        const stateKeys = contract.state 
          ? (Array.isArray(contract.state) ? contract.state.length : Object.keys(contract.state).length)
          : 0;
        if (stateKeys === 0 && !contract.preset) {
          warnings.push(`Contract '${contractName}' has no state entries to verify and no preset`);
        }
      }

      // Check if .env file exists
      const configDir = path.dirname(path.resolve(filePath));
      const envFile = path.join(configDir, '.env');
      if (!fs.existsSync(envFile)) {
        // Check if any env vars are used
        const fileContents = fs.readFileSync(filePath, 'utf-8');
        if (fileContents.includes('${')) {
          warnings.push(
            `Configuration uses environment variables but no .env file found in ${configDir}`
          );
        }
      }

      return {
        valid: true,
        errors: [],
        warnings,
        contractCount,
        stateEntryCount,
      };
    } catch (error: unknown) {
      if (error instanceof ConfigurationError || error instanceof ValidationError) {
        errors.push(error.message);
      } else if (error instanceof z.ZodError) {
        // Handle Zod validation errors
        const messages = error.issues.map((err: z.ZodIssue) => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        errors.push(`Validation failed:\n  - ${messages.join('\n  - ')}`);
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Unexpected error: ${errorMessage}`);
      }
      return { valid: false, errors, warnings, contractCount: 0, stateEntryCount: 0 };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`Failed to validate configuration: ${errorMessage}`);
    return { valid: false, errors, warnings, contractCount: 0, stateEntryCount: 0 };
  }
}

/**
 * Validate configuration object directly (without file I/O).
 * Useful for testing or programmatic validation.
 */
export function validateConfig(config: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const result = SchemaValidator.safeParse(config);
    
    if (!result.success) {
      const messages = result.error.issues.map((err: z.ZodIssue) => {
        const path = err.path.join('.');
        return path ? `${path}: ${err.message}` : err.message;
      });
      errors.push(...messages);
      return { valid: false, errors, warnings, contractCount: 0, stateEntryCount: 0 };
    }

    const validConfig = result.data;
    
    // Count contracts and state entries
    const contractCount = Object.keys(validConfig.contracts).length;
    let stateEntryCount = 0;
    for (const contract of Object.values(validConfig.contracts)) {
      if (contract.state) {
        if (Array.isArray(contract.state)) {
          stateEntryCount += contract.state.length;
        } else {
          stateEntryCount += Object.keys(contract.state).length;
        }
      }
    }

    // Additional validation checks
    if (contractCount === 0) {
      warnings.push('No contracts defined in configuration');
    }

    // Check for contracts with no state entries
    for (const [contractName, contract] of Object.entries(validConfig.contracts)) {
      const stateKeys = contract.state 
        ? (Array.isArray(contract.state) ? contract.state.length : Object.keys(contract.state).length)
        : 0;
      if (stateKeys === 0 && !contract.preset) {
        warnings.push(`Contract '${contractName}' has no state entries to verify and no preset`);
      }
    }

    return {
      valid: true,
      errors: [],
      warnings,
      contractCount,
      stateEntryCount,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`Failed to validate configuration: ${errorMessage}`);
    return { valid: false, errors, warnings, contractCount: 0, stateEntryCount: 0 };
  }
}
