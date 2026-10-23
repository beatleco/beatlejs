import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type BNotifyEvent, NotifyEventId } from '../../../events';
import { type BServiceInstance } from '../../../service';
import { useContainer } from '../hooks';
import { IdentifierSymbol, type BGetOptions } from '../../../container';
/**
 * Type that maps a list of service classes to instances, using an optional ID.
 */
export type BUseSignal<T> = {
  [K in keyof T]: T[K];
};

type PropKey = string | number | symbol;

// True union of keys across all element types (not keyof-of-union intersection)
type UnionKeys<T extends unknown[]> = T extends [infer Head, ...infer Tail]
  ? keyof Head | UnionKeys<Tail>
  : never;

// Walks the tuple, tracking keys seen so far.
// A repeated key gets replaced by an error-message literal, which breaks
// the assignment when it doesn't match what was actually passed in.
type NoDuplicates<
  Keys extends readonly PropKey[],
  Seen extends PropKey = never,
> = Keys extends readonly [
  infer Head extends PropKey,
  ...infer Rest extends readonly PropKey[],
]
  ? Head extends Seen
  ? readonly [`Duplicate key: ${Head & string}`, ...NoDuplicates<Rest, Seen>]
  : readonly [Head, ...NoDuplicates<Rest, Seen | Head>]
  : Keys;

/**
 * Hook to subscribe to signals from one or more services.
 * It listens to property changes and triggers the provided callback when updates occur.
 *
 * @param services The list of services to subscribe to.
 * @param scope Optional scope for a specific instance of a service.
 */

export function useSignal<
  T extends unknown[],
  const K extends readonly UnionKeys<T>[],
>(
  services: [...T],
  options?: BGetOptions<T[number]> & { keys?: NoDuplicates<K>; pure?: boolean },
): BUseSignal<T> {
  const container = useContainer();
  const cached = useRef<any>(options?.pure ? {} : undefined);
  const scope = options?.scope ?? null;
  const keys = options?.keys ?? null;
  const serviceInstances = useMemo(
    () =>
      services.map((service) =>
        container.getByClass(service, options),
      ) as unknown as BUseSignal<T>,
    [scope],
  );
  const set = useMemo(() => (keys ? new Set(keys) : null), [keys]);
  const [, setLocalState] = useState<number>(0); // State to track updated values
  const onMessage = useCallback(
    (event: BNotifyEvent) => {
      if (!event) return;
      if (event.type !== NotifyEventId) return;
      if (event.isSimilar) return;
      if (set && !set.has(event.propertyName as never)) return;

      if (options?.pure) {
        const key = `${event.instance[IdentifierSymbol]}__${event.propertyName}`;
        if (cached.current && cached.current[key] === event.value) return;
        cached.current[key] = event.value;
      }

      setLocalState((localState) => localState + 1);
    },
    [scope, set],
  );
  useEffect(() => {
    const subs = serviceInstances.map((service) => {
      const svc = service as BServiceInstance<unknown>;
      return svc.subscribe(onMessage);
    });
    return () => subs.forEach((un) => un());
  }, [onMessage]);
  return serviceInstances;
}
