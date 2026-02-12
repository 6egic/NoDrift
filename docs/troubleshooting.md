# Troubleshooting

Common issues and solutions when using Nodrift.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Configuration Errors](#configuration-errors)
- [Network Errors](#network-errors)
- [Contract Errors](#contract-errors)
- [Verification Issues](#verification-issues)
- [Performance Issues](#performance-issues)
- [CI/CD Issues](#cicd-issues)

---

## Installation Issues

### Cannot find module 'nodrift'

**Problem:** Module not found after installation.

**Solution:**

```bash
# Install globally
npm install -g nodrift

# Or use npx
npx nodrift config.yaml

# Or install locally and use npm scripts
npm install --save-dev nodrift
```

### Permission denied

**Problem:** Permission error during global installation.

**Solution:**

```bash
# Use sudo (not recommended)
sudo npm install -g nodrift

# Or configure npm to use a different directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
npm install -g nodrift
```

### Node version incompatibility

**Problem:** Nodrift requires Node.js >= 16.0.0

**Solution:**

```bash
# Check Node version
node --version

# Update Node.js
# Using nvm
nvm install 18
nvm use 18

# Or download from nodejs.org
```

---

## Configuration Errors

### Invalid YAML syntax

**Problem:** YAML parsing error.

**Error:**
```
Error: Invalid YAML syntax at line 5
```

**Solution:**

```yaml
#  Bad - incorrect indentation
contracts:
MyToken:
  address: "0x..."

#  Good - correct indentation
contracts:
  MyToken:
    address: "0x..."
```

**Tips:**
- Use 2 spaces for indentation (not tabs)
- Validate YAML online: https://www.yamllint.com/
- Use `nodrift validate config.yaml` to check syntax

### Environment variable not defined

**Problem:** Required environment variable is missing.

**Error:**
```
Error: Environment variable RPC_URL is not defined
```

**Solution:**

```bash
# Set environment variable
export RPC_URL="https://..."

# Or use .env file
echo 'RPC_URL=https://...' > .env
export $(cat .env | xargs)

# Or provide inline
RPC_URL="https://..." nodrift config.yaml
```

### Schema validation error

**Problem:** Configuration doesn't match schema.

**Error:**
```
Error: Invalid configuration: contracts.MyToken.address is required
```

**Solution:**

```yaml
#  Bad - missing required field
contracts:
  MyToken:
    preset: erc20

#  Good - all required fields
contracts:
  MyToken:
    preset: erc20
    address: "${TOKEN_ADDRESS}"
```

### Invalid preset

**Problem:** Unknown preset specified.

**Error:**
```
Error: Unknown preset: erc721a
```

**Solution:**

```bash
# List available presets
nodrift presets

# Use correct preset name
```

```yaml
#  Correct preset names
preset: erc20
preset: erc721
preset: erc1155
preset: erc4626
preset: diamond
preset: proxy
preset: accessControl
```

---

## Network Errors

### Connection timeout

**Problem:** RPC request timeout.

**Error:**
```
Error: Network timeout after 30000ms
```

**Solution:**

```yaml
# Increase timeout
network:
  rpc_url: "${RPC_URL}"
  chain_id: 1
  timeout: 60000  # 60 seconds
```

### Rate limit exceeded

**Problem:** Too many requests to RPC provider.

**Error:**
```
Error: Rate limit exceeded
```

**Solution:**

```yaml
# Increase retry delay
network:
  rpc_url: "${RPC_URL}"
  chain_id: 1
  max_retries: 5
  retry_delay: 2000  # 2 seconds
```

**Or use a different RPC provider:**

```bash
# Free public RPCs (rate limited)
export RPC_URL="https://eth-mainnet.public.blastapi.io"

# Paid providers (higher limits)
export RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
export RPC_URL="https://mainnet.infura.io/v3/YOUR_KEY"
```

### Invalid RPC URL

**Problem:** RPC URL is incorrect or unreachable.

**Error:**
```
Error: Failed to connect to RPC endpoint
```

**Solution:**

```bash
# Test RPC URL
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  $RPC_URL

# Use correct URL format
export RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
```

### Chain ID mismatch

**Problem:** Chain ID doesn't match RPC endpoint.

**Error:**
```
Error: Chain ID mismatch: expected 1, got 137
```

**Solution:**

```yaml
#  Correct chain IDs
network:
  rpc_url: "https://eth-mainnet.g.alchemy.com/v2/..."
  chain_id: 1  # Ethereum

network:
  rpc_url: "https://polygon-rpc.com"
  chain_id: 137  # Polygon
```

---

## Contract Errors

### Contract not found

**Problem:** Contract doesn't exist at address.

**Error:**
```
Error: Contract not found at address 0x...
```

**Solution:**

```bash
# Verify contract address
# Check on Etherscan/block explorer

# Ensure correct network
# Mainnet vs Testnet addresses are different
```

### Invalid ABI

**Problem:** ABI is malformed or incorrect.

**Error:**
```
Error: Invalid ABI format
```

**Solution:**

```yaml
#  Use preset (includes ABI)
contracts:
  MyToken:
    preset: erc20
    address: "${ADDRESS}"

#  Or provide valid ABI file
contracts:
  MyToken:
    address: "${ADDRESS}"
    abi: "./abis/MyToken.json"

#  Or inline ABI
contracts:
  MyToken:
    address: "${ADDRESS}"
    abi:
      - "function owner() view returns (address)"
      - "function totalSupply() view returns (uint256)"
```

### Function not found

**Problem:** Function doesn't exist in contract.

**Error:**
```
Error: Function 'totalSupply' not found in contract
```

**Solution:**

```yaml
# Check function name spelling
- type: function_call
  function: totalSupply  # Correct
  # NOT: total_supply, TotalSupply, etc.

# Verify function exists in ABI
# Check contract on Etherscan
```

### Execution reverted

**Problem:** Contract function reverted.

**Error:**
```
Error: Execution reverted
```

**Solution:**

```yaml
# Check function arguments
- type: function_call
  function: balanceOf
  args: ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"]  # Valid address
  # NOT: ["invalid_address"]

# Ensure function is view/pure
# Nodrift only calls view/pure functions
```

---

## Verification Issues

### False positive drift

**Problem:** Drift detected but values are actually correct.

**Solution:**

```yaml
# Use tolerance for numeric values
- type: function_call
  function: totalSupply
  value: "1000000"
  options:
    tolerance: "1%"  # Allow 1% deviation

# Use case-insensitive for strings
- type: function_call
  function: symbol
  value: "TOKEN"
  options:
    ignore_case: true

# Use ignore_order for arrays
- type: array_state
  name: whitelist
  checks:
    exact: ["0x123...", "0x456..."]
  options:
    ignore_order: true
```

### Unexpected value format

**Problem:** Value format doesn't match expected.

**Solution:**

```yaml
# For addresses, use checksummed format
value: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
# NOT: "0x742d35cc6634c0532925a3b844bc9e7595f0beb"

# For numbers, use string format
value: "1000000000000000000000"
# NOT: 1000000000000000000000

# For booleans, use boolean
value: true
# NOT: "true"
```

### Storage slot not found

**Problem:** Storage slot returns zero.

**Error:**
```
Warning: Storage slot returns zero value
```

**Solution:**

```yaml
# Verify slot address
# ERC1967 implementation slot:
slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"

# Specify decode type
options:
  decode_as: address

# Check if contract uses standard proxy pattern
```

---

## Performance Issues

### Slow verification

**Problem:** Verification takes too long.

**Solution:**

```yaml
# Reduce timeout
network:
  timeout: 15000  # 15 seconds

# Use faster RPC provider
# Paid providers are usually faster

# Reduce number of checks
# Only verify critical state
```

### Memory issues

**Problem:** Out of memory errors.

**Solution:**

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" nodrift config.yaml

# Reduce concurrent checks
# Split into multiple config files
```

### Rate limiting

**Problem:** Hitting RPC rate limits.

**Solution:**

```yaml
# Increase retry delay
network:
  retry_delay: 2000  # 2 seconds between retries

# Use paid RPC provider
# Higher rate limits

# Split verification across multiple runs
```

---

## CI/CD Issues

### Environment variables not set

**Problem:** CI/CD pipeline can't find environment variables.

**Solution:**

```yaml
# GitHub Actions - use secrets
env:
  RPC_URL: ${{ secrets.RPC_URL }}

# GitLab CI - use variables
variables:
  RPC_URL: $RPC_URL

# Jenkins - use credentials
environment {
  RPC_URL = credentials('rpc-url')
}
```

### JUnit XML not generated

**Problem:** Test results not appearing in CI/CD.

**Solution:**

```bash
# Ensure output directory exists
mkdir -p test-results

# Use correct output format
nodrift config.yaml --output junit --junit-file test-results/results.xml

# Verify file was created
ls -la test-results/
```

### Pipeline fails unexpectedly

**Problem:** Pipeline fails even when verification passes.

**Solution:**

```bash
# Don't use --fail-on-drift for monitoring
nodrift config.yaml

# Use --fail-on-drift only for deployment gates
nodrift config.yaml --fail-on-drift

# Check exit code
echo $?
```

---

## Debug Mode

Enable verbose logging for troubleshooting:

```bash
# Verbose mode
nodrift config.yaml --verbose

# Debug environment variables
nodrift config.yaml --verbose 2>&1 | grep "Environment"

# Validate configuration
nodrift validate config.yaml --verbose
```

---

## Getting Help

If you're still experiencing issues:

1. **Check Documentation**
   - [Getting Started](getting-started.md)
   - [Configuration](configuration.md)
   - [FAQ](faq.md)

2. **Search Issues**
   - [GitHub Issues](https://github.com/your-org/nodrift/issues)

3. **Ask for Help**
   - [GitHub Discussions](https://github.com/your-org/nodrift/discussions)
   - Email: support@nodrift.dev

4. **Report a Bug**
   - [Create an Issue](https://github.com/your-org/nodrift/issues/new)
   - Include:
     - Nodrift version (`nodrift --version`)
     - Node.js version (`node --version`)
     - Configuration file (sanitized)
     - Error message
     - Steps to reproduce

---

## Common Error Codes

| Code | Error Type | Solution |
|------|------------|----------|
| 0 | Success | No action needed |
| 1 | Drift detected | Review diffs, update config or contracts |
| 2 | Configuration error | Fix YAML syntax, add missing fields |
| 3 | Network error | Check RPC URL, increase timeout |
| 4 | Contract error | Verify address, check ABI |
| 5 | Validation error | Fix configuration schema |
| 6 | Unknown error | Enable verbose mode, report bug |

---

## Next Steps

- **[FAQ](faq.md)** - Frequently asked questions
- **[Configuration](configuration.md)** - Configuration reference
- **[Examples](../examples/)** - Working examples
