# Frequently Asked Questions (FAQ)

Common questions about Nodrift.

## General Questions

### What is Nodrift?

Nodrift is a production-grade tool for verifying that deployed smart contracts match their expected configuration. It's like infrastructure-as-code tools (Terraform, Pulumi) but for Ethereum smart contracts.

### Why use Nodrift?

- **Prevent Configuration Drift** - Detect unauthorized changes to contract state
- **Automate Verification** - Integrate into CI/CD pipelines
- **Audit & Compliance** - Generate verification reports
- **Multi-Network Support** - Verify contracts across multiple chains
- **Production-Grade** - Retry logic, rate limiting, error handling

### How does Nodrift work?

1. You define expected contract state in a YAML file
2. Nodrift reads current state from the blockchain
3. Nodrift compares current vs expected state
4. Nodrift reports any differences (drift)

### Is Nodrift free?

Yes, Nodrift is open-source and free to use under the MIT license.

---

## Installation & Setup

### What are the requirements?

- Node.js >= 16.0.0
- npm or yarn
- RPC endpoint for your target blockchain

### How do I install Nodrift?

```bash
# Global installation
npm install -g nodrift

# Project installation
npm install --save-dev nodrift
```

### Do I need to provide an ABI?

Not if you use presets. Presets include ABIs for common standards (ERC20, ERC721, etc.).

```yaml
# No ABI needed with preset
contracts:
  MyToken:
    preset: erc20
    address: "${ADDRESS}"
    state:
      - type: function_call
        function: symbol
        value: "MTK"
```

### Can I use Nodrift without a paid RPC provider?

Yes, you can use free public RPCs, but they have rate limits. For production use, we recommend paid providers like Alchemy or Infura.

---

## Configuration

### What file format does Nodrift use?

YAML. It's human-readable and supports comments.

### Can I use environment variables?

Yes, use `${VAR_NAME}` syntax:

```yaml
network:
  rpc_url: "${RPC_URL}"
contracts:
  MyContract:
    address: "${CONTRACT_ADDRESS}"
```

### Can I split configuration across multiple files?

Yes, use imports:

```yaml
imports:
  - ./configs/networks.yaml
  - ./configs/contracts.yaml
```

### How do I verify contracts on multiple networks?

Override network settings per contract:

```yaml
contracts:
  EthereumToken:
    address: "${ETH_ADDRESS}"
    network:
      rpc_url: "${ETH_RPC_URL}"
      chain_id: 1
  
  PolygonToken:
    address: "${POLYGON_ADDRESS}"
    network:
      rpc_url: "${POLYGON_RPC_URL}"
      chain_id: 137
```

---

## Verification

### What can Nodrift verify?

- Contract ownership
- Role memberships (AccessControl)
- State variables
- Function return values
- Storage slots
- Proxy implementations
- Array/mapping state
- Cross-contract values
- And more...

See [State Types](state-types.md) for complete list.

### How do I handle expected variations?

Use comparison options:

```yaml
# Numeric tolerance
- type: function_call
  function: totalSupply
  value: "1000000"
  options:
    tolerance: "5%"

# Case-insensitive strings
- type: function_call
  function: symbol
  value: "TOKEN"
  options:
    ignore_case: true

# Order-insensitive arrays
- type: array_state
  name: whitelist
  checks:
    exact: ["0x123...", "0x456..."]
  options:
    ignore_order: true
```

### Can I verify proxy contracts?

Yes, use the `proxy` preset or `storage_slot` type:

```yaml
contracts:
  MyProxy:
    preset: proxy
    address: "${PROXY_ADDRESS}"
    state:
      - type: proxy
        value:
          implementation: "${IMPLEMENTATION_ADDRESS}"
          admin: "${ADMIN_ADDRESS}"
```

### Can I verify contracts without deploying?

No, Nodrift verifies deployed contracts by reading on-chain state. For pre-deployment verification, use other tools like Slither or Mythril.

---

## CI/CD Integration

### Which CI/CD platforms are supported?

All major platforms:
- GitHub Actions
- GitLab CI
- Jenkins
- CircleCI
- Azure Pipelines
- And more...

See [CI/CD Integration](ci-cd-integration.md) for examples.

### How do I fail the pipeline on drift?

Use the `--fail-on-drift` flag:

```bash
nodrift config.yaml --fail-on-drift
```

This exits with code 1 if drift is detected.

