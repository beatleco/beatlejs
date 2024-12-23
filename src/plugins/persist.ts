import { MakeSetRegistry } from '../registries';
import type {
  BDescriptor
} from '../service';

export const PersistRegistry = MakeSetRegistry<string>();

/**
 * A decorator function to register a property as persistable.
 * This decorator allows properties to be tagged and their values to be managed in snapshots.
 *
 * @param next - The original method descriptor.
 * @returns A descriptor function that registers the property as persistable.
 */
export function persisted<T>(next: BDescriptor<T>): BDescriptor<T> {
  return function (target, propertyName) {
    PersistRegistry.register(target, propertyName);
    return next(target, propertyName) as T;
  };
}
