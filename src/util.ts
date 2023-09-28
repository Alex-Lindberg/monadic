import { Monad } from "./monad";

class Success<T, E> {
  constructor(public value: T) {}
  isSuccess(): this is Success<T, E> {
    return true;
  }
}

class Failure<T, E> {
  constructor(public error: E) {}
  isSuccess(): this is Success<T, E> {
    return false;
  }
}

type Either<T, E> = Success<T, E> | Failure<T, E>;

type MatchCondition<T, E> = {
  condition: (value: T) => boolean;
  action: (value: T) => T | E | Promise<T | E>;
};

enum MatchMode {
  FIRST,
  EVERY,
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

type Cancelable = {
  cancel: (reason?: string) => void;
};

type FoldResult<U> = { result?: U; error?: Error };

export {
  Either,
  Success,
  Failure,
  MatchCondition,
  MatchMode,
  MatchOptions,
  NamedMonad,
  RetryOptions,
  Cancelable,
  FoldResult,
};