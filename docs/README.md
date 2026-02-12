# Nodrift Documentation

Complete documentation for Nodrift - Smart Contract State Verification.

##  Documentation Index

### Getting Started

- **[Getting Started](getting-started.md)** - Installation, first verification, and basic usage
  - Prerequisites
  - Installation options
  - Your first verification
  - Understanding output
  - Common options

### Core Documentation

- **[Configuration Guide](configuration.md)** - Complete configuration reference
  - Configuration structure
  - Network settings
  - Contract definitions
  - State verification
  - Imports and templates
  - Environment variables
  - Best practices

- **[State Types](state-types.md)** - All verification types
  - Basic types (Owner, Role, Variable, Function Call)
  - Advanced types (Storage Slot, Proxy)
  - Complex types (Array, Mapping, Cross-Contract, Aggregate, Conditional, Comparison, Time-Based)
  - Type combinations

- **[Comparison Options](comparison-options.md)** - Flexible value matching
  - Numeric comparisons (tolerance, range)
  - String comparisons (case-insensitive, pattern matching)
  - Array comparisons (order-insensitive)
  - Object comparisons (partial match)
  - Common options

- **[Presets](presets.md)** - Built-in contract presets
  - ERC20, ERC721, ERC1155, ERC4626
  - Diamond, Proxy, AccessControl
  - Custom presets
  - Usage examples

### Integration

- **[CI/CD Integration](ci-cd-integration.md)** - Pipeline integration
  - GitHub Actions
  - GitLab CI
  - Jenkins
  - CircleCI
  - Azure Pipelines
  - Best practices

- **[API Reference](api-reference.md)** - Programmatic usage
  - Core API
  - Configuration loading
  - Verification
  - Output formatting
  - Error handling
  - TypeScript support

### Help & Support

- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions
  - Installation issues
  - Configuration errors
  - Network errors
  - Contract errors
  - Verification issues
  - Performance issues
  - CI/CD issues

- **[FAQ](faq.md)** - Frequently asked questions
  - General questions
  - Installation & setup
  - Configuration
  - Verification
  - CI/CD integration
  - Performance
  - Security
  - Advanced usage

- **[Changelog](changelog.md)** - Version history and release notes
  - Latest changes
  - Version history
  - Upgrade guides
  - Breaking changes

---

##  Quick Links

### For Beginners

1. Start with [Getting Started](getting-started.md)
2. Read [Configuration Guide](configuration.md)
3. Explore [Examples](../examples/)

### For Advanced Users

1. Review [State Types](state-types.md)
2. Learn [Comparison Options](comparison-options.md)
3. Check [API Reference](api-reference.md)

### For CI/CD Integration

1. Read [CI/CD Integration](ci-cd-integration.md)
2. Use provided templates
3. Configure secrets/variables

### For Troubleshooting

1. Check [Troubleshooting](troubleshooting.md)
2. Review [FAQ](faq.md)
3. Search [GitHub Issues](https://github.com/your-org/nodrift/issues)

---

##  Documentation by Topic

### Installation

- [Getting Started - Installation](getting-started.md#installation)
- [Troubleshooting - Installation Issues](troubleshooting.md#installation-issues)
- [FAQ - Installation & Setup](faq.md#installation--setup)

### Configuration

- [Configuration Guide](configuration.md)
- [Getting Started - Configuration](getting-started.md#step-1-create-configuration-file)
- [Troubleshooting - Configuration Errors](troubleshooting.md#configuration-errors)
- [FAQ - Configuration](faq.md#configuration)

### Verification

- [State Types](state-types.md)
- [Comparison Options](comparison-options.md)
- [Presets](presets.md)
- [FAQ - Verification](faq.md#verification)

### CI/CD

- [CI/CD Integration](ci-cd-integration.md)
- [FAQ - CI/CD Integration](faq.md#cicd-integration)
- [Troubleshooting - CI/CD Issues](troubleshooting.md#cicd-issues)

### API

- [API Reference](api-reference.md)
- [FAQ - Advanced Usage](faq.md#advanced-usage)

---

##  Use Case Guides

### Continuous Verification

Verify contracts in CI/CD pipelines after deployments:

1. [CI/CD Integration](ci-cd-integration.md)
2. [Configuration - Best Practices](configuration.md#best-practices)
3. [Examples - Protocol Examples](../examples/protocol-examples/)

### Audit & Compliance

Generate verification reports for audits:

1. [Getting Started - Output Formats](getting-started.md#output-formats)
2. [Configuration Guide](configuration.md)
3. [State Types](state-types.md)

### Drift Detection

Detect unauthorized changes to contract state:

1. [Getting Started](getting-started.md)
2. [Comparison Options](comparison-options.md)
3. [CI/CD Integration - Scheduled Verification](ci-cd-integration.md#scheduled-verification)

### Multi-Chain Monitoring

Monitor contracts across multiple networks:

1. [Configuration - Multi-Network](configuration.md#multi-network-verification)
2. [Examples - Multi-Network Example](../examples/feature-examples/)
3. [CI/CD Integration - Matrix Strategy](ci-cd-integration.md#advanced-workflow-with-matrix)

---

##  External Resources

### Project Links

- [GitHub Repository](https://github.com/your-org/nodrift)
- [npm Package](https://www.npmjs.com/package/nodrift)
- [Issue Tracker](https://github.com/your-org/nodrift/issues)
- [Discussions](https://github.com/your-org/nodrift/discussions)

### Related Documentation

- [Architecture](../ARCHITECTURE.md) - System design and internals
- [Contributing](../CONTRIBUTING.md) - Development guide
- [License](../LICENSE) - MIT License
- [Examples](../examples/) - Working examples
