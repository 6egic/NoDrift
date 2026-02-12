/** Etherscan API integration for fetching contract ABIs. */

import type { ABI } from '../common/types';

const ETHERSCAN_API_ENDPOINTS: Record<number, string> = {
  1: 'https://api.etherscan.io/api',      // Ethereum Mainnet
  5: 'https://api-goerli.etherscan.io/api', // Goerli
  11155111: 'https://api-sepolia.etherscan.io/api', // Sepolia
  137: 'https://api.polygonscan.com/api',  // Polygon
  80001: 'https://api-testnet.polygonscan.com/api', // Mumbai
  56: 'https://api.bscscan.com/api',      // BSC
  97: 'https://api-testnet.bscscan.com/api', // BSC Testnet
  42161: 'https://api.arbiscan.io/api',    // Arbitrum
  10: 'https://api-optimistic.etherscan.io/api', // Optimism
  43114: 'https://api.snowtrace.io/api',   // Avalanche
  250: 'https://api.ftmscan.com/api',      // Fantom
};

export interface FetchABIOptions {
  address: string;
  chainId: number;
  apiKey?: string;
}

export interface FetchABIResult {
  success: boolean;
  abi?: ABI;
  error?: string;
}

/**
 * Get Etherscan API endpoint for a given chain ID.
 */
function getEtherscanEndpoint(chainId: number): string | null {
  return ETHERSCAN_API_ENDPOINTS[chainId] || null;
}

/**
 * Fetch contract ABI from Etherscan (or compatible explorer).
 */
export async function fetchABIFromEtherscan(
  options: FetchABIOptions
): Promise<FetchABIResult> {
  const { address, chainId, apiKey } = options;

  // Validate address
  if (!address.startsWith('0x') || address.length !== 42) {
    return {
      success: false,
      error: 'Invalid contract address format',
    };
  }

  // Get API endpoint
  const endpoint = getEtherscanEndpoint(chainId);
  if (!endpoint) {
    return {
      success: false,
      error: `Chain ID ${chainId} is not supported for ABI fetching. Supported chains: ${Object.keys(ETHERSCAN_API_ENDPOINTS).join(', ')}`,
    };
  }

  // Check for API key
  const apiKeyToUse = apiKey || process.env.ETHERSCAN_API_KEY;
  if (!apiKeyToUse) {
    return {
      success: false,
      error: 'Etherscan API key not provided. Set ETHERSCAN_API_KEY environment variable or provide via --api-key flag.',
    };
  }

  // Build API URL
  const url = `${endpoint}?module=contract&action=getabi&address=${address}&apikey=${apiKeyToUse}`;

  try {
    // Use fetch (available in Node.js 18+)
    const response = await fetch(url);
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json() as { status: string; result: string | unknown; message?: string };

    if (data.status === '0') {
      // Contract not verified or other error
      const errorMsg = typeof data.result === 'string' ? data.result : data.message;
      return {
        success: false,
        error: errorMsg || 'Failed to fetch ABI. Contract may not be verified on Etherscan.',
      };
    }

    if (data.status === '1' && data.result) {
      try {
        const abi = JSON.parse(data.result as string);
        if (Array.isArray(abi)) {
          return {
            success: true,
            abi,
          };
        } else {
          return {
            success: false,
            error: 'Invalid ABI format received from Etherscan',
          };
        }
      } catch (parseError: unknown) {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        return {
          success: false,
          error: `Failed to parse ABI: ${errorMessage}`,
        };
      }
    }

    return {
      success: false,
      error: 'Unexpected response format from Etherscan API',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Network error: ${errorMessage}`,
    };
  }
}

/**
 * Filter ABI to only include view/pure functions and public variables.
 * This reduces the ABI size and focuses on what Nodrift needs.
 */
export function filterABIForVerification(abi: ABI): ABI {
  return abi.filter((item) => {
    // Include functions that are view or pure
    if (item.type === 'function') {
      return (
        item.stateMutability === 'view' ||
        item.stateMutability === 'pure' ||
        item.stateMutability === undefined // Some ABIs don't specify
      );
    }
    
    // Include events (might be useful for debugging)
    if (item.type === 'event') {
      return false; // Events not needed for verification
    }
    
    // Include errors
    if (item.type === 'error') {
      return false; // Errors not needed for verification
    }
    
    // Include constructor (not needed)
    if (item.type === 'constructor') {
      return false;
    }
    
    // Include fallback/receive (not needed)
    if (item.type === 'fallback' || item.type === 'receive') {
      return false;
    }
    
    return false;
  });
}

/**
 * Get minimal ABI for specific functions/variables.
 */
export function getMinimalABI(abi: ABI, functionNames: string[]): ABI {
  return abi.filter((item) => {
    if (item.type === 'function' && 'name' in item && typeof item.name === 'string') {
      return functionNames.includes(item.name);
    }
    return false;
  });
}

