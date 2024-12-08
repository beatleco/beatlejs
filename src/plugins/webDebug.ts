import { IdentifierSymbol } from '../container';
import type { BPlugin } from '../plugin';
import { PluginRegistry } from '../registries';
import type { BServiceClass, BServiceInstance } from '../service';

export function WebDebugPlugin(): BPlugin {
  return {
    /**
     * onCreate is called when a service instance is created.
     * It adds the service instance to the global `window` object with a key based on the instance's identifier.
     *
     * @param _ - The service class (not used in this function).
     * @param instance - The instance of the service being created.
     */
    async onCreate(_: BServiceClass, instance: BServiceInstance<unknown>) {
      // Generate a unique key for the instance using its identifier.
      const key = `$${instance[IdentifierSymbol]}`;

      // Define a property on the `window` object with the key and the instance as the value.
      // The property is non-writable and configurable, meaning it cannot be changed or deleted.
      Object.defineProperty(window, key, {
        configurable: true, // The property can be deleted or modified in terms of configuration.
        enumerable: true, // The property will show up in `for...in` loops or `Object.keys()` calls.
        writable: false, // The value cannot be changed after being set.
        value: instance, // The service instance itself is assigned as the value of the property.
      });
    },

    /**
     * onDestroy is called when a service instance is destroyed.
     * It removes the instance from the global `window` object by setting the corresponding key to `undefined`.
     *
     * @param _ - The service class (not used in this function).
     * @param instance - The instance of the service being destroyed.
     */
    async onDestroy(_: BServiceClass, instance: BServiceInstance<unknown>) {
      // Generate the key based on the instance's identifier.
      const key = `$${instance[IdentifierSymbol]}`;

      // Set the property on `window` to `undefined`, effectively removing the reference to the instance.
      Object.defineProperty(window, key, {
        configurable: true, // The property can still be deleted or modified.
        enumerable: true, // The property will show up in enumeration.
        writable: false, // Prevent modification of the value.
        value: undefined, // Set the value to `undefined` to clear the reference.
      });
    },
  };
}

// Register the plugin into the plugin registry.
PluginRegistry.add(WebDebugPlugin);
