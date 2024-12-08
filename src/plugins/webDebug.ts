import { IdentifierSymbol } from '../container';
import type { BPlugin } from '../plugin';
import { PluginRegistry } from '../registries';
import type { BServiceClass, BServiceInstance } from '../service';

export function WebDebugPlugin(): BPlugin {
  return {
    async onCreate(_: BServiceClass, instance: BServiceInstance<unknown>) {
      const key = `$${instance[IdentifierSymbol]}`;
      Object.defineProperty(window, key, {
        configurable: true,
        enumerable: true,
        writable: false,
        value: instance,
      });
    },
    async onDestroy(_: BServiceClass, instance: BServiceInstance<unknown>) {
      const key = `$${instance[IdentifierSymbol]}`;
      Object.defineProperty(window, key, {
        configurable: true,
        enumerable: true,
        writable: false,
        value: undefined,
      });
    },
  };
}

PluginRegistry.add(WebDebugPlugin);
