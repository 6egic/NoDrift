/** Utility functions for reconciliation. */

import { ethers } from 'ethers';

/**
 * Normalize address to checksum format.
 */
export function normalizeAddress(address: unknown): string | null {
  if (address === null || address === undefined) {
    return null;
  }
  if (typeof address === 'string' && address.startsWith('0x')) {
    try {
      return ethers.getAddress(address);
    } catch {
      return address;
    }
  }
  return String(address);
}

/**
 * Normalize list of addresses.
 */
export function normalizeList(items: unknown[]): string[] {
  return items
    .filter((item) => item !== null && item !== undefined)
    .map((item) => normalizeAddress(item))
    .filter((addr): addr is string => addr !== null)
    .sort();
}

