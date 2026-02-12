# Nodrift Examples

This directory contains real-world examples demonstrating Nodrift's contract verification capabilities using actual deployed contracts on Ethereum mainnet.

## Directory Structure: Directory Structure

```
examples/
├── basic/              # Basic ERC20 token verification
├── defi/               # DeFi protocol verification (DEX, liquidity pools)
├── governance/         # Governance token verification
├── stablecoins/        # Stablecoin supply and distribution monitoring
├── risk-management/    # Treasury allocation and liquidity risk monitoring
├── METRICS.md          # Metrics and Severity System: Metrics and severity system documentation
└── README.md           # This file
```

## Quick Start: Quick Start

All examples use the same RPC endpoint and work out of the box:

```bash
# Basic ERC20 token
npm run dev -- examples/basic/01-erc20-token.yaml

# Stablecoin
npm run dev -- examples/basic/02-stablecoin.yaml

# DEX Factory
npm run dev -- examples/defi/01-dex-factory.yaml

# Complete Uniswap V2 ecosystem
npm run dev -- examples/defi/03-uniswap-v2-ecosystem.yaml

# USDC distribution monitoring
npm run dev -- examples/stablecoins/02-usdc-distribution.yaml

# Treasury allocation tracking
npm run dev -- examples/risk-management/01-treasury-allocation.yaml

# Liquidity pool health
npm run dev -- examples/risk-management/02-liquidity-pool-health.yaml
```

## Examples by Category:

### Basic Examples

Learn the fundamentals of contract verification:

| Example | File | Description | Demonstrates |
|---------|------|-------------|--------------|
| **ERC20 Token** | [`basic/01-erc20-token.yaml`](basic/01-erc20-token.yaml) | Verify USDC token properties | Basic function calls, string/number comparisons |
| **Stablecoin** | [`basic/02-stablecoin.yaml`](basic/02-stablecoin.yaml) | Verify DAI stablecoin | Token metadata verification |
| **Token with Balances** | [`basic/03-erc20-with-balances.yaml`](basic/03-erc20-with-balances.yaml) | Check USDC balances and allowances | Balance checks, tolerance, greater_than comparison |

### DeFi Examples

Verify decentralized finance protocols:

| Example | File | Description | Demonstrates |
|---------|------|-------------|--------------|
| **DEX Factory** | [`defi/01-dex-factory.yaml`](defi/01-dex-factory.yaml) | Verify Uniswap V2 Factory | Factory configuration, fee settings |
| **Liquidity Pool** | [`defi/02-uniswap-v2-pair.yaml`](defi/02-uniswap-v2-pair.yaml) | Verify USDC/WETH pair | Pool token verification, liquidity checks |
| **DEX Ecosystem** | [`defi/03-uniswap-v2-ecosystem.yaml`](defi/03-uniswap-v2-ecosystem.yaml) | Verify Router, Factory, and Pairs | Multi-contract verification, cross-contract relationships |
| **Time-Based Checks** | [`defi/05-oracle-freshness-check.yaml`](defi/05-oracle-freshness-check.yaml) | Monitor timestamp freshness | Time-based verification, staleness detection, oracle monitoring |
| **Chainlink Oracles** | [`defi/06-chainlink-oracle-monitoring.yaml`](defi/06-chainlink-oracle-monitoring.yaml) | Monitor Chainlink price feeds | Real-world time-based verification with Chainlink |

### Governance Examples

Verify governance and voting systems:

| Example | File | Description | Demonstrates |
|---------|------|-------------|--------------|
| **Governance Token** | [`governance/01-uni-token.yaml`](governance/01-uni-token.yaml) | Verify UNI token | Fixed supply tokens, treasury balances |

### Stablecoin Examples

Monitor stablecoin supply, distribution, and concentration risk:

| Example | File | Description | Demonstrates |
|---------|------|-------------|--------------|
| **DAI Supply Monitoring** | [`stablecoins/01-dai-supply-monitoring.yaml`](stablecoins/01-dai-supply-monitoring.yaml) | Monitor DAI supply and liquidity | Supply monitoring, PSM reserves, DEX liquidity |
| **USDC Distribution** | [`stablecoins/02-usdc-distribution.yaml`](stablecoins/02-usdc-distribution.yaml) | Track USDC across DeFi protocols | Protocol exposure, concentration risk, exchange holdings |

### Risk Management Examples

Monitor treasury allocations and liquidity pool health:

| Example | File | Description | Demonstrates |
|---------|------|-------------|--------------|
| **Treasury Allocation** | [`risk-management/01-treasury-allocation.yaml`](risk-management/01-treasury-allocation.yaml) | Monitor DAO treasury holdings | Multi-asset tracking, allocation percentages |
| **Liquidity Pool Health** | [`risk-management/02-liquidity-pool-health.yaml`](risk-management/02-liquidity-pool-health.yaml) | Monitor DEX pool reserves | Pool balance monitoring, liquidity thresholds, metrics |
| **Protocol Solvency** | [`risk-management/03-protocol-solvency-check.yaml`](risk-management/03-protocol-solvency-check.yaml) | Verify protocol backing | Multi-contract solvency verification |
| **Metrics and Severity System: Comprehensive Metrics** | [`risk-management/04-comprehensive-metrics.yaml`](risk-management/04-comprehensive-metrics.yaml) | **Full metrics system demo** | **All severity levels, categories, and risk metrics** |

