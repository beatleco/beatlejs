import './private/plugins';
import { BContainer } from '../../container';
import { BServiceClass } from '../../service';
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

  container.subscribe((a: BNotifyEvent) => {
    if (!a) return;
    if (a.type !== NotifyEventId) return;
    if (a.isSimilar) return;
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
