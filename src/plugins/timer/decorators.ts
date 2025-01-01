import { MakeArrayRegistry } from '../../registries';
import type { BDescriptor } from '../../service';

/**
 * Options to configure a timer, including the interval between executions, the number of shots, and whether the timer starts manually.
 */
export type BTimerOptions = {
  /** The interval between timer executions in milliseconds.  */
  interval: number;

  /** The number of times the timer function will be executed before stopping.  */
  shots: number;

  /** Whether the timer should start manually (false means it starts automatically).  */
  startManually: boolean;
};

/**
 * Custom registry that stores timer options for each service property.
 * The registry holds the configuration for each timed property in the service.
 */
export const TimerRegistry = MakeArrayRegistry<
  BTimerOptions & {
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
export function timer<T>(
  next: BDescriptor<T>,
  options?: Partial<BTimerOptions>,
): BDescriptor<VoidFunction> {
  return function (target, key) {
    TimerRegistry.register(target, {
      propertyName: key,
      interval: options?.interval ?? 1000,
      startManually: options?.startManually ?? false,
      shots: options?.shots ?? 0,
    });
    return next(target, key) as unknown as VoidFunction;
  };
}
