import { MakeArrayRegistry } from '../../registries';
import type { BDescriptor } from '../../service';
import { DePromise } from '../../types';

export type BCacheOptions = {
  lifespan: number;
  cacheKey: undefined | string | ((...args: unknown[]) => string);
};

export const CacheRegistry = MakeArrayRegistry<
  BCacheOptions & {
    propertyName: string;
  }
>();

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
): BDescriptor<(...args: Parameters<T>) => Promise<DePromise<ReturnType<T>>>> {
  return function (target, key) {
    CacheRegistry.register(target, {
      propertyName: key,
      lifespan: options?.lifespan ?? 3_600_000,
      cacheKey: options?.cacheKey
    });
    return next(target, key) as unknown as T;
  };
}
