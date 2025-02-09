import { IdentifierSymbol } from "../../../container";
import { TypeError } from "../../../errors/TypeError";
import { BPlugin } from "../../../plugin";
import { extendPlugins } from "../../../registries";
import { BServiceClass, BServiceInstance } from '../../../service';
import { OptimusRegistry } from "../decorators";

type BCallableFunction = (...args: any[]) => unknown;

function CachePlugin(): BPlugin {
  return {
    async onCreate(target: BServiceClass, instance: BServiceInstance<never>) {
      const definitions = OptimusRegistry.get(target);
      if (!definitions) return;


      definitions.forEach(
        (propertyName) => {
          const proxyFunction: BCallableFunction = instance[propertyName];
          if (typeof proxyFunction !== 'function') {
            throw new TypeError(instance[IdentifierSymbol], propertyName, 'optimus plugin only works on functions');
          }
          const resolvers: any[] = [];
          const rejectors: any[] = [];
          let pending = false;

          async function replaceFunction(...args: unknown[]) {
            if (pending) {
              return new Promise((acc, rej) => {
                resolvers.push(acc);
                rejectors.push(rej);
              });
            }
            pending = true;
            try {
              const result = await proxyFunction.apply(instance, args);
              resolvers.forEach((acc) => acc(result));
              rejectors.splice(0, rejectors.length);
              resolvers.splice(0, resolvers.length);
              pending = false;
              return result;
            } catch (e) {
              rejectors.forEach((rej) => rej(e));
              rejectors.splice(0, rejectors.length);
              resolvers.splice(0, resolvers.length);
              pending = false;
              throw e;
            }
          }
          Object.defineProperty(instance, propertyName, {
            configurable: true,
            enumerable: false,
            writable: false,
            value: replaceFunction,
          });
        },
      );
    },
  };
}

extendPlugins(CachePlugin);
