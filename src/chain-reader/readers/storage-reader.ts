/** Storage slot and proxy readers. */

import { ethers } from 'ethers';
import { StateReadError } from '../../common/exceptions';
import { RpcClient } from '../../services/rpc-client';
import { getKnownStorageSlot } from '../helpers/storage-slots';

export interface StorageReaderContext {
  rpcClient: RpcClient;
  provider: ethers.JsonRpcProvider;
}

/**
 * Read raw storage slot value.
 */
export async function readStorageSlot(
  contractAddress: string,
  slot: string,
  context: StorageReaderContext
): Promise<string> {
  try {
    const slotBigInt = BigInt(slot);
    const value = await context.rpcClient.callWithRetry(
      () => context.provider.getStorage(contractAddress, slotBigInt),
      `readStorageSlot(${slot.slice(0, 10)}...)`,
      contractAddress
    );
    return value;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new StateReadError(`Could not read storage slot '${slot}': ${errorMessage}`);
  }
}

/**
 * Read proxy storage slot based on pattern and check type.
 */
export async function readProxySlot(
  contractAddress: string,
  proxyPattern: string,
  check: string,
  context: StorageReaderContext
): Promise<string> {
  let slot: string;
  
  if (proxyPattern === 'erc1967') {
    if (check === 'implementation') {
      slot = getKnownStorageSlot('IMPLEMENTATION_SLOT');
    } else if (check === 'admin') {
      slot = getKnownStorageSlot('ADMIN_SLOT');
    } else if (check === 'beacon') {
      slot = getKnownStorageSlot('BEACON_SLOT');
    } else {
      throw new StateReadError(`Unknown proxy check type: ${check}`);
    }
  } else {
    // For other patterns, would need custom slot calculation
    throw new StateReadError(`Proxy pattern '${proxyPattern}' not yet fully supported`);
  }
  
  return await readStorageSlot(contractAddress, slot, context);
}

