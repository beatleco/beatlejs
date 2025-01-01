import { MakeArrayRegistry } from '../../registries';

import type { BDescriptor } from '../../service';

/**
 * Type definition for a tagged property in a service.
 * Associates a tag with a service property.
 */
export type BTagDefinition = {
  propertyName: string;
  tag: string;
};

/**
 * Custom registry to keep track of tags associated with service properties.
 */
export const TaggedRegistry = MakeArrayRegistry<BTagDefinition>();

/**
 * A decorator function to register a property with a specific tag.
 * This decorator allows properties to be tagged and their values to be managed in snapshots.
 *
 * @param tag The tag associated with the property.
 * @param next The original method descriptor.
 */
export function tagged<T>(tag: string, next: BDescriptor<T>): BDescriptor<T> {
  return function (target, propertyName) {
    TaggedRegistry.register(target, {
      tag,
      propertyName,
    });
    return next(target, propertyName) as T;
  };
}
