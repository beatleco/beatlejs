import { useCallback, useEffect, useState } from 'react';
import { IdentifierSymbol } from '../container';
import { EventBus } from '../eventBus';
import { useContainer } from '../react';
import { MakeCustomRegistry, PluginRegistry } from '../registries';
import type { BDescriptor, BServiceClass, BServiceInstance } from '../service';
/**
 * Type definition for the Property Vault.
 * The vault is a map that stores properties of a service instance.
 */
export type PropertyVault = Map<string, unknown>;

/**
 * Symbol used to identify the property vault on service instances.
 */
export const VaultSymbol = Symbol('__vault__');

/**
 * Signal channel name used for broadcasting events.
 */
export const SignalChannelName = '\x00';

/**
 * A custom registry for signal definitions.
 * Stores information about methods that will trigger signal events.
 */
export const SignalRegistry = MakeCustomRegistry<string>();

/**
 * Type definition for the notification event when a property is updated.
 * It includes details about the service, the property, and the old/new values.
 */
export type BNotifyEvent = {
  target: BServiceClass;
  instance: BServiceInstance<unknown>;
  key: string;
  propertyName: string;
  value: unknown;
  similar: boolean;
};

/**
 * A decorator function to register a service method for signal broadcasting.
 * It registers the method in the SignalRegistry to enable signal notifications when the property changes.
 *
 * @example
 *
 *
 * @param next The original method descriptor.
 */
export function signal<T>(next: BDescriptor<T>): BDescriptor<T> {
  return function (target, key) {
    // Register the method in the SignalRegistry to track signal events
    SignalRegistry.register(target, key);
    return next(target, key); // Return the original method descriptor
  };
}

/**
 * Type that maps a list of service classes to instances, using an optional ID.
 */
export type BUseSignal<T> = {
  [K in keyof T]: T[K];
};

/**
 * Hook to subscribe to signals from one or more services.
 * It listens to property changes and triggers the provided callback when updates occur.
 *
 * @param services The list of services to subscribe to.
 * @param scope Optional scope for a specific instance of a service.
 */
export function useSignal<T extends unknown[]>(
  services: [...T],
  scope?: string,
): BUseSignal<T> {
  const container = useContainer(); // Get the service container
  const [, setLocalState] = useState<Record<string, unknown>>({}); // State to track updated values

  const firstService = services[0] as BServiceClass;

  // Callback function to handle the received signal message
  const onMessage = useCallback(async function ({
    key,
    propertyName,
    value,
    target,
  }: BNotifyEvent) {
    if (scope) {
      if (key === target.identifier && scope.indexOf(key) === -1) return;
    } else {
      if (key !== target.identifier) return;
    }
    setLocalState((localState) => {
      const uniquePropertyPath = `${key}_${propertyName}`;
      if (localState[uniquePropertyPath] === value) return localState;
      return {
        ...localState,
        [uniquePropertyPath]: value, // Update the state with new value
      };
    });
  }, []);

  useEffect(() => {
    const signalPlugin = container.getPluginByClass(SignalPlugin); // Get the signal plugin from container
    if (services.length === 1) {
      // Subscribe to the signal for a single service
      return signalPlugin.subscribe(
        scope ? `${firstService.identifier}_${scope}` : firstService,
        onMessage,
      );
    } else {
      // Subscribe to signals for all services in the array
      return signalPlugin.subscribeAll(onMessage);
    }
  }, [container, onMessage, firstService, services.length, scope]);

  // Return mapped service instances
  return services.map((service) =>
    container.getByClass(service, scope),
  ) as unknown as BUseSignal<T>;
}

/**
 * Signal plugin responsible for dispatching and subscribing to property change signals.
 * It manages event bus subscriptions and handles service property updates.
 */
export function SignalPlugin() {
  const eventBus = EventBus<string, BNotifyEvent>(); // Event bus for managing signal messages

  return {
    eventBus,
    /**
     * Subscribe to a specific signal event for a target service or service identifier.
     *
     * @param target The target service or service identifier to subscribe to.
     * @param listener The callback listener for the event.
     */
    subscribe(
      target: BServiceClass | string,
      listener: (message: BNotifyEvent) => Promise<void>,
    ) {
      return eventBus.subscribe(
        typeof target === 'string' ? target : target.identifier,
        listener,
      );
    },

    /**
     * Subscribe to signals from all services within the signal system.
     *
     * @param listener The callback listener for the event.
     */
    subscribeAll(listener: (message: BNotifyEvent) => Promise<void>) {
      return eventBus.subscribe(SignalChannelName, listener); // Broadcast to all services
    },

    /**
     * Called when a service is created.
     * It sets up property getters and setters to handle property updates and dispatch signals.
     *
     * @param target The service class.
     * @param instance The service instance.
     */
    async onCreate(target: BServiceClass, instance: BServiceInstance<never>) {
      const definitions = SignalRegistry.get(target); // Get the list of properties to track
      if (!definitions) return;
      const vault = getVaultFromInstance(instance); // Get the vault for the instance

      definitions.forEach(function (propertyName) {
        if (!propertyName) return;
        // Store the initial property value in the vault
        vault.set(propertyName, instance[propertyName]);
        Object.defineProperty(instance, propertyName, {
          configurable: false, // Prevent further modifications to property descriptor
          enumerable: true, // Make the property enumerable
          get: () => vault.get(propertyName), // Get the property value from vault
          set(value) {
            const org = vault.get(propertyName); // Get the current property value
            const event: BNotifyEvent = {
              target,
              instance,
              key: instance[IdentifierSymbol] as string,
              propertyName,
              value,
              similar: org === value, // Indicate whether the value has changed
            };
            vault.set(propertyName, value); // Update the vault with the new value
            eventBus.dispatch(SignalChannelName, event); // Dispatch the signal to all listeners
            eventBus.dispatch(instance[IdentifierSymbol], event); // Dispatch the signal to specific instance listeners
          },
        });
      });
    },
  };
}

/**
 * Retrieves the property vault for a given service instance.
 * If the vault does not exist, it creates and attaches a new one.
 *
 * @param instance The service instance.
 * @returns The property vault for the instance.
 */
export function getVaultFromInstance(
  instance: BServiceInstance<never>,
): PropertyVault {
  let vault: PropertyVault = instance[VaultSymbol];
  if (!vault) {
    vault = new Map(); // Create a new vault if it doesn't exist
    Object.defineProperty(instance, VaultSymbol, {
      configurable: false,
      writable: false,
      enumerable: false,
      value: vault, // Attach the vault to the service instance
    });
  }
  return vault;
}

/**
 * Registers the SignalPlugin into the plugin registry for system-wide use.
 */
PluginRegistry.add(SignalPlugin);
