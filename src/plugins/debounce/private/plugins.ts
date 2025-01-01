import type { BPlugin } from '../../../plugin';
import { extendPlugins } from '../../../registries';
import type { BServiceClass, BServiceInstance } from '../../../service';
import { DebounceRegistry } from '../decorators';

type BDebounceFunction = (...args: unknown[]) => Promise<void> | void;

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
        function replacementFunction(...args: unknown[]) {
          if (!timers) return;
          clearTimeout(timers[index]);
          timers[index] = setTimeout(() => {
            proxyFunction.apply(instance, args);
            timers[index] = undefined;
          }, ms);
        }
        Object.defineProperty(instance, propertyName, {
          configurable: true,
          enumerable: false,
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

extendPlugins(DebouncePlugin);
