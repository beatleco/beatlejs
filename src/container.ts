import type { BPlugin, BPluginClass } from './plugin';
import { PluginRegistry, ServiceRegistry } from './registries';
import type { BServiceClass, BServiceInstance } from './service';

export const IdentifierSymbol = Symbol('identifier');

export type BServiceTuple = {
  class: BServiceClass;
  instance: BServiceInstance<unknown>;
};

export type BContainer = {
  getByClass<T>(target: T, scope?: string): T;
  getByName<T = unknown>(name: string, scope?: string): T | undefined;
  getPluginByClass<T extends BPluginClass>(type: T): ReturnType<T>;
  resolveByClass<T>(target: T, scope?: string): Promise<T>;
  invokeParallel(name: string, ...args: unknown[]): Promise<void>;
  invokeLinear(name: string, ...args: unknown[]): Promise<void>;
  clear(filter?: (target: BServiceClass, instance: unknown) => boolean): void;
};

export function Container(): BContainer {
  const services = new Map<string, BServiceTuple>();
  const plugins = new Map<BPluginClass, BPlugin>();
  const self: BContainer = {
    getByClass,
    getByName,
    getPluginByClass,
    resolveByClass,
    invokeParallel,
    invokeLinear,
    clear,
  };

  PluginRegistry.forEach((plugin) => {
    plugins.set(plugin, plugin(self));
  });
  ServiceRegistry.forEach((item) => getByClass(item));


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

  async function invokeLinear(name: string, ...args: unknown[]) {
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
        return Promise.resolve(fn.apply(instance, args));
      }
    }
  }

  function clear(
    filter?: (target: BServiceClass, instance: unknown) => boolean,
  ) {
    services.forEach((obj) => {
      if (filter && !filter(obj.class, obj.instance)) return;
      if (
        typeof obj.instance === 'object' &&
        'reset' in obj.instance &&
        typeof obj.instance.reset === 'function'
      ) {
        obj.instance.reset();
      }
    });
  }
  function getPluginByClass<T extends BPluginClass>(type: T): ReturnType<T> {
    const plugin = plugins.get(type) as unknown as ReturnType<T>;
    if (!plugin) throw new Error('Plugin not found.');
    return plugin;
  }

  async function resolveByClass<T>(target: T, scope?: string): Promise<T> {
    const service = target as BServiceClass;
    const key = scope ? `${service.identifier}_${scope}` : service.identifier;
    const impl = services.get(key);
    if (!impl) {
      const instance = makeService(target, key);
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

  function getByClass<T>(target: T, scope?: string): T {
    const service = target as BServiceClass;
    const key = scope ? `${service.identifier}_${scope}` : service.identifier;
    const impl = services.get(key);
    if (!impl) {
      const instance = makeService(target, key);
      for (const plugin of plugins.values()) {
        if(plugin.onCreate) {
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

  function getByName<T = unknown>(
    identifier: string,
    scope?: string,
  ): T | undefined {
    const key = scope ? `${identifier}_${scope}` : identifier;
    const impl = services.get(key);
    return impl?.instance as T;
  }

  function makeService<T>(
    target: T,
    serviceIdentifier: string,
  ): BServiceInstance<T> {
    const metadata = target as BServiceClass;
    const keys = new Set(Object.keys(metadata.blueprint));
    const reservedKeywords = ['container ', 'reset', 'destroy'];
    for (const keyword of reservedKeywords) {
      if (!keys.has(keyword)) continue;
      console.error(
        `${serviceIdentifier}.${keyword}: ${keyword} is a reserved keyword, Please choose a different property name.`,
      );
    }
    const instance = Object.create(metadata.blueprint);
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