### How do I generate test reports?

Use JUnit XML output:

```bash
nodrift config.yaml --output junit --junit-file results.xml
```

Most CI/CD platforms can parse JUnit XML for test reporting.

### Can I run verification on a schedule?

Yes, configure scheduled runs in your CI/CD platform:

```yaml
# GitHub Actions
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
```

---

## Performance

### How fast is Nodrift?

Depends on:
- Number of checks
- RPC provider speed
- Network latency
- Contract complexity

Typical verification: 2-10 seconds for 10-20 checks.

### Can I speed up verification?

Yes:
- Use faster RPC provider
- Reduce timeout
- Minimize number of checks
- Use parallel execution for multiple networks

### Does Nodrift cache results?

No, Nodrift always reads fresh state from the blockchain. This ensures accuracy.

---

## Troubleshooting

### Why am I getting "Network timeout"?

Increase timeout in configuration:

```yaml
network:
  timeout: 60000  # 60 seconds
```

Or use a faster RPC provider.

### Why am I getting "Rate limit exceeded"?

You're hitting RPC rate limits. Solutions:
- Use paid RPC provider
- Increase retry delay
- Reduce number of checks

### Why is drift detected when values look correct?

Check value format:
- Addresses should be checksummed
- Numbers should be strings
- Use comparison options (tolerance, ignore_case, etc.)

See [Troubleshooting](troubleshooting.md) for more solutions.

---

## Security

### Is it safe to use Nodrift?

Yes, Nodrift only reads blockchain state. It never:
- Sends transactions
- Requires private keys
- Modifies contract state
- Stores sensitive data

### Should I commit my configuration file?

Yes, but use environment variables for sensitive values:

```yaml
#  Safe to commit
network:
  rpc_url: "${RPC_URL}"  # Environment variable

#  Don't commit
network:
  rpc_url: "https://eth-mainnet.g.alchemy.com/v2/secret_key"
```

### Can Nodrift access my private keys?

No, Nodrift doesn't need or use private keys. It only reads public blockchain state.

---

## Advanced Usage

### Can I use Nodrift programmatically?

Yes, Nodrift provides a Node.js API:

```typescript
import { Nodrift, loadConfig } from 'nodrift';

const config = await loadConfig('./config.yaml');
const nodrift = new Nodrift(config);
const result = await nodrift.run();
```

See [API Reference](api-reference.md) for details.

### Can I create custom presets?

Yes, define custom presets in your configuration:

```yaml
presets:
  MyCustomPreset:
    abi:
      - "function owner() view returns (address)"

contracts:
  MyContract:
    preset: MyCustomPreset
    address: "${ADDRESS}"
    state:
      - type: owner
        value: "${OWNER}"
```

### Can I verify contracts on testnets?

Yes, just use the testnet RPC URL and chain ID:

```yaml
network:
  rpc_url: "${GOERLI_RPC_URL}"
  chain_id: 5  # Goerli
```

### Can I verify contracts on L2s?

Yes, Nodrift supports all EVM-compatible chains:
- Polygon
- Arbitrum
- Optimism
- BSC
- Avalanche
- And more...

---

## Comparison with Other Tools

### Nodrift vs Hardhat Verify

- **Hardhat Verify**: Verifies source code on Etherscan
- **Nodrift**: Verifies on-chain state matches configuration

They serve different purposes and can be used together.

### Nodrift vs Tenderly

- **Tenderly**: Monitoring, debugging, and alerting platform
- **Nodrift**: Configuration verification tool

Tenderly is broader; Nodrift is focused on configuration drift detection.

### Nodrift vs Slither

- **Slither**: Static analysis for security vulnerabilities
- **Nodrift**: Runtime state verification

Slither analyzes code; Nodrift verifies deployed state.

---

## Contributing

### How can I contribute?

- Report bugs
- Suggest features
- Improve documentation
- Submit pull requests

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

### How do I report a bug?

[Create an issue](https://github.com/your-org/nodrift/issues/new) with:
- Nodrift version
- Node.js version
- Configuration file (sanitized)
- Error message
- Steps to reproduce

### Can I request a feature?

Yes! [Open a discussion](https://github.com/your-org/nodrift/discussions) or create a feature request issue.

---

## License

### What license does Nodrift use?

MIT License - free for commercial and personal use.

### Can I use Nodrift in commercial projects?

Yes, the MIT license allows commercial use.