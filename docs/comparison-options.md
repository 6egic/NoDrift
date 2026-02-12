# Comparison Options

Flexible value matching and comparison options in Nodrift.

## Table of Contents

- [Overview](#overview)
- [Numeric Comparisons](#numeric-comparisons)
- [String Comparisons](#string-comparisons)
- [Array Comparisons](#array-comparisons)
- [Object Comparisons](#object-comparisons)
- [Common Options](#common-options)

---

## Overview

Nodrift supports flexible value comparison through the `options` field. This allows you to handle expected variations, case sensitivity, ordering, and more.

**Basic Syntax:**

```yaml
- type: variable
  name: totalSupply
  value: "1000000"
  options:
    tolerance: "5%"
    description: "Total supply with 5% tolerance"
```

---

## Numeric Comparisons

### Tolerance (Percentage)

Allow percentage-based deviation:

```yaml
- type: variable
  name: totalSupply
  value: "1000000"
  options:
    tolerance: "5%"  # Allow 5% deviation
```

**Accepted Values:**
- `950000` to `1050000` (5% of 1000000)

### Tolerance (Absolute)

Allow absolute deviation:

```yaml
- type: variable
  name: totalSupply
  value: "1000000"
  options:
    tolerance: "10000"  # Allow 10000 deviation
```

**Accepted Values:**
- `990000` to `1010000` (10000 from 1000000)

### Range

Specify min/max bounds:

```yaml
- type: variable
  name: totalSupply
  value: "1000000"
  options:
    range:
      min: "900000"
      max: "1100000"
```

**Accepted Values:**
- Any value between `900000` and `1100000` (inclusive)

### Examples

```yaml
# Percentage tolerance
- type: variable
  name: price
  value: "100000000000000000"  # 0.1 ETH
  options:
    tolerance: "2%"

# Absolute tolerance
- type: function_call
  function: balanceOf
  args: ["${USER}"]
  value: "1000000000000000000000"
  options:
    tolerance: "1000000000000000000"  # 1 token

# Range
- type: variable
  name: totalSupply
  value: "1000000"
  options:
    range:
      min: "900000"
      max: "1100000"

# Minimum only
- type: variable
  name: balance
  value: "1000000"
  options:
    range:
      min: "1000000"

# Maximum only
- type: variable
  name: balance
  value: "1000000"
  options:
    range:
      max: "1000000"
```

---

## String Comparisons

### Case Insensitive

Ignore case when comparing strings:

```yaml
- type: variable
  name: symbol
  value: "MTK"
  options:
    ignore_case: true
```

**Accepted Values:**
- `MTK`, `mtk`, `Mtk`, `mTk`, etc.

### Pattern Matching

Use regex patterns:

```yaml
- type: variable
  name: symbol
  value: "TOKEN"
  options:
    pattern: "^TOKEN.*"  # Starts with "TOKEN"
```

**Accepted Values:**
- `TOKEN`, `TOKEN1`, `TOKEN_V2`, etc.

### Trim Whitespace

Trim leading/trailing whitespace:

```yaml
- type: variable
  name: name
  value: "My Token"
  options:
    trim: true
```

**Accepted Values:**
- `My Token`, ` My Token `, `My Token  `, etc.

### Examples

```yaml
# Case insensitive
- type: variable
  name: symbol
  value: "USDC"
  options:
    ignore_case: true

# Pattern matching
- type: variable
  name: version
  value: "1.0.0"
  options:
    pattern: "^\\d+\\.\\d+\\.\\d+$"  # Semantic versioning

# Combined
- type: variable
  name: name
  value: "My Token"
  options:
    ignore_case: true
    trim: true
```

---

## Array Comparisons

### Ignore Order

Order-insensitive array comparison:

```yaml
- type: array_state
  name: whitelist
  checks:
    exact: ["0x123...", "0x456...", "0x789..."]
  options:
    ignore_order: true
```

**Accepted Values:**
- `["0x123...", "0x456...", "0x789..."]`
- `["0x789...", "0x123...", "0x456..."]`
- Any permutation

### Allow Empty

Allow empty arrays:

```yaml
- type: array_state
  name: whitelist
  checks:
    length: 0
  options:
    allow_empty: true
```

### Contains (Subset)

Check if array contains specific elements:

```yaml
- type: array_state
  name: whitelist
  checks:
    contains: ["0x123...", "0x456..."]
  options:
    ignore_order: true
```

**Accepted Values:**
- Any array containing `0x123...` and `0x456...`
- Order doesn't matter
- Can contain additional elements

### Examples

```yaml
# Ignore order
- type: array_state
  name: admins
  checks:
    exact: ["${ADMIN_1}", "${ADMIN_2}", "${ADMIN_3}"]
  options:
    ignore_order: true

# Allow empty
- type: array_state
  name: pendingTransactions
  checks:
    length: 0
  options:
    allow_empty: true

# Contains subset
- type: array_state
  name: whitelist
  checks:
    contains: ["${REQUIRED_USER_1}", "${REQUIRED_USER_2}"]
  options:
    ignore_order: true
```

---

## Object Comparisons

### Partial Match

Match subset of object properties:

```yaml
- type: function_call
  function: getConfig
  value:
    owner: "${OWNER}"
    paused: false
  options:
    partial_match: true
```

**Accepted Values:**
- Any object containing at least `owner` and `paused` with matching values
- Can contain additional properties

### Ignore Keys

Ignore specific keys when comparing:

```yaml
- type: function_call
  function: getReserves
  value:
    reserve0: "1000000"
    reserve1: "2000000"
  options:
    ignore_keys: ["blockTimestampLast"]
```

### Deep Comparison

Enable deep comparison for nested objects:

```yaml
- type: function_call
  function: getConfig
  value:
    settings:
      fee: 300
      enabled: true
  options:
    deep_compare: true
```

### Examples

```yaml
# Partial match
- type: function_call
  function: getPoolInfo
  value:
    totalLiquidity: "1000000"
    fee: 300
  options:
    partial_match: true

# Ignore keys
- type: function_call
  function: getReserves
  value:
    reserve0: "1000000000000000000000"
    reserve1: "2000000000000000000000"
  options:
    ignore_keys: ["blockTimestampLast", "timestamp"]

# Deep comparison with tolerance
- type: function_call
  function: getPoolData
  value:
    reserves:
      token0: "1000000"
      token1: "2000000"
    fee: 300
  options:
    deep_compare: true
    tolerance: "1%"
```

---

## Common Options

### Description

Add human-readable description:

```yaml
- type: variable
  name: totalSupply
  value: "1000000"
  options:
    description: "Total supply should be 1M tokens"
```

### Severity

Set check severity:

```yaml
- type: variable
  name: paused
  value: false
  options:
    severity: critical  # critical, high, medium, low
```

**Severity Levels:**
- `critical` - Critical check (default)
- `high` - High priority
- `medium` - Medium priority
- `low` - Low priority / informational

### Skip

Skip check conditionally:

```yaml
- type: variable
  name: testValue
  value: "123"
  options:
    skip: true
    skip_reason: "Not applicable in production"
```

### Timeout

Set custom timeout for this check:

```yaml
- type: function_call
  function: expensiveOperation
  value: "result"
  options:
    timeout: 60000  # 60 seconds
```

---

## Combining Options

You can combine multiple options:

```yaml
# Numeric with tolerance and description
- type: variable
  name: totalSupply
  value: "1000000000000000000000000"
  options:
    tolerance: "1%"
    description: "Total supply: 1M tokens with 1% tolerance"
    severity: critical

# String with case-insensitive and pattern
- type: variable
  name: symbol
  value: "TOKEN"
  options:
    ignore_case: true
    pattern: "^TOKEN.*"
    description: "Symbol should start with TOKEN (case-insensitive)"

# Array with order-insensitive
- type: array_state
  name: whitelist
  checks:
    exact: ["${USER_1}", "${USER_2}", "${USER_3}"]
  options:
    ignore_order: true
    description: "Whitelist should contain exactly 3 users"

# Object with partial match and ignored keys
- type: function_call
  function: getReserves
  value:
    reserve0: "1000000"
    reserve1: "2000000"
  options:
    partial_match: true
    ignore_keys: ["blockTimestampLast"]
    tolerance: "5%"
    description: "Pool reserves with 5% tolerance"
```

---

## Advanced Examples

### Complex Numeric Comparison

```yaml
- type: function_call
  function: getTotalValueLocked
  value: "10000000000000000000000000"  # 10M tokens
  options:
    tolerance: "2%"
    range:
      min: "9000000000000000000000000"   # 9M minimum
    description: "TVL should be ~10M with 2% tolerance, minimum 9M"
    severity: high
```

### Complex String Comparison

```yaml
- type: variable
  name: version
  value: "1.0.0"
  options:
    pattern: "^\\d+\\.\\d+\\.\\d+$"
    description: "Version must follow semantic versioning"
    severity: medium
```

### Complex Array Comparison

```yaml
- type: array_state
  name: validators
  checks:
    length: 21
    contains: ["${REQUIRED_VALIDATOR_1}", "${REQUIRED_VALIDATOR_2}"]
  options:
    ignore_order: true
    description: "Must have 21 validators including required ones"
    severity: critical
```

### Complex Object Comparison

```yaml
- type: function_call
  function: getPoolConfig
  value:
    fee: 300
    tickSpacing: 60
    maxLiquidityPerTick: "1000000000000000000"
  options:
    partial_match: true
    ignore_keys: ["observationCardinalityNext"]
    deep_compare: true
    description: "Pool configuration check"
```

---

## Best Practices

### 1. Use Tolerances for Dynamic Values

```yaml
#  Good - allows for expected variations
- type: variable
  name: totalSupply
  value: "1000000"
  options:
    tolerance: "1%"

#  Bad - too strict for dynamic values
- type: variable
  name: totalSupply
  value: "1000000"
```

### 2. Add Descriptions

```yaml
#  Good - clear intent
- type: variable
  name: paused
  value: false
  options:
    description: "Contract should not be paused in production"

#  Bad - no context
- type: variable
  name: paused
  value: false
```

### 3. Use Appropriate Severity

```yaml
#  Good - critical for security
- type: owner
  value: "${MULTISIG}"
  options:
    severity: critical
    description: "Owner must be multisig"

#  Good - low for informational
- type: variable
  name: version
  value: "1.0.0"
  options:
    severity: low
    description: "Version check"
```

### 4. Combine Options Wisely

```yaml
#  Good - comprehensive check
- type: array_state
  name: whitelist
  checks:
    contains: ["${REQUIRED_USER}"]
  options:
    ignore_order: true
    description: "Whitelist must include required user"
    severity: high
```

---

## Reference

### All Options

| Option | Type | Applies To | Description |
|--------|------|------------|-------------|
| `tolerance` | String | Numeric | Percentage or absolute tolerance |
| `range.min` | String | Numeric | Minimum value |
| `range.max` | String | Numeric | Maximum value |
| `ignore_case` | Boolean | String | Case-insensitive comparison |
| `pattern` | String | String | Regex pattern |
| `trim` | Boolean | String | Trim whitespace |
| `ignore_order` | Boolean | Array | Order-insensitive |
| `allow_empty` | Boolean | Array | Allow empty arrays |
| `partial_match` | Boolean | Object | Match subset of properties |
| `ignore_keys` | Array | Object | Ignore specific keys |
| `deep_compare` | Boolean | Object | Deep comparison |
| `description` | String | All | Human-readable description |
| `severity` | String | All | Check severity |
| `skip` | Boolean | All | Skip check |
| `skip_reason` | String | All | Reason for skipping |
| `timeout` | Number | All | Custom timeout (ms) |

---

## Next Steps

- **[State Types](state-types.md)** - All verification types
- **[Presets](presets.md)** - Built-in contract presets
- **[Examples](../examples/)** - Real-world examples
