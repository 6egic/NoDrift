# Nodrift Test Suite

Comprehensive test suite for the Nodrift smart contract state verification tool.

## Test Structure

```
tests/
├── setup.ts                    # Global test setup and configuration
├── helpers/
│   └── mocks.ts               # Mock utilities and test helpers
├── integration/               # Integration tests
│   └── core.integration.test.ts
└── e2e/                       # End-to-end tests
    └── cli.e2e.test.ts

src/
├── common/__tests__/          # Unit tests for common utilities
│   └── result-type.test.ts
├── patterns/__tests__/        # Unit tests for DDD patterns
│   └── ddd.test.ts
├── infrastructure/events/__tests__/  # Unit tests for event bus
│   └── event-bus.test.ts
└── reconciliator/__tests__/   # Unit tests for reconciliator
    └── comparison-engine.test.ts
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### E2E Tests Only
```bash
npm run test:e2e
```

### CI Mode
```bash
npm run test:ci
```

## Test Categories

### Unit Tests
- **Location**: `src/**/__tests__/*.test.ts`
- **Purpose**: Test individual functions, classes, and modules in isolation
- **Examples**:
  - Result type monad operations
  - DDD value objects and entities
  - Event bus functionality
  - Comparison engine logic

### Integration Tests
- **Location**: `tests/integration/*.test.ts`
- **Purpose**: Test interactions between multiple components
- **Examples**:
  - Core orchestration with chain readers and reconciliators
  - Plugin system integration
  - Event flow across components

### E2E Tests
- **Location**: `tests/e2e/*.test.ts`
- **Purpose**: Test complete user workflows through the CLI
- **Examples**:
  - CLI command execution
  - Configuration file validation
  - Full verification workflows

## Coverage Goals

- **Overall**: 70%+
- **Critical Paths**: 90%+
- **Branches**: 70%+
- **Functions**: 70%+
- **Lines**: 70%+

## Writing Tests

### Unit Test Example
```typescript
import { compareValues } from '../comparison-engine';

describe('ComparisonEngine', () => {
  it('should compare exact values', () => {
    expect(compareValues('test', 'test')).toBe(true);
    expect(compareValues('test', 'different')).toBe(false);
  });
});
```

### Integration Test Example
```typescript
import { Nodrift } from '../../src/core';
import { createMockConfig } from '../helpers/mocks';

describe('Core Integration', () => {
  it('should verify contracts', async () => {
    const config = createMockConfig();
    const nodrift = new Nodrift(config);
    const result = await nodrift.run();
    
    expect(result.ok).toBe(true);
  });
});
```

### E2E Test Example
```typescript
import { execSync } from 'child_process';

describe('CLI E2E', () => {
  it('should validate config', () => {
    const output = execSync('node dist/cli.js validate config.yaml');
    expect(output.toString()).toContain('valid');
  });
});
```

## Mocking

### Provider Mocking
```typescript
import { createMockProvider } from '../helpers/mocks';

const provider = createMockProvider();
provider.getBlockNumber.mockResolvedValue(12345678);
```

### Contract Mocking
```typescript
import { createMockContract } from '../helpers/mocks';

const contract = createMockContract('0x123...');
contract.owner.mockResolvedValue('0x742...');
```

### Configuration Mocking
```typescript
import { createMockConfig } from '../helpers/mocks';

const config = createMockConfig();
config.contracts.TestToken.state.push({
  type: 'owner',
  expected: '0x742...',
});
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Clarity**: Test names should clearly describe what is being tested
3. **Arrange-Act-Assert**: Follow the AAA pattern for test structure
4. **Mocking**: Mock external dependencies (RPC calls, file system, etc.)
5. **Coverage**: Aim for high coverage but focus on critical paths
6. **Performance**: Keep tests fast (< 100ms for unit tests)
7. **Cleanup**: Always clean up resources in `afterEach` hooks

## Continuous Integration

Tests run automatically on:
- Every commit (via pre-commit hook)
- Pull requests (via GitHub Actions)
- Before publishing (via `prepublishOnly` script)

## Debugging Tests

### Run Single Test File
```bash
npm test -- src/common/__tests__/result-type.test.ts
```

### Run Single Test
```bash
npm test -- -t "should compare exact values"
```

### Debug with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Verbose Output
```bash
npm test -- --verbose
```

## Troubleshooting

### Tests Failing After Changes
1. Run `npm run type-check` to check for TypeScript errors
2. Run `npm run lint` to check for linting issues
3. Clear Jest cache: `npx jest --clearCache`
4. Rebuild: `npm run build`

### Coverage Not Updating
1. Delete coverage directory: `rm -rf coverage`
2. Run tests with coverage: `npm run test:coverage`

### E2E Tests Failing
1. Ensure project is built: `npm run build`
2. Check that CLI is executable: `node dist/cli.js --version`
3. Verify test fixtures are created correctly

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass: `npm test`
3. Check coverage: `npm run test:coverage`
4. Update this README if adding new test categories
