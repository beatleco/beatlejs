import { IdentifierSymbol } from '../../../container';
import type { BPlugin } from '../../../plugin';
import { extendPlugins } from '../../../registries';
import type { BServiceClass, BServiceInstance } from '../../../service';
import { RetryRegistry } from '../decorators';

type BRetryFunction = (...args: unknown[]) => Promise<void> | void;

function RetryPlugin(): BPlugin {
  const timerMap = new Map<
    BServiceInstance<never>,
    (NodeJS.Timeout | undefined)[]
  >();

  return {
    async onCreate(target: BServiceClass, instance: BServiceInstance<never>) {
      const definitions = RetryRegistry.get(target);
      if (!definitions) return;
      let timers = timerMap.get(instance);
      if (!timers) {
        timers = [];
        timerMap.set(instance, timers);
      }

      definitions.forEach(
        ({ propertyName, interval, shots, maximumDelay, retryCurve }) => {
          const proxyFunction: BRetryFunction = instance[propertyName];
          const index = timers.length;

          let counter = 1;
          let delay = interval;
          let running = false;

          async function replacementFunction(...args: string[]) {
            if (!timers || running) return;
            running = true;
            timers[index] = undefined;

            await new Promise(function callee(acc, rej) {
              Promise.resolve(proxyFunction.apply(instance, args))
                .then((result) => {
                  acc(result);
                  running = false;
                  timers[index] = undefined;
                })
                .catch((e) => {
                  console.error(
                    `${instance[IdentifierSymbol]}.${propertyName}: Runtime failure,`,
                    e,
                  );

                  if (shots !== 0 && counter >= shots) {
                    rej(e);
                    running = false;
                    timers[index] = undefined;
                    return;
                  }

                  if (retryCurve === 'log')
                    delay = Math.min(delay * 2, maximumDelay);

                  console.error(
                    `${instance[IdentifierSymbol]}.${propertyName}: Retrying in ${delay / 1000} seconds.`,
                  );

                  timers[index] = setTimeout(() => callee(acc, rej), delay);
                  counter++;
                });
            });
          }
          Object.defineProperty(instance, propertyName, {
            configurable: true,
            enumerable: false,
            writable: false,
            value: replacementFunction,
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

extendPlugins(RetryPlugin);
