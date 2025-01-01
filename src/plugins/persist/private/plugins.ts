import { BContainer } from '../../../container';
import { BPlugin } from '../../../plugin';
import { extendPlugins, ServiceRegistry } from '../../../registries';
import { BServiceClass, BServiceInstance } from '../../../service';
import { getVaultFromInstance } from '../../../vault';
import {
  BPersistDataProviderFunction,
  BPersistOnSaveTriggeredFunction,
} from '../browserPersist';
import { PersistRegistry } from '../decorators';
import { getKey, Symbol_dataProvider, Symbol_onSaveTriggered } from './symbols';
import { getServiceSnapshot } from './utils';

function PersistPlugin(container: BContainer | undefined): BPlugin {
  const clone = new Set<BServiceClass>();
  ServiceRegistry.forEach((key) => clone.add(key));
  return {
    async onCreate(
      service: BServiceClass,
      instance: BServiceInstance<unknown>,
    ) {
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
            vault.set(key, { value });
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
