import { MakeSetRegistry } from '../../registries';
import type { BDescriptor } from '../../service';

export const OptimusRegistry = MakeSetRegistry<string>();

export function optimus<T>(
  next: BDescriptor<T>,
): BDescriptor<T> {
  return function (target, key) {
    OptimusRegistry.register(target, key);
    return next(target, key) as unknown as T;
  };
}
