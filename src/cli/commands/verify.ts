/** Verify command handler. */

import * as fs from 'fs';
import * as path from 'path';
import { config as dotenvConfig } from 'dotenv';
import chalk from 'chalk';
import { VERSION } from '../../index';
import { Nodrift } from '../../core';
import { loadSchema } from '../../config/schema';
import {
  NodriftError,
  ConfigurationError,
  ConnectionError,
  ValidationError,
  StateReadError,
  ContractError,
} from '../../common/exceptions';
import { setupLogger, getLogger } from '../../common/logger';
import { getExitCode } from '../../common/exit-codes';
import { getOutputHandler } from '../../output/handlers';
import { calculateStats } from '../../output/stats';
import { printHeader } from '../../output/formatters';
import { unwrap } from '../../common/result-type';

const logger = getLogger();

export interface VerifyOptions {
  output?: 'text' | 'json' | 'junit';
  failOnDrift?: boolean;
  compactJson?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  plan?: boolean;
  junitFile?: string;
}

/**
 * Handle the verify command.
 */
export async function handleVerify(configFile: string, options: VerifyOptions): Promise<void> {
  // Setup logging level
  if (options.verbose) {
    setupLogger('DEBUG');
  } else if (process.env.DEBUG) {
    setupLogger('DEBUG');
  } else {
    setupLogger('WARNING');
  }

  // Validate config file exists
  if (!fs.existsSync(configFile)) {
    console.error(`Error: Configuration file not found: ${configFile}`);
    process.exit(getExitCode(new ConfigurationError('Config file not found'), false, false) as number);
  }

  // Try to load .env file from the same directory as config file, or project root
  const configDir = path.dirname(path.resolve(configFile));
  const configBasename = path.basename(configFile, path.extname(configFile));
  const projectRoot = process.cwd();
  const envFiles = [
    path.join(configDir, '.env'),
    path.join(configDir, `${configBasename}.env`),
    path.join(projectRoot, '.env'),  // Also check project root
  ];

  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      dotenvConfig({ path: envFile });
      logger.debug(`Loaded environment variables from ${envFile}`);
      break;
    }
  }

  // Print header
  if (options.output === 'text') {
    printHeader(VERSION, options.quiet);
  }

  // Show progress indicator for text output
  if (options.output === 'text' && !options.quiet) {
    const contractCount = Object.keys((await loadSchema(configFile)).contracts).length;
    process.stdout.write(`${chalk.cyan(`[INFO] Reading state from ${contractCount} contract${contractCount !== 1 ? 's' : ''}...`)}`);
  }

  // Track execution time
  const startTime = Date.now();

  // Run verification with progress tracking
  const config = loadSchema(configFile);
  const nodrift = new Nodrift(config);
  const resultWrapper = await nodrift.run();
  const result = unwrap(resultWrapper);
  
  const executionTimeMs = Date.now() - startTime;

  if (options.output === 'text' && !options.quiet) {
    process.stdout.write(
      `\r${chalk.cyan('[SUCCESS] Reading contract state...')} ${chalk.green('Done')}\n`
    );
  }

  // Calculate statistics
  const stats = calculateStats(result);

  // Get contract addresses and networks for plan display
  const contractAddresses: Record<string, string> = {};
  const contractNetworks: Record<string, number> = {};
  if (options.plan) {
    // Load config to get contract addresses and networks (they're already resolved in loadSchema)
    const config = loadSchema(configFile);
    for (const [contractName, contractConfig] of Object.entries(config.contracts)) {
      contractAddresses[contractName] = contractConfig.address;
      const network = contractConfig.network || config.network;
      contractNetworks[contractName] = network.chain_id;
    }
  }

  // Use output handler for formatting
  const outputHandler = getOutputHandler(options.output || 'text');
  outputHandler.handle(result, {
    format: options.output || 'text',
    quiet: options.quiet,
    compactJson: options.compactJson,
    plan: options.plan,
    junitFile: options.junitFile,
    contractAddresses,
    contractNetworks,
    executionTimeMs,
  });

  // Exit code handling for CI/CD
  const exitCode = getExitCode(null, stats.driftDetected, options.failOnDrift || false);
  process.exit(exitCode as number);
}

/**
 * Handle verify command errors.
 */
export function handleVerifyError(error: unknown, options: VerifyOptions): void {
  const exitCode = getExitCode(error, false, false);
  
  if (error instanceof ConfigurationError) {
    logger.error(`Configuration error: ${error.message}`);
    console.error(`${chalk.red('Error:')} Configuration invalid: ${error.message}`);
    if (options.verbose || process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(exitCode as number);
  } else if (error instanceof ValidationError) {
    logger.error(`Validation error: ${error.message}`);
    console.error(`${chalk.red('Error:')} Validation failed: ${error.message}`);
    if (options.verbose || process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(exitCode as number);
  } else if (error instanceof ConnectionError) {
    logger.error(`Connection error: ${error.message}`);
    console.error(`${chalk.red('Error:')} Unable to connect to blockchain: ${error.message}`);
    console.error(`  Check your RPC URL and network connection.`);
    process.exit(exitCode as number);
  } else if (error instanceof StateReadError || error instanceof ContractError) {
    logger.error(`Contract error: ${error.message}`);
    console.error(`${chalk.red('Error:')} Contract interaction failed: ${error.message}`);
    if (options.verbose || process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(exitCode as number);
  } else if (error instanceof NodriftError) {
    logger.error(`Nodrift error: ${error.message}`);
    console.error(`${chalk.red('Error:')} ${error.message}`);
    if (options.verbose || process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(exitCode as number);
  } else {
    // Check for file system errors
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code: string }).code;
      if (code === 'ENOENT' || code === 'EACCES' || code === 'EISDIR') {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        logger.exception(`File system error: ${errorObj.message}`, errorObj);
        console.error(`${chalk.red('Error:')} File system error: ${errorObj.message}`);
        if (options.verbose || process.env.DEBUG) {
          console.error(errorObj.stack);
        } else {
          console.error(`  Run with --verbose or set DEBUG=1 for details.`);
        }
        process.exit(exitCode as number);
      }
    }
    
    // Handle any other error
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.exception(`Unexpected error: ${errorObj.message}`, errorObj);
    console.error(`${chalk.red('Fatal Error:')} ${errorObj.message}`);
    if (options.verbose || process.env.DEBUG) {
      console.error(errorObj.stack);
    } else {
      console.error(`  Run with --verbose or set DEBUG=1 for details.`);
    }
    process.exit(exitCode as number);
  }
}

