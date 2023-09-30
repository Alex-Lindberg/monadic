import { Monad } from "./monad";
import { Failure, Success } from "./util";

/**
 * A type representing a value that can be either a success or a failure
 * @type Either
 * @param {T} value The value
 *
 * @template T The type of the value
 * @template E The type of the error
 */
export type Either<T, E> = Success<T, E> | Failure<T, E>;

/**
 * A type representing a match condition
 * @type MatchCondition
 * @param {T} value The value
 *
 * @template T The type of the value
 * @template E The type of the error
 */
export type MatchCondition<T, E> = {
  /**
   * The condition
   *
   * @param value the value
   * @returns {boolean} true if the condition is met
   */
  condition: (value: T) => boolean;
  /**
   * The action to perform if the condition is met
   *
   * @param value the value
   * @returns {T | E | Promise<T | E>} the action
   */
  action: (value: T) => T | E | Promise<T | E>;
};

/**
 * A type representing a match mode
 * @type MatchMode
 * @param {FIRST} FIRST match the first condition
 * @param {EVERY} EVERY match every condition
 */
export enum MatchMode {
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
export type MatchOptions = {
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
export type NamedMonad<T, E = Error> = {
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
export type RetryOptions<E> = {
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
export type FoldResult<U, E = Error> = { result?: U; error?: E };

/**
 * A type representing a set of error criteria.
 * @type ErrorCriteria
 * @param {statusCodes} statusCodes the status codes
 * @param {messages} messages the error messages
 * @param {types} types the error types
 *
 * @template E The type of the error
 */
export type ErrorCriteria = {
  statusCodes?: number[];
  messages?: string[];
  types?: any[]; // Could be refined to specific type unions if needed
};
