import { MakeArrayRegistry } from '../../registries';
import type { BDescriptor } from '../../service';
import { type DePromise } from '../../types';

export type BCacheOptions = {
  lifespan: number;
  cacheKey: undefined | string | ((...args: unknown[]) => string);
};

export const CacheRegistry = MakeArrayRegistry<
  BCacheOptions & {
    propertyName: string;
  }
>();

export type BCacheContext = {
  clear: (match?: (key: string) => boolean) => void;
  // replace: (replacer: (preValue: T) => T, match?: (key: string) => boolean) => void;
};
export type BCacheReplacement<T extends (...args: any[]) => any> = ((
  ...args: Parameters<T>
) => Promise<DePromise<ReturnType<T>>>) &
  BCacheContext;

/**
 * A decorator function that registers a timer on a service property.
 * The timer will call the function at specified intervals with the provided configuration.
 *
 * @param next The original method descriptor of the function to be used as the timer.
 * @param options Timer options such as interval, shots, and startManually.
 * @returns A function that starts the timer when invoked.
 */
export function cache<T extends (...args: any[]) => any>(
  next: BDescriptor<T>,
  options?: Partial<BCacheOptions>,
): BDescriptor<BCacheReplacement<T>> {
  return function (target, key) {
    CacheRegistry.register(target, {
      propertyName: key,
      lifespan: options?.lifespan ?? 3_600_000,
      cacheKey: options?.cacheKey,
    });
    return next(target, key) as unknown as BCacheReplacement<T>;
  };
}
