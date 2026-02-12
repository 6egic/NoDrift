/** Configuration validation utilities. */

import * as fs from 'fs';
import * as path from 'path';
import { loadSchema } from './schema';
import { ConfigurationError, ValidationError } from '../common/exceptions';
// No logger needed for config validator

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  contractCount: number;
  stateEntryCount: number;
}

export function validateConfigFile(filePath: string): ValidationResult {
  /**
   * Validate a configuration file and return detailed results.
   * This is a more detailed version that provides warnings and suggestions.
   */
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
        stateEntryCount += Object.keys(contract.state || {}).length;
      }

      // Additional validation checks
      // Check for common issues
      if (contractCount === 0) {
        warnings.push('No contracts defined in configuration');
      }

      // Check for contracts with no state entries
      for (const [contractName, contract] of Object.entries(config.contracts)) {
        const stateKeys = Object.keys(contract.state || {});
        if (stateKeys.length === 0) {
          warnings.push(`Contract '${contractName}' has no state entries to verify`);
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

