import type { BPlugin, BPluginClass } from './plugin';
import { PluginRegistry, ServiceRegistry } from './registries';
import type { BServiceClass, BServiceInstance } from './service';

export const IdentifierSymbol = Symbol('identifier');

/**
 * A tuple that holds a service class and its corresponding instance.
 */
export type BServiceTuple = {
  class: BServiceClass;
  instance: BServiceInstance<unknown>;
};

/**
 * Each container holds services as singletons.
 * Services can be accessed, their functions invoked, or they can be reset via the container.
 */
export type BContainer = {
  /**
   * Retrieves a service instance by its class.
   *
   * @param {T} target - The service class to retrieve.
   * @param {string} [scope] - Optional scope to specify which instance of the service to retrieve.
   * @returns {T} The service instance.
   */
  getByClass<T>(target: T, scope?: string): T;

  /**
   * Retrieves a service instance by its name.
   *
   * @param {string} name - The name of the service to retrieve.
   * @param {string} [scope] - Optional scope to specify which instance of the service to retrieve.
   * @returns {T | undefined} The service instance or undefined if not found.
   */
  getByName<T = unknown>(name: string, scope?: string): T | undefined;

  /**
   * Retrieves a plugin instance by its class.
   *
   * @param {T} type - The plugin class to retrieve.
   * @returns {ReturnType<T>} The resolved plugin instance.
   */
  getPluginByClass<T extends BPluginClass>(type: T): ReturnType<T>;

  /**
   * Resolves a service instance asynchronously by its class.
   * This method is useful when you need to initialize or await the service setup before usage.
   *
   * @param {T} target - The service class to resolve.
   * @param {string} [scope] - Optional scope to specify which instance of the service to resolve.
   * @returns {Promise<T>} A promise that resolves to the service instance.
   */
  resolveByClass<T>(target: T, scope?: string): Promise<T>;

  /**
   * Invokes a function from multiple services in parallel.
   *
   * @param {string} name - The name of the function to invoke.
   * @param {...unknown[]} args - Arguments to pass to the function.
   * @returns {Promise<void>} A promise indicating the completion of the parallel function calls.
   */
  invokeParallel(name: string, ...args: unknown[]): Promise<void>;

  /**
   * Invokes a function from services in a sequential order.
   * Each function is executed in the order of invocation.
   *
   * @param {string} name - The name of the function to invoke.
   * @param {...unknown[]} args - Arguments to pass to the function.
   * @returns {Promise<void>} A promise indicating the completion of the sequential function calls.
   */
  invokeLinear(name: string, ...args: unknown[]): Promise<void>;

  /**
   * Clears services in the container.
   * Optionally, a filter function can be provided to target specific services for removal.
   *
   * @param {(target: BServiceClass, instance: unknown) => boolean} [filter] - An optional filter function to specify which services to clear.
   */
  clear(filter?: (target: BServiceClass, instance: unknown) => boolean): void;
};

/**
 * Creates and returns a new instance of a Beatle container.
 * The container manages services, their lifecycle, and plugin registration within the Beatle framework.
 *
 * @description
 * The container is responsible for storing services, resolving their dependencies, and managing lifecycle hooks.
 * It also supports invoking methods on all services in parallel or sequentially.
 * The container is extended by plugins to modify or extend its behavior.
 *
 * Services are registered and retrieved by class or name, and plugins can hook into service creation and destruction.
 *
 * @returns {BContainer} - The container instance with methods to manage services, invoke functions, and handle plugins.
 */
