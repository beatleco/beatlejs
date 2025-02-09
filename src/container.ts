import { UnaryBus, type BListener, type BUnsubscribe } from './eventBus';
import type { BPlugin, BPluginClass } from './plugin';
import { PluginArray, ServiceIdentifiers, ServiceRegistry } from './registries';
import type { BServiceClass, BServiceInstance } from './service';

export const IdentifierSymbol = Symbol('identifier');
export const BusSymbol = Symbol('bus');

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
  reset(filter?: (target: BServiceClass, instance: unknown) => boolean): void;
  /**
   * Destroy services in the container.
   * Optionally, a filter function can be provided to target specific services for removal.
   *
   * @param {(target: BServiceClass, instance: unknown) => boolean} [filter] - An optional filter function to specify which services to clear.
   */
  destroy(filter?: (target: BServiceClass, instance: unknown) => boolean): void;

  /**
   * Register a lazy loaded plugin into the container.
   *
   * @param plugin plugin class to be registered
   */
  registerPlugin<T extends BPluginClass>(plugin: T): void;

  /**
   * Store a variable inside the container.
   *
   * @param name name of the variable
   */
  setProperty<T = unknown>(name: string | symbol, value: T): void;

  /**
   * Get a variable from the container.
   *
   * @param name name of the variable
   */
  getProperty<T = unknown>(name: string | symbol): T | undefined;

  /**
   * Dispatch a message to service event bus
   * 
   * @param message message to dispatch
   */
  dispatch<T>(message: T): Promise<void>;
  /**
   * Subscribe to service event bus
   * 
   * @param listener listener function 
   */
  subscribe<T>(listener: BListener<T>): BUnsubscribe;

  /**
   * Halt hooks and events that are happening (mostly used by plugins)
   * 
   * @param inert inert mode 
   */
  halt(inert: boolean): void;
  /**
   * Check for halt in the system (mostly used by plugins)
   */
  isHalted(): boolean;
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
export function Container(options?: { maxPlugins?: number }): BContainer {
  const services = new Map<string, BServiceTuple>();
  const context: Record<string | symbol, unknown> = {};
  const pluginSet = new Map<BPluginClass, number>();
  const pluginArray: BPlugin[] = Array(options?.maxPlugins ?? 128);
  let pluginCounter = 0;
  const bus = UnaryBus<unknown>();
  let bIsInert = false;

  const self: BContainer = {
    getByClass,
    getByName,
    getPluginByClass,
    resolveByClass,
    registerPlugin,
    invokeParallel,
    invokeLinear,
    reset,
    destroy,
    setProperty,
    getProperty,
    halt,
    isHalted,
    dispatch: bus.dispatch as BContainer['dispatch'],
    subscribe: bus.subscribe as BContainer['subscribe'],
  };

  function isHalted() {
    return bIsInert;
  }

  function halt(inert: boolean) {
    bIsInert = inert;
  }


  function setProperty<T = unknown>(name: string | symbol, value: T) {
    Object.defineProperty(context, name, {
      configurable: true,
      enumerable: true,
      writable: false,
      value,
    });
  }

  function getProperty<T = unknown>(name: string | symbol) {
    return context[name] as unknown as T | undefined;
  }

  function addPlugin(plugin: BPluginClass) {
    const instance = plugin(self);
    const index = pluginCounter++;
    pluginArray[index] = instance;
    pluginSet.set(plugin, index);
    return instance;
  }

  // Initialize all registered plugins and add them to the container
  PluginArray.forEach((plugin) => addPlugin(plugin));

  // Initialize all registered services
  ServiceRegistry.forEach((item) => getByClass(item));

  function registerPlugin(plugin: BPluginClass) {
    if (pluginSet.has(plugin)) return;
    const pluginInstance = addPlugin(plugin);
    services.forEach((value) => {
      if (pluginInstance.onCreate)
        pluginInstance.onCreate(value.class, value.instance);
    });
  }

  function autoRegisterNewPlugins() {
    if(PluginArray.length != pluginCounter) {
      for(let i = pluginCounter - 1; i < PluginArray.length; i++) {
        addPlugin(PluginArray[i]);
      }
    }
  }

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
  function reset(
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

  // Method to clear services from the container
  function destroy(
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
        obj.instance.destroy();
      }
    });
  }

  // Method to retrieve a plugin by its class
  function getPluginByClass<T extends BPluginClass>(type: T): ReturnType<T> {
    const index = pluginSet.get(type);
    if (typeof index === 'undefined') throw new Error('Plugin not found.');
    return pluginArray[index] as unknown as ReturnType<T>;
  }

  // Method to resolve a service by its class
  async function resolveByClass<T>(target: T, scope?: string): Promise<T> {
    const service = target as BServiceClass;
    const key = scope ? `${service.identifier}_${scope}` : service.identifier;
    const impl = services.get(key);
    if (!impl) {
      const instance = makeService(target, key);
      // Invoke onCreate for each plugin when a new service is created
      for (let i = 0; i < pluginCounter; i++) {
        const plugin = pluginArray[i];
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
      for (let i = 0; i < pluginCounter; i++) {
        const plugin = pluginArray[i];
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
  function getByName<T = unknown>(identifier: string, scope?: string): T {
    const key = scope ? `${identifier}_${scope}` : identifier;
    const impl = services.get(key);
    if (impl) return impl.instance as T;
    const target = ServiceIdentifiers.get(identifier);
    if (!target)
      throw new Error(
        `${identifier}: Service is not registered within the global scope`,
      );
    return getByClass(target, scope) as T;
  }

  // Helper function to create a service instance
  function makeService<T>(
    target: T,
    serviceIdentifier: string,
  ): BServiceInstance<T> {
    autoRegisterNewPlugins();
    const metadata = target as BServiceClass;
    const keys = new Set(Object.keys(metadata.blueprint));
    const reservedKeywords = [
      'container',
      'reset',
      'destroy',
      'dispatch',
      'subscribe',
    ];
    // Check for reserved keywords in service blueprint
    for (const keyword of reservedKeywords) {
      if (!keys.has(keyword)) continue;
      console.error(
        `${serviceIdentifier}.${keyword}: ${keyword} is a reserved keyword, Please choose a different property name.`,
      );
    }

    const instance = Object.create(metadata.blueprint);
    const bus = UnaryBus();

    Object.defineProperty(instance, BusSymbol, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: bus,
    });

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

    Object.defineProperty(instance, 'dispatch', {
      configurable: false,
      enumerable: false,
      value: bus.dispatch,
    });
    Object.defineProperty(instance, 'subscribe', {
      configurable: false,
      enumerable: false,
      value: bus.subscribe,
    });

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
        for (let i = pluginCounter - 1; i >= 0; i--) {
          const plugin = pluginArray[i];
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
