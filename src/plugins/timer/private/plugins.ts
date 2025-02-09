import { IdentifierSymbol } from '../../../container';
import { TypeError } from '../../../errors/TypeError';
import type { BPlugin } from '../../../plugin';
import { extendPlugins } from '../../../registries';
import type { BServiceClass, BServiceInstance } from '../../../service';
import { TimerRegistry } from '../decorators';

type BTimerFunction = (
  elapsed: number,
  count: number,
) => boolean | undefined | void;

function TimerPlugin(): BPlugin {
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
          if (typeof proxyFunction !== 'function') {
            throw new TypeError(instance[IdentifierSymbol], propertyName, 'timer plugin only works on functions');
          }
          const index = timers.length;
          let running = false;

          function timerFunction(elapsed = 0, counter = 0) {
            if (!timers) return;
            running = true;
            timers[index] = undefined;

            const result = proxyFunction.call(instance, elapsed, counter);

            if (result === false) {
              running = false;
              timers[index] = undefined;
              return;
            }
            if (shots === 0 || counter < shots - 1) {
              timers[index] = setTimeout(() => {
                timerFunction(elapsed + interval, counter + 1);
              }, interval);
            } else {
              running = false;
              timers[index] = undefined;
            }
          }

          function starter() {
            if (running) return;
            timerFunction();
          }

          if (!startManually) timerFunction();

          Object.defineProperty(instance, propertyName, {
            configurable: true,
            enumerable: false,
            writable: false,
            value: starter,
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

extendPlugins(TimerPlugin);
