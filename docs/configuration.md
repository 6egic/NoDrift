# Configuration Guide

Complete reference for Nodrift configuration files.

## Table of Contents

- [Configuration Structure](#configuration-structure)
- [Schema Support](#schema-support)
- [Version](#version)
- [Network Configuration](#network-configuration)
- [Contracts](#contracts)
- [State Verification](#state-verification)
- [Imports and Includes](#imports-and-includes)
- [Templates](#templates)
- [Environment Variables](#environment-variables)
- [Advanced Features](#advanced-features)

---

## Schema Support

Nodrift provides a production-grade JSON Schema for IDE support. Add this to the top of your YAML files:

```yaml
# yaml-language-server: $schema=./nodrift.schema.json
```

This enables:
**Autocomplete** - IntelliSense for all fields
**Validation** - Real-time error checking
**Documentation** - Inline help on hover
**Type safety** - Prevents invalid configurations

> **Note**: The schema uses `value` as the standard field name for expected values, but `expected` is also supported for backward compatibility. Both work identically.

---

## Configuration Structure

A Nodrift configuration file is a YAML file with the following structure:

```yaml
# yaml-language-server: $schema=./nodrift.schema.json
version: "1.0.0"

# Global network configuration
network:
  rpc_url: "${RPC_URL}"
  chain_id: 1
  timeout: 30000
  max_retries: 3

# Optional: Import external configurations
imports:
  - ./configs/networks.yaml
  - ./configs/templates.yaml

# Optional: Define reusable templates
templates:
  ERC20Template:
    preset: erc20
    state:
      - type: owner
        value: "${OWNER}"

# Contract definitions
contracts:
  ContractName:
    address: "${CONTRACT_ADDRESS}"
    abi: "./path/to/abi.json"
    preset: erc20
    network:
      rpc_url: "${CUSTOM_RPC_URL}"
      chain_id: 137
    state:
      - type: owner
        value: "${OWNER}"
```

---

## Version

Specifies the configuration schema version.

```yaml
version: 1.0
```

**Required:** Yes  
**Type:** String  
**Current Version:** `1.0`

---

## Network Configuration

### Global Network

Define default network settings for all contracts:

```yaml
network:
  rpc_url: "${RPC_URL}"
  chain_id: 1
  timeout: 30000        # Optional
  max_retries: 3        # Optional
  retry_delay: 1000     # Optional
```

#### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `rpc_url` | String | Yes | - | RPC endpoint URL |
| `chain_id` | Number | Yes | - | Network chain ID |
| `timeout` | Number | No | 30000 | Request timeout (ms) |
| `max_retries` | Number | No | 3 | Max retry attempts |
| `retry_delay` | Number | No | 1000 | Initial retry delay (ms) |

#### Common Chain IDs

| Network | Chain ID |
|---------|----------|
| Ethereum Mainnet | 1 |
| Ethereum Goerli | 5 |
| Ethereum Sepolia | 11155111 |
| Polygon Mainnet | 137 |
| Polygon Mumbai | 80001 |
| BSC Mainnet | 56 |
| BSC Testnet | 97 |
| Arbitrum One | 42161 |
| Arbitrum Goerli | 421613 |
| Optimism | 10 |
| Optimism Goerli | 420 |
| Avalanche C-Chain | 43114 |
| Avalanche Fuji | 43113 |

### Contract-Level Network Override

Override network settings for specific contracts:

```yaml
contracts:
  PolygonContract:
    address: "${POLYGON_ADDRESS}"
    network:
      rpc_url: "${POLYGON_RPC_URL}"
      chain_id: 137
    state:
      - type: owner
        value: "${OWNER}"
```

---

## Contracts

Define contracts to verify.

### Basic Contract

```yaml
contracts:
  MyContract:
    address: "${CONTRACT_ADDRESS}"
    abi: "./path/to/abi.json"
    state:
      - type: owner
        value: "${OWNER}"
```

### Contract with Preset

```yaml
contracts:
  MyToken:
    preset: erc20
    address: "${TOKEN_ADDRESS}"
    state:
      - type: owner
        value: "${OWNER}"
```

### Contract Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | String | Yes | Contract address (supports env vars) |
| `abi` | String/Array | Conditional | ABI file path or inline ABI (required if no preset) |
| `preset` | String | No | Built-in preset (erc20, erc721, etc.) |
| `network` | Object | No | Override network settings |
| `state` | Array | Yes | State verification checks |
| `template` | String | No | Template to extend |

### Multiple Contracts

```yaml
contracts:
  TokenA:
    preset: erc20
    address: "${TOKEN_A_ADDRESS}"
    state:
      - type: owner
        value: "${OWNER_A}"
  
  TokenB:
    preset: erc20
    address: "${TOKEN_B_ADDRESS}"
    state:
      - type: owner
        value: "${OWNER_B}"
  
  NFTContract:
    preset: erc721
    address: "${NFT_ADDRESS}"
    state:
      - type: owner
        value: "${OWNER_NFT}"
```

---

## State Verification

Define state checks for each contract.

### Basic State Check

```yaml
state:
  - type: owner
    value: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
```

### State Check with Options

```yaml
state:
  - type: variable
    name: totalSupply
    value: "1000000"
    options:
      tolerance: "5%"
      description: "Total token supply"
```

### Common State Types

See [State Types Guide](state-types.md) for complete reference.

#### Owner

```yaml
- type: owner
  value: "${OWNER_ADDRESS}"
```

#### Role

```yaml
- type: role
  role: MINTER_ROLE
  account: "${MINTER_ADDRESS}"
  value: true
```

#### Variable

```yaml
- type: variable
  name: totalSupply
  value: "1000000000000000000000000"
```

#### Function Call

```yaml
- type: function_call
  function: balanceOf
  args: ["${USER_ADDRESS}"]
  value: "100000000000000000000"
```

#### Storage Slot

```yaml
- type: storage_slot
  slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
  value: "${IMPLEMENTATION_ADDRESS}"
```

---

## Imports and Includes

Reuse configurations across multiple files.

### Imports

```yaml
imports:
  - ./configs/networks.yaml
  - ./configs/templates.yaml
  - ./configs/common-state.yaml
```

### Example: networks.yaml

```yaml
# configs/networks.yaml
networks:
  ethereum:
    rpc_url: "${ETH_RPC_URL}"
    chain_id: 1
  
  polygon:
    rpc_url: "${POLYGON_RPC_URL}"
    chain_id: 137
  
  bsc:
    rpc_url: "${BSC_RPC_URL}"
    chain_id: 56
```

### Example: templates.yaml

```yaml
# configs/templates.yaml
templates:
  StandardToken:
    preset: erc20
    state:
      - type: owner
        value: "${OWNER}"
      - type: variable
        name: paused
        value: false
```

### Using Imported Configurations

```yaml
version: 1.0

imports:
  - ./configs/networks.yaml
  - ./configs/templates.yaml

network: ${networks.ethereum}

contracts:
  MyToken:
    template: StandardToken
    address: "${TOKEN_ADDRESS}"
```

---

## Templates

Define reusable contract templates.

### Defining Templates

```yaml
templates:
  ERC20Template:
    preset: erc20
    state:
      - type: owner
        value: "${OWNER}"
      - type: variable
        name: paused
        value: false
      - type: role
        role: MINTER_ROLE
        account: "${MINTER}"
        value: true
  
  ProxyTemplate:
    preset: proxy
    state:
      - type: storage_slot
        slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
        value: "${IMPLEMENTATION}"
```

### Using Templates

```yaml
contracts:
  TokenA:
    template: ERC20Template
    address: "${TOKEN_A_ADDRESS}"
  
  TokenB:
    template: ERC20Template
    address: "${TOKEN_B_ADDRESS}"
  
  ProxyContract:
    template: ProxyTemplate
    address: "${PROXY_ADDRESS}"
```

### Template Inheritance

Templates can extend other templates:

```yaml
templates:
  BaseToken:
    preset: erc20
    state:
      - type: owner
        value: "${OWNER}"
  
  MintableToken:
    extends: BaseToken
    state:
      - type: role
        role: MINTER_ROLE
        account: "${MINTER}"
        value: true
```

---

## Environment Variables

Nodrift supports environment variable substitution using `${VAR_NAME}` syntax.

### Basic Usage

```yaml
network:
  rpc_url: "${RPC_URL}"
  chain_id: 1

contracts:
  MyContract:
    address: "${CONTRACT_ADDRESS}"
    state:
      - type: owner
        value: "${EXPECTED_OWNER}"
```

### Setting Variables

#### Option 1: Export

```bash
export RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
export CONTRACT_ADDRESS="0x..."
export EXPECTED_OWNER="0x..."
```

#### Option 2: .env File

```bash
# .env
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
CONTRACT_ADDRESS=0x...
EXPECTED_OWNER=0x...
```

Load with:

```bash
export $(cat .env | grep -v '^#' | xargs)
nodrift config.yaml
```

#### Option 3: Inline

```bash
RPC_URL="https://..." CONTRACT_ADDRESS="0x..." nodrift config.yaml
```

### Default Values

Provide default values for optional variables:

```yaml
network:
  rpc_url: "${RPC_URL:-https://eth-mainnet.public.blastapi.io}"
  timeout: ${TIMEOUT:-30000}
```

### Required Variables

Variables without defaults are required:

```yaml
contracts:
  MyContract:
    address: "${CONTRACT_ADDRESS}"  # Required
```

If not set, Nodrift will error:

```
Error: Environment variable CONTRACT_ADDRESS is not defined
```

---

## Advanced Features

### ABI Configuration

#### Inline ABI

```yaml
contracts:
  MyContract:
    address: "${ADDRESS}"
    abi:
      - "function owner() view returns (address)"
      - "function totalSupply() view returns (uint256)"
    state:
      - type: owner
        value: "${OWNER}"
```

#### ABI File

```yaml
contracts:
  MyContract:
    address: "${ADDRESS}"
    abi: "./abis/MyContract.json"
    state:
      - type: owner
        value: "${OWNER}"
```

#### Etherscan ABI Fetching

```yaml
contracts:
  MyContract:
    address: "${ADDRESS}"
    abi:
      source: etherscan
      api_key: "${ETHERSCAN_API_KEY}"
    state:
      - type: owner
        value: "${OWNER}"
```

### Multi-Network Verification

Verify the same contract across multiple networks:

```yaml
version: 1.0

contracts:
  TokenEthereum:
    preset: erc20
    address: "${ETH_TOKEN_ADDRESS}"
    network:
      rpc_url: "${ETH_RPC_URL}"
      chain_id: 1
    state:
      - type: owner
        value: "${OWNER}"
  
  TokenPolygon:
    preset: erc20
    address: "${POLYGON_TOKEN_ADDRESS}"
    network:
      rpc_url: "${POLYGON_RPC_URL}"
      chain_id: 137
    state:
      - type: owner
        value: "${OWNER}"
  
  TokenBSC:
    preset: erc20
    address: "${BSC_TOKEN_ADDRESS}"
    network:
      rpc_url: "${BSC_RPC_URL}"
      chain_id: 56
    state:
      - type: owner
        value: "${OWNER}"
```

### Conditional Checks

Perform checks based on other state values:

```yaml
state:
  - type: variable
    name: paused
    value: false
  
  - type: conditional
    condition:
      type: variable
      name: paused
      value: false
    then:
      - type: variable
        name: totalSupply
        value: "1000000"
```

### Cross-Contract Checks

Verify state across multiple contracts:

```yaml
contracts:
  TokenContract:
    address: "${TOKEN_ADDRESS}"
    preset: erc20
    state:
      - type: owner
        value: "${OWNER}"
  
  VaultContract:
    address: "${VAULT_ADDRESS}"
    abi: "./abis/Vault.json"
    state:
      - type: cross_contract
        target_contract: TokenContract
        function: balanceOf
        args: ["${VAULT_ADDRESS}"]
        value: "1000000000000000000000"
```

### Aggregate Checks

Perform aggregate operations:

```yaml
state:
  - type: aggregate
    operation: sum
    sources:
      - type: function_call
        function: balanceOf
        args: ["${USER_1}"]
      - type: function_call
        function: balanceOf
        args: ["${USER_2}"]
      - type: function_call
        function: balanceOf
        args: ["${USER_3}"]
    value: "1000000000000000000000"
```

---

## Configuration Examples

### Minimal Configuration

```yaml
version: 1.0

network:
  rpc_url: "${RPC_URL}"
  chain_id: 1

contracts:
  MyContract:
    preset: erc20
    address: "${ADDRESS}"
    state:
      - type: owner
        value: "${OWNER}"
```

### Production Configuration

```yaml
version: 1.0

network:
  rpc_url: "${RPC_URL}"
  chain_id: 1
  timeout: 60000
  max_retries: 5
  retry_delay: 2000

imports:
  - ./configs/networks.yaml
  - ./configs/templates.yaml

contracts:
  GovernanceToken:
    template: ERC20Template
    address: "${GOV_TOKEN_ADDRESS}"
    state:
      - type: owner
        value: "${TIMELOCK_ADDRESS}"
      
      - type: variable
        name: totalSupply
        value: "100000000000000000000000000"
        options:
          tolerance: "0.1%"
          description: "100M tokens"
      
      - type: role
        role: MINTER_ROLE
        account: "${MINTER_ADDRESS}"
        value: true
      
      - type: role
        role: PAUSER_ROLE
        account: "${PAUSER_ADDRESS}"
        value: true
  
  TimelockController:
    address: "${TIMELOCK_ADDRESS}"
    abi: "./abis/TimelockController.json"
    state:
      - type: variable
        name: getMinDelay
        value: "172800"  # 2 days
      
      - type: role
        role: PROPOSER_ROLE
        account: "${GOVERNOR_ADDRESS}"
        value: true
      
      - type: role
        role: EXECUTOR_ROLE
        account: "0x0000000000000000000000000000000000000000"
        value: true
```

---

## Validation

Validate your configuration without connecting to blockchain:

```bash
nodrift validate config.yaml
```

This checks:
- YAML syntax
- Schema validation
- Required fields
- Environment variable resolution
- Type correctness

---

## Best Practices

### 1. Use Environment Variables

Never hardcode sensitive values:

```yaml
#  Bad
network:
  rpc_url: "https://eth-mainnet.g.alchemy.com/v2/abc123"

#  Good
network:
  rpc_url: "${RPC_URL}"
```

### 2. Use Presets

Leverage built-in presets when possible:

```yaml
#  Good
contracts:
  MyToken:
    preset: erc20
    address: "${ADDRESS}"
```

### 3. Organize with Imports

Split large configurations:

```yaml
imports:
  - ./configs/networks.yaml
  - ./configs/mainnet-contracts.yaml
  - ./configs/testnet-contracts.yaml
```

### 4. Use Templates

Reduce duplication with templates:

```yaml
templates:
  StandardToken:
    preset: erc20
    state:
      - type: owner
        value: "${OWNER}"

contracts:
  TokenA:
    template: StandardToken
    address: "${TOKEN_A}"
  
  TokenB:
    template: StandardToken
    address: "${TOKEN_B}"
```

### 5. Add Descriptions

Document your checks:

```yaml
state:
  - type: variable
    name: totalSupply
    value: "1000000"
    options:
      description: "Total supply should be 1M tokens"
```

### 6. Use Tolerances

Allow for expected variations:

```yaml
state:
  - type: variable
    name: totalSupply
    value: "1000000"
    options:
      tolerance: "1%"  # Allow 1% deviation
```

---

## Next Steps

- **[State Types](state-types.md)** - Learn all verification types
- **[Comparison Options](comparison-options.md)** - Flexible value matching
- **[Presets](presets.md)** - Built-in contract presets
- **[Examples](../examples/)** - Real-world examples

---

## Reference

- [YAML Specification](https://yaml.org/spec/)
- [JSON Schema](../nodrift.schema.json)
- [Architecture](../ARCHITECTURE.md)
