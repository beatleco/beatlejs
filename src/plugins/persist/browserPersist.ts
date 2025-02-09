import './private/plugins';
import { BContainer, IdentifierSymbol } from '../../container';
import { BServiceClass, BServiceInstance } from '../../service';
import { PersistRegistry } from './decorators';
import {
  getKey,
  Symbol_dataProvider,
  Symbol_onSaveTriggered,
} from './private/symbols';
import {
  debounce,
  getServiceSnapshot,
  restoreServiceSnapshot,
} from './private/utils';
import { BNotifyEvent, NotifyEventId } from '../../events';

function getProps(target: BServiceClass) {
  let set = PersistRegistry.get(target);
  if (target.extends) {
    const newSet = getProps(target.extends as BServiceClass);
    if (newSet) {
      if (!set) set = new Set();
      newSet.forEach(prop => set?.add(prop));
    }
  }
  return set;
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

  for (const item of container.getServices()) {
    try {
      restoreServiceSnapshot(container, item.class, dataProvider(getKey(item.class, item.instance)));
    } catch (e) {
      console.error(`error loading service data ${item.instance[IdentifierSymbol]}`, e);
    }
  }

  const persist: any = {};
  const debouncedPersist: any = {};

  function getPersistor(target: BServiceClass, instance: BServiceInstance<unknown>) {
    const identifier = instance[IdentifierSymbol];
    persist[identifier] =
      persist[identifier] ||
      (() => {
        const data = getServiceSnapshot(
          instance as never,
          getProps(target),
        );
        return onSaveTriggered(getKey(target, instance), data);
      });
    return persist[identifier];
  }
  function getDebouncedPersistor(target: BServiceClass, instance: BServiceInstance<unknown>) {
    const identifier = instance[IdentifierSymbol];
    debouncedPersist[identifier] =
      debouncedPersist[identifier] ||
      debounce(() => {
        getPersistor(target, instance)()
      }, debounceInterval ?? 1000);
    return debouncedPersist[identifier];
  }

  container.subscribe((a: BNotifyEvent) => {
    if (!a) return;
    if (a.type !== NotifyEventId) return;
    if (a.isSimilar) return;
    const data = getProps(a.target);
    if (!data || !data.has(a.propertyName)) return;
    getDebouncedPersistor(a.target, a.instance)();
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
          for (const item of container.getServices()) {
            getPersistor(item.class, item.instance)();
          }
        },
        {
          capture: false,
          passive: false,
        },
      );
    },
  );
}
