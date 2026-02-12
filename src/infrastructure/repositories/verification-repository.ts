/** Repository for persisting verification results. */

import * as fs from 'fs';
import * as path from 'path';
import type { VerificationResult } from '../../core';
import type { Diff } from '../../reconciliator/diff';
import { getLogger } from '../../common/logger';

const logger = getLogger();

/**
 * Verification record with metadata.
 */
export interface VerificationRecord {
  id: string;
  sessionId: string;
  timestamp: number;
  configFile: string;
  result: VerificationResult;
  duration?: number;
  success: boolean;
  driftCount: number;
}

/**
 * Repository interface for verification results.
 */
export interface IVerificationRepository {
  /**
   * Save a verification result.
   */
  save(record: VerificationRecord): Promise<void>;

  /**
   * Find verification by ID.
   */
  findById(id: string): Promise<VerificationRecord | null>;

  /**
   * Find all verifications for a config file.
   */
  findByConfigFile(configFile: string): Promise<VerificationRecord[]>;

  /**
   * Find verifications within a time range.
   */
  findByTimeRange(start: Date, end: Date): Promise<VerificationRecord[]>;

  /**
   * Find verifications with drifts.
   */
  findWithDrifts(): Promise<VerificationRecord[]>;

  /**
   * Get verification history for a contract.
   */
  getContractHistory(contractName: string): Promise<VerificationRecord[]>;

  /**
   * Delete old verifications.
   */
  deleteOlderThan(date: Date): Promise<number>;

  /**
   * Get statistics.
   */
  getStats(): Promise<RepositoryStats>;
}

/**
 * Repository statistics.
 */
export interface RepositoryStats {
  totalVerifications: number;
  verificationsWithDrifts: number;
  oldestVerification?: Date;
  newestVerification?: Date;
  averageDuration?: number;
}

/**
 * In-memory implementation of verification repository.
 */
export class InMemoryVerificationRepository implements IVerificationRepository {
  private records = new Map<string, VerificationRecord>();

  async save(record: VerificationRecord): Promise<void> {
    this.records.set(record.id, record);
    logger.debug(`Verification record saved: ${record.id}`);
  }

  async findById(id: string): Promise<VerificationRecord | null> {
    return this.records.get(id) || null;
  }

  async findByConfigFile(configFile: string): Promise<VerificationRecord[]> {
    return Array.from(this.records.values()).filter(
      r => r.configFile === configFile
    );
  }

  async findByTimeRange(start: Date, end: Date): Promise<VerificationRecord[]> {
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    return Array.from(this.records.values()).filter(
      r => r.timestamp >= startTime && r.timestamp <= endTime
    );
  }

  async findWithDrifts(): Promise<VerificationRecord[]> {
    return Array.from(this.records.values()).filter(r => r.driftCount > 0);
  }

  async getContractHistory(contractName: string): Promise<VerificationRecord[]> {
    return Array.from(this.records.values()).filter(r => {
      return Object.keys(r.result.current_states).includes(contractName);
    });
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const cutoff = date.getTime();
    let deleted = 0;

    for (const [id, record] of this.records.entries()) {
      if (record.timestamp < cutoff) {
        this.records.delete(id);
        deleted++;
      }
    }

    return deleted;
  }

  async getStats(): Promise<RepositoryStats> {
    const records = Array.from(this.records.values());
    
    if (records.length === 0) {
      return {
        totalVerifications: 0,
        verificationsWithDrifts: 0,
      };
    }

    const timestamps = records.map(r => r.timestamp);
    const durations = records.filter(r => r.duration).map(r => r.duration!);

    return {
      totalVerifications: records.length,
      verificationsWithDrifts: records.filter(r => r.driftCount > 0).length,
      oldestVerification: new Date(Math.min(...timestamps)),
      newestVerification: new Date(Math.max(...timestamps)),
      averageDuration: durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : undefined,
    };
  }

  /**
   * Clear all records (for testing).
   */
  clear(): void {
    this.records.clear();
  }
}

/**
 * File-based implementation of verification repository.
 * Stores verification results as JSON files.
 */
export class FileVerificationRepository implements IVerificationRepository {
  private storageDir: string;

  constructor(storageDir: string = '.nodrift/history') {
    this.storageDir = storageDir;
    this.ensureStorageDir();
  }

  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private getFilePath(id: string): string {
    return path.join(this.storageDir, `${id}.json`);
  }

  async save(record: VerificationRecord): Promise<void> {
    const filePath = this.getFilePath(record.id);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
    logger.debug(`Verification record saved to file: ${filePath}`);
  }

  async findById(id: string): Promise<VerificationRecord | null> {
    const filePath = this.getFilePath(id);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as VerificationRecord;
    } catch (error) {
      logger.error(`Failed to read verification record ${id}:`, error);
      return null;
    }
  }

  async findByConfigFile(configFile: string): Promise<VerificationRecord[]> {
    const records = await this.loadAllRecords();
    return records.filter(r => r.configFile === configFile);
  }

  async findByTimeRange(start: Date, end: Date): Promise<VerificationRecord[]> {
    const startTime = start.getTime();
    const endTime = end.getTime();
    const records = await this.loadAllRecords();
    
    return records.filter(
      r => r.timestamp >= startTime && r.timestamp <= endTime
    );
  }

  async findWithDrifts(): Promise<VerificationRecord[]> {
    const records = await this.loadAllRecords();
    return records.filter(r => r.driftCount > 0);
  }

  async getContractHistory(contractName: string): Promise<VerificationRecord[]> {
    const records = await this.loadAllRecords();
    return records.filter(r => {
      return Object.keys(r.result.current_states).includes(contractName);
    });
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const cutoff = date.getTime();
    const files = fs.readdirSync(this.storageDir);
    let deleted = 0;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(this.storageDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const record = JSON.parse(content) as VerificationRecord;

        if (record.timestamp < cutoff) {
          fs.unlinkSync(filePath);
          deleted++;
        }
      } catch (error) {
        logger.error(`Failed to process file ${file}:`, error);
      }
    }

    return deleted;
  }

  async getStats(): Promise<RepositoryStats> {
    const records = await this.loadAllRecords();
    
    if (records.length === 0) {
      return {
        totalVerifications: 0,
        verificationsWithDrifts: 0,
      };
    }

    const timestamps = records.map(r => r.timestamp);
    const durations = records.filter(r => r.duration).map(r => r.duration!);

    return {
      totalVerifications: records.length,
      verificationsWithDrifts: records.filter(r => r.driftCount > 0).length,
      oldestVerification: new Date(Math.min(...timestamps)),
      newestVerification: new Date(Math.max(...timestamps)),
      averageDuration: durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : undefined,
    };
  }

  private async loadAllRecords(): Promise<VerificationRecord[]> {
    const files = fs.readdirSync(this.storageDir);
    const records: VerificationRecord[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(this.storageDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const record = JSON.parse(content) as VerificationRecord;
        records.push(record);
      } catch (error) {
        logger.error(`Failed to load record from ${file}:`, error);
      }
    }

    return records;
  }
}
