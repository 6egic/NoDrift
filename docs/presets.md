# Presets Reference

Built-in presets for common contract standards in Nodrift.

## Table of Contents

- [Overview](#overview)
- [Available Presets](#available-presets)
- [ERC20](#erc20)
- [ERC721](#erc721)
- [ERC1155](#erc1155)
- [ERC4626](#erc4626)
- [Diamond](#diamond)
- [Proxy](#proxy)
- [AccessControl](#accesscontrol)
- [Custom Presets](#custom-presets)

---

## Overview

Presets provide pre-configured ABIs for standard contract patterns. They are **ABI templates only** - you define all verification checks yourself.

**Benefits:**
-  No need to manually define ABI functions
-  Correct function signatures guaranteed
-  Saves time looking up ABIs on Etherscan
-  Standardized across common contract types
-  Full control over which checks to perform

**Usage:**

```yaml
contracts:
  MyToken:
    preset: erc20  # Provides ERC20 ABI automatically
    address: "${TOKEN_ADDRESS}"
    state:
      # You define ALL checks explicitly
      - type: function_call
        function: symbol
        value: "USDC"
      
      - type: function_call
        function: decimals
        value: 6
```

---

## Available Presets

| Preset | Standard | Description |
|--------|----------|-------------|
| `erc20` | ERC20 | Fungible token standard |
| `erc721` | ERC721 | Non-fungible token (NFT) standard |
| `erc1155` | ERC1155 | Multi-token standard |
| `erc4626` | ERC4626 | Tokenized vault standard |
| `diamond` | EIP-2535 | Diamond pattern for upgradeable contracts |
| `proxy` | ERC1967 | Transparent/UUPS proxy pattern |
| `accessControl` | OpenZeppelin | AccessControl role management |

**List all presets:**

```bash
nodrift presets
```

---

## ERC20

Fungible token standard (ERC20).

### Included Functions

- `totalSupply()` - Total token supply
- `balanceOf(address)` - Account balance
- `allowance(address,address)` - Spending allowance
- `decimals()` - Token decimals
- `symbol()` - Token symbol
- `name()` - Token name

### Usage

```yaml
contracts:
  MyToken:
    preset: erc20  # Provides ABI only
    address: "${TOKEN_ADDRESS}"
    state:
      # Define all checks explicitly
      - type: function_call
        function: symbol
        args: []
        value: "MTK"
      
      - type: function_call
        function: decimals
        args: []
        value: 18
      
      - type: function_call
        function: totalSupply
        args: []
        value: "1000000000000000000000000"  # 1M tokens
        options:
          tolerance: "1%"
      
      - type: function_call
        function: balanceOf
        args: ["${TREASURY}"]
        value: "500000000000000000000000"  # 500K tokens
```

### Common Checks

```yaml
# Total supply
- type: variable
  name: totalSupply
  value: "1000000000000000000000000"

# Token metadata
- type: variable
  name: symbol
  value: "MTK"

- type: variable
  name: name
  value: "My Token"

- type: variable
  name: decimals
  value: 18

# Balances
- type: function_call
  function: balanceOf
  args: ["${ADDRESS}"]
  value: "100000000000000000000"

# Allowances
- type: function_call
  function: allowance
  args: ["${OWNER}", "${SPENDER}"]
  value: "1000000000000000000000"
```

---

## ERC721

Non-fungible token (NFT) standard.

### Included Functions

- `totalSupply()` - Total NFTs minted
- `balanceOf(address)` - NFT count for address
- `ownerOf(uint256)` - Owner of specific token
- `tokenURI(uint256)` - Token metadata URI
- `symbol()` - Collection symbol
- `name()` - Collection name

### Usage

```yaml
contracts:
  MyNFT:
    preset: erc721
    address: "${NFT_ADDRESS}"
    state:
      - type: owner
        value: "${OWNER}"
      
      - type: variable
        name: totalSupply
        value: "10000"
      
      - type: variable
        name: symbol
        value: "MNFT"
      
      - type: function_call
        function: ownerOf
        args: [1]
        value: "${TOKEN_1_OWNER}"
      
      - type: function_call
        function: tokenURI
        args: [1]
        value: "ipfs://QmXxx.../1"
```

### Common Checks

```yaml
# Collection info
- type: variable
  name: name
  value: "My NFT Collection"

- type: variable
  name: symbol
  value: "MNFT"

- type: variable
  name: totalSupply
  value: "10000"

# Token ownership
- type: function_call
  function: ownerOf
  args: [1]
  value: "${OWNER_ADDRESS}"

# Token metadata
- type: function_call
  function: tokenURI
  args: [1]
  value: "ipfs://QmXxx.../1"

# Balance
- type: function_call
  function: balanceOf
  args: ["${ADDRESS}"]
  value: "5"
```

---

## ERC1155

Multi-token standard.

### Included Functions

- `balanceOf(address,uint256)` - Token balance for address
- `balanceOfBatch(address[],uint256[])` - Batch balance query
- `uri(uint256)` - Token metadata URI
- `isApprovedForAll(address,address)` - Operator approval

### Usage

```yaml
contracts:
  MyMultiToken:
    preset: erc1155
    address: "${TOKEN_ADDRESS}"
    state:
      - type: owner
        value: "${OWNER}"
      
      - type: function_call
        function: balanceOf
        args: ["${USER}", "1"]
        value: "100"
      
      - type: function_call
        function: uri
        args: [1]
        value: "ipfs://QmXxx.../{id}"
```

### Common Checks

```yaml
# Token balances
- type: function_call
  function: balanceOf
  args: ["${ADDRESS}", "1"]
  value: "100"

# Batch balances
- type: function_call
  function: balanceOfBatch
  args:
    - ["${USER_1}", "${USER_2}"]
    - ["1", "2"]
  value: ["100", "200"]

# Metadata URI
- type: function_call
  function: uri
  args: [1]
  value: "ipfs://QmXxx.../{id}"

# Operator approval
- type: function_call
  function: isApprovedForAll
  args: ["${OWNER}", "${OPERATOR}"]
  value: true
```

---

## ERC4626

Tokenized vault standard.

### Included Functions

- `totalAssets()` - Total underlying assets
- `asset()` - Underlying asset address
- `convertToShares(uint256)` - Assets to shares conversion
- `convertToAssets(uint256)` - Shares to assets conversion
- `maxDeposit(address)` - Max deposit for address
- `maxWithdraw(address)` - Max withdrawal for address

### Usage

```yaml
contracts:
  MyVault:
    preset: erc4626
    address: "${VAULT_ADDRESS}"
    state:
      - type: owner
        value: "${OWNER}"
      
      - type: function_call
        function: asset
        value: "${UNDERLYING_TOKEN}"
      
      - type: function_call
        function: totalAssets
        value: "1000000000000000000000000"
        options:
          tolerance: "5%"
```

### Common Checks

```yaml
# Underlying asset
- type: function_call
  function: asset
  value: "${UNDERLYING_TOKEN_ADDRESS}"

# Total assets
- type: function_call
  function: totalAssets
  value: "1000000000000000000000000"
  options:
    tolerance: "1%"

# Conversion rates
- type: function_call
  function: convertToShares
  args: ["1000000000000000000"]
  value: "1000000000000000000"

- type: function_call
  function: convertToAssets
  args: ["1000000000000000000"]
  value: "1000000000000000000"
```

---

## Diamond

Diamond pattern (EIP-2535) for upgradeable contracts.

### Included Functions

- `facets()` - List all facets
- `facetAddress(bytes4)` - Get facet for selector
- `facetFunctionSelectors(address)` - Get selectors for facet

### Usage

```yaml
contracts:
  MyDiamond:
    preset: diamond
    address: "${DIAMOND_ADDRESS}"
    state:
      - type: owner
        value: "${OWNER}"
      
      - type: function_call
        function: facetAddress
        args: ["0x12345678"]
        value: "${EXPECTED_FACET}"
```

### Common Checks

```yaml
# Facet address
- type: function_call
  function: facetAddress
  args: ["0x12345678"]  # Function selector
  value: "${FACET_ADDRESS}"

# All facets
- type: function_call
  function: facets
  value:
    - facetAddress: "${FACET_1}"
      functionSelectors: ["0x12345678", "0x87654321"]
    - facetAddress: "${FACET_2}"
      functionSelectors: ["0xabcdef00"]
```

---

## Proxy

ERC1967 proxy pattern (Transparent/UUPS).

### Included Checks

- Implementation address (storage slot)
- Admin address (storage slot, for Transparent)
- Beacon address (storage slot, for Beacon)

### Usage

```yaml
contracts:
  MyProxy:
    preset: proxy
    address: "${PROXY_ADDRESS}"
    state:
      - type: proxy
        checks:
          implementation: "${IMPLEMENTATION_ADDRESS}"
          admin: "${PROXY_ADMIN_ADDRESS}"
```

### Common Checks

```yaml
# UUPS Proxy
- type: proxy
  checks:
    implementation: "${IMPLEMENTATION_ADDRESS}"

# Transparent Proxy
- type: proxy
  checks:
    implementation: "${IMPLEMENTATION_ADDRESS}"
    admin: "${PROXY_ADMIN_ADDRESS}"

# Beacon Proxy
- type: proxy
  checks:
    beacon: "${BEACON_ADDRESS}"

# Manual storage slot check
- type: storage_slot
  slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
  value: "${IMPLEMENTATION_ADDRESS}"
  options:
    decode_as: address
    description: "ERC1967 implementation slot"
```

---

## AccessControl

OpenZeppelin AccessControl role management.

### Included Functions

- `hasRole(bytes32,address)` - Check role membership
- `getRoleAdmin(bytes32)` - Get role admin
- `getRoleMemberCount(bytes32)` - Get role member count
- `getRoleMember(bytes32,uint256)` - Get role member by index

### Usage

```yaml
contracts:
  MyContract:
    preset: accessControl
    address: "${CONTRACT_ADDRESS}"
    state:
      - type: role
        role: DEFAULT_ADMIN_ROLE
        account: "${ADMIN}"
        value: true
      
      - type: role
        role: MINTER_ROLE
        account: "${MINTER}"
        value: true
      
      - type: role
        role: PAUSER_ROLE
        account: "${PAUSER}"
        value: true
```

### Common Checks

```yaml
# Role membership
- type: role
  role: DEFAULT_ADMIN_ROLE
  account: "${ADMIN_ADDRESS}"
  value: true

- type: role
  role: MINTER_ROLE
  account: "${MINTER_ADDRESS}"
  value: true

# Role admin
- type: function_call
  function: getRoleAdmin
  args: ["MINTER_ROLE"]
  value: "DEFAULT_ADMIN_ROLE"

# Role member count
- type: function_call
  function: getRoleMemberCount
  args: ["MINTER_ROLE"]
  value: "3"
```

---

## Custom Presets

You can define custom presets in your configuration:

### Defining Custom Presets

```yaml
# In a separate file: presets.yaml
presets:
  MyCustomPreset:
    abi:
      - "function owner() view returns (address)"
      - "function paused() view returns (bool)"
      - "function version() view returns (string)"
    state:
      - type: owner
        value: "${OWNER}"
      - type: variable
        name: paused
        value: false
```

### Using Custom Presets

```yaml
imports:
  - ./presets.yaml

contracts:
  MyContract:
    preset: MyCustomPreset
    address: "${CONTRACT_ADDRESS}"
```

---

## Combining Presets with Custom Checks

You can extend presets with additional checks:

```yaml
contracts:
  MyToken:
    preset: erc20
    address: "${TOKEN_ADDRESS}"
    state:
      # Preset includes standard ERC20 checks
      
      # Add custom checks
      - type: owner
        value: "${OWNER}"
      
      - type: role
        role: MINTER_ROLE
        account: "${MINTER}"
        value: true
      
      - type: variable
        name: paused
        value: false
      
      - type: storage_slot
        slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
        value: "${IMPLEMENTATION}"
```

---

## Best Practices

### 1. Use Presets When Available

```yaml
#  Good - uses preset
contracts:
  MyToken:
    preset: erc20
    address: "${ADDRESS}"

#  Bad - manual ABI
contracts:
  MyToken:
    address: "${ADDRESS}"
    abi: "./abis/ERC20.json"
```

### 2. Extend Presets with Custom Checks

```yaml
#  Good - preset + custom checks
contracts:
  MyToken:
    preset: erc20
    address: "${ADDRESS}"
    state:
      - type: owner
        value: "${OWNER}"
      - type: role
        role: MINTER_ROLE
        account: "${MINTER}"
        value: true
```

### 3. Create Custom Presets for Repeated Patterns

```yaml
#  Good - reusable preset
presets:
  GovernanceToken:
    preset: erc20
    state:
      - type: owner
        value: "${TIMELOCK}"
      - type: role
        role: MINTER_ROLE
        account: "${MINTER}"
        value: true

contracts:
  TokenA:
    preset: GovernanceToken
    address: "${TOKEN_A}"
  
  TokenB:
    preset: GovernanceToken
    address: "${TOKEN_B}"
```

---

## Next Steps

- **[State Types](state-types.md)** - All verification types
- **[Configuration](configuration.md)** - Complete configuration reference
- **[Examples](../examples/)** - Real-world examples
