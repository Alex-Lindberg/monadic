import { Monad } from "./monad";
import { Either, NamedMonad, RetryOptions } from "./types";

/**
 * A class representing a successful value
 * @class Success
 * @param {T} value The value
 *
 * @template T The type of the value
 * @template E The type of the error
 */
class Success<T, E> {
  constructor(public value: T) {}
  /**
   * Returns true if the value is a success
   *
   * @returns {boolean} true if the value is a success
   */
  isSuccess(): this is Success<T, E> {
    return true;
  }
  /**
   * Returns false if the value is a success
   *
   * @returns {boolean} true if the value is a success
   */
  isFailure(): this is Failure<T, E> {
    return false;
  }
}

/**
 * A class representing a failed value
 * @class Failure
 * @param {T} value The value
 *
 * @template T The type of the value
 * @template E The type of the error
 */
class Failure<T, E> {
  constructor(public error: E) {}
  /**
   * Returns false if the value is a failure
   *
   * @returns {boolean} true if the value is a failure
   */
  isSuccess(): this is Success<T, E> {
    return false;
  }
  /**
   * Returns true if the value is a failure
   * 
   * @returns {boolean} true if the value is a failure
   */
  isFailure(): this is Failure<T, E> {
    return true;
  }
}

/**
 * A class containing utility functions
 * @class Util
 */
class Util {
  static of<T, E = Error>(value: T, error?: E): Monad<T, E> {
    if (error) {
      return new Monad(Promise.resolve(new Failure(error)));
    }
    return new Monad(Promise.resolve(new Success(value)));
  }

  /**
   * Creates a new monad containing the value
   *
   * @param promise The promise to wrap
   * @returns {Monad<T, E>} A monad containing the value
   *
   * @template T The type of the value
   * @template E The type of the error
   * @example
   * const monad = Monad.fromPromise(Promise.resolve(1)); // monad contains 1
   * const monad = Monad.fromPromise(Promise.reject(new Error("Something went wrong"))); // monad contains an error
   */
  static fromPromise<T, E = Error>(promise: Promise<T>): Monad<T, E> {
    return new Monad<T, E>(
      promise
        .then((value) => new Success(value) as Either<T, E>)
        .catch((error) => new Failure(error as E) as Either<T, E>),
    );
  }

  /**
   * Creates a new monad that resolves to Failure
   *
   * @param error The error
   * @returns {Monad<T, E>} A monad containing the error
   *
   * @template T The type of the value
   * @template E The type of the error
   * @example
   * const monad = Monad.fail(new Error("Something went wrong")); // monad contains an error
   */
  static fail<T, E>(error: E): Monad<T, E> {
    return new Monad(Promise.resolve(new Failure(error)));
  }

  /**
   * Creates a new monad from an array of monads
   *
   * @param monads An array of monads
   * @returns {Monad<T[], E>} A monad containing an array of values
   *
   * @template T The type of the value
   * @template E The type of the error
   * @example
   * const monad1 = Monad.of(1);
   * const monad2 = Monad.of(2);
   * const monad12 = Monad.zip(monad1, monad2); // monad12 contains { 0: 1, 1: 2 }
   */
  static zip<T extends any[], E = Error>(monads: NamedMonad<T[number], E>[]): Monad<{ [key: string]: T[number] }, E>;
  /**
   * Creates a new monad from an array of monads
   *
   * @param monads Multiple arrays of monads
   * @returns {Monad<T[], E>} A monad containing an array of values
   *
   * @template T The type of the value
   * @template E The type of the error
   * @example
   * const monad1 = Monad.of(1);
   * const monad2 = Monad.of(2);
   * const monad123 = Monad.zip([monad1, monad2]); // monad123 contains { 0: 1, 1: 2 }
   */
  static zip<T extends any[], E = Error>(...monads: NamedMonad<T[number], E>[]): Monad<{ [key: string]: T[number] }, E>;
  /**
   * Creates a new monad from multiple values
   *
   * @param monads Either an array of monads or multiple arrays of monads
   * @returns {Monad<T[], E>} A monad containing an array of values
   *
   * @template T The type of the value
   * @template E The type of the error
   * @example
   * const monad123 = Monad.zip(1, 2, 3); // monad123 contains { 0: 1, 1: 2, 2: 3 }
   */
  static zip<T extends any[], E = Error>(...monads: any[]): Monad<{ [key: string]: T[number] }, E> {
    const monadArray = Array.isArray(monads[0]) ? [...monads[0]] : monads;
    return new Monad(
      Promise.all(monadArray.map((m: NamedMonad<T[number], E>) => m.monad.yield())).then((results) => {
        let error: E | null = null;
        const combinedValue = results.reduce(
          (acc, result, i) => {
            const key = monadArray[i].name || `m${i}`;
            if (result.isSuccess()) acc[key] = result.value;
            else if (error === null) error = result.error;
            return acc;
          },
          {} as { [key: string]: T[number] },
        );
        if (error) {
          return new Failure(error);
        }
        return new Success(combinedValue);
      }),
    );
  }

