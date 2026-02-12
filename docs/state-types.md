# State Types Reference

Complete reference for all state verification types in Nodrift.

## Table of Contents

- [Basic Types](#basic-types)
  - [Owner](#owner)
  - [Role](#role)
  - [Variable](#variable)
  - [Function Call](#function-call)
- [Advanced Types](#advanced-types)
  - [Storage Slot](#storage-slot)
  - [Proxy](#proxy)
- [Complex Types](#complex-types)
  - [Array State](#array-state)
  - [Mapping State](#mapping-state)
  - [Cross Contract](#cross-contract)
  - [Aggregate](#aggregate)
  - [Conditional](#conditional)
  - [Comparison](#comparison)
  - [Time Based](#time-based)

---

## Basic Types

### Owner

Verify contract ownership (Ownable pattern).

**Syntax:**

```yaml
- type: owner
  value: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  options:
    description: "Contract owner should be multisig"
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String | Yes | Must be `owner` |
| `value` | Address | Yes | Value: owner address |
| `options` | Object | No | Comparison options |

**Example:**

```yaml
state:
  - type: owner
    value: "${MULTISIG_ADDRESS}"
```

**Supported Patterns:**
- OpenZeppelin Ownable
- OpenZeppelin Ownable2Step
- Custom `owner()` function

---

### Role

Verify AccessControl role memberships.

**Syntax:**

```yaml
- type: role
  role: MINTER_ROLE
  account: "0x123..."
  value: true
  options:
    description: "Minter role assignment"
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String | Yes | Must be `role` |
| `role` | String | Yes | Role identifier (name or bytes32) |
| `account` | Address | Yes | Account to check |
| `value` | Boolean | Yes | Value: role status |
| `options` | Object | No | Comparison options |

**Examples:**

```yaml
# Check if account has role
- type: role
  role: MINTER_ROLE
  account: "${MINTER_ADDRESS}"
  value: true

# Check if account doesn't have role
- type: role
  role: PAUSER_ROLE
  account: "${RANDOM_ADDRESS}"
  value: false

# Using bytes32 role
- type: role
  role: "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6"
  account: "${ADMIN_ADDRESS}"
  value: true
```

**Supported Patterns:**
- OpenZeppelin AccessControl
- Custom role management

---

### Variable

Read and verify public state variables.

**Syntax:**

```yaml
- type: variable
  name: totalSupply
  value: "1000000000000000000000000"
  options:
    tolerance: "1%"
    description: "Total token supply"
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String | Yes | Must be `variable` |
| `name` | String | Yes | Variable name |
| `value` | Any | Yes | Value to verify |
| `options` | Object | No | Comparison options |

**Examples:**

```yaml
# Numeric variable
- type: variable
  name: totalSupply
  value: "1000000000000000000000000"

# Boolean variable
- type: variable
  name: paused
  value: false

# String variable
- type: variable
  name: symbol
  value: "MTK"

# Address variable
- type: variable
  name: treasury
  value: "${TREASURY_ADDRESS}"

# With tolerance
- type: variable
  name: totalSupply
  value: "1000000"
  options:
    tolerance: "5%"
```

**Supported Types:**
- uint, int (all sizes)
- bool
- address
- string
- bytes

---

### Function Call

Execute view functions and verify return values.

**Syntax:**

```yaml
- type: function_call
  function: balanceOf
  args: ["0x123..."]
  value: "100000000000000000000"
  options:
    description: "User balance check"
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String | Yes | Must be `function_call` |
| `function` | String | Yes | Function name |
| `args` | Array | No | Function arguments |
| `value` | Any | Yes | Value to verify |
| `options` | Object | No | Comparison options |

**Examples:**

```yaml
# No arguments
- type: function_call
  function: decimals
  value: 18

# Single argument
- type: function_call
  function: balanceOf
  args: ["${USER_ADDRESS}"]
  value: "100000000000000000000"

# Multiple arguments
- type: function_call
  function: allowance
  args: ["${OWNER_ADDRESS}", "${SPENDER_ADDRESS}"]
  value: "1000000000000000000000"

# Complex return value
- type: function_call
  function: getReserves
  value:
    reserve0: "1000000000000000000000"
    reserve1: "2000000000000000000000"
    blockTimestampLast: 1234567890
```

---

## Advanced Types

### Storage Slot

Direct storage slot access for proxies and upgradeable contracts.

**Syntax:**

```yaml
- type: storage_slot
  slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
  value: "0x..."
  options:
    decode_as: address
    description: "ERC1967 implementation slot"
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String | Yes | Must be `storage_slot` |
| `slot` | String | Yes | Storage slot (hex) |
| `value` | Any | Yes | Value to verify |
| `options.decode_as` | String | No | Type to decode as |

**Examples:**

```yaml
# ERC1967 implementation slot
- type: storage_slot
  slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
  value: "${IMPLEMENTATION_ADDRESS}"
  options:
    decode_as: address

# ERC1967 admin slot
- type: storage_slot
  slot: "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103"
  value: "${ADMIN_ADDRESS}"
  options:
    decode_as: address

# Custom slot
- type: storage_slot
  slot: "0x0"
  value: "0x1234..."
  options:
    decode_as: bytes32
```

**Common Slots:**
- ERC1967 Implementation: `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`
- ERC1967 Admin: `0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103`
- ERC1967 Beacon: `0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50`

---

### Proxy

ERC1967 proxy pattern verification.

**Syntax:**

```yaml
- type: proxy
  checks:
    implementation: "${IMPLEMENTATION_ADDRESS}"
    admin: "${ADMIN_ADDRESS}"
  options:
    description: "Proxy configuration"
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String | Yes | Must be `proxy` |
| `checks.implementation` | Address | No | Expected implementation |
| `checks.admin` | Address | No | Expected admin |
| `checks.beacon` | Address | No | Expected beacon |

**Examples:**

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
```

---

## Complex Types

### Array State

Verify array length and membership.

**Syntax:**

```yaml
- type: array_state
  name: whitelist
  checks:
    length: 5
    contains: ["0x123...", "0x456..."]
    not_contains: ["0x789..."]
  options:
    ignore_order: true
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String | Yes | Must be `array_state` |
| `name` | String | Yes | Array variable name |
| `checks.length` | Number | No | Expected length |
| `checks.contains` | Array | No | Must contain these |
| `checks.not_contains` | Array | No | Must not contain these |
| `checks.exact` | Array | No | Exact array contents |

**Examples:**

```yaml
# Check length
- type: array_state
  name: whitelist
  checks:
    length: 10

# Check membership
- type: array_state
  name: whitelist
  checks:
    contains: ["${USER_1}", "${USER_2}"]

# Exact match
- type: array_state
  name: admins
  checks:
    exact: ["${ADMIN_1}", "${ADMIN_2}", "${ADMIN_3}"]
  options:
    ignore_order: true
```

---

### Mapping State

Verify mapping key-value pairs.

**Syntax:**

```yaml
- type: mapping_state
  name: balances
  keys:
    - key: "0x123..."
      value: "1000000000000000000000"
    - key: "0x456..."
      value: "2000000000000000000000"
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String | Yes | Must be `mapping_state` |
| `name` | String | Yes | Mapping variable name |
| `keys` | Array | Yes | Key-value pairs to check |

**Examples:**

```yaml
# Simple mapping
- type: mapping_state
  name: balances
  keys:
    - key: "${USER_ADDRESS}"
      value: "1000000000000000000000"

# Nested mapping
- type: mapping_state
  name: allowances
  keys:
    - key: ["${OWNER}", "${SPENDER}"]
      value: "1000000000000000000000"
```

---

### Cross Contract

Read values from other contracts.

**Syntax:**

```yaml
- type: cross_contract
  target_contract: OtherContract
  function: getValue
  args: []
  value: "42"
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String | Yes | Must be `cross_contract` |
| `target_contract` | String | Yes | Target contract name |
| `function` | String | Yes | Function to call |
| `args` | Array | No | Function arguments |
| `value` | Any | Yes | Value to verify |

**Examples:**

```yaml
contracts:
  TokenContract:
    address: "${TOKEN_ADDRESS}"
    preset: erc20
  
  VaultContract:
    address: "${VAULT_ADDRESS}"
    abi: "./abis/Vault.json"
    state:
      # Check vault's token balance
      - type: cross_contract
        target_contract: TokenContract
        function: balanceOf
        args: ["${VAULT_ADDRESS}"]
        value: "1000000000000000000000"
```

---

### Aggregate

Perform aggregate operations on multiple values.

**Syntax:**

```yaml
- type: aggregate
  operation: sum
  sources:
    - type: function_call
      function: balanceOf
      args: ["${USER_1}"]
    - type: function_call
      function: balanceOf
      args: ["${USER_2}"]
  value: "1000000000000000000000"
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String | Yes | Must be `aggregate` |
| `operation` | String | Yes | sum, count, average, min, max |
| `sources` | Array | Yes | Value sources |
| `value` | Any | Yes | Value to verify |

**Operations:**
- `sum` - Sum of all values
- `count` - Count of values
- `average` - Average of values
- `min` - Minimum value
- `max` - Maximum value

**Examples:**

```yaml
# Sum of balances
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

# Count of active users
- type: aggregate
  operation: count
  sources:
    - type: function_call
      function: isActive
      args: ["${USER_1}"]
    - type: function_call
      function: isActive
      args: ["${USER_2}"]
  value: 2
```

---

### Conditional

Conditional verification based on other states.

**Syntax:**

```yaml
- type: conditional
  condition:
    type: variable
    name: paused
    value: false
  then:
    - type: variable
      name: totalSupply
      value: "1000000"
  else:
    - type: variable
      name: totalSupply
      value: "0"
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String | Yes | Must be `conditional` |
| `condition` | Object | Yes | Condition to check |
| `then` | Array | Yes | Checks if true |
| `else` | Array | No | Checks if false |

**Examples:**

```yaml
# Check based on pause state
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

---

### Comparison

Compare two arbitrary values.

**Syntax:**

```yaml
- type: comparison
  left:
    type: function_call
    function: balanceOf
    args: ["${USER_1}"]
  operator: ">"
  right:
    type: function_call
    function: balanceOf
    args: ["${USER_2}"]
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String | Yes | Must be `comparison` |
| `left` | Object | Yes | Left value source |
| `operator` | String | Yes | Comparison operator |
| `right` | Object | Yes | Right value source |

**Operators:**
- `==` - Equal
- `!=` - Not equal
- `>` - Greater than
- `>=` - Greater than or equal
- `<` - Less than
- `<=` - Less than or equal

**Examples:**

```yaml
# Compare balances
- type: comparison
  left:
    type: function_call
    function: balanceOf
    args: ["${TREASURY}"]
  operator: ">"
  right:
    type: function_call
    function: balanceOf
    args: ["${USER}"]
```

---

### Time Based

Timestamp and staleness checks.

**Syntax:**

```yaml
- type: time_based
  function: getLastUpdate
  max_age_seconds: 86400  # 24 hours
  args: []  # Optional function arguments
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String | Yes | Must be `time_based` |
| `function` | String | Yes | Function that returns timestamp |
| `max_age_seconds` | Number | Yes | Maximum age in seconds |
| `args` | Array | No | Function arguments (default: []) |

**Examples:**

```yaml
# Check data freshness (no arguments)
- type: time_based
  function: lastUpdateTime
  max_age_seconds: 3600  # 1 hour

# Check oracle price feed freshness
- type: time_based
  function: latestRoundData
  max_age_seconds: 300  # 5 minutes
  args: []

# Check timestamp for specific token
- type: time_based
  function: getLastUpdate
  max_age_seconds: 86400  # 24 hours
  args: ["${TOKEN_ADDRESS}"]
```

---

## Type Combinations

You can combine multiple types for comprehensive verification:

```yaml
state:
  # Basic ownership
  - type: owner
    value: "${OWNER}"
  
  # Role management
  - type: role
    role: MINTER_ROLE
    account: "${MINTER}"
    value: true
  
  # State variables
  - type: variable
    name: totalSupply
    value: "1000000"
    options:
      tolerance: "1%"
  
  # Function calls
  - type: function_call
    function: balanceOf
    args: ["${TREASURY}"]
    value: "500000"
  
  # Storage slots
  - type: storage_slot
    slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
    value: "${IMPLEMENTATION}"
  
  # Cross-contract
  - type: cross_contract
    target_contract: OtherContract
    function: getValue
    value: "42"
  
  # Aggregate
  - type: aggregate
    operation: sum
    sources:
      - type: function_call
        function: balanceOf
        args: ["${USER_1}"]
      - type: function_call
        function: balanceOf
        args: ["${USER_2}"]
    value: "1000000"
```

---

## Next Steps

- **[Comparison Options](comparison-options.md)** - Flexible value matching
- **[Presets](presets.md)** - Built-in contract presets
- **[Examples](../examples/)** - Real-world examples
