#!/usr/bin/env node

/** Enhanced CLI with plugin support and new architecture. */

import { Command } from 'commander';
import { VERSION } from './index';
import { Colors } from './output/formatters';
import { handleValidate, handleValidateError } from './cli/commands/validate';
import { handleInit, handleInitError } from './cli/commands/init';
import { Nodrift } from './core';
import { loadSchema } from './config/schema';
import { getLogger } from './common/logger';
import { getEventBus } from './infrastructure/events/event-bus';
import { getPluginManager } from './infrastructure/plugins/plugin-system';
import { MetricsPlugin } from './infrastructure/plugins/builtin/metrics-plugin';
import { FileVerificationRepository } from './infrastructure/repositories/verification-repository';

const logger = getLogger();

// Disable colors if output is not a TTY
if (!process.stdout.isTTY) {
  Colors.disable();
}

const program = new Command();

program
  .name('nodrift')
  .description(
    'Nodrift - Dual-State Contract Verification (Enhanced).\n\n' +
      'Verifies that on-chain contract state matches your YAML configuration.\n' +
      'With enterprise-grade architecture, plugins, and observability.\n' +
      'Perfect for CI/CD pipelines, audits, and drift detection.'
  )
  .version(VERSION);

// Validate command (unchanged)
program
  .command('validate')
  .description('Validate configuration file without connecting to blockchain')
  .argument('<config-file>', 'Path to YAML configuration file')
  .option('-v, --verbose', 'Show detailed validation errors', false)
  .action(async (configFile: string, options) => {
    try {
      await handleValidate(configFile, options);
      process.exit(0);
    } catch (error: unknown) {
      handleValidateError(error, options);
    }
  });

// Init command (unchanged)
program
  .command('init')
  .description('Interactive configuration generator - creates a new Nodrift config file')
  .action(async () => {
    try {
      await handleInit();
      process.exit(0);
    } catch (error: unknown) {
      handleInitError(error);
    }
  });

// Presets command (unchanged)
program
  .command('presets')
  .description('List available presets for common contract standards')
  .action(() => {
    console.log('\n📦 Available Presets:\n');
    const presetDescriptions: Record<string, string> = {
      erc20: 'ERC20 token standard - totalSupply, balanceOf, allowance, decimals, symbol, name',
      erc721: 'ERC721 NFT standard - totalSupply, balanceOf, ownerOf, tokenURI, symbol, name',
      erc1155: 'ERC1155 multi-token standard - balanceOf, balanceOfBatch, uri, isApprovedForAll',
      erc4626: 'ERC4626 tokenized vault standard - totalAssets, asset, convertToShares, convertToAssets',
      diamond: 'Diamond pattern (EIP-2535) - facets, facetAddress, facetFunctionSelectors',
      proxy: 'ERC1967 proxy pattern - implementation, admin verification',
      accessControl: 'OpenZeppelin AccessControl - role membership verification',
    };

    for (const [name, description] of Object.entries(presetDescriptions)) {
      console.log(`  ${Colors.CYAN(name.padEnd(15))} ${description}`);
    }

    console.log('\n💡 Usage in YAML:');
    console.log('  contracts:');
    console.log('    MyToken:');
    console.log('      preset: erc20');
    console.log('      address: "${TOKEN_ADDRESS}"');
    console.log('      # Preset automatically includes ABI and common state checks\n');
    process.exit(0);
  });

// Enhanced verify command with plugin support
program
  .argument('<config-file>', 'Path to YAML configuration file')
  .option(
    '-o, --output <format>',
    'Output format (text, json, or junit)',
    (value) => {
      if (value !== 'text' && value !== 'json' && value !== 'junit') {
        throw new Error('Output format must be "text", "json", or "junit"');
      }
      return value;
    },
    'text'
  )
  .option(
    '--junit-file <path>',
    'Path to write JUnit XML file (default: test-results/nodrift-junit.xml)',
    'test-results/nodrift-junit.xml'
  )
  .option(
    '--fail-on-drift',
    'Exit with error code 1 if drift is detected (CI/CD mode)',
    false
  )
  .option('--compact-json', 'Use compact JSON output (no indentation)', false)
  .option(
    '-q, --quiet',
    'Suppress non-essential output (only show drifts/errors)',
    false
  )
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option(
    '--plan',
    'Show Terraform-style plan output (grouped by contract, with summary)',
    false
  )
  // New options for enhanced architecture
  .option('--enable-metrics', 'Enable metrics collection plugin', false)
  .option('--enable-history', 'Save verification results to history', false)
  .option('--history-path <path>', 'Path to history storage', '.nodrift/history')
  .option('--use-v2', 'Use enhanced architecture (v2)', false)
  .option('--show-events', 'Show event log after verification', false)
  .action(async (configFile: string, options) => {
    try {
      if (options.useV2) {
        // Use enhanced architecture
        await handleVerifyV2(configFile, options);
      } else {
        // Use original implementation
        const { handleVerify } = await import('./cli/commands/verify');
        await handleVerify(configFile, options);
      }
    } catch (error: unknown) {
      const { handleVerifyError } = await import('./cli/commands/verify');
      handleVerifyError(error, options);
    }
  });

