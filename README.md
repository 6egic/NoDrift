# Nodrift

<div align="center">

**Smart Contract State Verification for Ethereum**

[![npm version](https://img.shields.io/npm/v/nodrift.svg)](https://www.npmjs.com/package/nodrift)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16-green.svg)](https://nodejs.org/)

*Verify on-chain contract state matches your YAML configuration. Perfect for CI/CD pipelines, audits, and drift detection.*

[Getting Started](#quick-start) • [Documentation](docs/) • [Examples](examples/)

</div>

---

##  What is Nodrift?

Nodrift is a production-grade tool for verifying that your deployed smart contracts match their expected configuration. Like infrastructure-as-code tools (Terraform, Pulumi), but for Ethereum smart contracts.

**Key Features:** 

-  **Comprehensive State Verification** - Owner, roles, variables, storage slots, proxy patterns, and more
-  **Multi-Network Support** - Verify contracts across Ethereum, Polygon, BSC, Arbitrum, Optimism, and more
-  **Built-in Presets** - ERC20, ERC721, ERC1155, ERC4626, Diamond, Proxy patterns
-  **Flexible Comparisons** - Tolerance, ranges, patterns, case-insensitive, order-insensitive
-  **CI/CD Ready** - JUnit XML output, exit codes, GitHub Actions/GitLab CI templates
-  **Multiple Output Formats** - Text, JSON, JUnit XML, Terraform-style plan
-  **Production-Grade Schema** - Full JSON Schema validation with IDE support and error messages
-  **Production-Grade Runtime** - Retry logic, rate limiting, connection pooling, error handling

---

##  Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Configuration](#configuration)
- [State Types](#state-types)
- [Presets](#presets)
- [CI/CD Integration](#cicd-integration)
- [Examples](#examples)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

##  Quick Start

### Installation

```bash
npm install -g nodrift
```

### Create Your First Config

```bash
nodrift init
```

This interactive wizard will guide you through creating a configuration file.

### Example Configuration

Create a `nodrift.yaml` file:

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
        expected: "${EXPECTED_OWNER}"
      
      - type: variable
        name: totalSupply
        expected: "1000000000000000000000000"  # 1M tokens
        options:
          tolerance: "1%"
      
      - type: role
        role: MINTER_ROLE
        account: "${MINTER_ADDRESS}"
        expected: true
```

### Run Verification

```bash
# Create .env file with your RPC URL
echo "RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY" > .env

# Run verification
nodrift nodrift.yaml

# CI/CD mode (fail on drift)
nodrift nodrift.yaml --fail-on-drift

# Terraform-style plan output
nodrift nodrift.yaml --plan

# JUnit XML output
nodrift nodrift.yaml --output junit --junit-file results.xml

# JSON output for CI/CD
nodrift nodrift.yaml --output json
```

---

##  Installation

### NPM (Global)

```bash
npm install -g nodrift
```

### NPM (Project)

```bash
npm install --save-dev nodrift
```

### From Source

```bash
git clone https://github.com/your-org/nodrift.git
cd nodrift
npm install
npm run build
npm link
```

### Requirements

- Node.js >= 16.0.0
- npm or yarn

---

##  Basic Usage

### Commands

```bash
# Verify contracts against configuration
nodrift <config-file>

# Validate configuration without blockchain connection
nodrift validate <config-file>

# Interactive configuration generator
nodrift init

# List available presets
nodrift presets
```

### Options

```bash
nodrift <config-file> [options]

Options:
  -o, --output <format>      Output format: text, json, junit (default: text)
  --junit-file <path>        JUnit XML output path (default: test-results/nodrift-junit.xml)
  --fail-on-drift            Exit with code 1 if drift detected (CI/CD mode)
  --compact-json             Compact JSON output (no indentation)
  -q, --quiet                Suppress non-essential output
  -v, --verbose              Enable verbose logging
  --plan                     Terraform-style plan output
  -h, --help                 Display help
  --version                  Display version
```

### Exit Codes

- `0` - Success (no drift)
- `1` - Drift detected (only with `--fail-on-drift`)
- `2` - Configuration error
- `3` - Network error
- `4` - Contract error
- `5` - Validation error
- `6` - Unknown error

---

##  Configuration

### Basic Structure

```yaml
version: 1.0

# Global network configuration (can be overridden per contract)
network:
  rpc_url: "${RPC_URL}"
  chain_id: 1
  timeout: 30000        # Optional: RPC timeout in ms
  max_retries: 3        # Optional: Max retry attempts

# Optional: Import reusable configurations
imports:
  - ./configs/networks.yaml
  - ./configs/templates.yaml

# Contract definitions
contracts:
  ContractName:
    address: "${CONTRACT_ADDRESS}"
    abi: "./path/to/abi.json"  # Optional if using preset
    preset: erc20               # Optional: Use built-in preset
    
    # Optional: Override network for this contract
    network:
      rpc_url: "${POLYGON_RPC_URL}"
      chain_id: 137
    
    # State verification
    state:
      - type: owner
        expected: "${OWNER_ADDRESS}"
      
      - type: variable
        name: paused
        expected: false
```

### Environment Variables

Nodrift supports environment variable substitution using `${VAR_NAME}` syntax:

```yaml
network:
  rpc_url: "${RPC_URL}"
  
contracts:
  MyContract:
    address: "${CONTRACT_ADDRESS}"
    state:
      - type: owner
        expected: "${EXPECTED_OWNER}"
```

Set variables before running:

```bash
export RPC_URL="https://..."
export CONTRACT_ADDRESS="0x..."
export EXPECTED_OWNER="0x..."
```

Or use a `.env` file:

```bash
# .env
RPC_URL=https://...
CONTRACT_ADDRESS=0x...
EXPECTED_OWNER=0x...
```

```bash
# Load and run
export $(cat .env | xargs) && nodrift config.yaml
```

### Advanced Features

- **Imports/Includes** - Reuse configurations across files
- **Templates** - Define reusable contract templates
- **Multi-Network** - Verify contracts across multiple chains
- **Custom ABIs** - Use custom ABI files or fetch from Etherscan

See [Configuration Guide](docs/configuration.md) for details.

---

##  State Types

Nodrift supports comprehensive state verification:

### Basic Types

- **Owner** - Verify contract ownership
- **Role** - Verify AccessControl role memberships
- **Variable** - Read public state variables
- **Function Call** - Execute view functions

### Advanced Types

- **Storage Slot** - Direct storage slot access
- **Proxy** - ERC1967 proxy pattern verification

### Complex Types

- **Array State** - Verify array length and membership
- **Mapping State** - Verify mapping key-value pairs
- **Cross Contract** - Read values from other contracts
- **Aggregate** - Aggregate operations (sum, count, average, min, max)
- **Conditional** - Conditional verification based on other states
- **Comparison** - Compare two arbitrary values
- **Time Based** - Timestamp and staleness checks

### Example

```yaml
state:
  # Owner check
  - type: owner
    expected: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  
  # Role check
  - type: role
    role: MINTER_ROLE
    account: "0x123..."
    expected: true
  
  # Variable check
  - type: variable
    name: totalSupply
    expected: "1000000000000000000000000"
  
  # Function call
  - type: function_call
    function: balanceOf
    args: ["0x123..."]
    expected: "100000000000000000000"
  
  # Storage slot
  - type: storage_slot
    slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
    expected: "0x..."
  
  # Array state
  - type: array_state
    name: whitelist
    checks:
      length: 5
      contains: ["0x123...", "0x456..."]
  
  # Cross-contract check
  - type: cross_contract
    target_contract: OtherContract
    function: getValue
    args: []
    expected: "42"
```

See [State Types Guide](docs/state-types.md) for complete reference.

---

##  Presets

Nodrift includes built-in presets for common contract standards:

### Available Presets

- **erc20** - ERC20 token standard
- **erc721** - ERC721 NFT standard
- **erc1155** - ERC1155 multi-token standard
- **erc4626** - ERC4626 tokenized vault standard
- **diamond** - Diamond pattern (EIP-2535)
- **proxy** - ERC1967 proxy pattern
- **accessControl** - OpenZeppelin AccessControl

### Usage

```yaml
contracts:
  MyToken:
    preset: erc20
    address: "${TOKEN_ADDRESS}"
    state:
      # Preset automatically includes ABI and common checks
      - type: owner
        expected: "${OWNER}"
```

### List Presets

```bash
nodrift presets
```

See [Presets Guide](docs/presets.md) for details.

---

##  Comparison Options

Nodrift supports flexible value comparison:

### Numeric Comparisons

```yaml
- type: variable
  name: totalSupply
  expected: "1000000"
  options:
    tolerance: "5%"        # Allow 5% deviation
    # OR
    tolerance: "1000"      # Allow absolute deviation of 1000
    # OR
    range:
      min: "900000"
      max: "1100000"
```

### String Comparisons

```yaml
- type: variable
  name: symbol
  expected: "TOKEN"
  options:
    ignore_case: true      # Case-insensitive comparison
    # OR
    pattern: "^TOKEN.*"    # Regex pattern matching
```

### Array Comparisons

```yaml
- type: array_state
  name: whitelist
  checks:
    contains: ["0x123...", "0x456..."]
  options:
    ignore_order: true     # Order-insensitive comparison
```

See [Comparison Options Guide](docs/comparison-options.md) for complete reference.

---

##  CI/CD Integration

### GitHub Actions

```yaml
name: Contract Verification

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Nodrift
        run: npm install -g nodrift
      
      - name: Verify Contracts
        env:
          RPC_URL: ${{ secrets.RPC_URL }}
          CONTRACT_ADDRESS: ${{ secrets.CONTRACT_ADDRESS }}
        run: |
          nodrift config.yaml --fail-on-drift --output junit
      
      - name: Publish Test Results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: test-results/nodrift-junit.xml
```

### GitLab CI

```yaml
verify-contracts:
  stage: test
  image: node:18
  script:
    - npm install -g nodrift
    - nodrift config.yaml --fail-on-drift --output junit
  artifacts:
    reports:
      junit: test-results/nodrift-junit.xml
```

### Jenkins

```groovy
pipeline {
  agent any
  stages {
    stage('Verify Contracts') {
      steps {
        sh 'npm install -g nodrift'
        sh 'nodrift config.yaml --fail-on-drift --output junit'
      }
    }
  }
  post {
    always {
      junit 'test-results/nodrift-junit.xml'
    }
  }
}
```

See [CI/CD Integration Guide](docs/ci-cd-integration.md) for more examples.

---

##  Examples

The [`examples/`](examples/) directory contains comprehensive real-world examples:

### Example Categories

- **[Basic Examples](examples/basic/)** - ERC20 token verification fundamentals
- **[DeFi Examples](examples/defi/)** - DEX, liquidity pools, and oracle monitoring
- **[Governance Examples](examples/governance/)** - Governance token verification
- **[Stablecoin Examples](examples/stablecoins/)** - Supply and distribution monitoring
- **[Risk Management Examples](examples/risk-management/)** - Treasury allocation and liquidity health

### Running Examples

```bash
# Basic ERC20 token
nodrift examples/basic/01-erc20-token.yaml

# Complete Uniswap V2 ecosystem
nodrift examples/defi/03-uniswap-v2-ecosystem.yaml

# USDC distribution monitoring
nodrift examples/stablecoins/02-usdc-distribution.yaml

# Treasury allocation tracking
nodrift examples/risk-management/01-treasury-allocation.yaml
```

See [Examples README](examples/README.md) for complete details and all available examples.

---

##  Documentation

### Core Documentation

- **[Getting Started](docs/getting-started.md)** - Installation and first steps
- **[Configuration Guide](docs/configuration.md)** - Complete configuration reference
- **[State Types](docs/state-types.md)** - All verification types
- **[Comparison Options](docs/comparison-options.md)** - Flexible value matching
- **[Presets](docs/presets.md)** - Built-in contract presets
- **[CI/CD Integration](docs/ci-cd-integration.md)** - Pipeline integration
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions
- **[FAQ](docs/faq.md)** - Frequently asked questions

### Development

- **[Architecture](docs/architecture.md)** - System design and internals
- **[Contributing](CONTRIBUTING.md)** - Development guide

---

##  Use Cases

### Continuous Verification

Verify contract state in CI/CD pipelines after deployments:

```bash
nodrift config.yaml --fail-on-drift --output junit
```

### Audit & Compliance

Generate verification reports for audits:

```bash
nodrift config.yaml --output json > audit-report.json
```

### Drift Detection

Detect unauthorized changes to contract state:

```bash
nodrift config.yaml --plan
```

### Multi-Chain Monitoring

Monitor contracts across multiple networks:

```yaml
contracts:
  TokenEthereum:
    network:
      chain_id: 1
    address: "0x..."
  
  TokenPolygon:
    network:
      chain_id: 137
    address: "0x..."
```

---

##  Development

### Setup

```bash
git clone https://github.com/your-org/nodrift.git
cd nodrift
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
npm run format
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

---

##  Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Ways to Contribute

-  Report bugs
-  Suggest features
-  Improve documentation
-  Submit pull requests
-  Star the project

---

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

##  Acknowledgments

- Built with [ethers.js](https://docs.ethers.org/)
- Inspired by infrastructure-as-code tools like Terraform




