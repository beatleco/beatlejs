import type { BPlugin } from '../plugin';
import { MakeCustomRegistry, PluginRegistry } from '../registries';
import type { BDescriptor, BServiceClass, BServiceInstance } from '../service';

export type BDebounceFunction = (...args: unknown[]) => Promise<void> | void;

export type BDebounceOptions = {
  ms: number;
};

export const DebounceRegistry = MakeCustomRegistry<
  BDebounceOptions & {
    propertyName: string;
  }
>();

export function debounced<T>(
  next: BDescriptor<T>,
  ms?: number,
): BDescriptor<T> {
  return function (target, key) {
    DebounceRegistry.register(target, {
      propertyName: key,
      ms: ms ?? 250,
    });
    return next!(target, key) as T;
  };
}

function DebouncePlugin(): BPlugin {
  const timerMap = new Map<
    BServiceInstance<never>,
    (NodeJS.Timeout | undefined)[]
  >();
  return {
    async onCreate(target: BServiceClass, instance: BServiceInstance<never>) {
      const definitions = DebounceRegistry.get(target);
      if (!definitions) return;
      let timers = timerMap.get(instance);
      if (!timers) {
        timers = [];
        timerMap.set(instance, timers);
      }

      definitions.forEach(({ propertyName, ms }) => {
        const proxyFunction: BDebounceFunction = instance[propertyName];
        const index = timers.length;
        const currentTimer = timers[index];

        function replacementFunction(...args: unknown[]) {
          if (!timers) return;
          clearTimeout(currentTimer);
          timers[index] = setTimeout(() => {
            proxyFunction.apply(instance, args);
            timers[index] = undefined;
          }, ms);
        }
        Object.defineProperty(instance, propertyName, {
          configurable: true,
          enumerable: true,
          writable: false,
          value: replacementFunction,
        });
      });
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

PluginRegistry.add(DebouncePlugin);