## What Each Example Teaches: 

### 1. Basic Token Verification ([`basic/01-erc20-token.yaml`](basic/01-erc20-token.yaml))

**Concepts:**
- Basic function calls
- String and number comparisons
- Token metadata (name, symbol, decimals)

**Run it:**
```bash
npm run dev -- examples/basic/01-erc20-token.yaml
```

**Expected result:**  All checks pass

---

### 2. Stablecoin Verification ([`basic/02-stablecoin.yaml`](basic/02-stablecoin.yaml))

**Concepts:**
- Verifying stablecoin properties
- 18 decimal tokens (vs 6 for USDC)

**Run it:**
```bash
npm run dev -- examples/basic/02-stablecoin.yaml
```

**Expected result:**  All checks pass

---

### 3. Token with Balances ([`basic/03-erc20-with-balances.yaml`](basic/03-erc20-with-balances.yaml))

**Concepts:**
- Checking account balances
- Using `tolerance` for values that change
- Using `comparison: greater_than` for minimum thresholds

**Run it:**
```bash
npm run dev -- examples/basic/03-erc20-with-balances.yaml
```

**Expected result:**  All checks pass (with tolerance)

---

### 4. DEX Factory ([`defi/01-dex-factory.yaml`](defi/01-dex-factory.yaml))

**Concepts:**
- Factory pattern verification
- Fee configuration
- Admin addresses

**Run it:**
```bash
npm run dev -- examples/defi/01-dex-factory.yaml
```

**Expected result:**  Shows actual values (demonstrates drift detection)

---

### 5. Liquidity Pool ([`defi/02-uniswap-v2-pair.yaml`](defi/02-uniswap-v2-pair.yaml))

**Concepts:**
- Verifying pool token addresses
- Checking liquidity exists
- Factory relationship

**Run it:**
```bash
npm run dev -- examples/defi/02-uniswap-v2-pair.yaml
```

**Expected result:**  All checks pass

---

### 6. Complete DEX Ecosystem ([`defi/03-uniswap-v2-ecosystem.yaml`](defi/03-uniswap-v2-ecosystem.yaml))

**Concepts:**
- Multi-contract verification
- Cross-contract relationships
- Router → Factory → Pair verification
- Comprehensive protocol checks

**Run it:**
```bash
npm run dev -- examples/defi/03-uniswap-v2-ecosystem.yaml
```

**Expected result:**  Shows pair count is higher than minimum (485k+ pairs)

---

### 7. Governance Token ([`governance/01-uni-token.yaml`](governance/01-uni-token.yaml))

**Concepts:**
- Fixed supply tokens
- Treasury balance verification
- Governance token properties

**Run it:**
```bash
npm run dev -- examples/governance/01-uni-token.yaml
```

**Expected result:**  All checks pass

---

### 8. DAI Supply Monitoring ([`stablecoins/01-dai-supply-monitoring.yaml`](stablecoins/01-dai-supply-monitoring.yaml))

**Concepts:**
- Stablecoin supply monitoring
- PSM (Peg Stability Module) reserves
- DEX liquidity tracking
- Multi-protocol exposure

**Run it:**
```bash
npm run dev -- examples/stablecoins/01-dai-supply-monitoring.yaml
```

**Expected result:**  Shows actual supply and liquidity values

---

### 9. USDC Distribution ([`stablecoins/02-usdc-distribution.yaml`](stablecoins/02-usdc-distribution.yaml))

**Concepts:**
- Concentration risk monitoring
- Protocol exposure tracking
- Exchange holdings verification
- Using `less_than` for maximum thresholds

**Run it:**
```bash
npm run dev -- examples/stablecoins/02-usdc-distribution.yaml
```

**Expected result:**  Shows actual distribution across protocols

---

### 10. Treasury Allocation ([`risk-management/01-treasury-allocation.yaml`](risk-management/01-treasury-allocation.yaml))

**Concepts:**
- Multi-asset treasury monitoring
- Allocation percentage tracking
- Diversification verification
- Native token holdings

**Run it:**
```bash
npm run dev -- examples/risk-management/01-treasury-allocation.yaml
```

**Expected result:**  Verifies treasury holds expected assets

---

### 11. Liquidity Pool Health ([`risk-management/02-liquidity-pool-health.yaml`](risk-management/02-liquidity-pool-health.yaml))

**Concepts:**
- Pool reserve monitoring
- Liquidity threshold alerts
- Imbalance detection
- Multi-pool tracking

**Run it:**
```bash
npm run dev -- examples/risk-management/02-liquidity-pool-health.yaml
```

**Expected result:**  Verifies pools have adequate liquidity

---

## Customizing Examples: Customizing Examples

### Using Your Own RPC Endpoint

