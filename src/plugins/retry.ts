import { IdentifierSymbol } from '../container';
import type { BPlugin } from '../plugin';
import { MakeCustomRegistry, PluginRegistry } from '../registries';
import type { BDescriptor, BServiceClass, BServiceInstance } from '../service';
/**
 * Type definition for a retry function.
 * This type represents a function that can return a `Promise` or void, and will be retried upon failure.
 */
export type BRetryFunction = (...args: unknown[]) => Promise<void> | void;

/**
 * Options for configuring the retry behavior.
 * - `interval`: The delay before the first retry.
 * - `shots`: The number of retry attempts before giving up.
 * - `retryCurve`: Defines the delay increase pattern, either 'linear' or 'log'.
 * - `maximumDelay`: The maximum possible delay between retries.
 */
export type BRetryOptions = {
  interval: number; // Initial delay before retry
  shots: number; // Number of retry attempts
  retryCurve: 'linear' | 'log'; // Defines how the delay increases between retries
  maximumDelay: number; // Maximum delay for retries
};

/**
 * A custom registry for retry configurations.
 * Stores retry options for methods that need to be retried on failure.
 */
export const RetryRegistry = MakeCustomRegistry<
  BRetryOptions & {
    propertyName: string; // The name of the method to be retried
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
    // Register the retry settings for the method in the RetryRegistry
    RetryRegistry.register(target, {
      propertyName: key,
      interval: options?.interval ?? 1000, // Default interval is 1000ms
      shots: options?.shots ?? 5, // Default number of retries is 5
      maximumDelay: options?.maximumDelay ?? 32_000, // Default maximum delay is 32 seconds
      retryCurve: options?.retryCurve ?? 'linear', // Default retry curve is 'linear'
    });
    return next(target, key); // Return the original method descriptor
  };
}

/**
 * Retry plugin implementation.
 * This plugin applies retry logic to methods when they are created,
 * and cleans up timers when services are destroyed.
 */
function RetryPlugin(): BPlugin {
  const timerMap = new Map<
    BServiceInstance<never>,
    (NodeJS.Timeout | undefined)[]
  >();

  return {
    /**
     * Called when a service is created.
     * It applies the retry logic to the methods defined in RetryRegistry.
     */
    async onCreate(target: BServiceClass, instance: BServiceInstance<never>) {
      // Retrieve retry definitions for the service
      const definitions = RetryRegistry.get(target);
      if (!definitions) return;

      // Initialize timer array if it doesn't exist for the service instance
      let timers = timerMap.get(instance);
      if (!timers) {
        timers = [];
        timerMap.set(instance, timers);
      }

      // Apply retry logic to each registered method
      definitions.forEach(
        ({ propertyName, interval, shots, maximumDelay, retryCurve }) => {
          const proxyFunction: BRetryFunction = instance[propertyName];
          const index = timers.length;

          let counter = 1; // Track the current retry attempt
          let delay = interval; // Set the initial delay between retries
          let running = false; // Ensure only one retry happens at a time

          // Replacement function that handles retry logic
          async function replacementFunction(...args: string[]) {
            if (!timers || running) return; // Prevent multiple retries at the same time
            running = true;
            timers[index] = undefined;

            // Retry loop
            await new Promise(function callee(acc, rej) {
              Promise.resolve(proxyFunction.apply(instance, args))
                .then((result) => {
                  acc(result);
                  running = false;
                  timers[index] = undefined;
                })
                .catch((e) => {
                  // Log error if the function fails
                  console.error(
                    `${instance[IdentifierSymbol]}.${propertyName}: Runtime failure,`,
                    e,
                  );

                  // If no more retry attempts left, reject the promise
                  if (shots !== 0 && counter >= shots) {
                    rej(e);
                    running = false;
                    timers[index] = undefined;
                    return;
                  }

                  // If retry curve is 'log', increase the delay logarithmically
                  if (retryCurve === 'log')
                    delay = Math.min(delay * 2, maximumDelay);

                  console.error(
                    `${instance[IdentifierSymbol]}.${propertyName}: Retrying in ${delay / 1000} seconds.`,
                  );

                  // Set a timeout for the next retry attempt
                  timers[index] = setTimeout(() => callee(acc, rej), delay);
                  counter++;
                });
            });
          }

          // Replace the original method with the retry-enabled method
          Object.defineProperty(instance, propertyName, {
            configurable: true,
            enumerable: false,
            writable: false,
            value: replacementFunction,
          });
        },
      );
    },

    /**
     * Called when a service is destroyed.
     * It clears all retry timers associated with the service instance.
     */
    async onDestroy(_: BServiceClass, instance: BServiceInstance<never>) {
      const timers = timerMap.get(instance);
      if (timers) {
        // Clear all stored timeouts for retry attempts
        timers.forEach(clearTimeout);
        // Remove all timers from the array
        timers.splice(0, timers.length);
      }
    },
  };
}

/**
 * Add the RetryPlugin to the PluginRegistry so it will be applied to services.
 */
PluginRegistry.add(RetryPlugin);
