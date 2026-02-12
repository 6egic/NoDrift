/** Storage slot constants and utilities. */

/**
 * Known storage slot constants for common patterns.
 */
export const KNOWN_STORAGE_SLOTS: Record<string, string> = {
  // ERC1967 slots
  'IMPLEMENTATION_SLOT': '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
  'BEACON_SLOT': '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50',
  'ADMIN_SLOT': '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103',
};

/**
 * Get known storage slot by name.
 */
export function getKnownStorageSlot(slotName: string): string {
  return KNOWN_STORAGE_SLOTS[slotName] || '';
}

