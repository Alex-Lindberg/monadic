import { Either, MatchCondition, MatchOptions, NamedMonad, RetryOptions, FoldResult, ErrorType, HttpError } from "./util";
export declare class Monad<T, E = Error> {
    private value;
    constructor(value: Promise<Either<T, E>>);
    static of<T, E = Error>(value: T, error?: E): Monad<T, E>;
    static fromPromise<T, E = Error>(promise: Promise<T>): Monad<T, E>;
    static fail<T, E>(error: E): Monad<T, E>;
    toPromise(): Promise<T>;
    static zip<T extends any[], E = Error>(monads: NamedMonad<T[number], E>[]): Monad<{
        [key: string]: T[number];
    }, E>;
    static zip<T extends any[], E = Error>(...monads: NamedMonad<T[number], E>[]): Monad<{
        [key: string]: T[number];
    }, E>;
    static retry<T, E = Error>(operationFn: () => Monad<T, E>, options: RetryOptions<E>): Monad<T, E>;
    static timeout<T, E = Error>(operation: (abortSignal?: AbortSignal) => Monad<T, E>, duration: number, timeoutError: E): Monad<T, E>;
    static timeExecution<T, E = Error, L = Console>(operation: () => Monad<T, E>, logger: L, transformer?: (duration: number, result: Either<T, E>) => string): Promise<Either<T, E>>;
    map<U>(fn: (value: T) => U): Monad<U, E>;
    flatMap<U>(fn: (value: T) => U | Promise<U> | Monad<U, E>): Monad<U, E>;
    recover(fn: (error: E) => T): Monad<T, E>;
    orElse(alternative: Monad<T, E> | ((error: E) => Monad<T, E>)): Monad<T, E>;
    match(conditions: MatchCondition<T, E>[] | MatchCondition<T, E>, options?: MatchOptions): Monad<T, E>;
    filter<E2 = E>(predicate: (value: T) => boolean | Promise<boolean>, errorFn?: (value: T) => E2): Monad<T, E | E2>;
    tap(fn: (value: T) => T | void | Promise<void>): Monad<T, E>;
    fold<U>(onSuccess: (value: T) => U, onFailure: (error: E) => U): Promise<FoldResult<U>>;
    log<L = Console>(logger?: L, transformer?: (either: Either<T, E>) => any): Monad<T, E>;
    handleSpecificErrors(errorTypes: ErrorType[], handler: (error: E) => Monad<T, E>): Monad<T, E>;
    handleHttpErrors(statusCodes: number[], handler: (error: HttpError) => Monad<T, E>): Monad<T, E>;
    yield(): Promise<Either<T, E>>;
}
//# sourceMappingURL=monad.d.ts.map