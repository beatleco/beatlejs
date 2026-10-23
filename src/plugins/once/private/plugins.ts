import { IdentifierSymbol } from '../../../container';
import { TypeError } from '../../../errors/TypeError';
import { type BPlugin } from '../../../plugin';
import { extendPlugins } from '../../../registries';
import { type BServiceClass, type BServiceInstance } from '../../../service';
import { OnceRegistry } from '../decorators';

type BCallableFunction = (...args: any[]) => unknown;

function OncePlugin(): BPlugin {
  return {
    async onCreate(target: BServiceClass, instance: BServiceInstance<never>) {
      const definitions = OnceRegistry.get(target);
      if (!definitions) return;

      definitions.forEach((propertyName) => {
        const proxyFunction: BCallableFunction = instance[propertyName];
        if (typeof proxyFunction !== 'function') {
          throw new TypeError(
            instance[IdentifierSymbol],
            propertyName,
            'once plugin only works on functions',
          );
        }
        let isCalled = false;
        let prevValue: any = undefined;
        async function replaceFunction(...args: unknown[]) {
          if (isCalled) return prevValue;
          prevValue = await proxyFunction.apply(instance, args);
          isCalled = true;
          return prevValue;
        }
        Object.defineProperty(instance, propertyName, {
          configurable: true,
          enumerable: false,
          writable: false,
          value: replaceFunction,
        });
      });
    },
  };
}

extendPlugins(OncePlugin);
