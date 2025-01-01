import { MakeArrayRegistry } from '../../registries';
import { BDescriptor } from '../../service';

/**
 * Options for configuring the retry behavior.
 * - `interval`: The delay before the first retry.
 * - `shots`: The number of retry attempts before giving up.
 * - `retryCurve`: Defines the delay increase pattern, either 'linear' or 'log'.
 * - `maximumDelay`: The maximum possible delay between retries.
 */
export type BRetryOptions = {
  /** Initial delay before retry */
  interval: number;
  /** Number of retry attempts */
  shots: number;
  /** Defines how the delay increases between retries */
  retryCurve: 'linear' | 'log';
  /** Maximum delay for retries */
  maximumDelay: number;
};

/**
 * A custom registry for retry configurations.
 * Stores retry options for methods that need to be retried on failure.
 */
export const RetryRegistry = MakeArrayRegistry<
  BRetryOptions & {
    propertyName: string;
  }
>();

/**
 * Decorator function to mark methods for retry logic.
 * It registers the method with retry options in the RetryRegistry.
 *
 * @param next The original method descriptor.
 * @param options The retry options (optional).
 */
export function retry<T>(
  next: BDescriptor<T>,
  options?: Partial<BRetryOptions>,
): BDescriptor<T> {
  return function (target, key) {
    RetryRegistry.register(target, {
      propertyName: key,
      interval: options?.interval ?? 1000, 
      shots: options?.shots ?? 5, 
      maximumDelay: options?.maximumDelay ?? 32_000,
      retryCurve: options?.retryCurve ?? 'linear',
    });
    return next(target, key);
  };
}
