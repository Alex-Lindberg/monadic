import { Either, MatchCondition, MatchOptions, NamedMonad, RetryOptions, FoldResult, ErrorType, HttpError } from "./util";
export declare class Monad<T, E = Error> {
    private value;
    /**
     * @param value The value
     */
    constructor(value: Promise<Either<T, E>>);
    /**
     * Creates a new monad containing the value
     *
     * @param value The value
     * @param error The error
     * @returns {Monad<T, E>} A monad containing the value
     *
     * @template T The type of the value
     * @template E The type of the error
     * @example
     * const monad = Monad.of(1); // monad contains 1
     * const monad = Monad.of(1, new Error("Something went wrong")); // monad contains an error
     *
     */
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
     * Creates a new promise that resolves to the value of the monad
     *
     * @returns {Promise<T>} A promise that resolves to the value of the monad
     * @example
     * const monad = Monad.of(1);
     * const value = await monad.toPromise(); // value === 1
     */
    toPromise(): Promise<T>;
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
    /**
     * Maps the value of the monad to a new value. If the value is a promise, it will be awaited.
     * If the value is a failure, the failure will be propagated. If the mapping function throws an error,
     * the error will be propagated as a failure.
     *
     * @param fn The mapping function
     * @returns {Monad<U, E>} A monad containing the mapped value
     *
     * @template U The type of the mapped value
     * @example
     * const monad = Monad.of(1);
     * const mappedMonad = monad.map(value => value + 1); // mappedMonad contains 2
     * const monad = Monad.fail(new Error("Something went wrong"));
     * const mappedMonad = monad.map(value => value + 1); // mappedMonad contains an error
     */
    map<U>(fn: (value: T) => U): Monad<U, E>;
    /**
     * Works the same as map, but the mapping function can return a monad. If the mapping function returns a promise,
     * it will be awaited. If the mapping function throws an error, the error will be propagated as a failure.
     * @see map
     *
     * @param fn The mapping function
     * @returns {Monad<U, E>} A monad containing the mapped value
     *
     * @template U The type of the mapped value
     * @example
     * const monad = Monad.of(1);
     * const mappedMonad = monad.flatMap(value => Monad.of(value + 1)); // mappedMonad contains 2
     * const monad = Monad.fail(new Error("Something went wrong"));
     * const mappedMonad = monad.flatMap(value => Monad.of(value + 1)); // mappedMonad contains an error
     * const monad = Monad.of(1);
     * const mappedMonad = monad.flatMap(value => Monad.fail(new Error("Something went wrong"))); // mappedMonad contains an error
     */
    flatMap<U>(fn: (value: T) => U | Promise<U> | Monad<U, E>): Monad<U, E>;
    /**
     * Returns the value of the monad if it is a success, otherwise returns the alternative value.
     *
     * @param fn The function that returns the alternative value
     * @returns {Monad<T, E>} A monad containing the value
     *
     * @template U The type of the alternative value
     * @example
     * const monad = Monad.of(1);
     * const value = monad.recover(() => 2); // value === 1
     * const monad = Monad.fail(new Error("Something went wrong"));
     * const value = monad.recover(error => 1); // value === 1
     */
    recover(fn: (error: E) => T): Monad<T, E>;
    /**
     * Returns the value of the monad if it is a success, otherwise returns the alternative value or monad.
     * Works similarly to recover, but the alternative value can be a monad.
     *
     * @param alternative The alternative value or monad
     * @returns {Monad<T, E>} A monad containing the value
     *
     * @template U The type of the alternative value
     * @example
     * const monad = Monad.of(1);
     * const value = monad.orElse(2); // value === 1
     * const monad = Monad.fail(new Error("Something went wrong"));
     * const value = monad.orElse(2); // value === 2
     */
    orElse(alternative: Monad<T, E> | ((error: E) => Monad<T, E>)): Monad<T, E>;
    /**
     * Matches a value against a set of conditions. If a condition matches, the action is executed and the result is returned.
     * If no condition matches, the monad is returned. If continueIfNoMatch is true, the monad is returned if no condition matches.
     * If continueOnError is true, the monad is returned if an error occurs during the execution of an action.
     *
     * @param conditions An array of conditions or a single condition, @see MatchCondition
     * @param options @see MatchOptions
     *  - continueIfNoMatch: @default false
     *  - mode: @default MatchMode.FIRST
     *  - continueOnError: @default false
     * @returns {Monad<T, E>} A monad containing the result of the action
     *
     * @example
     * const monad = Monad.of(1);
     * const matchedMonad = monad.match([
     *  { condition: value => value === 1, action: value => value + 1 },
     *  { condition: value => value === 2, action: value => value + 2 },
     * ]); // matchedMonad contains 2
     */
    match(conditions: MatchCondition<T, E>[] | MatchCondition<T, E>, options?: MatchOptions): Monad<T, E>;
    /**
     * Filters the value of the monad. If the value is a promise, it will be awaited.
     *
     * @param predicate The predicate function, @see Array.filter
     * @param errorFn A function that returns the error to use if the predicate returns false
     * @returns {Monad<T, E>} A monad containing the filtered value
     *
     * @template E2 The type of the error
     * @example
     * const monad = Monad.of(1);
     * const filteredMonad = monad.filter(value => value === 1); // filteredMonad contains 1
     * const monad = Monad.of(1);
     * const filteredMonad = monad.filter(value => value === 2); // filteredMonad contains an error
     * const monad = Monad.fail(new Error("Something went wrong"));
     * const filteredMonad = monad.filter(value => value === 1); // filteredMonad contains an error
     */
    filter<E2 = E>(predicate: (value: T) => boolean | Promise<boolean>, errorFn?: (value: T) => E2): Monad<T, E | E2>;
    /**
     * Returns the value of the input monad if it is a success, otherwise throws the error.
     * Used to allow side effects outside of the monad.
     * The returned monad will contain the same value as the input monad.
     *
     * @param fn The function to execute
     * @returns {Monad<T, E>} A monad containing the value
     *
     * @template E2 The type of the error
     * @example
     * const monad = Monad.of(1);
     * const value = monad.tap(value => console.log(value)); // value === 1
     * const monad = Monad.fail(new Error("Something went wrong"));
     * const value = monad.tap(value => console.log(value)); // value === an error
     */
    tap(fn: (value: T) => T | void | Promise<void>): Monad<T, E>;
    /**
     * Fold the value of the monad into a new value. If the value is a promise, it will be awaited.
     * If the value is a failure, the error will be propagated. If the mapping function throws an error,
     *
     * @param onSuccess The function to execute if the monad is a success
     * @param onFailure The function to execute if the monad is a failure
     * @returns {Promise<FoldResult<U>>} A promise that resolves to the result of the fold operation, @see FoldResult
     *
     * @template U The type of the result
     * @example
     * const monad = Monad.of(1);
     * const result = await monad.fold(value => value + 1, error => error.message); // result === 2
     * const monad = Monad.fail(new Error("Something went wrong"));
     * const result = await monad.fold(value => value + 1, error => error.message); // result === "Something went wrong"
     */
    fold<U>(onSuccess: (value: T) => U, onFailure: (error: E) => U): Promise<FoldResult<U>>;
    /**
     * Logs the value of the monad to the console. If the value is a promise, it will be awaited.
     * If the value is a failure, the error will be propagated. If the mapping function throws an error,
     *
     * @param logger The logger to use, @default console
     * @param transformer A function that transforms the value of the monad into a log message, @default either => either.isSuccess() ? `Success: ${either.value}` : `Error: ${either.error}`
     * @returns {Monad<T, E>} A monad containing the value
     *
     * @template L The type of the logger
     * @example
     * const monad = Monad.of(1);
     * const value = await monad.log(); // value === 1
     * const monad = Monad.fail(new Error("Something went wrong"));
     * const value = await monad.log(); // value === an error
     */
    log<L = Console>(logger?: L, transformer?: (either: Either<T, E>) => any): Monad<T, E>;
    /**
     * Handles specific errors. If the value is a promise, it will be awaited.
     *
     * @param errorTypes An array of error types to handle
     * @param handler A function that returns a monad
     * @returns {Monad<T, E>} A monad containing the value
     *
     * @example
     * const monad = Monad.of(1);
     * const value = await monad.handleSpecificErrors([Error], error => Monad.of(2)); // value === 1
     */
    handleSpecificErrors(errorTypes: ErrorType[], handler: (error: E) => Monad<T, E>): Monad<T, E>;
    /**
     * Handles http errors. If the value is a promise, it will be awaited.
     *
     * @param statusCodes An array of status codes to handle
     * @param handler A function that returns a monad
     * @returns {Monad<T, E>} A monad containing the value
     *
     * @example
     * const monad = Monad.of(1);
     * const value = await monad.handleHttpErrors([404], error => Monad.of(2)); // value === 1
     */
    handleHttpErrors(statusCodes: number[], handler: (error: HttpError) => Monad<T, E>): Monad<T, E>;
    /**
     * Returns the value of the monad
     * @returns {Promise<Either<T, E>>} A promise that resolves to the value of the monad
     * @example
     * const monad = Monad.of(1);
     * const value = await monad.yield(); // value === 1
     */
    yield(): Promise<Either<T, E>>;
}
//# sourceMappingURL=monad.d.ts.map