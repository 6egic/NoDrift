/** Nodrift - Dual-State Contract Verification (Enterprise Edition). */

export const VERSION = '2.0.0';

// Core exports
export * from './common/exceptions';
export * from './common/logger';
export * from './common/utils';
export * from './common/result-type';
export * from './config/schema';
export * from './config/plugin-config';
export * from './chain-reader';
export * from './reconciliator/index';
export { Diff } from './reconciliator/diff';

// Core
export { Nodrift, runFromFile } from './core';
export type { VerificationResult } from './core';

// Infrastructure exports
export * from './infrastructure/events/event-bus';
export * from './infrastructure/events/domain-events';
export * from './infrastructure/plugins/plugin-system';
export * from './infrastructure/repositories/verification-repository';
export * from './infrastructure/ports/blockchain-provider.port';
export * from './infrastructure/adapters/ethers-provider.adapter';

// Pattern exports
export * from './patterns/dependency-graph';
export * from './patterns/ddd';
export * from './common/worker-pool';
export * from './common/di-container';
