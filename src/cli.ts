#!/usr/bin/env node

/** CLI interface for Nodrift - Production-ready with enhanced UX. */

import { Command } from 'commander';
import { VERSION } from './index';
import { Colors } from './output/formatters';
import { handleValidate, handleValidateError } from './cli/commands/validate';
import { handleInit, handleInitError } from './cli/commands/init';
import { handleVerify, handleVerifyError } from './cli/commands/verify';

// Disable colors if output is not a TTY
if (!process.stdout.isTTY) {
  Colors.disable();
}


const program = new Command();

program
  .name('nodrift')
  .description(
    'Nodrift - Dual-State Contract Verification.\n\n' +
      'Verifies that on-chain contract state matches your YAML configuration.\n' +
      'With two faces watching both current and expected state.\n' +
      'Perfect for CI/CD pipelines, audits, and drift detection.'
  )
  .version(VERSION);

// Validate command
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

// Init command
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

// Presets command
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

// Main verify command
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
    'Suppress non-essential output (only show diffs/errors)',
    false
  )
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option(
    '--plan',
    'Show Terraform-style plan output (grouped by contract, with summary)',
    false
  )
  .action(async (configFile: string, options) => {
    try {
      await handleVerify(configFile, options);
    } catch (error: unknown) {
      handleVerifyError(error, options);
    }
  });

// Parse command line arguments
if (require.main === module) {
  program.parse();
}

export { program as main };

