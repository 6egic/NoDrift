/** Tests for Result type monad */

import {
  Ok,
  Err,
  isOk,
  isErr,
  map,
  mapErr,
  andThen,
  unwrap,
  unwrapOr,
  unwrapOrElse,
  combine,
  combineAll,
  fromPromise,
  tryCatch,
  tryCatchAsync,
  type Result,
} from '../result-type';

describe('Result Type', () => {
  describe('Ok', () => {
    it('should create a successful result', () => {
      const result = Ok(42);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });
  });

  describe('Err', () => {
    it('should create a failed result', () => {
      const error = new Error('test error');
      const result = Err(error);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('isOk', () => {
    it('should return true for Ok result', () => {
      const result = Ok(42);
      expect(isOk(result)).toBe(true);
    });

    it('should return false for Err result', () => {
      const result = Err(new Error('test'));
      expect(isOk(result)).toBe(false);
    });
  });

  describe('isErr', () => {
    it('should return true for Err result', () => {
      const result = Err(new Error('test'));
      expect(isErr(result)).toBe(true);
    });

    it('should return false for Ok result', () => {
      const result = Ok(42);
      expect(isErr(result)).toBe(false);
    });
  });

  describe('map', () => {
    it('should transform Ok value', () => {
      const result = Ok(42);
      const mapped = map(result, x => x * 2);
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.value).toBe(84);
      }
    });

    it('should not transform Err value', () => {
      const error = new Error('test');
      const result = Err(error);
      const mapped = map(result, x => x * 2);
      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error).toBe(error);
      }
    });
  });

  describe('mapErr', () => {
    it('should transform Err value', () => {
      const result: Result<number, string> = Err('error');
      const mapped = mapErr(result, e => new Error(e));
      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error).toBeInstanceOf(Error);
        expect(mapped.error.message).toBe('error');
      }
    });

    it('should not transform Ok value', () => {
      const result: Result<number, string> = Ok(42);
      const mapped = mapErr(result, e => new Error(e));
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.value).toBe(42);
      }
    });
  });

  describe('andThen', () => {
    it('should chain Ok results', () => {
      const result = Ok(42);
      const chained = andThen(result, x => Ok(x * 2));
      expect(isOk(chained)).toBe(true);
      if (isOk(chained)) {
        expect(chained.value).toBe(84);
      }
    });

    it('should short-circuit on Err', () => {
      const error = new Error('test');
      const result = Err(error);
      const chained = andThen(result, x => Ok(x * 2));
      expect(isErr(chained)).toBe(true);
      if (isErr(chained)) {
        expect(chained.error).toBe(error);
      }
    });

    it('should propagate Err from chain', () => {
      const result = Ok(42);
      const error = new Error('chain error');
      const chained = andThen(result, () => Err(error));
      expect(isErr(chained)).toBe(true);
      if (isErr(chained)) {
        expect(chained.error).toBe(error);
      }
    });
  });

  describe('unwrap', () => {
    it('should return value for Ok', () => {
      const result = Ok(42);
      expect(unwrap(result)).toBe(42);
    });

    it('should throw error for Err', () => {
      const error = new Error('test');
      const result = Err(error);
      expect(() => unwrap(result)).toThrow(error);
    });
  });

  describe('unwrapOr', () => {
    it('should return value for Ok', () => {
      const result = Ok(42);
      expect(unwrapOr(result, 0)).toBe(42);
    });

    it('should return default for Err', () => {
      const result = Err(new Error('test'));
      expect(unwrapOr(result, 0)).toBe(0);
    });
  });

  describe('unwrapOrElse', () => {
    it('should return value for Ok', () => {
      const result = Ok(42);
      expect(unwrapOrElse(result, () => 0)).toBe(42);
    });

    it('should compute default for Err', () => {
      const result = Err(new Error('test'));
      expect(unwrapOrElse(result, e => e.message.length)).toBe(4);
    });
  });

  describe('combine', () => {
    it('should combine all Ok results', () => {
      const results = [Ok(1), Ok(2), Ok(3)];
      const combined = combine(results);
      expect(isOk(combined)).toBe(true);
      if (isOk(combined)) {
        expect(combined.value).toEqual([1, 2, 3]);
      }
    });

    it('should return first Err', () => {
      const error = new Error('test');
      const results = [Ok(1), Err(error), Ok(3)];
      const combined = combine(results);
      expect(isErr(combined)).toBe(true);
      if (isErr(combined)) {
        expect(combined.error).toBe(error);
      }
    });
  });

  describe('combineAll', () => {
    it('should combine all Ok results', () => {
      const results = [Ok(1), Ok(2), Ok(3)];
      const combined = combineAll(results);
      expect(isOk(combined)).toBe(true);
      if (isOk(combined)) {
        expect(combined.value).toEqual([1, 2, 3]);
      }
    });

    it('should collect all errors', () => {
      const error1 = new Error('error1');
      const error2 = new Error('error2');
      const results = [Ok(1), Err(error1), Ok(3), Err(error2)];
      const combined = combineAll(results);
      expect(isErr(combined)).toBe(true);
      if (isErr(combined)) {
        expect(combined.error).toEqual([error1, error2]);
      }
    });
  });

  describe('fromPromise', () => {
    it('should convert resolved promise to Ok', async () => {
      const promise = Promise.resolve(42);
      const result = await fromPromise(promise);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    it('should convert rejected promise to Err', async () => {
      const error = new Error('test');
      const promise = Promise.reject(error);
      const result = await fromPromise(promise);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe(error);
      }
    });

    it('should wrap non-Error rejections', async () => {
      const promise = Promise.reject('string error');
      const result = await fromPromise(promise);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('string error');
      }
    });
  });

  describe('tryCatch', () => {
    it('should convert successful function to Ok', () => {
      const result = tryCatch(() => 42);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    it('should convert throwing function to Err', () => {
      const error = new Error('test');
      const result = tryCatch(() => {
        throw error;
      });
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe(error);
      }
    });

    it('should wrap non-Error throws', () => {
      const result = tryCatch(() => {
        throw 'string error';
      });
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('string error');
      }
    });
  });

  describe('tryCatchAsync', () => {
    it('should convert successful async function to Ok', async () => {
      const result = await tryCatchAsync(async () => 42);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    it('should convert throwing async function to Err', async () => {
      const error = new Error('test');
      const result = await tryCatchAsync(async () => {
        throw error;
      });
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe(error);
      }
    });
  });
});
