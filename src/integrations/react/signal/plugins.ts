import { SignalRegistry } from '../../../decorators/signal';
import { extendPlugins } from '../../../registries';
import { type BServiceClass, type BServiceInstance } from '../../../service';
import { getVaultFromInstance } from '../../../vault';
import { type BNotifyEvent, NotifyEventId } from '../../../events';

function SignalPlugin() {
  return {
    async onCreate(target: BServiceClass, instance: BServiceInstance<unknown>) {
      const definitions = SignalRegistry.get(target);
      if (!definitions) return;
      const vault = getVaultFromInstance(instance);
      definitions.forEach(function (propertyName) {
        if (!propertyName) return;
        const ref = instance as unknown as Record<string, any>;
        vault.set(propertyName, { value: ref[propertyName] });
        Object.defineProperty(instance, propertyName, {
          configurable: true,
          enumerable: true,
          get: () => vault.get(propertyName)?.value,
          set(value) {
            const val = vault.get(propertyName);
            if (!val) return;
            const event: BNotifyEvent = {
              type: NotifyEventId,
              propertyName,
              value,
              target,
              prevValue: val.value,
              isSimilar: val.value === value,
              instance,
            };
            val.value = value;

            instance.container.dispatch(event);
            instance.dispatch(event);
          },
        });
      });
    },
  };
}

extendPlugins(SignalPlugin);
