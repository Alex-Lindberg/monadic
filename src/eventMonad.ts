import { Monad } from "./monad";
import { Failure, Success } from "./util";

export class EventMonad<T, E = Error> extends Monad<T, E> {
  constructor(event: T, error?: E) {
    if (error) super(Promise.resolve(new Failure(error)));
    else super(Promise.resolve(new Success(event)));
  }

  // You can add specialized methods for handling events,
  // such as filtering based on event type, transforming event data, etc.
}

export class EventStream<T, E = Error> {
  private listeners: Array<(event: EventMonad<T, E>) => void> = [];

  emit(event: T, error?: E) {
    const eventMonad = new EventMonad(event, error);
    this.listeners.forEach((listener) => listener(eventMonad));
  }

  subscribe(listener: (event: EventMonad<T, E>) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }
}
