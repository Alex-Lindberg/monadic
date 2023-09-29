import {
  Either,
  Failure,
  Success,
  MatchCondition,
  MatchOptions,
  MatchMode,
  NamedMonad,
  RetryOptions,
  FoldResult,
  ErrorType,
  HttpError,
} from "./util";

export class Monad<T, E = Error> {
  constructor(private value: Promise<Either<T, E>>) {}

  // ---- Static methods ----
  static of<T, E = Error>(value: T, error?: E): Monad<T, E> {
    if (error) {
      return new Monad(Promise.resolve(new Failure(error)));
    }
    return new Monad(Promise.resolve(new Success(value)));
  }

  static fromPromise<T, E = Error>(promise: Promise<T>): Monad<T, E> {
    return new Monad<T, E>(
      promise
        .then((value) => new Success(value) as Either<T, E>)
        .catch((error) => new Failure(error as E) as Either<T, E>),
    );
  }

  static fail<T, E>(error: E): Monad<T, E> {
    return new Monad(Promise.resolve(new Failure(error)));
  }

  async toPromise(): Promise<T> {
    return this.value.then((either) =>
      either.isSuccess() ? Promise.resolve(either.value) : Promise.reject(either.error),
    );
  }

  static zip<T extends any[], E = Error>(monads: NamedMonad<T[number], E>[]): Monad<{ [key: string]: T[number] }, E>;
  static zip<T extends any[], E = Error>(...monads: NamedMonad<T[number], E>[]): Monad<{ [key: string]: T[number] }, E>;
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

  // ---- Instance methods ----
  map<U>(fn: (value: T) => U): Monad<U, E> {
    return new Monad(
      this.value.then((either) =>
        either.isSuccess()
          ? Promise.resolve()
              .then(() => fn(either.value))
              .then((value) => new Success(value) as Either<U, E>)
              .catch((error) => new Failure(error instanceof Error ? error.message : error) as Either<U, E>)
          : (new Failure(either.error) as Either<U, E>),
      ),
    );
  }

  flatMap<U>(fn: (value: T) => U | Promise<U> | Monad<U, E>): Monad<U, E> {
    return new Monad(
      this.value.then((either) =>
        either.isSuccess()
          ? Promise.resolve()
              .then(() => fn(either.value))
              .catch((error) => new Failure(error instanceof Error ? error.message : error) as Either<U, E>)
              .then((value) => {
                if (value instanceof Monad) {
                  return value.yield().then((innerEither) => innerEither as Either<U, E>);
                } else if (value instanceof Promise) {
                  return value
                    .then((result) => new Success(result) as Either<U, E>)
                    .catch((error) => new Failure(error) as Either<U, E>);
                } else if (value instanceof Failure) {
                  return value as Either<U, E>;
                } else {
                  return new Success(value) as Either<U, E>;
                }
              })
          : Promise.resolve(new Failure(either.error) as Either<U, E>),
      ),
    );
  }

  recover(fn: (error: E) => T): Monad<T, E> {
    return new Monad(
      this.value.then((either) => (either.isSuccess() ? either : (new Success(fn(either.error)) as Either<T, E>))),
    );
  }

  orElse(alternative: Monad<T, E> | ((error: E) => Monad<T, E>)): Monad<T, E> {
    return new Monad(
      this.value.then((either) =>
        either.isSuccess()
          ? either
          : (typeof alternative === "function" ? alternative(either.error) : alternative).yield(),
      ),
    );
  }

  match(
    conditions: MatchCondition<T, E>[] | MatchCondition<T, E>,
    options: MatchOptions = {
      continueIfNoMatch: false,
      mode: MatchMode.FIRST,
      continueOnError: false,
    },
  ): Monad<T, E> {
    return new Monad(
      this.value.then(async (either) => {
        if (either.isSuccess()) {
          const conditionsArray = Array.isArray(conditions) ? conditions : [conditions];
          let matched = false;
          for (const condition of conditionsArray) {
            if (condition.condition(either.value)) {
              matched = true;
              try {
                const actionResult = await condition.action(either.value);
                if (options.mode === MatchMode.FIRST) {
                  return new Success(actionResult) as Either<T, E>;
                }
              } catch (error) {
                if (options.continueOnError) return either;
                return new Failure(error instanceof Error ? error.message : error) as Either<T, E>;
              }
            }
          }
          if (!matched && !options.continueIfNoMatch) {
            return new Failure("No conditions matched") as Either<T, E>;
          } else if (matched || options.continueIfNoMatch) {
            return either;
          }
        }
        return either;
      }),
    );
  }

  filter<E2 = E>(
    predicate: (value: T) => boolean | Promise<boolean>,
    errorFn: (value: T) => E2 = () => "Value did not satisfy the predicate" as any as E2,
  ): Monad<T, E | E2> {
    return new Monad<T, E | E2>(
      this.value.then(async (either) => {
        if (!either.isSuccess()) return either;
        let satisfiesPredicate: any;
        try {
          satisfiesPredicate = await predicate(either.value);
        } catch (error) {
          return new Failure<T, E2>(errorFn(either.value));
        }
        return satisfiesPredicate ? either : new Failure<T, E2>(errorFn(either.value));
      }),
    );
  }

  tap(fn: (value: T) => T | void | Promise<void>): Monad<T, E> {
    return new Monad(
      this.value.then(async (either) => {
        if (either.isSuccess()) {
          await Promise.resolve(fn(either.value));
        }
        return either;
      }),
    );
  }

  async fold<U>(onSuccess: (value: T) => U, onFailure: (error: E) => U): Promise<FoldResult<U>> {
    try {
      const either = await this.yield();
      const result = either.isSuccess() ? onSuccess(either.value) : onFailure(either.error);
      return { result };
    } catch (error) {
      return { error };
    }
  }

  log<L = Console>(
    logger?: L,
    transformer: (either: Either<T, E>) => any = (either) =>
      either.isSuccess() ? `Success: ${either.value}` : `Error: ${either.error}`,
  ): Monad<T, E> {
    return new Monad(
      this.value.then((either) => {
        // Pass the value to the logger if it has a log method
        if (logger && typeof (logger as any).log === "function") {
          (logger as any).log(transformer(either));
        } else {
          console.log(transformer(either));
        }
        return either;
      }),
    );
  }

  handleSpecificErrors(errorTypes: ErrorType[], handler: (error: E) => Monad<T, E>): Monad<T, E> {
    return new Monad(
      this.value.then((either) =>
        !either.isSuccess() && errorTypes.some((type) => either.error instanceof type)
          ? handler(either.error).yield()
          : either,
      ),
    );
  }

  handleHttpErrors(statusCodes: number[], handler: (error: HttpError) => Monad<T, E>): Monad<T, E> {
    return new Monad(
      this.value.then((either) =>
        !either.isSuccess() && either.error instanceof HttpError && statusCodes.includes(either.error.statusCode)
          ? handler(either.error).yield()
          : either,
      ),
    );
  }

  yield(): Promise<Either<T, E>> {
    return this.value;
  }
}
