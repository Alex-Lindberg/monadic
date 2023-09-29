import { Monad } from "./monad";
declare class Success<T, E> {
    value: T;
    constructor(value: T);
    isSuccess(): this is Success<T, E>;
}
declare class Failure<T, E> {
    error: E;
    constructor(error: E);
    isSuccess(): this is Success<T, E>;
}
type Either<T, E> = Success<T, E> | Failure<T, E>;
type MatchCondition<T, E> = {
    condition: (value: T) => boolean;
    action: (value: T) => T | E | Promise<T | E>;
};
declare enum MatchMode {
    FIRST = 0,
    EVERY = 1
}
type MatchOptions = {
    continueIfNoMatch?: boolean;
    continueOnError?: boolean;
    mode?: MatchMode;
};
type NamedMonad<T, E = Error> = {
    monad: Monad<T, E>;
    name?: string;
};
type RetryOptions<E> = {
    times: number;
    delay: number;
    backoffFactor?: number;
    onError?: (error: E, attempt: number) => void;
};
type FoldResult<U> = {
    result?: U;
    error?: Error;
};
type ErrorType = new (...args: any[]) => Error;
declare class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string);
}
export { Either, Success, Failure, MatchCondition, MatchMode, MatchOptions, NamedMonad, RetryOptions, FoldResult, ErrorType, HttpError, };
//# sourceMappingURL=util.d.ts.map