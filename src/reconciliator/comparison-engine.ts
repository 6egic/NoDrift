/** Core comparison engine for value matching. */

import { normalizeAddress } from './utils';

export interface ComparisonOptions {
  tolerance?: number | string;
  range?: { min?: number; max?: number };
  pattern?: string | boolean;
  ignore_case?: boolean;
  ignore_order?: boolean;
  allow_empty?: boolean;
}

/**
 * Compare two values with enhanced options.
 */
export function compareValues(
  current: unknown,
  desired: unknown,
  options?: ComparisonOptions
): boolean {
  if (current === null || current === undefined || desired === null || desired === undefined) {
    return current === desired;
  }

  // Handle empty values with allow_empty option
  if (options?.allow_empty) {
    if ((Array.isArray(current) && current.length === 0) ||
        (typeof current === 'string' && current === '')) {
      return true;  // Empty is acceptable
    }
  }

  // Handle addresses
  if (typeof current === 'string' && typeof desired === 'string') {
    if (current.startsWith('0x') && desired.startsWith('0x')) {
      return normalizeAddress(current) === normalizeAddress(desired);
    }
    
    // Pattern matching (regex)
    if (options?.pattern) {
      const patternStr = typeof options.pattern === 'string' ? options.pattern : String(desired);
      try {
        const regex = new RegExp(patternStr, options.ignore_case ? 'i' : '');
        return regex.test(current);
      } catch {
        // Invalid regex, fall back to direct comparison
      }
    }
    
    // Case-insensitive comparison
    if (options?.ignore_case && !options.pattern) {
      return current.toLowerCase() === desired.toLowerCase();
    }
  }

  // Handle numbers with tolerance or range
  if (typeof current === 'number' || typeof current === 'bigint' || 
      typeof desired === 'number' || typeof desired === 'bigint') {
    const currNum = typeof current === 'bigint' ? Number(current) : current;
    const desNum = typeof desired === 'bigint' ? Number(desired) : desired;
    
    if (typeof currNum === 'number' && typeof desNum === 'number') {
      // Range check
      if (options?.range) {
        if (options.range.min !== undefined && currNum < options.range.min) return false;
        if (options.range.max !== undefined && currNum > options.range.max) return false;
        return true;
      }
      
      // Tolerance check
      if (options?.tolerance !== undefined) {
        let tolerance: number;
        if (typeof options.tolerance === 'string' && options.tolerance.endsWith('%')) {
          const percent = parseFloat(options.tolerance.slice(0, -1)) / 100;
          tolerance = Math.abs(desNum * percent);
        } else {
          tolerance = typeof options.tolerance === 'number' 
            ? options.tolerance 
            : parseFloat(String(options.tolerance));
        }
        return Math.abs(currNum - desNum) <= tolerance;
      }
    }
  }

  // Handle bigint (ethers v6 uses native bigint instead of BigNumber)
  if (typeof current === 'bigint' && typeof desired === 'bigint') {
    return current === desired;
  }
  if (typeof current === 'bigint') {
    return current.toString() === String(desired);
  }
  if (typeof desired === 'bigint') {
    return String(current) === desired.toString();
  }

  // Handle arrays with order-insensitive comparison
  if (Array.isArray(current) && Array.isArray(desired)) {
    if (options?.ignore_order) {
      // Compare as sets (order doesn't matter)
      const currentSet = new Set(current.map(String));
      const desiredSet = new Set(desired.map(String));
      if (currentSet.size !== desiredSet.size) return false;
      for (const item of desiredSet) {
        if (!currentSet.has(item)) return false;
      }
      return true;
    } else {
      // Order-sensitive comparison
      if (current.length !== desired.length) return false;
      for (let i = 0; i < current.length; i++) {
        if (!compareValues(current[i], desired[i], options)) return false;
      }
      return true;
    }
  }

  // Handle objects/structs
  if (typeof current === 'object' && typeof desired === 'object' &&
      current !== null && desired !== null &&
      !Array.isArray(current) && !Array.isArray(desired)) {
    const currKeys = Object.keys(current).sort();
    const desKeys = Object.keys(desired).sort();
    if (currKeys.length !== desKeys.length) return false;
    return currKeys.every(key =>
      compareValues(
        (current as Record<string, unknown>)[key],
        (desired as Record<string, unknown>)[key],
        options
      )
    );
  }

  // Default: strict equality
  return current === desired;
}