  /**
   * Retries an operation a number of times
   *
   * @param operationFn A function that returns a monad
   * @param options Options for the retry operation, @see RetryOptions
   * @returns {Monad<T, E>} A monad containing the result of the operation
   *
   * @template T The type of the value
   * @template E The type of the error
   * @example
   * const monad = Monad.retry(() => Monad.of(1), { times: 3 }); // monad contains 1
   * const monad = Monad.retry(() => Monad.fail(new Error("Something went wrong")), { times: 3 }); // monad contains an error
   */
  static retry<T, E = Error>(operationFn: () => Monad<T, E>, options: RetryOptions<E>): Monad<T, E> {
    const { times = 1, delay = 1000, backoffFactor = 1, onError } = options;
    const retryOperation = async (retriesLeft: number, currentDelay: number): Promise<Either<T, E>> => {
      const operation = operationFn();
      const result = await operation.yield();
      if (result.isSuccess() || retriesLeft <= 0) return result;
      if (onError && result.error) onError(result.error, times - retriesLeft);
      // Artificially delay the retry
      await new Promise((resolve) => setTimeout(resolve, currentDelay));

      return retryOperation(retriesLeft - 1, currentDelay * backoffFactor);
    };
    return new Monad(retryOperation(times, delay));
  }

  /**
   * Sets a timeout for an operation
   *
   * @param operation A function that returns a monad
   * @param duration  The duration of the timeout in milliseconds
   * @param timeoutError The error to return if the timeout is reached
   * @returns  {Monad<T, E>} A monad containing the result of the operation
   *
   * @template T The type of the value
   * @template E The type of the error
   * @example
   * const monad = Monad.timeout(() => Monad.of(1), 1000, new Error("Timeout")); // monad contains 1
   * const monad = Monad.timeout(() => Monad.fail(new Error("Something went wrong")), 1000, new Error("Timeout")); // monad contains an error
   */
  static timeout<T, E = Error>(
    operation: (abortSignal?: AbortSignal) => Monad<T, E>,
    duration: number,
    timeoutError: E,
  ): Monad<T, E> {
    return new Monad<T, E>(
      new Promise<Either<T, E>>((resolve) => {
        const abortController = new AbortController();
        let isAbortSupported = true;

        const timer = setTimeout(() => {
          if (isAbortSupported) {
            abortController.abort();
          }
          resolve(new Failure(timeoutError));
        }, duration);
        operation(abortController.signal)
          .yield()
          .then((result) => {
            if (result.isSuccess()) {
              clearTimeout(timer);
              resolve(result);
            } else if (result.error instanceof DOMException && result.error.name === "AbortError") {
              isAbortSupported = false;
              // Let the timeout handler take care of this
            } else {
              clearTimeout(timer);
              resolve(result);
            }
          })
          .catch((error) => {
            clearTimeout(timer);
            resolve(new Failure(error));
          });
      }),
    );
  }

  /**
   * Measures the execution time of an operation
   *
   * @param operation  The operation to measure
   * @param logger A logger to log the result of the operation, @default console.log
   * @param transformer A function that transforms the result of the operation into a log message, @default (duration, result) => `Execution took ${duration.toFixed(2)}ms - Error: ${result.error}`
   * @returns {Promise<Either<T, E>>} A promise that resolves to the result of the operation
   *
   * @template T The type of the value
   * @template E The type of the error
   * @template L The type of the logger
   * @example
   * const monad = Monad.timeExecution(() => Monad.of(1)); // monad contains 1
   * const monad = Monad.timeExecution(() => Monad.fail(new Error("Something went wrong"))); // monad contains an error
   */
  static async timeExecution<T, E = Error, L = Console>(
    operation: () => Monad<T, E>,
    logger: L,
    transformer?: (duration: number, result: Either<T, E>) => string,
  ): Promise<Either<T, E>> {
    const startTime = performance.now();
    const result = await operation().yield();
    const endTime = performance.now();
    const duration = endTime - startTime;

    let message = `Execution took ${duration.toFixed(2)}ms`;
    if (transformer) {
      message = transformer(duration, result);
    } else if (!result.isSuccess()) {
      message += ` - Error: ${result.error}`; // Include error information in the log message
    }
    if (logger && typeof (logger as any).log === "function") (logger as any).log(message);
    else console.log(message);
    return result;
  }
}

export {
  Success,
  Failure,
  Util,
};
