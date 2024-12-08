export type BListener<M> = (message: M) => Promise<void> | void;

export function EventBus<T, M>() {
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
    dispatch(type: T, message: M) {
      const listeners = getListeners(type);
      if (listeners.length) {
        return Promise.all(
          listeners.map((listener) => Promise.resolve(listener(message))),
        );
      }
    },
    subscribe(type: T, listener: BListener<M>): () => void {
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
