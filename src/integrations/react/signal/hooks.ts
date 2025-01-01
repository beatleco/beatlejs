import { useCallback, useEffect, useMemo, useState } from 'react';
import { BNotifyEvent, NotifyEventId } from '../../../events';
import { BServiceInstance } from '../../../service';
import { useContainer } from '../hooks';
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
  const [, setLocalState] = useState<number>(0); // State to track updated values

  // Callback function to handle the received signal message
  const onMessage = useCallback(
    (event: BNotifyEvent) => {
      if (!event) return;
      if (event.isSimilar) return;
      if (event.type !== NotifyEventId) return;
      setLocalState((localState) => localState + 1);
    },
    [scope],
  );

  useEffect(() => {
    const subs = services.map((target) => {
      const svc = container.getByClass(target) as BServiceInstance<unknown>;
      return svc.subscribe(onMessage);
    });
    return () => subs.forEach((un) => un());
  }, []);

  // Return mapped service instances
  return useMemo(
    () =>
      services.map((service) =>
        container.getByClass(service, scope),
      ) as unknown as BUseSignal<T>,
    [scope],
  );
}
