import { MakeSetRegistry } from '../../registries';
import { type BDescriptor } from '../../service';
import { type DePromise } from '../../types';

export type BProgressiveContext = {
  pending: boolean;
  error: unknown;
};
export type BProgressiveReplacement<T extends (...args: any[]) => any> = ((
  ...args: Parameters<T>
) => Promise<DePromise<ReturnType<T>>>) &
  BProgressiveContext;

export const ProgressiveRegistry = MakeSetRegistry<string>();

export function progressive<T extends (...args: any[]) => any>(
  next: BDescriptor<T>,
): BDescriptor<BProgressiveReplacement<T>> {
  return function (target, key) {
    ProgressiveRegistry.register(target, key);
    return next(target, key) as unknown as BProgressiveReplacement<T>;
  };
}
