# Nodrift Metrics System

This document explains how to use the metrics and severity system in Nodrift for advanced drift monitoring and risk assessment.

## Overview

The metrics system allows you to:
- **Categorize checks** by type (liquidity, solvency, risk, etc.)
- **Assign severity levels** (critical, high, medium, low)
- **Track specific metrics** with meaningful names
- **Generate risk reports** based on aggregated metrics

## Metric Structure

Add a `metric` field to any state check:

```yaml
state:
  - type: function_call
    function: balanceOf
    args: ["0xAddress"]
    value: "1000000"
    options:
      comparison: greater_than
    metric:
      name: "pool_liquidity"           # Unique metric identifier
      category: "liquidity"             # Metric category
      severity: "high"                  # Severity level
      description: "Pool must maintain minimum liquidity"  # Human-readable description
```

## Severity Levels

### CRITICAL: CRITICAL
**Use for:** Checks that indicate system failure, security breach, or immediate action required

**Examples:**
- Contract identity verification (wrong contract = system compromise)
- Minimum solvency thresholds (reserves < liabilities)
- Concentration risk limits (single entity > 25% of supply)
- Pool integrity checks (wrong tokens = pool replacement)

```yaml
metric:
  severity: "critical"
  description: "Single exchange holding >25% creates systemic risk"
```

### HIGH: HIGH
**Use for:** Important checks that affect system health but aren't immediately critical

**Examples:**
- Liquidity depth monitoring
- Protocol exposure limits
- Treasury allocation thresholds
- Major holder balances

```yaml
metric:
  severity: "high"
  description: "Pool must maintain healthy reserves for normal operations"
```

### MEDIUM: MEDIUM
**Use for:** Monitoring checks that track trends and changes

**Examples:**
- Supply drift monitoring
- Fee recipient changes
- Governance parameter updates
- Non-critical balance changes

```yaml
metric:
  severity: "medium"
  description: "Track USDC supply changes for market analysis"
```

### LOW: LOW
**Use for:** Informational checks and baseline monitoring

**Examples:**
- Historical data tracking
- Informational queries
- Baseline establishment
- Non-critical metadata

```yaml
metric:
  severity: "low"
  description: "Track for informational purposes"
```

## Metric Categories

### `integrity`
Verifies contract identity and system integrity
- Token symbols/names
- Contract addresses
- Pool token verification
- Factory relationships

### `solvency`
Checks that assets back liabilities
- Reserve requirements
- Collateralization ratios
- Backing verification
- Minimum balance thresholds

### `liquidity`
Monitors available liquidity
- Pool depths
- DEX reserves
- Protocol liquidity
- Trading capacity

### `risk`
Tracks concentration and systemic risks
- Holder concentration
- Exchange exposure
- Protocol concentration
- Counterparty risk

### `supply`
Monitors token supply metrics
- Total supply changes
- Minting/burning activity
- Supply distribution
- Inflation/deflation

### `governance`
Tracks governance parameters
- Fee recipients
- Admin addresses
- Voting parameters
- Timelock settings

## Complete Example

See [`risk-management/04-comprehensive-metrics.yaml`](risk-management/04-comprehensive-metrics.yaml) for a full example demonstrating all severity levels and categories.

## Expected Output

When metrics are defined, the tool will generate enhanced output:

```
╔══════════════════════════════════════════════════════════════════════╗
║                     Drift Analysis Summary                            ║
╚══════════════════════════════════════════════════════════════════════╝

Contracts Checked:     6
Total Checks:          15
Passing:               12 (80%)
Drifting:              3 (20%)

Drift Severity:
  CRITICAL: CRITICAL:         1  (exchange_concentration_risk)
  HIGH: HIGH:             1  (pool_liquidity_depth)
  MEDIUM: MEDIUM:           1  (total_supply_drift)
  LOW: LOW:              0

Risk Metrics by Category:
  Integrity:            4/4 passing
  Solvency:             3/3 passing
  Liquidity:             2/3 passing (1 drift)
  Risk:                CRITICAL: 0/1 passing (1 CRITICAL)
  Supply:                1/2 passing (1 drift)
  Governance:           2/2 passing

Critical Issues:
  1. exchange_concentration_risk (CRITICAL)
     Binance holds 34.8B USDC (68.9% of supply)
     Expected: <10B USDC (<25% of supply)
     Action: IMMEDIATE - Concentration risk exceeds safe limits

High Priority Issues:
  2. pool_liquidity_depth (HIGH)
     Pool has 72.4M LP tokens
     Expected: >10 LP tokens
     Status: HEALTHY - Above minimum threshold
```