export function Container(): BContainer {
  // Holds the registered services and their instances
  const services = new Map<string, BServiceTuple>();

  // Holds the registered plugins and their instances
  const plugins = new Map<BPluginClass, BPlugin>();

  // Container instance exposing various methods to interact with services and plugins
  const self: BContainer = {
    getByClass,
    getByName,
    getPluginByClass,
    resolveByClass,
    invokeParallel,
    invokeLinear,
    clear,
  };

  // Initialize all registered plugins and add them to the container
  PluginRegistry.forEach((plugin) => {
    plugins.set(plugin, plugin(self));
  });

  // Initialize all registered services
  ServiceRegistry.forEach((item) => getByClass(item));

  // Method to invoke a function on all services in parallel
  async function invokeParallel(name: string, ...args: unknown[]) {
    await Promise.all(
      Array.from(services.values()).map((obj) => {
        const instance: BServiceInstance<{ [key: string]: never }> =
          obj.instance;
        if (
          typeof instance === 'object' &&
          name in instance &&
          typeof instance[name] === 'function'
        ) {
          const fn = instance[name];
          return Promise.resolve(fn.apply(instance, args));
        }
        return Promise.resolve();
      }),
    );
  }

  // Method to invoke a function on all services in a specific order
  async function invokeLinear(name: string, ...args: unknown[]) {
    // Sort services based on their order property
    const ordered = Array.from(services.values()).sort(
      (a, b) => (a.class.order ?? 0) - (b.class.order ?? 0),
    );
    for (const obj of ordered) {
      const instance: BServiceInstance<{ [key: string]: never }> = obj.instance;
      if (
        typeof instance === 'object' &&
        name in instance &&
        typeof instance[name] === 'function'
      ) {
        const fn = instance[name];
        await Promise.resolve(fn.apply(instance, args));
      }
    }
  }

  // Method to clear services from the container
  function clear(
    filter?: (target: BServiceClass, instance: unknown) => boolean,
  ) {
    services.forEach((obj) => {
      if (filter && !filter(obj.class, obj.instance)) return;
      // If the instance has a reset method, call it
      if (
        typeof obj.instance === 'object' &&
        'reset' in obj.instance &&
        typeof obj.instance.reset === 'function'
      ) {
        obj.instance.reset();
      }
    });
  }

  // Method to retrieve a plugin by its class
  function getPluginByClass<T extends BPluginClass>(type: T): ReturnType<T> {
    const plugin = plugins.get(type) as unknown as ReturnType<T>;
    if (!plugin) throw new Error('Plugin not found.');
    return plugin;
  }

  // Method to resolve a service by its class
  async function resolveByClass<T>(target: T, scope?: string): Promise<T> {
    const service = target as BServiceClass;
    const key = scope ? `${service.identifier}_${scope}` : service.identifier;
    const impl = services.get(key);
    if (!impl) {
      const instance = makeService(target, key);
      // Invoke onCreate for each plugin when a new service is created
      for (const plugin of plugins.values()) {
        if (plugin.onCreate) {
          await plugin.onCreate(target as BServiceClass, instance);
        }
      }
      services.set(key, {
        class: service,
        instance,
      });
      return instance as T;
    }
    return impl.instance as T;
  }

  // Method to retrieve a service by its class
  function getByClass<T>(target: T, scope?: string): T {
    const service = target as BServiceClass;
    const key = scope ? `${service.identifier}_${scope}` : service.identifier;
    const impl = services.get(key);
    if (!impl) {
      const instance = makeService(target, key);
      // Invoke onCreate for each plugin when a new service is created
      for (const plugin of plugins.values()) {
        if (plugin.onCreate) {
          plugin.onCreate(target as BServiceClass, instance);
        }
      }
      services.set(key, {
        class: service,
        instance,
      });
      return instance as T;
    }
    return impl.instance as T;
  }

  // Method to retrieve a service by its name
  function getByName<T = unknown>(
    identifier: string,
    scope?: string,
  ): T | undefined {
    const key = scope ? `${identifier}_${scope}` : identifier;
    const impl = services.get(key);
    return impl?.instance as T;
  }

  // Helper function to create a service instance
  function makeService<T>(
    target: T,
    serviceIdentifier: string,
  ): BServiceInstance<T> {
    const metadata = target as BServiceClass;
    const keys = new Set(Object.keys(metadata.blueprint));
    const reservedKeywords = ['container ', 'reset', 'destroy'];

    // Check for reserved keywords in service blueprint
    for (const keyword of reservedKeywords) {
      if (!keys.has(keyword)) continue;
      console.error(
        `${serviceIdentifier}.${keyword}: ${keyword} is a reserved keyword, Please choose a different property name.`,
      );
    }

    const instance = Object.create(metadata.blueprint);

    // Add identifiers and methods to the instance
    Object.defineProperty(instance, IdentifierSymbol, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: serviceIdentifier,
    });

    Object.defineProperty(instance, 'container', {
      configurable: false,
      enumerable: false,
      get: () => self,
    });

    // Add reset and destroy methods to the service instance
    Object.defineProperty(instance, 'reset', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: () => {
        Object.keys(instance).forEach((key) => {
          instance[key] = structuredClone(metadata.blueprint[key]);
        });
      },
    });

    Object.defineProperty(instance, 'destroy', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: async () => {
        for (const plugin of plugins.values()) {
          if (plugin.onDestroy) {
            await plugin.onDestroy(target as BServiceClass, instance);
          }
        }
        services.delete(instance[IdentifierSymbol]);
      },
    });

    return instance as BServiceInstance<T>;
  }

  return self;
}
