import { MakeSetRegistry } from "../registries";
import { BDescriptor } from "../service";

/**
 * A custom registry for react effect definitions.
 * Stores information about methods that react has to call on mount and un-mount.
 */
export const EffectRegistry = MakeSetRegistry<string>();

/**
 * A decorator function to register a service method for effect handling.
 * It registers the method in the EffectRegistry to enable calling the effect on mount and unmount.
 *
 * @example
 *
 *
 * @param next The original method descriptor.
 */
export function effect<T>(next: BDescriptor<T>): BDescriptor<T> {
  return function (target, key) {
    EffectRegistry.register(target, key);
    return next(target, key);
  };
}