Replace the `rpc_url` in any example:

```yaml
network:
  rpc_url: "https://your-rpc-endpoint.com"
  chain_id: 1
```

### Verifying Your Own Contracts

1. Copy an example that matches your use case
2. Update the contract address
3. Modify the ABI to include functions you want to verify
4. Set expected values based on your contract's state

### Example: Verify Your Own ERC20 Token

```yaml
version: 1.0

network:
  rpc_url: "YOUR_RPC_URL"
  chain_id: 1

contracts:
  MyToken:
    address: "0xYourTokenAddress"
    abi:
      - name: symbol
        type: function
        stateMutability: view
        inputs: []
        outputs:
          - type: string
      - name: totalSupply
        type: function
        stateMutability: view
        inputs: []
        outputs:
          - type: uint256
    
    state:
      - type: function_call
        function: symbol
        args: []
        value: "MYTOKEN"
      
      - type: function_call
        function: totalSupply
        args: []
        value: "1000000000000000000000000"  # 1M tokens (18 decimals)
        options:
          tolerance: "1%"
```

## Metrics and Severity System: Metrics and Severity System

Nodrift includes a powerful metrics system for categorizing checks and assessing risk. See [`METRICS.md`](METRICS.md) for complete documentation.

### Quick Overview

Add metrics to any state check:

```yaml
state:
  - type: function_call
    function: balanceOf
    args: ["0xAddress"]
    value: "1000000"
    options:
      comparison: greater_than
    metric:
      name: "pool_minimum_reserves"
      category: "solvency"
      severity: "critical"
      description: "Pool reserves below minimum indicates liquidity crisis"
```

### Severity Levels

- **CRITICAL: CRITICAL**: System failure, immediate action required (contract identity, solvency, concentration risk)
- **HIGH: HIGH**: Important health checks (liquidity depth, protocol exposure)
- **MEDIUM: MEDIUM**: Monitoring and trends (supply changes, governance updates)
- **LOW: LOW**: Informational tracking

### Metric Categories

- **`integrity`**: Contract identity and system integrity
- **`solvency`**: Assets backing liabilities
- **`liquidity`**: Available liquidity monitoring
- **`risk`**: Concentration and systemic risks
- **`supply`**: Token supply metrics
- **`governance`**: Governance parameters

**See [`risk-management/04-comprehensive-metrics.yaml`](risk-management/04-comprehensive-metrics.yaml) for a complete example.**

---

## Key Concepts: Key Concepts

### Comparison Options

- **Exact match:** Default behavior
- **Tolerance:** `tolerance: "5%"` - Allow ±5% variance
- **Greater than:** `comparison: greater_than` - Value must be greater
- **Less than:** `comparison: less_than` - Value must be less
- **Range:** `range: { min: X, max: Y }` - Value must be in range
- **Ignore case:** `ignore_case: true` - Case-insensitive string comparison

### State Types

- **`function_call`:** Call a contract function and verify return value
- **`owner`:** Verify contract owner (calls `owner()` function)
- **`variable`:** Read a public state variable
- **`role`:** Verify role-based access control
- **`proxy`:** Verify proxy implementation addresses
- **`time_based`:** Verify timestamp freshness and staleness

## Learning Path: Learning Path

1. **Start with Basic Examples** - Understand function calls and comparisons
2. **Move to DeFi Examples** - Learn multi-contract verification
3. **Explore Governance** - See advanced token patterns
4. **Create Your Own** - Apply concepts to your contracts

## Best Practices: Best Practices

1. **Use tolerance for dynamic values** - Token supplies, balances, and reserves change
2. **Use greater_than for minimums** - Ensure liquidity, balances meet thresholds
3. **Verify relationships** - Check that contracts reference each other correctly
4. **Group related checks** - Organize contracts by their relationships
5. **Document your checks** - Add comments explaining what you're verifying

## Additional Resources: Additional Resources

- [Configuration Guide](../docs/configuration.md) - Full configuration reference
- [State Types](../docs/state-types.md) - All available verification types
- [Comparison Options](../docs/comparison-options.md) - Detailed comparison operators
- [CI/CD Integration](../docs/ci-cd-integration.md) - Automate verification in pipelines

## Tips: Tips

- **Start simple:** Begin with basic property checks before complex logic
- **Test incrementally:** Add one check at a time and verify it works
- **Use real contracts:** These examples use real mainnet contracts you can inspect on Etherscan
- **Check Etherscan:** Verify addresses and function signatures on Etherscan before adding to config
- **Handle decimals:** Remember token amounts need proper decimal places (6 for USDC, 18 for most tokens)

## Troubleshooting: Troubleshooting

### "bad address checksum" error
Use lowercase addresses or properly checksummed addresses from Etherscan.

### "contract[func] is not a function" error
Add the function to the `abi` section of your contract config.

### "could not decode result data" error
The contract doesn't have that function, or the function signature is wrong.

### Values don't match
Use `tolerance` or `comparison` options for values that change over time.

## Contributing: Contributing

Have a great example? Submit a PR! 


