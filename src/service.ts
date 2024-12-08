import type { BContainer, IdentifierSymbol } from './container';
import { ServiceIdentifiers, ServiceRegistry } from './registries';

export type BServiceOptions = {
  identifier: string;
  order?: number;
  version?: number;
};

export interface BDescriptor<T> {
  (target: BServiceClass, key: string): T;
}

export type BServiceClass = {
  key: number;
  identifier: string;
  blueprint: {
    [key: string | symbol]: unknown;
  };
} & BServiceOptions;

export type BServiceDefinition = {
  [IdentifierSymbol]: string;
  container: BContainer;
  reset(): void;
  destroy(): Promise<void>;
};

export type BServiceProto<T> = {
  [K in keyof T]: T[K] extends BDescriptor<infer U> ? U : never;
};

export type BServiceInstance<T> = BServiceProto<T> & {
  [IdentifierSymbol]: string;
  container: BContainer;
  reset(): void;
  destroy(): Promise<void>;
};

export const Service = (function () {
  let index = 1;
  return function <T extends Record<string, BDescriptor<unknown>>>(
    options: BServiceOptions,
    obj: T,
  ) {
    const key = index + 1;
    const version = options.version ?? 1;
    const identifier =
      options.identifier?.replace(/[^a-zA-Z0-9-.]/, '') ?? key.toString();
    const existing = ServiceIdentifiers.get(identifier);
    if (existing) {
      console.error(
        `${identifier}: Duplicate identifier found, service identifiers must be unique.`,
      );
      return existing as unknown as BServiceInstance<T>;
    }
    index++;

    const order = options.order ?? 0;
    const service: BServiceClass = {
      key: key,
      identifier,
      order: order,
      version: version,
      blueprint: {},
    };
    Object.entries(obj).forEach(([key, field]) => {
      const value = field(service, key);
      Object.defineProperty(service.blueprint, key, {
        writable: true,
        enumerable: true,
        configurable: false,
        value: value,
      });
    });
    ServiceIdentifiers.set(identifier, service);
    ServiceRegistry.add(service);
    return service as unknown as BServiceInstance<T>;
  };
})();