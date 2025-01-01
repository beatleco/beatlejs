import { IdentifierSymbol } from '../../container';
import type { BPlugin } from '../../plugin';
import { extendPlugins } from '../../registries';
import type { BServiceClass, BServiceInstance } from '../../service';

export function DebugPlugin(): BPlugin {
  return {
    async onCreate(_: BServiceClass, instance: BServiceInstance<unknown>) {
      const key = `$${instance[IdentifierSymbol]}`;
      Object.defineProperty(window, key, {
        configurable: true,
        enumerable: false,
        writable: false,
        value: instance,
      });
    },

    async onDestroy(_: BServiceClass, instance: BServiceInstance<unknown>) {
      const key = `$${instance[IdentifierSymbol]}`;

      Object.defineProperty(window, key, {
        configurable: true,
        enumerable: false,
        writable: false,
        value: undefined,
      });
    },
  };
}
extendPlugins(DebugPlugin);
