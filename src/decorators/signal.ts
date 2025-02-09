import { MakeSetRegistry } from "../registries";
import { BDescriptor } from "../service";

/**
 * A custom registry for signal definitions.
 * Stores information about methods that will trigger signal events.
 */
export const SignalRegistry = MakeSetRegistry<string>();

/**
 * A decorator function to register a service method for signal broadcasting.
 * It registers the method in the SignalRegistry to enable signal notifications when the property changes.
 *
 * @example
 *
 *
 * @param next The original method descriptor.
 */
export function signal<T>(next: BDescriptor<T>): BDescriptor<T> {
  return function (target, key) {
    // Register the method in the SignalRegistry to track signal events
    SignalRegistry.register(target, key);
    return next(target, key); // Return the original method descriptor
  };
}