/**
 * Enhanced verify handler with plugin support.
 */
async function handleVerifyV2(configFile: string, options: any): Promise<void> {
  const startTime = Date.now();

  // Setup infrastructure
  const eventBus = getEventBus();
  const pluginManager = getPluginManager();

  // Register plugins based on options
  if (options.enableMetrics) {
    pluginManager.register(new MetricsPlugin());
    logger.info('Metrics plugin enabled');
  }

  // Setup repository if history is enabled
  let repository: FileVerificationRepository | null = null;
  if (options.enableHistory) {
    repository = new FileVerificationRepository(options.historyPath);
    logger.info(`History enabled: ${options.historyPath}`);
  }

  // Subscribe to events if requested
  const events: any[] = [];
  if (options.showEvents) {
    eventBus.onAny((event) => {
      events.push(event);
    });
  }

  try {
    // Load configuration
    const config = loadSchema(configFile);

    // Create Nodrift instance
    const nodrift = new Nodrift(config);

    // Initialize plugins
    await pluginManager.initialize({
      config,
      sessionId: nodrift.getSessionId(),
      eventBus,
      logger,
    });

    if (!options.quiet) {
      console.log(Colors.CYAN('\n🔍 Running verification (enhanced mode)...\n'));
    }

    // Run verification
    const result = await nodrift.run();

    if (!result.ok) {
      throw result.error;
    }

    const verificationResult = result.value;
    const duration = Date.now() - startTime;

    // Save to history if enabled
    if (repository) {
      await repository.save({
        id: `ver-${Date.now()}`,
        sessionId: nodrift.getSessionId(),
        timestamp: Date.now(),
        configFile,
        result: verificationResult,
        duration,
        success: verificationResult.diffs.length === 0,
        driftCount: verificationResult.diffs.length,
      });
    }

    // Output results
    if (options.output === 'json') {
      const output = {
        success: verificationResult.diffs.length === 0,
        drifts: verificationResult.diffs,
        duration,
        sessionId: nodrift.getSessionId(),
      };
      console.log(
        options.compactJson
          ? JSON.stringify(output)
          : JSON.stringify(output, null, 2)
      );
    } else {
      // Text output
      if (verificationResult.diffs.length === 0) {
        console.log(Colors.GREEN('✅ No drifts detected'));
      } else {
        console.log(Colors.RED(`❌ ${verificationResult.diffs.length} drift(s) detected:`));
        for (const diff of verificationResult.diffs) {
          console.log(`\n  Contract: ${Colors.CYAN(diff.contractName || 'unknown')}`);
          console.log(`  Key: ${diff.stateKey}`);
          console.log(`  Expected: ${Colors.GREEN(String(diff.desiredValue))}`);
          console.log(`  Actual: ${Colors.RED(String(diff.currentValue))}`);
        }
      }

      console.log(`\n⏱️  Duration: ${duration}ms`);
      console.log(`🆔 Session: ${nodrift.getSessionId()}`);
    }

    // Show metrics if enabled
    if (options.enableMetrics) {
      const metricsPlugin = pluginManager.getPlugin('metrics') as MetricsPlugin;
      const metrics = metricsPlugin?.getMetrics();
      if (metrics) {
        console.log('\n📊 Metrics:');
        console.log(`  Contracts Read: ${metrics.contractsRead}`);
        console.log(`  Contracts Failed: ${metrics.contractsFailed}`);
        console.log(`  Total Drifts: ${metrics.totalDrifts}`);
        console.log(`  RPC Calls: ${metrics.rpcCalls}`);
        console.log(`  Cache Hits: ${metrics.cacheHits}`);
        console.log(`  Cache Misses: ${metrics.cacheMisses}`);
      }
    }

    // Show events if requested
    if (options.showEvents && events.length > 0) {
      console.log('\n📋 Event Log:');
      for (const event of events) {
        console.log(`  [${new Date(event.timestamp).toISOString()}] ${event.type}`);
      }
    }

    // Cleanup
    await pluginManager.destroy();

    // Exit with error if drifts detected and fail-on-drift is set
    if (options.failOnDrift && verificationResult.diffs.length > 0) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(Colors.RED(`\n❌ Verification failed: ${errorMessage}\n`));

    // Cleanup on error
    await pluginManager.destroy();

    process.exit(1);
  }
}

// Parse command line arguments
if (require.main === module) {
  program.parse();
}

export { program as enhancedMain };
