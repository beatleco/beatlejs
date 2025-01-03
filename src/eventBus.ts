/**
 * A listener function for the EventBus.
 *
 * @description
 * The listener function is invoked when a specific event is dispatched on the EventBus.
 * It receives a message of type `M` and may perform asynchronous or synchronous operations based on that message.
 * The function can either return `Promise<void>` for asynchronous handling or `void` for synchronous handling.
 *
 * @example
 * ```tsx
 * const myListener: BListener<string> = async (message) => {
 *   console.log(`Received message: ${message}`);
 *   await someAsyncFunction(message);
 * };
 * ```
 *
 * @template M - The type of the message handled by the listener.
 */
export type BListener<M> = (message: M) => Promise<void> | void;
export type BUnsubscribe = () => void;

/**
 * Creates a new EventBus to handle asynchronous callbacks.
 * Essentially a Pub/Sub (Publish/Subscribe) system where events can be dispatched and listeners can be subscribed to specific event types.
 *
 * @description
 * The EventBus allows components or services to communicate by emitting events (dispatching) and subscribing to them to execute callback functions (listeners).
 * It supports asynchronous message processing by using Promises, and listeners can handle events either synchronously or asynchronously.
 *
 * The EventBus is useful in decoupling the components of an application. Producers (event dispatchers) do not need to know about consumers (listeners) directly.
 *
 * @example
 * ```tsx
 * const eventBus = EventBus<string, string>();
 * const unsubscribe = eventBus.subscribe('myEvent', async (message) => {
 *   console.log(`Received event: ${message}`);
 * });
 *
 * eventBus.dispatch('myEvent', 'Hello, world!');
 * unsubscribe(); // Unsubscribe from the event after use
 * ```
 *
 * @template T - The type of event (the event's identifier, such as a string).
 * @template M - The type of message that is passed to listeners when the event is dispatched.
 */
export function EventBus<T, M>() {
  // A map of event types to their respective listeners
  const listeners = new Map<T, BListener<M>[]>();

  function getListeners(type: T) {
    let bucket = listeners.get(type);
    if (!bucket) {
      bucket = [];
      listeners.set(type, bucket);
    }
    return bucket;
  }

  return {
    /**
     * Dispatches an event to all listeners subscribed to that event type.
     * It invokes each listener asynchronously by passing the provided message.
     *
     * @param type - The event type to dispatch.
     * @param message - The message to pass to each listener.
     * @returns A Promise that resolves when all listeners have been called.
     */
    async dispatch(type: T, message: M) {
      const listeners = getListeners(type);
      if (listeners.length) {
        await Promise.all(
          listeners.map((listener) => Promise.resolve(listener(message))),
        );
      }
    },

    /**
     * Subscribes to one or more event types and executes the provided listener when those events occur.
     *
     * @param args - The event types followed by the listener function. Supports multiple event types.
     * @returns A function to unsubscribe from all the events.
     */
    subscribe(type: T, listener: BListener<M>): BUnsubscribe {
      const listeners = getListeners(type);
      listeners.push(listener);
      return () =>
        Promise.resolve(() => {
          const idx = listeners.indexOf(listener);
          if (idx === -1) return;
          listeners.splice(idx, 1);
        });
    },
  };
}

export function UnaryBus<M>() {
  const listeners: BListener<M>[] = [];

  return {
    async dispatch(message: M) {
      if (!listeners.length) return;
      await Promise.all(
        listeners.map((listener) => Promise.resolve(listener(message))),
      );
    },
    subscribe(listener: BListener<M>): BUnsubscribe {
      listeners.push(listener);
      return () => {
        Promise.resolve(() => {
          const idx = listeners.indexOf(listener);
          if (idx === -1) return;
          listeners.splice(idx, 1);
        });
      };
    },
  };
}
