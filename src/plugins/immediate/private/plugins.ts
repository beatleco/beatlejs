import { IdentifierSymbol } from '../../../container';
import { TypeError } from '../../../errors/TypeError';
import { type BPlugin } from '../../../plugin';
import { extendPlugins } from '../../../registries';
import { type BServiceClass, type BServiceInstance } from '../../../service';
import { ImmediateRegistry } from '../decorators';

type BCallableFunction = (...args: any[]) => unknown;

function ImmediatePlugin(): BPlugin {
  return {
    async onCreate(target: BServiceClass, instance: BServiceInstance<never>) {
      const definitions = ImmediateRegistry.get(target);
      if (!definitions) return;

      definitions.forEach((propertyName) => {
        const proxyFunction: BCallableFunction = instance[propertyName];
        if (typeof proxyFunction !== 'function') {
          throw new TypeError(
            instance[IdentifierSymbol],
            propertyName,
            'immediate plugin only works on functions',
          );
        }
        async function replaceFunction(...args: unknown[]) {
          setTimeout(() => {
            proxyFunction.apply(instance, args);
          }, 0);
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

extendPlugins(ImmediatePlugin);
