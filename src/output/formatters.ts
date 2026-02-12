/** Beautiful output formatters for Nodrift. */

import { Diff } from '../reconciliator/diff';
import { formatAddress, formatValue } from '../common/utils';
import chalk from 'chalk';

export class Colors {
  /** ANSI color codes for terminal output. */
  static HEADER = chalk.magenta as typeof chalk.magenta;
  static BLUE = chalk.blue as typeof chalk.blue;
  static CYAN = chalk.cyan as typeof chalk.cyan;
  static GREEN = chalk.green as typeof chalk.green;
  static YELLOW = chalk.yellow as typeof chalk.yellow;
  static RED = chalk.red as typeof chalk.red;
  static END = '';
  static BOLD = chalk.bold as typeof chalk.bold;
  static UNDERLINE = chalk.underline as typeof chalk.underline;
  static DIM = chalk.dim as typeof chalk.dim;
  static MAGENTA = chalk.magenta as typeof chalk.magenta;

  static disable(): void {
    /** Disable colors (e.g., when output is not a TTY). */
    // Colors are disabled by chalk automatically when not a TTY
    const noColor = ((s: string) => s) as any;
    Colors.HEADER = noColor;
    Colors.BLUE = noColor;
    Colors.CYAN = noColor;
    Colors.GREEN = noColor;
    Colors.YELLOW = noColor;
    Colors.RED = noColor;
    Colors.BOLD = noColor;
    Colors.UNDERLINE = noColor;
    Colors.DIM = noColor;
    Colors.MAGENTA = noColor;
  }
}

export function formatDiffBeautiful(diff: Diff, useColors: boolean = true): string {
  /** Format a diff with beautiful styling. */
  const colors = useColors ? Colors : {
    HEADER: (s: string) => s,
    BLUE: (s: string) => s,
    CYAN: (s: string) => s,
    GREEN: (s: string) => s,
    YELLOW: (s: string) => s,
    RED: (s: string) => s,
    END: '',
    BOLD: (s: string) => s,
    UNDERLINE: (s: string) => s,
    DIM: (s: string) => s,
    MAGENTA: (s: string) => s,
  } as typeof Colors;

  const contractKey = `${diff.contractName}.${diff.stateKey}`;

  if (diff.action === 'error') {
    return (
      `${colors.RED('✗')} ${colors.BOLD(contractKey)} ` +
      `(${colors.YELLOW(diff.stateType)}): ${colors.RED('ERROR')}\n` +
      `   ${colors.RED('→')} ${diff.error || 'Unknown error'}`
    );
  }

  if (diff.stateType === 'owner') {
    const current = formatAddress((diff.currentValue as string) || 'None', true);
    const expected = formatAddress((diff.desiredValue as string) || 'None', true);
    const currentFull = formatAddress((diff.currentValue as string) || 'None');
    const expectedFull = formatAddress((diff.desiredValue as string) || 'None');

    return (
      `${colors.YELLOW('↻')} ${colors.BOLD(contractKey)} ` +
      `(${colors.CYAN('owner')})\n` +
      `   ${colors.YELLOW('Current:')}  ${colors.RED(current)}\n` +
      `   ${colors.YELLOW('Expected:')} ${colors.GREEN(expected)}\n` +
      `   ${colors.CYAN('Full:')}      ${currentFull} → ${expectedFull}`
    );
  }

  if (diff.stateType === 'role') {
    if (diff.action === 'add') {
      const desiredSet = new Set(Array.isArray(diff.desiredValue) ? diff.desiredValue : []);
      const currentSet = new Set(Array.isArray(diff.currentValue) ? diff.currentValue : []);
      const toAdd = Array.from(desiredSet).filter((m) => !currentSet.has(m)).sort();

      if (toAdd.length === 1) {
        const member = formatAddress(toAdd[0] as string, true);
        const memberFull = formatAddress(toAdd[0] as string);
        return (
          `${colors.GREEN('+')} ${colors.BOLD(contractKey)} ` +
          `(${colors.CYAN('role')}): ${colors.YELLOW('Missing member')}\n` +
          `   ${colors.GREEN('+')} ${member} (${memberFull})`
        );
      } else {
        const membersList = toAdd
          .map(
            (m) =>
              `   ${colors.GREEN('+')} ${formatAddress(m as string, true)} (${formatAddress(m as string)})`
          )
          .join('\n');
        return (
          `${colors.GREEN('+')} ${colors.BOLD(contractKey)} ` +
          `(${colors.CYAN('role')}): ${colors.YELLOW(`Missing ${toAdd.length} members`)}\n` +
          membersList
        );
      }
    }

    if (diff.action === 'remove') {
      const desiredSet = new Set(Array.isArray(diff.desiredValue) ? diff.desiredValue : []);
      const currentSet = new Set(Array.isArray(diff.currentValue) ? diff.currentValue : []);
      const toRemove = Array.from(currentSet).filter((m) => !desiredSet.has(m)).sort();

      if (toRemove.length === 1) {
        const member = formatAddress(toRemove[0] as string, true);
        const memberFull = formatAddress(toRemove[0] as string);
        return (
          `${colors.RED('-')} ${colors.BOLD(contractKey)} ` +
          `(${colors.CYAN('role')}): ${colors.YELLOW('Unexpected member')}\n` +
          `   ${colors.RED('-')} ${member} (${memberFull})`
        );
      } else {
        const membersList = toRemove
          .map(
            (m) =>
              `   ${colors.RED('-')} ${formatAddress(m as string, true)} (${formatAddress(m as string)})`
          )
          .join('\n');
        return (
          `${colors.RED('-')} ${colors.BOLD(contractKey)} ` +
          `(${colors.CYAN('role')}): ${colors.YELLOW(`Unexpected ${toRemove.length} members`)}\n` +
          membersList
        );
      }
    }
  }

  if (diff.stateType === 'variable' || diff.stateType === 'function_call') {
    const current = formatValue(diff.currentValue, 60);
    const expected = formatValue(diff.desiredValue, 60);

    let output = (
      `${colors.YELLOW('↻')} ${colors.BOLD(contractKey)} ` +
      `(${colors.CYAN(diff.stateType)})\n` +
      `   ${colors.YELLOW('Current:')}  ${colors.RED(current)}\n` +
      `   ${colors.YELLOW('Expected:')} ${colors.GREEN(expected)}`
    );
    
    // Add metric information if available
    if (diff.metric) {
      const severityColor = diff.metric.severity === 'critical' ? colors.RED : 
                           diff.metric.severity === 'high' ? colors.YELLOW : 
                           diff.metric.severity === 'medium' ? colors.BLUE : colors.DIM;
      const severityText = diff.metric.severity.toUpperCase();
      output += `\n   ${colors.DIM('Metric:')}    [${severityColor(severityText)}] ${colors.BOLD(diff.metric.name)} (${diff.metric.category})`;
      if (diff.metric.description) {
        output += `\n   ${colors.DIM('Info:')}      ${colors.DIM(diff.metric.description)}`;
      }
    }
    
    return output;
  }

  return `${colors.YELLOW('[WARNING]')} ${contractKey}: Unknown diff type`;
}

