import { MakeArrayRegistry } from '../../registries';
import { BDescriptor } from '../../service';

/**
 * Options for configuring debouncing, including the delay in milliseconds.
 */
type BDebounceOptions = {
  ms: number;
};

/**
 * A custom registry for debouncing configurations.
 * Stores debounce options for methods that need to be debounced.
 */
export const DebounceRegistry = MakeArrayRegistry<
  BDebounceOptions & {
    propertyName: string;
  }
>();

/**
 * Decorator function to mark methods for debouncing.
 * It registers the method with debounce options in the DebounceRegistry.
 *
 * @param next The original method descriptor.
 * @param ms The debounce delay in milliseconds (default is 250ms).
 */
export function debounce<T>(next: BDescriptor<T>, ms?: number): BDescriptor<T> {
  return function (target, key) {
    DebounceRegistry.register(target, {
      propertyName: key,
      ms: ms ?? 250,
    });
    return next(target, key);
  };
}
