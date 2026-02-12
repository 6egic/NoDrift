/** Init command handler. */

import chalk from 'chalk';
import { generateConfig } from '../init';
import { getExitCode } from '../../common/exit-codes';

/**
 * Handle the init command.
 */
export async function handleInit(): Promise<void> {
  await generateConfig();
}

/**
 * Handle init command errors.
 */
export function handleInitError(error: unknown): void {
  if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'ExitPromptError') {
    // User cancelled
    console.log(chalk.yellow('\nCancelled.'));
    process.exit(0);
  } else if (error instanceof Error) {
    const exitCode = getExitCode(error, false, false);
    console.error(`${chalk.red('Error:')} ${error.message}`);
    if (error.stack) {
      console.error(chalk.dim(error.stack));
    }
    process.exit(exitCode as number);
  } else {
    const exitCode = getExitCode(error, false, false);
    console.error(`${chalk.red('Error:')} Unknown error occurred`);
    process.exit(exitCode as number);
  }
}

