import { useCallback, useEffect, useState } from 'react';
import { IdentifierSymbol } from '../container';
import { EventBus } from '../eventBus';
import { useContainer } from '../react';
import { MakeCustomRegistry, PluginRegistry } from '../registries';
import type { BDescriptor, BServiceClass, BServiceInstance } from '../service';
import { getVault } from '../vault';

export const SignalChannelName = '\x00';
export const SignalRegistry = MakeCustomRegistry<string>();

export type BNotifyEvent = {
  target: BServiceClass;
  instance: BServiceInstance<unknown>;
  key: string;
  propertyName: string;
  value: unknown;
  similar: boolean;
};

export function signal<T>(next: BDescriptor<T>): BDescriptor<T> {
  return function (target, key) {
    SignalRegistry.register(target, key);
    return next!(target, key);
  };
}

export type BUseSignal<T> = {
  [K in keyof T]: T[K];
};

export function useSignal<T extends unknown[]>(
  services: [...T],
  id?: string,
): BUseSignal<T> {
  const container = useContainer();
  const [, setLocalState] = useState<Record<string, unknown>>({});

  const len = services.length;
  const firstService = services[0] as BServiceClass;

  const onMessage = useCallback(async function ({
    key,
    propertyName,
    value,
  }: BNotifyEvent) {
    setLocalState((localState) => {
      const uniquePropertyPath = `${key}_${propertyName}`;
      if (localState[uniquePropertyPath] === value) return localState;
      return {
        ...localState,
        [uniquePropertyPath]: value,
      };
    });
  }, []);

  useEffect(() => {
    const signalPlugin = container.getPluginByClass(SignalPlugin);
    if (len === 1) {
      return signalPlugin.subscribe(
        id ? `${firstService.identifier}_${id}` : firstService,
        onMessage,
      );
    } else {
      return signalPlugin.subscribeAll(onMessage);
    }
  }, [container, onMessage, firstService, len, id]);

  return services.map((service) =>
    container.getByClass(service, id),
  ) as unknown as BUseSignal<T>;
}

export function SignalPlugin() {
  const eventBus = EventBus<string, BNotifyEvent>();

  return {
    eventBus,
    subscribe(
      target: BServiceClass | string,
      listener: (message: BNotifyEvent) => Promise<void>,
    ) {
      return eventBus.subscribe(
        typeof target === 'string' ? target : target.identifier,
        listener,
      );
    },
    subscribeAll(listener: (message: BNotifyEvent) => Promise<void>) {
      return eventBus.subscribe(SignalChannelName, listener);
    },
    async onCreate(target: BServiceClass, instance: BServiceInstance<never>) {
      const definitions = SignalRegistry.get(target);
      if (!definitions) return;
      const vault = getVault(instance);

      definitions.forEach(function (propertyName) {
        if (!propertyName) return;
        vault.set(propertyName, instance[propertyName]);
        Object.defineProperty(instance, propertyName, {
          configurable: false,
          enumerable: true,
          get: () => vault.get(propertyName),
          set(value) {
            const org = vault.get(propertyName);
            const event: BNotifyEvent = {
              target,
              instance,
              key: instance[IdentifierSymbol] as string,
              propertyName,
              value,
              similar: org === value,
            };
            vault.set(propertyName, value);
            eventBus.dispatch(SignalChannelName, event);
            eventBus.dispatch(instance[IdentifierSymbol], event);
          },
        });
      });
    },
  };
}

PluginRegistry.add(SignalPlugin);
