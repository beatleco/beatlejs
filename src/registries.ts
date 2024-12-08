import type { BPluginClass } from './plugin';
import type { BServiceClass } from './service';

export const ServiceRegistry = new Set<BServiceClass>();
export const ServiceIdentifiers = new Map<string, BServiceClass>();
export const PluginRegistry = new Set<BPluginClass>();

/**
 * Creates a custom registry tailored to your specific needs.
 *
 * @description
 * This function allows you to define a custom registry that can be used with plugins or other parts
 * of your application to extend Beatle's functionality. The registry can store and manage metadata
 * or other custom data related to services and their properties.
 *
 * Custom registries are particularly useful when building reusable features, like debouncing or logging,
 * that require the registration and management of metadata for multiple services or properties.
 *
 * @example
 * ```tsx
 * import type { BDescriptor, BServiceClass } from "beatlejs";
 * import { MakeCustomRegistry } from 'beatlejs/registries';
 *
 * // Create a custom registry to store debounce information
 * export const DebounceRegistry = MakeCustomRegistry<{
 *   propertyName: string;
 *   ms: number;
 * }>();
 *
 * // Custom descriptor function for debouncing
 * function debounced<T>(
 *   next: BDescriptor<T>,
 *   ms?: number
 * ): BDescriptor<T> {
 *   return function (target: BServiceClass, propertyName: string) {
 *     // Register debounce metadata in the custom registry
 *     DebounceRegistry.register(target, { propertyName, ms });
 *     return next(target, propertyName);
 *   };
 * }
 * ```
 *
 */
export function MakeCustomRegistry<T>() {
  const map = new Map<BServiceClass, T[]>();
  return {
    register(target: BServiceClass, prop: T) {
      let service = map.get(target);
      if (!service) {
        service = [];
        map.set(target, service);
      }
      service.unshift(prop);
    },
    get(target: BServiceClass) {
      return map.get(target);
    },
    count(target: BServiceClass) {
      const svc = map.get(target);
      if (!svc) return 0;
      return svc.length;
    },
    forEach(callback: (value: T[], key: BServiceClass) => void) {
      map.forEach(callback);
    },
  };
}
