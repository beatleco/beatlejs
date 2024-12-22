import { BContainer } from '../container';
import { BPlugin } from '../plugin';
import { extendPlugins, ServiceRegistry } from '../registries';
import { BServiceClass } from '../service';
import { BServiceInstance } from '../service';

/**
 * Calls bootstrap function on all services
 */

export function bootstrap(container: BContainer) {
  return container.invokeLinear('bootstrap');
}
function BootstrapPlugin(): BPlugin {
  const clone = new Map<BServiceClass, VoidFunction | undefined | null>();
  ServiceRegistry.forEach((key) => clone.set(key, null));
  return {
    async onCreate(
      service: BServiceClass,
      instance: BServiceInstance<unknown>,
    ) {
      if (clone.has(service)) return;

      if ('bootstrap' in instance && typeof instance.bootstrap === 'function') {
        const un = await Promise.resolve(instance.bootstrap.call(instance));
        clone.set(service, un);
      } else {
        clone.set(service, undefined);
      }
    },
    async onDestroy(
      service: BServiceClass,
      instance: BServiceInstance<unknown>,
    ) {
      const fn = clone.get(service);
      clone.delete(service);
      if (typeof fn === 'function') {
        fn.call(instance);
      }
    },
  };
}

extendPlugins(BootstrapPlugin);
