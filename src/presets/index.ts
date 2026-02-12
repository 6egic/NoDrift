/** Configuration presets for common contract types. */

import type { ContractConfig } from '../config/types';

export interface PresetOptions {
  address: string;
  network?: {
    rpc_url?: string;
    chain_id?: number;
  };
}

/**
 * ERC20 token preset configuration.
 */
export function erc20Preset(options: PresetOptions): ContractConfig {
  const { address, network } = options;
  
  return {
    address,
    network: network ? {
      rpc_url: network.rpc_url || '${RPC_URL}',
      chain_id: network.chain_id || 1,
    } : undefined,
    abi: [
      {
        name: 'totalSupply',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint256' }],
      },
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ type: 'address', name: 'account' }],
        outputs: [{ type: 'uint256' }],
      },
      {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { type: 'address', name: 'owner' },
          { type: 'address', name: 'spender' }
        ],
        outputs: [{ type: 'uint256' }],
      },
      {
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint8' }],
      },
      {
        name: 'symbol',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'string' }],
      },
      {
        name: 'name',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'string' }],
      },
      {
        name: 'owner',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'address' }],
      },
    ],
    state: {},  // Empty - user defines all checks
  };
}

/**
 * ERC721 NFT preset configuration.
 */
export function erc721Preset(options: PresetOptions): ContractConfig {
  const { address, network } = options;
  
  return {
    address,
    network: network ? {
      rpc_url: network.rpc_url || '${RPC_URL}',
      chain_id: network.chain_id || 1,
    } : undefined,
    abi: [
      {
        name: 'name',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'string' }],
      },
      {
        name: 'symbol',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'string' }],
      },
      {
        name: 'totalSupply',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint256' }],
      },
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ type: 'address', name: 'owner' }],
        outputs: [{ type: 'uint256' }],
      },
      {
        name: 'ownerOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ type: 'uint256', name: 'tokenId' }],
        outputs: [{ type: 'address' }],
      },
      {
        name: 'tokenURI',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ type: 'uint256', name: 'tokenId' }],
        outputs: [{ type: 'string' }],
      },
      {
        name: 'owner',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'address' }],
      },
    ],
    state: {},  // Empty - user defines all checks
  };
}

/**
 * Proxy contract preset configuration (ERC1967).
 */
export function proxyPreset(options: PresetOptions & { implementationAddress?: string }): ContractConfig {
  const { address, network, implementationAddress: _implementationAddress } = options;
  
  return {
    address,
    network: network ? {
      rpc_url: network.rpc_url || '${RPC_URL}',
      chain_id: network.chain_id || 1,
    } : undefined,
    abi: [
      {
        name: 'implementation',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'address' }],
      },
      {
        name: 'admin',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'address' }],
      },
    ],
    state: {},  // Empty - user defines all checks
  };
}

/**
 * AccessControl preset configuration (OpenZeppelin).
 */
export function accessControlPreset(options: PresetOptions & { roles?: string[] }): ContractConfig {
  const { address, network, roles = ['DEFAULT_ADMIN_ROLE'] } = options;
  
  const roleState: Record<string, any> = {};
  for (const role of roles) {
    roleState[`role_${role.toLowerCase().replace(/\s+/g, '_')}`] = {
      type: 'role',
      role_name: role,
      members: `\${${role.toUpperCase().replace(/\s+/g, '_')}_MEMBERS || []}`,
    };
  }
  
  return {
    address,
    network: network ? {
      rpc_url: network.rpc_url || '${RPC_URL}',
      chain_id: network.chain_id || 1,
    } : undefined,
    abi: [
      {
        name: 'hasRole',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { type: 'bytes32', name: 'role' },
          { type: 'address', name: 'account' },
        ],
        outputs: [{ type: 'bool' }],
      },
      {
        name: 'getRoleMemberCount',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ type: 'bytes32', name: 'role' }],
        outputs: [{ type: 'uint256' }],
      },
      {
        name: 'getRoleMember',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { type: 'bytes32', name: 'role' },
          { type: 'uint256', name: 'index' }
        ],
        outputs: [{ type: 'address' }],
      },
    ],
    state: {},  // Empty - user defines all checks
  };
}

/**
 * ERC1155 multi-token preset configuration.
 */
