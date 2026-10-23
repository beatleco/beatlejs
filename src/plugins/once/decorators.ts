import { MakeSetRegistry } from '../../registries';
import type { BDescriptor } from '../../service';

export const OnceRegistry = MakeSetRegistry<string>();

export function once<T>(next: BDescriptor<T>): BDescriptor<T> {
  return function (target, key) {
    OnceRegistry.register(target, key);
    return next(target, key) as unknown as T;
  };
}