## Best Practices

### 1. Use Appropriate Severity Levels
- **CRITICAL**: System failure, immediate action required
- **HIGH**: Important but not immediately critical
- **MEDIUM**: Monitoring and trend analysis
- **LOW**: Informational only

### 2. Meaningful Names
Use descriptive metric names that indicate what's being measured:
-  `pool_minimum_reserves`
-  `exchange_concentration_risk`
- ❌ `check1`
- ❌ `balance`

### 3. Clear Descriptions
Write descriptions that explain:
- What is being checked
- Why it matters
- What action to take if it fails

### 4. Consistent Categories
Use standard categories for easier aggregation:
- `integrity`, `solvency`, `liquidity`, `risk`, `supply`, `governance`

### 5. Combine with Comparison Options
Metrics work best with appropriate comparison operators:

```yaml
# Critical minimum threshold
- type: function_call
  function: balanceOf
  args: ["0xPool"]
  value: "1000000"
  options:
    comparison: greater_than  # Must be above minimum
  metric:
    severity: "critical"
    category: "solvency"

# High-level health check
- type: function_call
  function: balanceOf
  args: ["0xPool"]
  value: "10000000"
  options:
    comparison: greater_than  # Should be above healthy level
  metric:
    severity: "high"
    category: "liquidity"
```

## Use Cases

### 1. Treasury Monitoring
Track allocation across multiple assets with appropriate severity:

```yaml
# Critical: Native token holdings
metric:
  name: "treasury_native_token"
  category: "solvency"
  severity: "critical"

# High: Stablecoin reserves
metric:
  name: "treasury_stablecoin_reserves"
  category: "liquidity"
  severity: "high"

# Medium: Other token holdings
metric:
  name: "treasury_diversification"
  category: "risk"
  severity: "medium"
```

### 2. DEX Pool Health
Monitor pool health with graduated severity:

```yaml
# Critical: Minimum reserves (solvency)
metric:
  name: "pool_minimum_reserves"
  category: "solvency"
  severity: "critical"

# High: Healthy reserves (liquidity)
metric:
  name: "pool_healthy_reserves"
  category: "liquidity"
  severity: "high"

# Medium: Pool growth tracking
metric:
  name: "pool_growth_rate"
  category: "supply"
  severity: "medium"
```

### 3. Stablecoin Monitoring
Track stablecoin health across multiple dimensions:

```yaml
# Critical: Issuer reserves
metric:
  name: "issuer_reserves"
  category: "solvency"
  severity: "critical"

# Critical: Concentration risk
metric:
  name: "exchange_concentration"
  category: "risk"
  severity: "critical"

# High: Protocol liquidity
metric:
  name: "protocol_liquidity"
  category: "liquidity"
  severity: "high"

# Medium: Supply changes
metric:
  name: "supply_drift"
  category: "supply"
  severity: "medium"
```

## Integration with CI/CD

Metrics enable automated risk assessment in CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run Nodrift with Metrics
  run: |
    nodrift verify config.yaml --output json > results.json
    
    # Parse metrics
    CRITICAL_COUNT=$(jq '.metrics.critical.count' results.json)
    
    # Fail build if critical issues found
    if [ "$CRITICAL_COUNT" -gt 0 ]; then
      echo "CRITICAL: $CRITICAL_COUNT critical issues found"
      exit 1
    fi
```

## Future Enhancements

Planned features for the metrics system:
- **Metric aggregation**: Sum, average, min, max across multiple checks
- **Threshold alerts**: Automatic alerting when metrics exceed thresholds
- **Historical tracking**: Store metric values over time
- **Trend analysis**: Detect increasing/decreasing trends
- **Risk scores**: Calculate overall risk scores from metrics
- **Custom categories**: Define your own metric categories

---

For more examples, see:
- [`risk-management/04-comprehensive-metrics.yaml`](risk-management/04-comprehensive-metrics.yaml) - Complete metrics example
- [`stablecoins/02-usdc-distribution.yaml`](stablecoins/02-usdc-distribution.yaml) - Stablecoin metrics
- [`risk-management/02-liquidity-pool-health.yaml`](risk-management/02-liquidity-pool-health.yaml) - Liquidity metrics
