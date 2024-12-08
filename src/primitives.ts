import type { BDescriptor } from './service';

export function method<T>(next: T): BDescriptor<T> {
  return function () {
    return next;
  };
}

export function property<T>(next: T): BDescriptor<T> {
  return function () {
    return next;
  };
}
