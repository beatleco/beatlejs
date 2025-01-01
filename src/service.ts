import type { BContainer, IdentifierSymbol } from './container';
import type { BListener, BUnsubscribe } from './eventBus';
import { ServiceIdentifiers, ServiceRegistry } from './registries';

/**
 * Defines the options for a service.
 */
export type BServiceOptions = {
  /**
   * A unique and identifiable name for your service.
   * @required
   */
  identifier: string;
  /**
   * Specifies the order of execution.
   *
   * @description
   * Determines the execution sequence when invoking methods through the container.
   * The container will execute functions from loaded services in ascending order of their specified `order` value.
   *
   * @default 0
   *
   * @example
   * ```tsx
   * import { Container, Service, func } from "beatlejs";
   *
   * Service(
   *   {
   *     order: 1,
   *     identifier: "ServiceB",
   *   },
   *   {
   *     greet: func(() => {
   *       console.log("greet from ServiceB is called");
   *     }),
   *   }
   * );
   *
   * Service(
   *   {
   *     order: 2,
   *     identifier: "ServiceA",
   *   },
   *   {
   *     greet: func(() => {
   *       console.log("greet from ServiceA is called");
   *     }),
   *   }
   * );
   * ```
   *
   * @output
   * ```
   * greet from ServiceB is called
   * greet from ServiceA is called
   * ```
   */
  order?: number;
  /**
   * Specifies the version of the service.
   * @default 1
   */
  version?: number;
};

/**
 * Defines the options for a descriptor.
 *
 * @description
 * Descriptors are similar to decorators in Python/TypeScript, annotations in Java, or attributes in C#,
 * but implemented in pure JavaScript. A descriptor serves as a foundational building block for extending Beatle.
 * Use this type to create custom descriptors tailored to your needs.
 *
 * @example
 * ```tsx
 * import type { BDescriptor, BServiceClass } from "beatlejs";
 * import { MakeArrayRegistry } from 'beatlejs/registries';
 * export const DebounceRegistry = MakeArrayRegistry<{
 *   propertyName: string;
 *   ms: number
 * }>();
 * function debounced<T>(
 *   next: BDescriptor<T>,
 *   ms?: number
 * ): BDescriptor<T> {
 *   return function (target: BServiceClass, propertyName: string) {
 *     // Process metadata as needed
 *     DebounceRegistry.register(target, { propertyName, ms });
 *     return next(target, propertyName);
 *   };
 * }
 * ```
 */
export interface BDescriptor<T> {
  (
    /**
     * A reference to the service definition invoking the descriptor.
     */
    target: BServiceClass,
    /**
     * The name of the service property being utilized by the descriptor.
     */
    propertyName: string,
  ): T;
}

/**
 * Registers and defines a service in the registry.
 */
export type BServiceClass = {
  index: number;
  identifier: string;
  blueprint: {
    [key: string | symbol]: unknown;
  };
} & BServiceOptions;

/**
 * Represents the definition of a service.
 */
export type BServiceDefinition = {
  [IdentifierSymbol]: string;
  container: BContainer;
  reset(): void;
  destroy(): Promise<void>;
  dispatch<T>(message: T): Promise<void>;
  subscribe<T>(listener: BListener<T>): BUnsubscribe;
};

/**
 * Represents the definition of a service prototype.
 */
export type BServiceProto<T> = {
  [K in keyof T]: T[K] extends BDescriptor<infer U> ? U : never;
};

/**
 * Represents an instance of a service.
 */
export type BServiceInstance<T> = BServiceProto<T> & BServiceDefinition;
/**
 * Provides a way to define services that can be accessed through containers.
 * This function allows you to register services with a given configuration and define their properties and methods.
 *
 * @example
 * ```tsx
 * import { Service } from "beatlejs";
 * const $AwesomeService = Service({
 *   identifier: 'AwesomeService',
 * });
 * ```
 *
 * @param {BServiceOptions} options - The configuration options for the service.
 * @param {T} definition - The service definition, which includes properties and methods that will be exposed to the container.
 * @returns {BServiceInstance<T>} The defined service with all its properties and methods.
 */
export function Service<T extends Record<string, BDescriptor<unknown>>>(
  /**
   * Service configuration and options.
   * This includes properties like the service identifier, version, and other settings.
   */
  options: BServiceOptions,

  /**
   * Service Definition Properties
   *
   * @description
   * These properties are similar to class properties in ECMAScript but are designed for use in pure JavaScript.
   * Define the properties and methods that you want to expose as public, making them accessible to other services or components in the container.
   * Other services within the container can interact with these public properties and methods.
   *
   * @example
   * ```tsx
   * import { Service, val, func } from "beatlejs";
   * const $AwesomeService = Service({
   *   identifier: 'AwesomeService',
   * }, {
   *   sayHello: func(() => console.log('hello world!')),
   *   someValue: val(12),
   * });
   * ```
   */
  definition: T,
): BServiceInstance<T> {
  const version = options.version ?? 1;
  const identifier = options.identifier?.replace(/[^a-zA-Z0-9-.]/, '');
  const existing = ServiceIdentifiers.get(identifier);
  if (existing) {
    console.error(
      `${identifier}: Duplicate identifier found, service identifiers must be unique.`,
    );
    return existing as unknown as BServiceInstance<T>;
  }

  const order = options.order ?? 0;
  const service: BServiceClass = {
    identifier,
    order: order,
    version: version,
    blueprint: {},
    index: counter++,
  };
  Object.entries(definition).forEach(([key, field]) => {
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
}

let counter = 0;
