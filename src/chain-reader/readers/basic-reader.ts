/** Basic state readers: owner, role, variable, function_call. */

import { ethers } from 'ethers';
import { StateReadError } from '../../common/exceptions';
import { RpcClient } from '../../services/rpc-client';
import type { ABI } from '../../common/types';

export interface BasicReaderContext {
  rpcClient: RpcClient;
  getContract: (address: string, abi: ABI) => ethers.Contract;
}

/**
 * Read contract owner.
 */
export async function readOwner(
  contract: ethers.Contract,
  context: BasicReaderContext
): Promise<string> {
  const contractAddress = await contract.getAddress();
  try {
    const owner = await context.rpcClient.callWithRetry(
      () => contract.owner(),
      'readOwner',
      contractAddress
    );
    return ethers.getAddress(owner);
  } catch (error: unknown) {
    // Try alternate patterns
    try {
      const owner = await context.rpcClient.callWithRetry(
        () => contract.getOwner(),
        'readOwner (getOwner)',
        contractAddress
      );
      return ethers.getAddress(owner);
    } catch {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StateReadError(`Could not read owner: ${errorMessage}`);
    }
  }
}

/**
 * Read all members of a role.
 */
export async function readRoleMembers(
  contract: ethers.Contract,
  roleHash: string,
  context: BasicReaderContext
): Promise<string[]> {
  const members: string[] = [];
  const contractAddress = await contract.getAddress();
  
  // Get role count
  let roleCount: bigint;
  try {
    roleCount = await context.rpcClient.callWithRetry(
      () => contract.getRoleMemberCount(roleHash),
      'getRoleMemberCount',
      contractAddress
    );
  } catch {
    try {
      roleCount = await context.rpcClient.callWithRetry(
        () => contract.roleMemberCount(roleHash),
        'roleMemberCount',
        contractAddress
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StateReadError(`Could not read role count: ${errorMessage}`);
    }
  }
  
  // Read all members in parallel
  const memberPromises: Promise<string>[] = [];
  for (let i = 0; i < Number(roleCount); i++) {
    memberPromises.push(
      context.rpcClient.callWithRetry(
        async () => {
          try {
            const member = await contract.getRoleMember(roleHash, i);
            return ethers.getAddress(member);
          } catch {
            const member = await contract.roleMember(roleHash, i);
            return ethers.getAddress(member);
          }
        },
        `getRoleMember(${i})`,
        contractAddress
      )
    );
  }
  
  const memberResults = await Promise.all(memberPromises);
  members.push(...memberResults);
  
  return members;
}

/**
 * Read a variable value.
 */
export async function readVariable(
  contract: ethers.Contract,
  variableName: string,
  context: BasicReaderContext,
  customAbi?: any
): Promise<any> {
  const contractAddress = await contract.getAddress();
  
  try {
    // Try as public variable first
    const value = await context.rpcClient.callWithRetry(
      () => contract[variableName](),
      `readVariable(${variableName})`,
      contractAddress
    );
    return value;
  } catch (error: unknown) {
    // Try with get prefix
    try {
      const getterName = `get${variableName.charAt(0).toUpperCase()}${variableName.slice(1)}`;
      const value = await context.rpcClient.callWithRetry(
        () => contract[getterName](),
        `readVariable(${getterName})`,
        contractAddress
      );
      return value;
    } catch {
      // Try custom ABI
      if (customAbi && customAbi.function) {
        try {
          const value = await context.rpcClient.callWithRetry(
            () => contract[customAbi.function](),
            `readVariable(${customAbi.function})`,
            contractAddress
          );
          return value;
        } catch {
          // Fall through
        }
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StateReadError(`Could not read variable '${variableName}': ${errorMessage}`);
    }
  }
}

/**
 * Read a function call result.
 */
export async function readFunctionCall(
  contract: ethers.Contract,
  functionName: string,
  args: any[],
  context: BasicReaderContext,
  customAbi?: any
): Promise<any> {
  const contractAddress = await contract.getAddress();
  
  try {
    const func = customAbi?.function || functionName;
    const value = await context.rpcClient.callWithRetry(
      () => contract[func](...args),
      `readFunctionCall(${func})`,
      contractAddress
    );
    return value;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new StateReadError(`Could not call function '${functionName}': ${errorMessage}`);
  }
}

