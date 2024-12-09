import type { BPlugin } from '../plugin';
import { MakeCustomRegistry, PluginRegistry } from '../registries';
import type { BDescriptor, BServiceClass, BServiceInstance } from '../service';
/**
 * A timer function that is executed at intervals and may run for a certain number of shots.
 * The function receives the elapsed time and count as parameters.
 * It can return a boolean to stop the timer or undefined/void to keep the timer running.
 */
export type BTimerFunction = (
  elapsed: number, // Time elapsed since the start of the timer in milliseconds.
  count: number, // The current count (or shot) number.
) => boolean | undefined | void;

/**
 * Options to configure a timer, including the interval between executions, the number of shots, and whether the timer starts manually.
 */
export type BTimerOptions = {
  interval: number; // The interval between timer executions in milliseconds.
  shots: number; // The number of times the timer function will be executed before stopping.
  startManually: boolean; // Whether the timer should start manually (false means it starts automatically).
};

/**
 * Custom registry that stores timer options for each service property.
 * The registry holds the configuration for each timed property in the service.
 */
export const TimerRegistry = MakeCustomRegistry<
  BTimerOptions & {
    propertyName: string; // The name of the property being timed.
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
export function timer(
  next: BDescriptor<BTimerFunction>,
  options?: Partial<BTimerOptions>,
): BDescriptor<VoidFunction> {
  return function (target, key) {
    // Register the timer options in the TimerRegistry.
    TimerRegistry.register(target, {
      propertyName: key,
      interval: options?.interval ?? 1000, // Default interval is 1000ms.
      startManually: options?.startManually ?? false, // Default to auto-starting the timer.
      shots: options?.shots ?? 0, // Default to infinite shots (0 means no limit).
    });
    return next(target, key) as unknown as VoidFunction;
  };
}

/**
 * The TimerPlugin manages timer-based behavior for services.
 * It initializes timers when services are created and clears them when services are destroyed.
 */
export function TimerPlugin(): BPlugin {
  // A map that holds an array of timers (timeouts) for each service instance.
  const timerMap = new Map<
    BServiceInstance<never>,
    (NodeJS.Timeout | undefined)[]
  >();

  return {
    // When a service is created, the timers for its properties are initialized.
    async onCreate(target: BServiceClass, instance: BServiceInstance<never>) {
      const definitions = TimerRegistry.get(target); // Get the timer definitions for the service.
      if (!definitions) return; // No timers to set up if no definitions are found.

      // Initialize the timers for this instance if they don't already exist.
      let timers = timerMap.get(instance);
      if (!timers) {
        timers = [];
        timerMap.set(instance, timers);
      }

      // Loop through the timer definitions for the service and set up the timers.
      definitions.forEach(
        ({ propertyName, interval, shots, startManually }) => {
          const proxyFunction: BTimerFunction = instance[propertyName]; // The function that will be called by the timer.
          const index = timers.length; // Get the index to store the timer.
          let running = false; // Track whether the timer is currently running.

          /**
           * The function that handles the timer logic.
           * It recursively sets a timeout to call the function at the specified interval.
           *
           * @param elapsed Time elapsed in milliseconds.
           * @param counter The current shot number.
           */
          function timerFunction(elapsed = 0, counter = 0) {
            if (!timers) return; // If timers are not initialized, do nothing.
            running = true; // Mark the timer as running.
            timers[index] = undefined; // Clear the previous timeout reference.

            const result = proxyFunction.call(instance, elapsed, counter); // Call the timer function.

            if (result === false) {
              running = false; // Stop the timer if the function returns false.
              timers[index] = undefined;
              return;
            }

            // If there are more shots, schedule the next timeout.
            if (shots === 0 || counter < shots - 1) {
              timers[index] = setTimeout(() => {
                timerFunction(elapsed + interval, counter + 1); // Call the function after the interval.
              }, interval);
            } else {
              running = false; // Stop the timer if the shots limit is reached.
              timers[index] = undefined;
            }
          }

          /**
           * Starter function that triggers the timer function if not already running.
           */
          function starter() {
            if (running) return; // Don't start the timer if it's already running.
            timerFunction(); // Start the timer function.
          }

          // If the timer doesn't start manually, start it automatically.
          if (!startManually) timerFunction();

          // Define the timer function as a property on the instance.
          Object.defineProperty(instance, propertyName, {
            configurable: true,
            enumerable: false,
            writable: false,
            value: starter, // The starter function will start the timer when called.
          });
        },
      );
    },

    // When a service is destroyed, clear all active timers.
    async onDestroy(_: BServiceClass, instance: BServiceInstance<never>) {
      const timers = timerMap.get(instance);
      if (timers) {
        timers.forEach(clearTimeout); // Clear each timeout (timer).
        timers.splice(0, timers.length); // Clear the array of timers.
      }
    },
  };
}

/**
 * Registers the TimerPlugin into the plugin registry to manage timer-based behaviors.
 */
PluginRegistry.add(TimerPlugin);
