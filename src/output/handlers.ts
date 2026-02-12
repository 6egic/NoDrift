/** Output format handlers for different output types. */

import chalk from 'chalk';
import { VERSION } from '../index';
import { VerificationResult } from '../core';
import { Diff } from '../reconciliator/diff';
import { generateJUnitXML, writeJUnitXML } from './junit-formatter';
import { calculateStats } from './stats';
import {
  printSummary,
  printSuccess,
  printPlanSummary,
  printPlan,
  formatDiffBeautiful,
} from './formatters';
import { getLogger } from '../common/logger';

const logger = getLogger();

export interface OutputOptions {
  format: 'text' | 'json' | 'junit';
  quiet?: boolean;
  compactJson?: boolean;
  plan?: boolean;
  junitFile?: string;
  contractAddresses?: Record<string, string>;
  contractNetworks?: Record<string, number>;
  executionTimeMs?: number;
}

export interface OutputHandler {
  handle(result: VerificationResult, options: OutputOptions): void;
}

/**
 * JSON output handler - machine-readable format for CI/CD.
 */
export class JsonOutputHandler implements OutputHandler {
  handle(result: VerificationResult, options: OutputOptions): void {
    const stats = calculateStats(result);
    const jsonOutput: any = {
      version: VERSION,
      summary: {
        total_diffs: stats.totalDiffs,
        total_errors: stats.totalErrors,
        total_warnings: stats.totalWarnings,
        total_contracts: stats.totalContracts,
        drift_detected: stats.driftDetected,
        status: stats.status,
        execution_time_ms: options.executionTimeMs || 0,
      },
      metrics: stats.metrics ? {
        by_severity: stats.metrics.bySeverity,
        by_category: stats.metrics.byCategory,
        total_with_metrics: stats.metrics.totalWithMetrics,
      } : undefined,
      diffs: result.diffs.map((d: Diff) => d.toDict()),
    };

    // Include current states if not in compact mode
    if (!options.compactJson) {
      jsonOutput.current_states = result.current_states;
    }

    const indent = options.compactJson ? 0 : 2;
    console.log(JSON.stringify(jsonOutput, null, indent));
  }
}

/**
 * JUnit XML output handler - standard test reporting format.
 */
