/** JUnit XML formatter for CI/CD test reporting. */

import * as fs from 'fs';
import * as path from 'path';
import { Diff } from '../reconciliator/diff';
import { VerificationResult } from '../core';

/**
 * Escape XML special characters.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format diff for JUnit failure/error message.
 */
function formatDiffForJUnit(diff: Diff): string {
  const lines: string[] = [];
  
  if (diff.action === 'error') {
    lines.push(`Error: ${diff.error || 'Unknown error'}`);
    lines.push(`Contract: ${diff.contractName}`);
    lines.push(`State Key: ${diff.stateKey}`);
    lines.push(`Type: ${diff.stateType}`);
  } else {
    lines.push(`Drift detected in ${diff.contractName}.${diff.stateKey}`);
    lines.push(`Type: ${diff.stateType}`);
    
    if (diff.currentValue !== undefined) {
      const current = typeof diff.currentValue === 'object' 
        ? JSON.stringify(diff.currentValue) 
        : String(diff.currentValue);
      lines.push(`Current: ${current}`);
    }
    
    if (diff.desiredValue !== undefined) {
      const desired = typeof diff.desiredValue === 'object' 
        ? JSON.stringify(diff.desiredValue) 
        : String(diff.desiredValue);
      lines.push(`Expected: ${desired}`);
    }
    
    if (diff.action === 'add') {
      lines.push('Action: Add missing value');
    } else if (diff.action === 'remove') {
      lines.push('Action: Remove unexpected value');
    } else {
      lines.push('Action: Update value');
    }
  }
  
  return lines.join('\n');
}

/**
 * Generate JUnit XML from verification results.
 */
export function generateJUnitXML(
  result: VerificationResult,
  executionTimeMs: number,
  testSuiteName: string = 'Nodrift Verification'
): string {
  const totalTests = result.diffs.length;
  const failures = result.diffs.filter(d => d.action !== 'error' && d.action !== 'add' && d.action !== 'remove').length;
  const errors = result.diffs.filter(d => d.action === 'error').length;
  const skipped = 0; // We don't track skipped tests currently
  
  const executionTime = (executionTimeMs / 1000).toFixed(3);
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<testsuites name="${escapeXml(testSuiteName)}" tests="${totalTests}" failures="${failures}" errors="${errors}" skipped="${skipped}" time="${executionTime}">\n`;
  xml += `  <testsuite name="${escapeXml(testSuiteName)}" tests="${totalTests}" failures="${failures}" errors="${errors}" skipped="${skipped}" time="${executionTime}" timestamp="${new Date().toISOString()}">\n`;
  
  // Group diffs by contract for better organization
  const diffsByContract = new Map<string, Diff[]>();
  for (const diff of result.diffs) {
    if (!diffsByContract.has(diff.contractName)) {
      diffsByContract.set(diff.contractName, []);
    }
    diffsByContract.get(diff.contractName)!.push(diff);
  }
  
  // Generate test cases
  for (const diff of result.diffs) {
    const testCaseName = `${diff.contractName}.${diff.stateKey}`;
    const className = diff.contractName;
    const time = '0.000'; // Individual test timing not tracked yet
    
    xml += `    <testcase classname="${escapeXml(className)}" name="${escapeXml(testCaseName)}" time="${time}">\n`;
    
    if (diff.action === 'error') {
      // Error case
      const errorMessage = diff.error || 'Unknown error';
      const errorContent = formatDiffForJUnit(diff);
      xml += `      <error type="${escapeXml(diff.stateType)}" message="${escapeXml(errorMessage)}">${escapeXml(errorContent)}</error>\n`;
    } else if (diff.action !== 'add' && diff.action !== 'remove') {
      // Failure case (drift detected)
      const failureMessage = `${diff.stateType} mismatch: expected ${String(diff.desiredValue)}, got ${String(diff.currentValue)}`;
      const failureContent = formatDiffForJUnit(diff);
      xml += `      <failure type="${escapeXml(diff.stateType)}" message="${escapeXml(failureMessage)}">${escapeXml(failureContent)}</failure>\n`;
    }
    // Success cases (no drift) don't need failure/error tags
    
    xml += `    </testcase>\n`;
  }
  
  // Add system-out and system-err if there are any
  if (result.diffs.length > 0) {
    xml += `    <system-out><![CDATA[\n`;
    xml += `Verification Summary:\n`;
    xml += `  Total checks: ${totalTests}\n`;
    xml += `  Failures: ${failures}\n`;
    xml += `  Errors: ${errors}\n`;
    xml += `  Execution time: ${executionTime}s\n`;
    xml += `]]></system-out>\n`;
  }
  
  xml += `  </testsuite>\n`;
  xml += `</testsuites>\n`;
  
  return xml;
}

/**
 * Write JUnit XML to file, creating directory if needed.
 */
export function writeJUnitXML(
  xml: string,
  filePath: string
): void {
  // Create directory if it doesn't exist
  const dir = path.dirname(filePath);
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write file
  fs.writeFileSync(filePath, xml, 'utf-8');
}

