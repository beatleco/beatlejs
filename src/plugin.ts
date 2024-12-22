import { BContainer } from './container';
import type { BServiceClass } from './service';

/**
 * Defines the structure of a plugin class for Beatle.
 * A plugin class is a factory function that returns a `BPlugin` instance.
 * This allows you to hook into service lifecycle events (such as creation and destruction)
 * for all registered services within the container.
 *
 * @description
 * A plugin class is used to create custom plugins that extend the functionality of Beatle.
 * It is a factory function that returns an object implementing the `BPlugin` interface.
 * This can be used to execute custom logic during the lifecycle of services (e.g., before and after service creation).
 *
 * The plugin class can optionally accept a `container` parameter, allowing the plugin to interact with
 * or access services and containers directly.
 *
 * You can register the plugin by passing the class to a `extendPlugin`.
 *
 * @example
 * ```tsx
 * import { extendPlugins } from "beatlejs";
 * import { BServiceClass, BServiceInstance, BPlugin } from "beatlejs";
 *
 * // Example of creating a plugin class
 * export function ExamplePlugin(): BPlugin {
 *   return {
 *     async onCreate(_: BServiceClass, instance: BServiceInstance<unknown>) {
 *       console.log("A service instance has been created.");
 *     },
 *     async onDestroy(_: BServiceClass, instance: BServiceInstance<unknown>) {
 *       console.log("A service instance is being destroyed.");
 *     },
 *   };
 * }
 *
 * // Register the plugin
 * extendPlugins(ExamplePlugin);
 * ```
 */
export type BPluginClass = { (container?: BContainer): BPlugin };

/**
 * Defines the structure for a Beatle plugin.
 * Plugins allow you to extend Beatle's functionality by hooking into service lifecycle events.
 *
 * @description
 * The `BPlugin` interface provides two optional methods, `onCreate` and `onDestroy`,
 * which are triggered during the creation and destruction of services within the container.
 * These methods allow you to run custom logic when services are loaded into memory or removed.
 * Plugins can be used to perform actions such as logging, managing side effects, or modifying services
 * when they are created or destroyed.
 *
 * @example
 * ```tsx
 * import { BServiceClass, BServiceInstance, BPlugin } from "beatlejs";
 *
 * export function ExamplePlugin(): BPlugin {
 *   return {
 *     async onCreate(target: BServiceClass, instance: BServiceInstance<unknown>) {
 *       console.log(`${target.identifier} has been created`);
 *     },
 *     async onDestroy(target: BServiceClass, instance: BServiceInstance<unknown>) {
 *       console.log(`${target.identifier} is being destroyed`);
 *     },
 *   };
 * }
 * ```
 */
export interface BPlugin {
  /**
   * Called when a service is loaded into memory.
   * This method is invoked for all registered services.
   *
   * @param target - The class definition of the service being created.
   * @param instance - The instance of the service being created.
   * @returns A promise that resolves once the onCreate logic is complete.
   */
  onCreate?(target: BServiceClass, instance: unknown): Promise<void>;

  /**
   * Called when a service's destroy function is triggered.
   * This method is invoked for all registered services.
   *
   * @param target - The class definition of the service being destroyed.
   * @param instance - The instance of the service being destroyed.
   * @returns A promise that resolves once the onDestroy logic is complete.
   */
  onDestroy?(target: BServiceClass, instance: unknown): Promise<void>;
}
