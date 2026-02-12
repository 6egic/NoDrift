/** Comparison utilities for state verification. */

import { ethers } from 'ethers';

/**
 * Compare two values using the specified operator.
 */
export function compareValues(left: unknown, right: unknown, operator: string): boolean {
  // Normalize addresses
  let normalizedLeft = left;
  let normalizedRight = right;
  
  if (typeof left === 'string' && left.startsWith('0x') && left.length === 42) {
    normalizedLeft = ethers.getAddress(left);
  }
  if (typeof right === 'string' && right.startsWith('0x') && right.length === 42) {
    normalizedRight = ethers.getAddress(right);
  }
  
  // Convert bigint to number for comparison
  const leftNum = typeof normalizedLeft === 'bigint' ? Number(normalizedLeft) : (typeof normalizedLeft === 'number' ? normalizedLeft : NaN);
  const rightNum = typeof normalizedRight === 'bigint' ? Number(normalizedRight) : (typeof normalizedRight === 'number' ? normalizedRight : NaN);
  
  switch (operator) {
    case 'equals':
      return normalizedLeft === normalizedRight;
    case 'not_equals':
      return normalizedLeft !== normalizedRight;
    case 'greater_than':
      return !isNaN(leftNum) && !isNaN(rightNum) && leftNum > rightNum;
    case 'less_than':
      return !isNaN(leftNum) && !isNaN(rightNum) && leftNum < rightNum;
    case 'greater_than_or_equal':
      return !isNaN(leftNum) && !isNaN(rightNum) && leftNum >= rightNum;
    case 'less_than_or_equal':
      return !isNaN(leftNum) && !isNaN(rightNum) && leftNum <= rightNum;
    case 'contains':
      return Array.isArray(normalizedRight) && normalizedRight.includes(normalizedLeft);
    case 'contains_all':
      return Array.isArray(normalizedLeft) && Array.isArray(normalizedRight) &&
             normalizedRight.every(item => (normalizedLeft as unknown[]).includes(item));
    case 'contains_any':
      return Array.isArray(normalizedLeft) && Array.isArray(normalizedRight) &&
             normalizedRight.some(item => (normalizedLeft as unknown[]).includes(item));
    case 'starts_with':
      return typeof normalizedLeft === 'string' && typeof normalizedRight === 'string' && normalizedLeft.startsWith(normalizedRight);
    case 'ends_with':
      return typeof normalizedLeft === 'string' && typeof normalizedRight === 'string' && normalizedLeft.endsWith(normalizedRight);
    default:
      throw new Error(`Unknown comparison operator: ${operator}`);
  }
}

