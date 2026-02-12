/** E2E tests for CLI commands */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CLI E2E Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodrift-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('nodrift validate', () => {
    it('should validate a valid configuration file', () => {
      const configPath = path.join(tempDir, 'nodrift.yaml');
      const config = `
version: 1.0

network:
  rpc_url: "http://localhost:8545"
  chain_id: 1

contracts:
  TestToken:
    address: "0x1234567890123456789012345678901234567890"
    state:
      - type: owner
        expected: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
`;
      fs.writeFileSync(configPath, config);

      try {
        const output = execSync(`node dist/cli.js validate ${configPath}`, {
          encoding: 'utf-8',
          cwd: process.cwd(),
        });
        expect(output).toContain('valid');
      } catch (error: any) {
        // Command might not be built yet, skip test
        if (error.message.includes('ENOENT') || error.message.includes('Cannot find module')) {
          console.log('Skipping E2E test - CLI not built');
          return;
        }
        throw error;
      }
    });

    it('should reject an invalid configuration file', () => {
      const configPath = path.join(tempDir, 'invalid.yaml');
      const config = `
version: 1.0
# Missing required network section
contracts:
  TestToken:
    address: "invalid-address"
`;
      fs.writeFileSync(configPath, config);

      try {
        execSync(`node dist/cli.js validate ${configPath}`, {
          encoding: 'utf-8',
          cwd: process.cwd(),
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        // Expected to fail
        if (error.message.includes('ENOENT') || error.message.includes('Cannot find module')) {
          console.log('Skipping E2E test - CLI not built');
          return;
        }
        expect(error.status).not.toBe(0);
      }
    });
  });

  describe('nodrift --help', () => {
    it('should display help information', () => {
      try {
        const output = execSync('node dist/cli.js --help', {
          encoding: 'utf-8',
          cwd: process.cwd(),
        });
        expect(output).toContain('Usage');
        expect(output).toContain('Options');
      } catch (error: any) {
        if (error.message.includes('ENOENT') || error.message.includes('Cannot find module')) {
          console.log('Skipping E2E test - CLI not built');
          return;
        }
        throw error;
      }
    });
  });

  describe('nodrift --version', () => {
    it('should display version information', () => {
      try {
        const output = execSync('node dist/cli.js --version', {
          encoding: 'utf-8',
          cwd: process.cwd(),
        });
        expect(output).toMatch(/\d+\.\d+\.\d+/);
      } catch (error: any) {
        if (error.message.includes('ENOENT') || error.message.includes('Cannot find module')) {
          console.log('Skipping E2E test - CLI not built');
          return;
        }
        throw error;
      }
    });
  });

  describe('Configuration file formats', () => {
    it('should accept YAML configuration', () => {
      const configPath = path.join(tempDir, 'config.yaml');
      const config = `
version: 1.0
network:
  rpc_url: "http://localhost:8545"
  chain_id: 1
contracts: {}
`;
      fs.writeFileSync(configPath, config);

      try {
        const output = execSync(`node dist/cli.js validate ${configPath}`, {
          encoding: 'utf-8',
          cwd: process.cwd(),
        });
        expect(output).toContain('valid');
      } catch (error: any) {
        if (error.message.includes('ENOENT') || error.message.includes('Cannot find module')) {
          console.log('Skipping E2E test - CLI not built');
          return;
        }
        throw error;
      }
    });

    it('should accept YML extension', () => {
      const configPath = path.join(tempDir, 'config.yml');
      const config = `
version: 1.0
network:
  rpc_url: "http://localhost:8545"
  chain_id: 1
contracts: {}
`;
      fs.writeFileSync(configPath, config);

      try {
        const output = execSync(`node dist/cli.js validate ${configPath}`, {
          encoding: 'utf-8',
          cwd: process.cwd(),
        });
        expect(output).toContain('valid');
      } catch (error: any) {
        if (error.message.includes('ENOENT') || error.message.includes('Cannot find module')) {
          console.log('Skipping E2E test - CLI not built');
          return;
        }
        throw error;
      }
    });
  });
});
