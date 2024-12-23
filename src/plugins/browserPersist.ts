import type { BContainer } from '../container';
import type { BPlugin } from '../plugin';
import { extendPlugins, ServiceRegistry } from '../registries';
import type {
  BServiceClass,
  BServiceDefinition,
  BServiceInstance
} from '../service';
import { PersistRegistry } from './persist';
import {
  type BNotifyEvent,
  getVaultFromInstance,
  SignalChannelName,
  SignalPlugin,
} from './signal';

const Symbol_dataProvider = Symbol('dataProvider');
const Symbol_onSaveTriggered = Symbol('onSaveTriggered');

function getKey(target: BServiceClass) {
  return `${target.identifier}_${target.version}`;
}

export type BPersistDataProviderFunction = (
  requestedKey: string,
) => Record<string, unknown> | undefined;
export type BPersistOnSaveTriggeredFunction = (
  requestedKey: string,
  serviceData: unknown,
) => Promise<void> | void;

/**
 * Enable automatic persisting of data.
 *
 * @param container - The DI container managing services and plugins.
 * @param dataProvider - A function that retrieves persisted data for a given key.
 * @param onSaveTriggered - A callback triggered when data needs to be saved.
 * @param debounceInterval - Optional debounce interval for save operations (default is 1000 ms).
 */
export async function browserPersist({
  container,
  dataProvider,
  onSaveTriggered,
  debounceInterval,
}: {
  container: BContainer;
  dataProvider: BPersistDataProviderFunction;
  onSaveTriggered: BPersistOnSaveTriggeredFunction;
  debounceInterval?: number;
}) {
  container.setProperty(Symbol_dataProvider, dataProvider);
  container.setProperty(Symbol_onSaveTriggered, onSaveTriggered);

  PersistRegistry.forEach((_, target) => {
    try {
      restoreServiceSnapshot(container, target, dataProvider(getKey(target)));
    } catch (e) {
      console.error(`error loading service data ${target.identifier}`, e);
    }
  });

  const persist: any = {};
  const debouncedPersist: any = {};
  const signal = container.getPluginByClass(SignalPlugin);

  function getPersistor(target: BServiceClass) {
    persist[target.identifier] =
      persist[target.identifier] ||
      ((target: BServiceClass) => {
        const instance = container.getByClass(target);
        const data = getServiceSnapshot(
          instance as never,
          PersistRegistry.get(target),
        );
        return onSaveTriggered(getKey(target), data);
      });
    return persist[target.identifier];
  }
  function getDebouncedPersistor(target: BServiceClass) {
    debouncedPersist[target.identifier] =
      debouncedPersist[target.identifier] ||
      debounce(() => {
        Promise.resolve(getPersistor(target)(target));
      }, debounceInterval ?? 1000);
    return debouncedPersist[target.identifier];
  }

  signal.eventBus.subscribe(SignalChannelName, (a: BNotifyEvent) => {
    if (a.similar) return;
    const data = PersistRegistry.get(a.target);
    if (!data || !data.has(a.propertyName)) return;
    getDebouncedPersistor(a.target)(a.target);
  });

  ['visibilitychange', 'pagehide', 'freeze', 'beforeunload'].forEach(
    (eventName) => {
      window.addEventListener(
        eventName,
        () => {
          if (
            eventName === 'visibilitychange' &&
            document.visibilityState === 'visible'
          )
            return;
          PersistRegistry.forEach((_, target) => {
            getPersistor(target)(target);
          });
        },
        {
          capture: false,
          passive: false,
        },
      );
    },
  );
}

function debounce(fn: (...args: any) => void, ms: number) {
  let tm: number | undefined = undefined;
  return function replacement(...args: any[]) {
    if (tm) {
      clearTimeout(tm);
      tm = undefined;
    }
    tm = setTimeout(() => {
      fn.apply(null, args);
      tm = undefined;
    }, ms) as unknown as number;
  };
}

function restoreServiceSnapshot(
  container: BContainer,
  target: BServiceDefinition | BServiceClass,
  snapshot?: Record<string, unknown>,
) {
  if (!snapshot) return;
  const instance = container.getByClass<Record<string, unknown>>(target);
  Object.entries(snapshot).forEach(([propertyName, value]) => {
    if (!(propertyName in instance)) return;
    instance[propertyName] = value;
  });
}

function getServiceSnapshot(
  instance: BServiceInstance<never>,
  properties?: Set<string>,
) {
  if (!properties) return;
  const output: Record<string, unknown> = {};
  let isServiceExportable = false;
  properties.forEach((propertyName) => {
    output[String(propertyName)] = instance[propertyName];
    isServiceExportable = true;
  });
  if (!isServiceExportable) return;
  return output;
}

function PersistPlugin(container: BContainer | undefined): BPlugin {
  const clone = new Set<BServiceClass>();
  ServiceRegistry.forEach((key) => clone.add(key));
  return {
    async onCreate(service: BServiceClass, instance: BServiceInstance<never>) {
      if (clone.has(service)) return;
      const dataProvider =
        container?.getProperty<BPersistDataProviderFunction>(
          Symbol_dataProvider,
        );
      if (dataProvider) {
        const data = dataProvider(getKey(service));
        if (data) {
          const vault = getVaultFromInstance(instance);
          const obj: Record<string, unknown> = instance;
          Object.entries(data).forEach(([key, value]) => {
            vault.set(key, value);
            obj[key] = value;
          });
        }
        clone.add(service);
      }
    },
    async onDestroy(service: BServiceClass, instance: BServiceInstance<never>) {
      const onSaveTriggered =
        container?.getProperty<BPersistOnSaveTriggeredFunction>(
          Symbol_onSaveTriggered,
        );
      if (onSaveTriggered) {
        const snapshot = getServiceSnapshot(
          instance,
          PersistRegistry.get(service),
        );
        if (snapshot) {
          onSaveTriggered(getKey(service), snapshot);
        }
        clone.delete(service);
      }
    },
  };
}

extendPlugins(PersistPlugin);
