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
declare class Success<T, E> {
    value: T;
    constructor(value: T);
    /**
     * Returns true if the value is a success
     *
     * @returns {boolean} true if the value is a success
     */
    isSuccess(): this is Success<T, E>;
    /**
     * Returns false if the value is a success
     *
     * @returns {boolean} true if the value is a success
     */
    isFailure(): this is Failure<T, E>;
}
/**
 * A class representing a failed value
 * @class Failure
 * @param {T} value The value
 *
 * @template T The type of the value
 * @template E The type of the error
 */
declare class Failure<T, E> {
    error: E;
    constructor(error: E);
    /**
     * Returns false if the value is a failure
     *
     * @returns {boolean} true if the value is a failure
     */
    isSuccess(): this is Success<T, E>;
    /**
     * Returns true if the value is a failure
     *
     * @returns {boolean} true if the value is a failure
     */
    isFailure(): this is Failure<T, E>;
}
/**
 * A class containing utility functions
 * @class Util
 */
declare class Util {
    static of<T, E = Error>(value: T, error?: E): Monad<T, E>;
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
    static fromPromise<T, E = Error>(promise: Promise<T>): Monad<T, E>;
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
    static fail<T, E>(error: E): Monad<T, E>;
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
    static zip<T extends any[], E = Error>(monads: NamedMonad<T[number], E>[]): Monad<{
        [key: string]: T[number];
    }, E>;
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
    static zip<T extends any[], E = Error>(...monads: NamedMonad<T[number], E>[]): Monad<{
        [key: string]: T[number];
    }, E>;
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
    static retry<T, E = Error>(operationFn: () => Monad<T, E>, options: RetryOptions<E>): Monad<T, E>;
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
    static timeout<T, E = Error>(operation: (abortSignal?: AbortSignal) => Monad<T, E>, duration: number, timeoutError: E): Monad<T, E>;
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
    static timeExecution<T, E = Error, L = Console>(operation: () => Monad<T, E>, logger: L, transformer?: (duration: number, result: Either<T, E>) => string): Promise<Either<T, E>>;
}
export { Success, Failure, Util };
//# sourceMappingURL=util.d.ts.map