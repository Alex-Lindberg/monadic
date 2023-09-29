import { Monad } from "./monad";

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
  isSuccess(): this is Success<T, E> {
    return true;
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
  isSuccess(): this is Success<T, E> {
    return false;
  }
}

/**
 * A type representing a value that can be either a success or a failure
 * @type Either
 * @param {T} value The value
 * 
 * @template T The type of the value
 * @template E The type of the error
 */
type Either<T, E> = Success<T, E> | Failure<T, E>;

/**
 * A type representing a match condition
 * @type MatchCondition
 * @param {T} value The value
 * 
 * @template T The type of the value
 * @template E The type of the error
 */
type MatchCondition<T, E> = {
  condition: (value: T) => boolean;
  action: (value: T) => T | E | Promise<T | E>;
};

/**
 * A type representing a match mode
 * @type MatchMode
 * @param {FIRST} FIRST match the first condition
 * @param {EVERY} EVERY match every condition
 */
enum MatchMode {
  FIRST,
  EVERY,
}

/**
 * A type representing match options
 * @type MatchOptions
 * @param {continueIfNoMatch} continueIfNoMatch continue if no match is found
 * @param {continueOnError} continueOnError continue if an error is thrown
 * @param {mode} mode the match mode
 */
type MatchOptions = {
  continueIfNoMatch?: boolean;
  continueOnError?: boolean;
  mode?: MatchMode;
};

/**
 * A type representing a named monad
 * @type NamedMonad
 * @param {monad} monad the monad
 * @param {name} name the name of the monad
 * 
 * @template T The type of the value
 * @template E The type of the error
 */
type NamedMonad<T, E = Error> = {
  monad: Monad<T, E>;
  name?: string;
};

/**
 * A type representing retry options
 * @type RetryOptions
 * @param {times} times the number of times to retry
 * @param {delay} delay the delay between retries
 * @param {backoffFactor} backoffFactor the backoff factor
 * @param {onError} onError the error handler
 * 
 * @template E The type of the error
 */
type RetryOptions<E> = {
  times: number;
  delay: number;
  backoffFactor?: number;
  onError?: (error: E, attempt: number) => void;
};

/**
 * A type representing a fold result
 * @type FoldResult
 * @param {result} result the result
 * @param {error} error the error
 * 
 * @template U The type of the result
 */
type FoldResult<U, E = Error> = { result?: U; error?: E };

/**
 * A type representing an error type
 * @type ErrorType
 * @param {args} args the error arguments
 */
type ErrorType = new (...args: any[]) => Error;

/**
 * A class representing an HTTP error
 * @class HttpError
 * @param {statusCode} statusCode the status code
 * @param {message} message the error message
 */
class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export {
  Either,
  Success,
  Failure,
  MatchCondition,
  MatchMode,
  MatchOptions,
  NamedMonad,
  RetryOptions,
  FoldResult,
  ErrorType,
  HttpError,
};
