/** Validate command handler. */

import * as fs from 'fs';
import * as path from 'path';
import { config as dotenvConfig } from 'dotenv';
import chalk from 'chalk';
import { loadSchema } from '../../config/schema';
import { ConfigurationError, ValidationError } from '../../common/exceptions';
import { getExitCode } from '../../common/exit-codes';
import { setupLogger, getLogger } from '../../common/logger';

const logger = getLogger();

export interface ValidateOptions {
  verbose?: boolean;
}

/**
 * Handle the validate command.
 */
export async function handleValidate(configFile: string, options: ValidateOptions): Promise<void> {
  // Setup logging
  if (options.verbose) {
    setupLogger('DEBUG');
  } else {
    setupLogger('WARNING');
  }

  // Validate config file exists
  if (!fs.existsSync(configFile)) {
    console.error(`${chalk.red('Error:')} Configuration file not found: ${configFile}`);
    process.exit(getExitCode(new ConfigurationError('Config file not found'), false, false) as number);
  }

  // Try to load .env file
  const configDir = path.dirname(path.resolve(configFile));
  const configBasename = path.basename(configFile, path.extname(configFile));
  const envFiles = [
    path.join(configDir, '.env'),
    path.join(configDir, `${configBasename}.env`),
  ];

  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      dotenvConfig({ path: envFile });
      logger.debug(`Loaded environment variables from ${envFile}`);
      break;
    }
  }

  console.log(chalk.cyan('[INFO] Validating configuration file...'));
  console.log();

  // Load and validate schema
  const config = loadSchema(configFile);

  // Success
  console.log(chalk.green('[SUCCESS] Configuration is valid!'));
  console.log();
  console.log(chalk.dim(`Network: Chain ID ${config.network.chain_id}`));
  console.log(chalk.dim(`Contracts: ${Object.keys(config.contracts).length}`));
  
  // Count state entries
  let totalStateEntries = 0;
  for (const contract of Object.values(config.contracts)) {
    totalStateEntries += Object.keys(contract.state || {}).length;
  }
  console.log(chalk.dim(`State entries: ${totalStateEntries}`));
  console.log();
}

/**
 * Handle validate command errors.
 */
export function handleValidateError(error: unknown, options: ValidateOptions): void {
  const exitCode = getExitCode(error, false, false);
  
  if (error instanceof ConfigurationError || error instanceof ValidationError) {
    console.error(`${chalk.red('Validation Error:')} ${error.message}`);
    if (options.verbose && error.stack) {
      console.error(chalk.dim(error.stack));
    }
    process.exit(exitCode as number);
  } else if (error instanceof Error) {
    console.error(`${chalk.red('Error:')} ${error.message}`);
    if (options.verbose && error.stack) {
      console.error(chalk.dim(error.stack));
    }
    process.exit(exitCode as number);
  }
}

