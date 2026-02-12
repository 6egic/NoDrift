/** Mock utilities for testing */

import type { Provider, Contract as EthersContract } from 'ethers';
import type { ABI } from '../../src/common/types';

/**
 * Create a mock ethers provider
 */
export function createMockProvider(): jest.Mocked<Provider> {
  return {
    getNetwork: jest.fn().mockResolvedValue({ chainId: 1n, name: 'mainnet' }),
    getBlockNumber: jest.fn().mockResolvedValue(12345678),
    getBalance: jest.fn().mockResolvedValue(1000000000000000000n),
    call: jest.fn().mockResolvedValue('0x'),
    getCode: jest.fn().mockResolvedValue('0x6080604052'),
    getStorage: jest.fn().mockResolvedValue('0x0000000000000000000000000000000000000000000000000000000000000000'),
  } as any;
}

/**
 * Create a mock ethers contract
 */
export function createMockContract(address: string = '0x1234567890123456789012345678901234567890'): jest.Mocked<EthersContract> {
  return {
    target: address,
    interface: {
      getFunction: jest.fn(),
      encodeFunctionData: jest.fn(),
      decodeFunctionResult: jest.fn(),
    },
    owner: jest.fn().mockResolvedValue('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'),
    totalSupply: jest.fn().mockResolvedValue(1000000000000000000000000n),
    balanceOf: jest.fn().mockResolvedValue(100000000000000000000n),
    symbol: jest.fn().mockResolvedValue('TOKEN'),
    name: jest.fn().mockResolvedValue('Test Token'),
    decimals: jest.fn().mockResolvedValue(18),
    paused: jest.fn().mockResolvedValue(false),
    hasRole: jest.fn().mockResolvedValue(true),
    getRoleAdmin: jest.fn().mockResolvedValue('0x0000000000000000000000000000000000000000000000000000000000000000'),
  } as any;
}

/**
 * Create a mock ABI
 */
export function createMockABI(): ABI {
  return [
    {
      type: 'function',
      name: 'owner',
      inputs: [],
      outputs: [{ type: 'address', name: '' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'totalSupply',
      inputs: [],
      outputs: [{ type: 'uint256', name: '' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'balanceOf',
      inputs: [{ type: 'address', name: 'account' }],
      outputs: [{ type: 'uint256', name: '' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'symbol',
      inputs: [],
      outputs: [{ type: 'string', name: '' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'hasRole',
      inputs: [
        { type: 'bytes32', name: 'role' },
        { type: 'address', name: 'account' }
      ],
      outputs: [{ type: 'bool', name: '' }],
      stateMutability: 'view',
    },
  ];
}

/**
 * Create a mock configuration
 */
export function createMockConfig() {
  return {
    version: '1.0',
    network: {
      rpc_url: 'http://localhost:8545',
      chain_id: 1,
      timeout: 30000,
      max_retries: 3,
    },
    contracts: {
      TestToken: {
        address: '0x1234567890123456789012345678901234567890',
        abi: createMockABI(),
        state: [
          {
            type: 'owner',
            expected: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          },
          {
            type: 'variable',
            name: 'totalSupply',
            expected: '1000000000000000000000000',
          },
        ],
      },
    },
  };
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Timeout waiting for condition');
}

/**
 * Create a spy that tracks calls
 */
export function createSpy<T extends (...args: any[]) => any>(): jest.Mock<ReturnType<T>, Parameters<T>> {
  return jest.fn();
}