export class JUnitOutputHandler implements OutputHandler {
  handle(result: VerificationResult, options: OutputOptions): void {
    const junitXml = generateJUnitXML(result, options.executionTimeMs || 0);
    
    // Write to file
    const junitPath = options.junitFile || 'test-results/nodrift-junit.xml';
    try {
      writeJUnitXML(junitXml, junitPath);
      if (!options.quiet) {
        console.log(chalk.green(`[SUCCESS] JUnit XML written to: ${junitPath}`));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const fsError = error && typeof error === 'object' && 'code' in error && 
        (error.code === 'ENOENT' || error.code === 'EACCES' || error.code === 'EISDIR');
      if (fsError) {
        console.error(chalk.red(`✗ Failed to write JUnit XML (file system error): ${errorMessage}`));
        // Fall back to stdout
        console.log(junitXml);
        logger.warning(`JUnit XML write failed, output to stdout instead`);
      } else {
        console.error(chalk.red(`✗ Failed to write JUnit XML: ${errorMessage}`));
        // Fall back to stdout
        console.log(junitXml);
      }
    }
  }
}

/**
 * Text output handler - human-readable format.
 */
export class TextOutputHandler implements OutputHandler {
  handle(result: VerificationResult, options: OutputOptions): void {
    const stats = calculateStats(result);
    
    if (options.plan) {
      // Terraform-style plan output
      const planStats = {
        numUpdates: stats.numUpdates,
        numAdds: stats.numAdds,
        numRemoves: stats.numRemoves,
        numErrors: stats.totalErrors,
        numContracts: stats.totalContracts,
      };
      
      if (result.diffs.length > 0) {
        printPlanSummary(
          planStats.numUpdates,
          planStats.numAdds,
          planStats.numRemoves,
          planStats.numErrors,
          planStats.numContracts,
          options.quiet || false
        );
        printPlan(
          result.diffs,
          options.contractAddresses || {},
          process.stdout.isTTY,
          options.contractNetworks
        );
        console.log();
        console.log(
          chalk.dim('Note: Nodrift is read-only. This plan shows drift detection only.')
        );
        console.log();
      } else {
        printPlanSummary(0, 0, 0, 0, stats.totalContracts, options.quiet || false);
        console.log(chalk.green.bold('[SUCCESS] No drift detected - all contracts match expected state!'));
        console.log();
      }
    } else if (result.diffs.length > 0) {
      printSummary(
        stats.totalContracts,
        stats.totalDiffs,
        stats.totalErrors,
        stats.totalWarnings,
        options.quiet || false
      );
      
      // Display metrics summary if available
      if (stats.metrics && stats.metrics.totalWithMetrics > 0) {
        console.log();
        console.log(chalk.cyan.bold('─'.repeat(70)));
        console.log(chalk.cyan.bold('Drift Metrics Summary'));
        console.log(chalk.cyan.bold('─'.repeat(70)));
        console.log();
        
        // Severity breakdown
        console.log(chalk.bold('Drift by Severity:'));
        if (stats.metrics.bySeverity.critical > 0) {
          console.log(`  ${chalk.red.bold('CRITICAL:')}  ${chalk.red.bold(stats.metrics.bySeverity.critical)}`);
        }
        if (stats.metrics.bySeverity.high > 0) {
          console.log(`  ${chalk.yellow.bold('HIGH:')}      ${chalk.yellow.bold(stats.metrics.bySeverity.high)}`);
        }
        if (stats.metrics.bySeverity.medium > 0) {
          console.log(`  ${chalk.blue('MEDIUM:')}    ${chalk.blue(stats.metrics.bySeverity.medium)}`);
        }
        if (stats.metrics.bySeverity.low > 0) {
          console.log(`  ${chalk.dim('LOW:')}       ${chalk.dim(stats.metrics.bySeverity.low)}`);
        }
        console.log();
        
        // Category breakdown
        console.log(chalk.bold('Drift by Category:'));
        const categories: Array<{key: keyof typeof stats.metrics.byCategory, label: string}> = [
          { key: 'integrity', label: 'Integrity' },
          { key: 'solvency', label: 'Solvency' },
          { key: 'liquidity', label: 'Liquidity' },
          { key: 'risk', label: 'Risk' },
          { key: 'supply', label: 'Supply' },
          { key: 'governance', label: 'Governance' },
        ];
        
        for (const {key, label} of categories) {
          const count = stats.metrics.byCategory[key];
          if (count > 0) {
            console.log(`  ${label.padEnd(12)} ${count}`);
          }
        }
        console.log();
      }
      
      // Separate errors and warnings
      const errors = result.diffs.filter((d: Diff) => d.action === 'error');
      const warnings = result.diffs.filter((d: Diff) => d.action !== 'error');
      
      if (errors.length > 0) {
        console.log(chalk.red.bold('─'.repeat(70)));
        console.log(chalk.red.bold('[ERROR] Errors'));
        console.log(chalk.red.bold('─'.repeat(70)));
        console.log();
        for (let i = 0; i < errors.length; i++) {
          const diff = errors[i];
          console.log(chalk.dim(`[${i + 1}/${errors.length}]`));
          console.log(formatDiffBeautiful(diff, process.stdout.isTTY));
          if (i < errors.length - 1) {
            console.log();
          }
        }
        console.log();
      }
      
      if (warnings.length > 0) {
        console.log(chalk.yellow.bold('─'.repeat(70)));
        console.log(chalk.yellow.bold('[WARNING] Configuration Drift'));
        console.log(chalk.yellow.bold('─'.repeat(70)));
        console.log();
        for (let i = 0; i < warnings.length; i++) {
          const diff = warnings[i];
          console.log(chalk.dim(`[${i + 1}/${warnings.length}]`));
          console.log(formatDiffBeautiful(diff, process.stdout.isTTY));
          if (i < warnings.length - 1) {
            console.log();
          }
        }
        console.log();
      }
    } else {
      printSuccess(stats.totalContracts, options.quiet || false);
    }
  }
}

/**
 * Get the appropriate output handler for the specified format.
 */
export function getOutputHandler(format: 'text' | 'json' | 'junit'): OutputHandler {
  switch (format) {
    case 'json':
      return new JsonOutputHandler();
    case 'junit':
      return new JUnitOutputHandler();
    case 'text':
    default:
      return new TextOutputHandler();
  }
}

