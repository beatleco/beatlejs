import { MakeSetRegistry } from '../../registries';
import type { BDescriptor } from '../../service';

export const ImmediateRegistry = MakeSetRegistry<string>();

export function immediate<T>(next: BDescriptor<T>): BDescriptor<T> {
  return function (target, key) {
    ImmediateRegistry.register(target, key);
    return next(target, key) as unknown as T;
  };
}
