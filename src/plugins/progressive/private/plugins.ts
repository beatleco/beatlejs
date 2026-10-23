import { NotifyEventId, type BNotifyEvent } from '../../../events';
import { IdentifierSymbol } from '../../../container';
import { TypeError } from '../../../errors/TypeError';
import type { BPlugin } from '../../../plugin';
import { extendPlugins } from '../../../registries';
import type { BServiceClass, BServiceInstance } from '../../../service';
import { ProgressiveRegistry } from '../decorators';

type BProgressiveFunction = (...args: unknown[]) => Promise<void> | void;

function ProgressivePlugin(): BPlugin {
  const timerMap = new Map<BServiceInstance<never>, (number | undefined)[]>();

  return {
    async onCreate(target: BServiceClass, instance: BServiceInstance<unknown>) {
      const definitions = ProgressiveRegistry.get(target);
      if (!definitions) return;

      definitions.forEach((propertyName) => {
        const proxyFunction: BProgressiveFunction = (instance as never)[
          propertyName
        ];
        if (typeof proxyFunction !== 'function') {
          throw new TypeError(
            instance[IdentifierSymbol],
            propertyName,
            'retry plugin only works on functions',
          );
        }
        let pending = false;
        let error: unknown | undefined = undefined;

        function setPending(value: boolean) {
          const event: BNotifyEvent = {
            type: NotifyEventId,
            propertyName,
            prevValue: pending,
            value,
            target,
            isSimilar: pending == value,
            instance,
          };

          instance.container.dispatch(event);
          instance.dispatch(event);
          pending = value;
        }

        async function replacementFunction(...args: string[]) {
          if (pending) return;
          setPending(true);
          try {
            const result = await Promise.resolve(
              proxyFunction.apply(instance, args),
            );
            error = undefined;
            setPending(false);
            return result;
          } catch (e) {
            error = e;
            setPending(false);
            throw e;
          }
        }

        Object.defineProperty(replacementFunction, 'pending', {
          configurable: false,
          enumerable: true,
          get() {
            return pending;
          },
        });
        Object.defineProperty(replacementFunction, 'error', {
          configurable: false,
          enumerable: true,
          get() {
            return error;
          },
        });
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

extendPlugins(ProgressivePlugin);