export function printHeader(version: string, quiet: boolean = false): void {
  /** Print beautiful CLI header. */
  if (quiet) {
    return;
  }

  const title = 'Nodrift';
  const subtitle = 'Smart Contract State Verification';
  const versionText = `v${version}`;

  const width = 70;
  const titleWithVersion = `${title} ${versionText}`;
  const titlePadding = Math.floor((width - titleWithVersion.length - 2) / 2);
  const titlePaddingRight = width - titleWithVersion.length - titlePadding - 2;
  const subtitlePadding = Math.floor((width - subtitle.length - 2) / 2);
  const subtitlePaddingRight = width - subtitle.length - subtitlePadding - 2;

  console.log();
  console.log(chalk.cyan.bold('╔' + '═'.repeat(width - 2) + '╗'));
  console.log(
    chalk.cyan.bold('║') +
      ' '.repeat(titlePadding) +
      chalk.cyan.bold(titleWithVersion) +
      ' '.repeat(titlePaddingRight) +
      chalk.cyan.bold('║')
  );
  console.log(
    chalk.cyan.bold('║') +
      ' '.repeat(subtitlePadding) +
      chalk.cyan(subtitle) +
      ' '.repeat(subtitlePaddingRight) +
      chalk.cyan.bold('║')
  );
  console.log(chalk.cyan.bold('╚' + '═'.repeat(width - 2) + '╝'));
  console.log();
}

