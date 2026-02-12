# Getting Started with Nodrift

Smart Contract State Verification - This guide will help you get up and running with Nodrift in minutes.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Your First Verification](#your-first-verification)
- [Understanding the Output](#understanding-the-output)
- [Next Steps](#next-steps)

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js** >= 16.0.0 installed ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **RPC endpoint** for your target blockchain (Alchemy, Infura, or your own node)
- **Contract address** you want to verify
- **Basic knowledge** of smart contracts and YAML

### Checking Node.js Version

```bash
node --version  # Should be >= 16.0.0
npm --version
```

---

## Installation

### Option 1: Global Installation (Recommended)

Install Nodrift globally to use it from anywhere:

```bash
npm install -g nodrift
```

Verify installation:

```bash
nodrift --version
```

### Option 2: Project Installation

Install Nodrift as a dev dependency in your project:

```bash
npm install --save-dev nodrift
```

Use via npm scripts:

```json
{
  "scripts": {
    "verify": "nodrift config.yaml"
  }
}
```

### Option 3: From Source

For development or contributing:

```bash
git clone https://github.com/your-org/nodrift.git
cd nodrift
npm install
npm run build
npm link
```

---

## Your First Verification

Let's verify a simple ERC20 token contract.

### Step 1: Create Configuration File

Use the interactive wizard:

```bash
nodrift init
```

Or create a file manually named `nodrift.yaml`:

```yaml
version: 1.0

network:
  rpc_url: "${RPC_URL}"
  chain_id: 1

contracts:
  MyToken:
    preset: erc20
    address: "${TOKEN_ADDRESS}"
    state:
      - type: owner
        value: "${EXPECTED_OWNER}"
      
      - type: function_call
        function: totalSupply
        value: "1000000000000000000000000"  # 1M tokens with 18 decimals
      
      - type: function_call
        function: symbol
        value: "MTK"
      
      - type: function_call
        function: decimals
        value: 18
```

### Step 2: Set Environment Variables

Create a `.env` file:

```bash
# .env
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
TOKEN_ADDRESS=0x1234567890123456789012345678901234567890
EXPECTED_OWNER=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

Or export them directly:

```bash
export RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
export TOKEN_ADDRESS="0x1234567890123456789012345678901234567890"
export EXPECTED_OWNER="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
```

### Step 3: Validate Configuration

Before running verification, validate your configuration:

```bash
nodrift validate nodrift.yaml
```

This checks:
- YAML syntax
- Schema validation
- Environment variable resolution
- No blockchain connection required

### Step 4: Run Verification

```bash
nodrift nodrift.yaml
```

Or with environment file:

```bash
export $(cat .env | grep -v '^#' | xargs) && nodrift nodrift.yaml
```

---

## Understanding the Output

### Success Output

When all checks pass:

```
 Nodrift Verification Complete

Contract: MyToken (0x1234...7890)
Network: Ethereum Mainnet (Chain ID: 1)

 owner: 0x742d...0bEb (matches value)
 totalSupply: 1000000000000000000000000 (matches value)
 symbol: MTK (matches value)
 decimals: 18 (matches value)

Summary:
  Total Checks: 4
  Passed: 4
  Failed: 0
  Duration: 2.3s

Exit Code: 0 (Success)
```

### Drift Detected Output

When values don't match:

```
 Nodrift Verification Complete - Drift Detected

Contract: MyToken (0x1234...7890)
Network: Ethereum Mainnet (Chain ID: 1)

 owner: 0x742d...0bEb (matches value)
 totalSupply: 999999000000000000000000 (value: 1000000000000000000000000)
   Difference: -1000000000000000000000 (-0.1%)
 symbol: MTK (matches value)
 decimals: 18 (matches value)

Summary:
  Total Checks: 4
  Passed: 3
  Failed: 1
  Duration: 2.1s

Exit Code: 0 (Use --fail-on-drift to exit with code 1)
```

### Error Output

When configuration or network errors occur:

```
 Configuration Error

Error: Invalid YAML syntax at line 5
  Expected: key-value pair
  Found: invalid indentation

Exit Code: 2
```

---

## Output Formats

### Text Output (Default)

Human-readable output:

```bash
nodrift nodrift.yaml
```

### JSON Output

Machine-readable JSON:

```bash
nodrift nodrift.yaml --output json
```

```json
{
  "success": true,
  "contracts": [
    {
      "name": "MyToken",
      "address": "0x1234...7890",
      "network": "Ethereum Mainnet",
      "checks": [
        {
          "type": "owner",
          "status": "passed",
          "current": "0x742d...0bEb",
          "value": "0x742d...0bEb"
        }
      ]
    }
  ],
  "summary": {
    "total": 4,
    "passed": 4,
    "failed": 0,
    "duration": 2.3
  }
}
```

### JUnit XML Output

For CI/CD integration:

```bash
nodrift nodrift.yaml --output junit --junit-file results.xml
```

### Plan Output

Terraform-style plan:

```bash
nodrift nodrift.yaml --plan
```

```
Nodrift Verification Plan

Contract: MyToken
   owner: 0x742d...0bEb
   totalSupply: 999999000000000000000000  1000000000000000000000000
   symbol: MTK
   decimals: 18

Plan: 3 to keep, 1 to change, 0 to add
```

---

## CI/CD Mode

For automated pipelines, use `--fail-on-drift`:

```bash
nodrift nodrift.yaml --fail-on-drift
```

This will:
- Exit with code `1` if drift is detected
- Exit with code `0` if no drift
- Exit with code `2-6` for errors

Perfect for CI/CD pipelines:

```yaml
# GitHub Actions
- name: Verify Contracts
  run: nodrift config.yaml --fail-on-drift
```

---

## Common Options

### Quiet Mode

Suppress non-essential output:

```bash
nodrift nodrift.yaml --quiet
```

### Verbose Mode

Show detailed logging:

```bash
nodrift nodrift.yaml --verbose
```

### Compact JSON

Minified JSON output:

```bash
nodrift nodrift.yaml --output json --compact-json
```

---

## Next Steps

Now that you've completed your first verification, explore:

1. **[Configuration Guide](configuration.md)** - Learn all configuration options
2. **[State Types](state-types.md)** - Explore all verification types
3. **[Comparison Options](comparison-options.md)** - Flexible value matching
4. **[Presets](presets.md)** - Use built-in contract presets
5. **[CI/CD Integration](ci-cd-integration.md)** - Integrate with your pipeline
6. **[Examples](../examples/)** - Real-world examples

---

## Quick Reference

### Essential Commands

```bash
# Verify contracts
nodrift config.yaml

# Validate configuration
nodrift validate config.yaml

# Interactive setup
nodrift init

# List presets
nodrift presets

# CI/CD mode
nodrift config.yaml --fail-on-drift --output junit

# Help
nodrift --help
```

### Essential Configuration

```yaml
version: 1.0

network:
  rpc_url: "${RPC_URL}"
  chain_id: 1

contracts:
  ContractName:
    address: "${ADDRESS}"
    preset: erc20  # Optional
    state:
      - type: owner
        value: "${OWNER}"
```

### Environment Variables

```bash
# Set variables
export RPC_URL="https://..."
export ADDRESS="0x..."
export OWNER="0x..."

# Or use .env file
export $(cat .env | xargs)
```

---

## Troubleshooting

### Common Issues

**Issue: "Cannot find module 'nodrift'"**

Solution: Install globally or use npx:
```bash
npm install -g nodrift
# OR
npx nodrift config.yaml
```

**Issue: "RPC_URL is not defined"**

Solution: Set environment variables:
```bash
export RPC_URL="https://..."
```

**Issue: "Network timeout"**

Solution: Increase timeout in config:
```yaml
network:
  rpc_url: "${RPC_URL}"
  timeout: 60000  # 60 seconds
```

**Issue: "Invalid ABI"**

Solution: Use preset or provide valid ABI:
```yaml
contracts:
  MyContract:
    preset: erc20  # Use preset
    # OR
    abi: "./path/to/abi.json"
```

See [Troubleshooting Guide](troubleshooting.md) for more solutions.