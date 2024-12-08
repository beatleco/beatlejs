import type { BPlugin } from '../plugin';
import { MakeCustomRegistry, PluginRegistry } from '../registries';
import type { BDescriptor, BServiceClass, BServiceInstance } from '../service';

/**
 * Type definition for a debounced function.
 * This type represents a function that can return a `Promise` or void.
 */
export type BDebounceFunction = (...args: unknown[]) => Promise<void> | void;

/**
 * Options for configuring debouncing, including the delay in milliseconds.
 */
export type BDebounceOptions = {
  ms: number;
};

/**
 * A custom registry for debouncing configurations.
 * Stores debounce options for methods that need to be debounced.
 */
export const DebounceRegistry = MakeCustomRegistry<
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
export function debounced<T>(
  next: BDescriptor<T>,
  ms?: number,
): BDescriptor<T> {
  return function (target, key) {
    // Register the debounce settings for the method in the DebounceRegistry
    DebounceRegistry.register(target, {
      propertyName: key,
      ms: ms ?? 250, // Default debounce time is 250ms if not provided
    });
    return next(target, key); // Return the original method descriptor
  };
}

/**
 * Debounce plugin implementation.
 * This plugin applies debouncing logic to methods when they are created,
 * and cleans up timers when services are destroyed.
 */
function DebouncePlugin(): BPlugin {
  const timerMap = new Map<
    BServiceInstance<never>,
    (NodeJS.Timeout | undefined)[]
  >();

  return {
    /**
     * Called when a service is created.
     * It applies the debounced function behavior to the methods defined in DebounceRegistry.
     */
    async onCreate(target: BServiceClass, instance: BServiceInstance<never>) {
      // Retrieve debounce definitions for the service
      const definitions = DebounceRegistry.get(target);
      if (!definitions) return;

      // Initialize timer array if it doesn't exist for the service instance
      let timers = timerMap.get(instance);
      if (!timers) {
        timers = [];
        timerMap.set(instance, timers);
      }

      // Apply debounce to each registered method
      definitions.forEach(({ propertyName, ms }) => {
        const proxyFunction: BDebounceFunction = instance[propertyName];
        const index = timers.length;

        // Replacement function to handle debouncing
        function replacementFunction(...args: unknown[]) {
          if (!timers) return;
          // Clear previous timeout if method was called again before the delay
          clearTimeout(timers[index]);

          // Set a new timeout to delay the method execution
          timers[index] = setTimeout(() => {
            proxyFunction.apply(instance, args);
            timers[index] = undefined;
          }, ms);
        }

        // Replace the original method with the debounced one
        Object.defineProperty(instance, propertyName, {
          configurable: true,
          enumerable: true,
          writable: false,
          value: replacementFunction,
        });
      });
    },

    /**
     * Called when a service is destroyed.
     * It clears all debounce timers associated with the service instance.
     */
    async onDestroy(_: BServiceClass, instance: BServiceInstance<never>) {
      const timers = timerMap.get(instance);
      if (timers) {
        // Clear all stored timeouts
        timers.forEach(clearTimeout);
        // Remove all timers from the array
        timers.splice(0, timers.length);
      }
    },
  };
}

/**
 * Add the DebouncePlugin to the PluginRegistry so it will be applied to services.
 */
PluginRegistry.add(DebouncePlugin);