export function printSummary(
  numContracts: number,
  numDiffs: number,
  numErrors: number,
  numWarnings: number,
  quiet: boolean = false
): void {
  /** Print beautiful verification summary. */
  if (quiet) {
    return;
  }

  const rows: Array<[string, string, string]> = [
    ['Contracts Checked', String(numContracts), '[OK]'],
    ['Differences Found', String(numDiffs), numDiffs > 0 ? '[WARN]' : '[OK]'],
  ];

  if (numErrors > 0) {
    rows.push(['Errors', String(numErrors), '✗']);
  }

  if (numWarnings > 0) {
    rows.push(['Warnings', String(numWarnings), '[WARN]']);
  }

  console.log(chalk.cyan.bold('Verification Summary'));
  console.log();

  const maxLabel = Math.max(...rows.map((r) => r[0].length));
  const maxValue = Math.max(...rows.map((r) => r[1].length));

  for (const [label, value, statusIcon] of rows) {
    const statusColor =
      statusIcon === '[OK]'
        ? chalk.green
        : statusIcon === '✗'
        ? chalk.red
        : chalk.yellow;
    console.log(
      `  ${chalk.cyan(label.padEnd(maxLabel))}  ` +
        `${chalk.bold(value.padStart(maxValue))}  ` +
        `${statusColor(statusIcon)}`
    );
  }

  console.log();
}

export function printSuccess(numContracts: number, quiet: boolean = false): void {
  /** Print beautiful success message. */
  if (quiet) {
    return;
  }

  const width = 70;
  const line1 = '[SUCCESS] All contracts are in desired state!';
  const line2 = `Verified ${numContracts} contract(s) with no differences`;
  const padding1 = Math.floor((width - line1.length - 2) / 2);
  const paddingRight1 = width - line1.length - padding1 - 2;
  const padding2 = Math.floor((width - line2.length - 2) / 2);
  const paddingRight2 = width - line2.length - padding2 - 2;

  console.log();
  console.log(chalk.green.bold('╔' + '═'.repeat(width - 2) + '╗'));
  console.log(
    chalk.green.bold('║') +
      ' '.repeat(padding1) +
      chalk.green.bold(line1) +
      ' '.repeat(paddingRight1) +
      chalk.green.bold('║')
  );
  console.log(
    chalk.green.bold('║') +
      ' '.repeat(padding2) +
      chalk.cyan(line2) +
      ' '.repeat(paddingRight2) +
      chalk.green.bold('║')
  );
  console.log(chalk.green.bold('╚' + '═'.repeat(width - 2) + '╝'));
  console.log();
}

export function formatPlanDiff(diff: Diff, useColors: boolean = true): string {
  /** Format a diff in Terraform-style plan format. */
  const colors = useColors ? Colors : {
    HEADER: (s: string) => s,
    BLUE: (s: string) => s,
    CYAN: (s: string) => s,
    GREEN: (s: string) => s,
    YELLOW: (s: string) => s,
    RED: (s: string) => s,
    END: '',
    BOLD: (s: string) => s,
    UNDERLINE: (s: string) => s,
    DIM: (s: string) => s,
    MAGENTA: (s: string) => s,
  } as typeof Colors;

  const resourcePath = `contract.${diff.contractName}.${diff.stateKey}`;

  if (diff.action === 'error') {
    return (
      `  ${colors.RED('✗')} ${colors.BOLD(resourcePath)} (${colors.YELLOW(diff.stateType)})\n` +
      `    ${colors.RED('Error:')} ${diff.error || 'Unknown error'}`
    );
  }

  if (diff.stateType === 'owner' || diff.stateType === 'variable' || diff.stateType === 'function_call') {
    const current = formatValue(diff.currentValue, 50);
    const expected = formatValue(diff.desiredValue, 50);
    
    // Check if values actually differ
    const currentStr = String(diff.currentValue || 'None');
    const expectedStr = String(diff.desiredValue || 'None');
    const isUpdate = currentStr !== expectedStr;

    if (!isUpdate) {
      // Values match, no change needed
      return `  ${colors.GREEN('[OK]')} ${resourcePath} (${colors.CYAN(diff.stateType)})\n    ${colors.DIM('No change needed')}`;
    }

    return (
      `  ${colors.YELLOW('~')} ${colors.BOLD(resourcePath)} (${colors.CYAN(diff.stateType)})\n` +
      `    ${colors.YELLOW('will update')}\n` +
      `      ${colors.RED(current)} ${colors.DIM('=>')} ${colors.GREEN(expected)}`
    );
  }

  if (diff.stateType === 'role') {
    if (diff.action === 'add') {
      const desiredSet = new Set(Array.isArray(diff.desiredValue) ? diff.desiredValue : []);
      const currentSet = new Set(Array.isArray(diff.currentValue) ? diff.currentValue : []);
      const toAdd = Array.from(desiredSet).filter((m) => !currentSet.has(m)).sort();

      if (toAdd.length === 1) {
        const member = formatAddress(toAdd[0] as string, true);
        return (
          `  ${colors.GREEN('+')} ${colors.BOLD(resourcePath)} (${colors.CYAN('role')})\n` +
          `    ${colors.GREEN('will add')} member: ${colors.GREEN(member)}`
        );
      } else {
        const membersList = toAdd
          .map((m) => `      ${colors.GREEN('+')} ${formatAddress(m as string, true)}`)
          .join('\n');
        return (
          `  ${colors.GREEN('+')} ${colors.BOLD(resourcePath)} (${colors.CYAN('role')})\n` +
          `    ${colors.GREEN(`will add ${toAdd.length} members:`)}\n${membersList}`
        );
      }
    }

    if (diff.action === 'remove') {
      const desiredSet = new Set(Array.isArray(diff.desiredValue) ? diff.desiredValue : []);
      const currentSet = new Set(Array.isArray(diff.currentValue) ? diff.currentValue : []);
      const toRemove = Array.from(currentSet).filter((m) => !desiredSet.has(m)).sort();

      if (toRemove.length === 1) {
        const member = formatAddress(toRemove[0] as string, true);
        return (
          `  ${colors.RED('-')} ${colors.BOLD(resourcePath)} (${colors.CYAN('role')})\n` +
          `    ${colors.RED('will remove')} member: ${colors.RED(member)}`
        );
      } else {
        const membersList = toRemove
          .map((m) => `      ${colors.RED('-')} ${formatAddress(m as string, true)}`)
          .join('\n');
        return (
          `  ${colors.RED('-')} ${colors.BOLD(resourcePath)} (${colors.CYAN('role')})\n` +
          `    ${colors.RED(`will remove ${toRemove.length} members:`)}\n${membersList}`
        );
      }
    }
  }

  return `  ${colors.YELLOW('~')} ${resourcePath}: Unknown diff type`;
}

