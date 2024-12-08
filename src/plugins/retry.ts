import { IdentifierSymbol } from '../container';
import type { BPlugin } from '../plugin';
import { MakeCustomRegistry, PluginRegistry } from '../registries';
import type { BDescriptor, BServiceClass, BServiceInstance } from '../service';

export type BRetryFunction = (...args: unknown[]) => Promise<void> | void;

export type BRetryOptions = {
  interval: number;
  shots: number;
  retryCurve: 'linear' | 'log';
  maximumDelay: number;
};

export const RetryRegistry = MakeCustomRegistry<
  BRetryOptions & {
    propertyName: string;
  }
>();

export function retry<T>(next: BDescriptor<T>): BDescriptor<T>;
export function retry<T>(
  options: Partial<BRetryOptions>,
  next: BDescriptor<T>,
): BDescriptor<T>;
export function retry<T>(
  options: Partial<BRetryOptions> | BDescriptor<T>,
  next?: BDescriptor<T>,
): BDescriptor<T> {
  let opts: Partial<BRetryOptions> = {};
  if (typeof options === 'function') {
    next = options;
  } else {
    opts = options;
  }
  return function (target, key) {
    RetryRegistry.register(target, {
      propertyName: key,
      interval: opts.interval ?? 1000,
      shots: opts.shots ?? 5,
      maximumDelay: opts.maximumDelay ?? 32_000,
      retryCurve: opts.retryCurve ?? 'linear',
    });
    return next!(target, key) as T;
  };
}

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
                    `${instance[IdentifierSymbol]}.${propertyName}: Retrying in ${delay / 1000} seonds.`,
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

PluginRegistry.add(RetryPlugin);
