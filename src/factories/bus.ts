import { func } from '../decorators/func';
import { val } from '../decorators/val';
import { type BListener, EventBus } from '../eventBus';
import { Service } from '../service';

/**
 * Creates a custom event bus for managing events and their listeners.
 *
 * @template EventBody - The structure of the events handled by the bus. Each event must have a `type` field.
 * @param identifier - An optional identifier for the bus (default is 'Bus').
 * @param waitForDebounceInterval - The debounce interval (in ms) for the `waitFor` functionality (default is 100 ms).
 * @returns An event bus instance with dispatch, subscribe, and waitFor methods.
 */
export function bus<EventBody extends { type: unknown }>(
  identifier = 'Bus',
  waitForDebounceInterval = 100,
) {
  /**
   * A service to handle event dispatching, subscribing, and waiting for events.
   * This service uses a custom event bus to manage event-driven functionality.
   */
  const self = Service(
    { identifier, order: -1000 },
    {
      bus: val(EventBus<EventBody['type'], EventBody>()),
      dispatchSet: val(new Set<EventBody['type']>()),
      emit: func(emit),
      on: func(on),
      waitFor: func(waitFor),
    },
  );

  /**
   * Dispatches an event to the event bus and tracks the event type in `_dispatchSet`.
   *
   * @param this - The current service instance.
   * @param message - The event body containing the type and event data.
   */
  async function emit(this: typeof self, message: EventBody) {
    await this.bus.dispatch(message.type, message);
    this.dispatchSet.add(message.type);
  }

  /**
   * Subscribes to one or more event types and executes the provided listener when those events occur.
   *
   * @param this - The current service instance.
   * @param args - The event types followed by the listener function. Supports multiple event types.
   * @returns A function to unsubscribe from all the events.
   */
  function on<T extends EventBody>(
    this: typeof self,
    ...args: [T['type'], ...T['type'][], BListener<unknown>]
  ) {
    if (args.length < 3) {
      // Subscribe to a single event type.
      return this.bus.subscribe(args[0] as T['type'], args[1] as any);
    }
    const un: VoidFunction[] = [];
    const listener = args[args.length - 1];
    for (let i = 0; i < args.length - 1; i++) {
      const type = args[i];
      un.push(this.bus.subscribe(type as T['type'], listener as any));
    }
    // Return a function that unsubscribes from all event types.
    return () => un.forEach((a) => a());
  }

  /**
   * Waits for a specific set of event types to be dispatched.
   * Resolves the promise when all specified event types are dispatched.
   *
   * @param this - The current service instance.
   * @param types - The event types to wait for.
   * @returns A promise that resolves when all specified event types are dispatched.
   */
  function waitFor<T extends EventBody['type']>(
    this: typeof self,
    ...types: [T, ...T[]]
  ) {
    return new Promise((acc) => {
      const check = () => {
        if (types.every((type) => this.dispatchSet.has(type))) {
          acc(true);
          return;
        }
        setTimeout(check, waitForDebounceInterval);
      };
      check();
    });
  }

  return self;
}