export function printPlanSummary(
  numUpdates: number,
  numAdds: number,
  numRemoves: number,
  numErrors: number,
  numContracts: number,
  quiet: boolean = false
): void {
  /** Print Terraform-style plan summary. */
  if (quiet) {
    return;
  }

  const totalChanges = numUpdates + numAdds + numRemoves + numErrors;

  console.log(chalk.bold('Nodrift Plan:') + ` ${totalChanges > 0 ? totalChanges : 'No'} changes detected`);
  console.log();

  if (totalChanges > 0) {
    const changes: Array<[string, number, any]> = [];
    if (numUpdates > 0) changes.push(['~ update', numUpdates, chalk.yellow]);
    if (numAdds > 0) changes.push(['+ add', numAdds, chalk.green]);
    if (numRemoves > 0) changes.push(['- remove', numRemoves, chalk.red]);
    if (numErrors > 0) changes.push(['✗ error', numErrors, chalk.red]);

    for (const [label, count, color] of changes) {
      console.log(`  ${color(label)}: ${count}`);
    }
  }

  console.log();
  console.log(`Plan: ${numContracts} contract${numContracts !== 1 ? 's' : ''} will be checked for drift.`);
  console.log();
}

export function printPlan(
  diffs: Diff[],
  contractAddresses: Record<string, string>,
  useColors: boolean = true,
  contractNetworks?: Record<string, number>
): void {
  /** Print Terraform-style plan grouped by contract. */
  const colors = useColors ? Colors : {
    HEADER: (s: string) => s,
    BLUE: (s: string) => s,
    CYAN: (s: string) => s,
    GREEN: (s: string) => s,
    YELLOW: (s: string) => s,
    RED: (s: string) => s,
    END: '',
    BOLD: (s: string) => s,
    UNDERLINE: (s: string) => s,
    DIM: (s: string) => s,
    MAGENTA: (s: string) => s,
  } as typeof Colors;

  // Group diffs by contract name
  const diffsByContract: Record<string, Diff[]> = {};
  for (const diff of diffs) {
    if (!diffsByContract[diff.contractName]) {
      diffsByContract[diff.contractName] = [];
    }
    diffsByContract[diff.contractName].push(diff);
  }

  // Print each contract's changes
  for (const [contractName, contractDiffs] of Object.entries(diffsByContract)) {
    const address = contractAddresses[contractName] || 'unknown';
    const addressShort = address.length > 42 ? `${address.slice(0, 8)}...${address.slice(-6)}` : address;
    const chainId = contractNetworks?.[contractName];
    const networkInfo = chainId ? ` (chain_id: ${chainId})` : '';

    console.log(
      colors.BOLD(colors.CYAN(`# Contract: ${contractName}`)) +
      colors.DIM(` (${addressShort}${networkInfo})`)
    );
    console.log();

    for (const diff of contractDiffs) {
      console.log(formatPlanDiff(diff, useColors));
      console.log();
    }

    // Separator between contracts (except for last one)
    const contractNames = Object.keys(diffsByContract);
    if (contractName !== contractNames[contractNames.length - 1]) {
      console.log();
    }
  }
}

