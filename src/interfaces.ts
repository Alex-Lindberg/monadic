import { Either, ErrorCriteria, FoldResult, MatchCondition, MatchOptions } from "./types";

/**
 * Interface for core monad functionality
 * @interface IMonad
 *
 * @template T The type of the value
 * @template E The type of the error
 */
export interface IMonad<T, E> {
  map<U>(fn: (value: T) => U): IMonad<U, E>;
  flatMap<U>(fn: (value: T) => IMonad<U, E> | Promise<U>): IMonad<U, E>;
  recover(fn: (error: E) => T): IMonad<T, E>;
  map<U>(fn: (value: T) => U): IMonad<U, E>;
  flatMap<U>(fn: (value: T) => U | Promise<U> | IMonad<U, E>): IMonad<U, E>;
  recover(fn: (error: E) => T): IMonad<T, E>;
  orElse(alternative: IMonad<T, E> | ((error: E) => IMonad<T, E>)): IMonad<T, E>;
  match(conditions: MatchCondition<T, E>[] | MatchCondition<T, E>, options?: MatchOptions): IMonad<T, E>;
  filter<E2 = E>(predicate: (value: T) => boolean | Promise<boolean>, errorFn?: (value: T) => E2): IMonad<T, E | E2>;
  tap(fn: (value: T) => T | void | Promise<void>): IMonad<T, E>;
  fold<U>(onSuccess: (value: T) => U, onFailure: (error: E) => U): Promise<FoldResult<U>>;
  log<V = String, L = Console>(logger?: L, transformer?: (either: Either<T, E>) => V): IMonad<T, E>;
  handleErrors(criteria: ErrorCriteria, handler: (error: E) => IMonad<T, E>): IMonad<T, E>;
  toPromise(): Promise<T>;
  yield(): Promise<Either<T, E>>;
}
