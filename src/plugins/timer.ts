import type { BPlugin } from '../plugin';
import { MakeCustomRegistry, PluginRegistry } from '../registries';
import type { BDescriptor, BServiceClass, BServiceInstance } from '../service';

export type BTimerFunction = (
  elapsed: number,
  count: number,
) => boolean | undefined | void;

export type BTimerOptions = {
  interval: number;
  shots: number;
  startManually: boolean;
};

export const TimerRegistry = MakeCustomRegistry<
  BTimerOptions & {
    propertyName: string;
  }
>();

export function timer<T>(
  options: Partial<BTimerOptions> | BDescriptor<T>,
  next?: BDescriptor<T>,
): BDescriptor<VoidFunction> {
  let opts: Partial<BTimerOptions> = {};
  if (typeof options === 'function') {
    next = options;
  } else {
    opts = options;
  }
  return function (target, key) {
    TimerRegistry.register(target, {
      propertyName: key,
      interval: opts.interval ?? 1000,
      startManually: opts.startManually ?? false,
      shots: opts.shots ?? 0,
    });
    return next!(target, key) as unknown as VoidFunction;
  };
}

export function TimerPlugin(): BPlugin {
  const timerMap = new Map<
    BServiceInstance<never>,
    (NodeJS.Timeout | undefined)[]
  >();
  return {
    async onCreate(target: BServiceClass, instance: BServiceInstance<never>) {
      const definitions = TimerRegistry.get(target);
      if (!definitions) return;
      let timers = timerMap.get(instance);
      if (!timers) {
        timers = [];
        timerMap.set(instance, timers);
      }

      definitions.forEach(
        ({ propertyName, interval, shots, startManually }) => {
          const proxyFunction: BTimerFunction = instance[propertyName];
          const index = timers.length;
          let running = false;

          function timerFunction(elapsed = 0, count = 0) {
            if (!timers || running) return;
            running = true;
            timers[index] = undefined;
            const result = proxyFunction.call(instance, elapsed, count);
            if (result === false) {
              running = false;
              timers[index] = undefined;
              return;
            }
            if (shots === 0 || count < shots) {
              timers[index] = setTimeout(() => {
                timerFunction(elapsed + interval, count + 1);
              }, interval);
            }
          }

          if (!startManually) timerFunction();

          Object.defineProperty(instance, propertyName, {
            configurable: true,
            enumerable: true,
            writable: false,
            value: timerFunction,
          });
        },
      );
    },
    async onDestroy(_: BServiceClass, instance: BServiceInstance<never>) {
      const timers = timerMap.get(instance);
      if (timers) {
        timers.forEach(clearTimeout);
        timers.splice(0, timers.length);
      }
    },
  };
}

PluginRegistry.add(TimerPlugin);
