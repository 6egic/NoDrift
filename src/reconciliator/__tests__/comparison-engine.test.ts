/** Tests for Comparison Engine */

import { compareValues, type ComparisonOptions } from '../comparison-engine';

describe('ComparisonEngine', () => {
  describe('compareValues', () => {
    it('should compare exact string values', () => {
      expect(compareValues('test', 'test')).toBe(true);
      expect(compareValues('test', 'different')).toBe(false);
    });

    it('should compare addresses case-insensitively', () => {
      const addr1 = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const addr2 = '0x742D35CC6634C0532925A3B844BC9E7595F0BEB';
      expect(compareValues(addr1, addr2)).toBe(true);
    });

    it('should handle case-insensitive string comparison', () => {
      const options: ComparisonOptions = { ignore_case: true };
      expect(compareValues('TEST', 'test', options)).toBe(true);
      expect(compareValues('TEST', 'test')).toBe(false);
    });

    it('should handle pattern matching', () => {
      const options: ComparisonOptions = { pattern: '^TOKEN.*' };
      expect(compareValues('TOKEN-V2', 'TOKEN', options)).toBe(true);
      expect(compareValues('COIN', 'TOKEN', options)).toBe(false);
    });

    it('should handle pattern matching with ignore_case', () => {
      const options: ComparisonOptions = { pattern: '^token.*', ignore_case: true };
      expect(compareValues('TOKEN-V2', 'token', options)).toBe(true);
    });

    it('should handle numeric tolerance (percentage)', () => {
      const options: ComparisonOptions = { tolerance: '10%' };
      expect(compareValues(1050, 1000, options)).toBe(true);
      expect(compareValues(1100, 1000, options)).toBe(true);
      expect(compareValues(1200, 1000, options)).toBe(false);
    });

    it('should handle numeric tolerance (absolute)', () => {
      const options: ComparisonOptions = { tolerance: 50 };
      expect(compareValues(1050, 1000, options)).toBe(true);
      expect(compareValues(950, 1000, options)).toBe(true);
      expect(compareValues(1100, 1000, options)).toBe(false);
    });

    it('should handle range comparison', () => {
      const options: ComparisonOptions = { range: { min: 900, max: 1100 } };
      expect(compareValues(1000, 1000, options)).toBe(true);
      expect(compareValues(1050, 1000, options)).toBe(true);
      expect(compareValues(1200, 1000, options)).toBe(false);
      expect(compareValues(800, 1000, options)).toBe(false);
    });

    it('should handle boolean values', () => {
      expect(compareValues(true, true)).toBe(true);
      expect(compareValues(false, false)).toBe(true);
      expect(compareValues(true, false)).toBe(false);
      expect(compareValues('true', true)).toBe(true);
      expect(compareValues('false', false)).toBe(true);
    });

    it('should handle null and undefined', () => {
      expect(compareValues(null, null)).toBe(true);
      expect(compareValues(undefined, undefined)).toBe(true);
      expect(compareValues(null, 'value')).toBe(false);
      expect(compareValues(undefined, 'value')).toBe(false);
    });

    it('should handle empty values with allow_empty option', () => {
      const options: ComparisonOptions = { allow_empty: true };
      expect(compareValues('', 'expected', options)).toBe(true);
      expect(compareValues([], 'expected', options)).toBe(true);
      expect(compareValues('', 'expected')).toBe(false);
    });

    it('should handle array comparison', () => {
      expect(compareValues([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(compareValues([1, 2, 3], [3, 2, 1])).toBe(false);
    });

    it('should handle array comparison with ignore_order', () => {
      const options: ComparisonOptions = { ignore_order: true };
      expect(compareValues([1, 2, 3], [3, 2, 1], options)).toBe(true);
      expect(compareValues([1, 2, 3], [1, 2, 4], options)).toBe(false);
    });

    it('should handle BigInt values', () => {
      expect(compareValues(BigInt(1000), BigInt(1000))).toBe(true);
      expect(compareValues(BigInt(1000), BigInt(2000))).toBe(false);
    });

    it('should handle string representations of numbers', () => {
      expect(compareValues('1000', 1000)).toBe(true);
      expect(compareValues('1000', '1000')).toBe(true);
      expect(compareValues('1000', 2000)).toBe(false);
    });

    it('should handle object comparison', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 2 };
      const obj3 = { a: 1, b: 3 };
      
      expect(compareValues(obj1, obj2)).toBe(true);
      expect(compareValues(obj1, obj3)).toBe(false);
    });

    it('should handle invalid regex patterns gracefully', () => {
      const options: ComparisonOptions = { pattern: '[invalid(' };
      // Should fall back to direct comparison
      expect(compareValues('test', 'test', options)).toBe(true);
    });
  });
});