export function erc1155Preset(options: PresetOptions): ContractConfig {
  const { address, network } = options;
  
  return {
    address,
    network: network ? {
      rpc_url: network.rpc_url || '${RPC_URL}',
      chain_id: network.chain_id || 1,
    } : undefined,
    abi: [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { type: 'address', name: 'account' },
          { type: 'uint256', name: 'id' },
        ],
        outputs: [{ type: 'uint256' }],
      },
      {
        name: 'balanceOfBatch',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { type: 'address[]', name: 'accounts' },
          { type: 'uint256[]', name: 'ids' },
        ],
        outputs: [{ type: 'uint256[]' }],
      },
      {
        name: 'uri',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ type: 'uint256', name: 'tokenId' }],
        outputs: [{ type: 'string' }],
      },
      {
        name: 'isApprovedForAll',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { type: 'address', name: 'account' },
          { type: 'address', name: 'operator' },
        ],
        outputs: [{ type: 'bool' }],
      },
    ],
    state: {},  // Empty - user defines all checks
  };
}

/**
 * ERC4626 tokenized vault preset configuration.
 */
export function erc4626Preset(options: PresetOptions): ContractConfig {
  const { address, network } = options;
  
  return {
    address,
    network: network ? {
      rpc_url: network.rpc_url || '${RPC_URL}',
      chain_id: network.chain_id || 1,
    } : undefined,
    abi: [
      {
        name: 'totalAssets',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint256' }],
      },
      {
        name: 'asset',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'address' }],
      },
      {
        name: 'convertToShares',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ type: 'uint256', name: 'assets' }],
        outputs: [{ type: 'uint256' }],
      },
      {
        name: 'convertToAssets',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ type: 'uint256', name: 'shares' }],
        outputs: [{ type: 'uint256' }],
      },
      {
        name: 'maxDeposit',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ type: 'address', name: 'receiver' }],
        outputs: [{ type: 'uint256' }],
      },
      {
        name: 'maxMint',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ type: 'address', name: 'receiver' }],
        outputs: [{ type: 'uint256' }],
      },
      {
        name: 'maxWithdraw',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ type: 'address', name: 'owner' }],
        outputs: [{ type: 'uint256' }],
      },
      {
        name: 'maxRedeem',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ type: 'address', name: 'owner' }],
        outputs: [{ type: 'uint256' }],
      },
    ],
    state: {},  // Empty - user defines all checks
  };
}

/**
 * Diamond pattern preset configuration (EIP-2535).
 * 
 * This preset generates function_call entries for Diamond pattern verification.
 * 
 * @param options - Preset options with Diamond-specific fields
 * @param options.facets - Optional array of expected facet addresses (for facets() check)
 * @param options.facetSelectors - Optional map of facet names to their expected function selectors
 *                                 Example: { "CutFacet": ["0x12345678", "0x87654321"] }
 * 
 * @example
 * // Basic usage - verify all facets
 * diamondPreset({
 *   address: "0x...",
 *   facets: ["0xFacet1", "0xFacet2"]
 * })
 * 
 * @example
 * // Advanced usage - verify specific facet selectors
 * diamondPreset({
 *   address: "0x...",
 *   facetSelectors: {
 *     "CutFacet": ["0x12345678"],
 *     "LoupeFacet": ["0x87654321", "0xabcdef00"]
 *   }
 * })
 */
export function diamondPreset(options: PresetOptions & { 
  facets?: string[];
  facetSelectors?: Record<string, string[]>;
}): ContractConfig {
  const { address, network, facets: _facets = [], facetSelectors: _facetSelectors = {} } = options;
  
  const abi = [
    {
      name: 'facets',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [
        {
          type: 'tuple[]',
          components: [
            { type: 'address', name: 'facetAddress' },
            { type: 'bytes4[]', name: 'functionSelectors' },
          ],
        },
      ],
    },
    {
      name: 'facetAddress',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ type: 'bytes4', name: 'functionSelector' }],
      outputs: [{ type: 'address' }],
    },
    {
      name: 'facetFunctionSelectors',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ type: 'address', name: 'facet' }],
      outputs: [{ type: 'bytes4[]' }],
    },
  ];
  
  return {
    address,
    network: network ? {
      rpc_url: network.rpc_url || '${RPC_URL}',
      chain_id: network.chain_id || 1,
    } : undefined,
    abi,
    state: {},  // Empty - user defines all checks
  };
}

/**
 * Available presets.
 */
export const presets = {
  erc20: erc20Preset,
  erc721: erc721Preset,
  erc1155: erc1155Preset,
  erc4626: erc4626Preset,
  diamond: diamondPreset,
  proxy: proxyPreset,
  accessControl: accessControlPreset,
};

/**
 * Get a preset by name.
 */
export function getPreset(name: keyof typeof presets) {
  return presets[name];
}

