/** Test setup and global configuration */

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

// Global test utilities
global.console = {
  ...console,
  // Suppress console output in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
