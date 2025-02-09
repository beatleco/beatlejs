import { DePromise } from "../../types";

export const cacheManager = {
  clear(serviceHandler: unknown, match?: ((key: string) => boolean)) {
    if (typeof serviceHandler !== 'function') return;
    if ('clear' in serviceHandler && typeof serviceHandler.clear === 'function') {
      serviceHandler.clear(match);
    }
  },
  replace<
    T extends (...args: any) => any,
    Q = DePromise<ReturnType<T>>,
  >(serviceHandler: T, replacer: (preValue: Q) => Q, match?: ((key: string) => boolean)) {
    if (typeof serviceHandler !== 'function') return;
    if ('replace' in serviceHandler && typeof serviceHandler.replace === 'function') {
      serviceHandler.replace(replacer, match);
    }
  }
}