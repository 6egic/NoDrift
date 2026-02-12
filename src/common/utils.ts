/** Utility functions for Nodrift. */

export function getEnvOrDefault(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

export function formatAddress(address: string, short: boolean = false): string {
  /**
   * Format Ethereum address for display.
   */
  if (!address || !address.startsWith('0x')) {
    return address;
  }

  if (short && address.length > 10) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  return address;
}

export function truncateString(s: string, maxLength: number = 50): string {
  /** Truncate string with ellipsis if too long. */
  if (s.length <= maxLength) {
    return s;
  }
  return s.slice(0, maxLength - 3) + '...';
}

export function formatValue(value: unknown, maxLength: number = 80): string {
  /**
   * Format value for display.
   */
  if (value === null || value === undefined) {
    return 'None';
  }

  if (typeof value === 'string') {
    if (value.length > maxLength) {
      return truncateString(value, maxLength);
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length > 5) {
      return `[${value.slice(0, 3).join(', ')}... (+${value.length - 3} more)]`;
    }
    return JSON.stringify(value);
  }

  return String(value);
}

