import type { BContainer } from '../container';
import { IdentifierSymbol } from '../container';
import { MakeArrayRegistry, extendPlugins } from '../registries';

import type {
  BDescriptor,
  BServiceClass,
  BServiceDefinition,
  BServiceInstance,
} from '../service';

/**
 * Type definition for a tagged property in a service.
 * Associates a tag with a service property.
 */
export type BTagDefinition = {
  propertyName: string; // The name of the property being tagged
  tag: string; // The tag associated with the property
};

/**
 * Snapshot of all service instances in the container.
 * A snapshot holds the state of all services in the container.
 */
export type BContainerSnapshot = BServiceSnapshot[];

/**
 * A service snapshot contains a key (service identifier),
 * version, and the data (properties) of a service instance.
 */
export type BServiceSnapshot = {
  key: string; // Unique key identifying the service instance
  version: number; // Version of the service (can be used for backward compatibility)
  data: Record<string, unknown>; // Data of the service instance, i.e., its properties
};

/**
 * Custom registry to keep track of tags associated with service properties.
 */
export const TagsRegistry = MakeArrayRegistry<BTagDefinition>();

/**
 * A decorator function to register a property with a specific tag.
 * This decorator allows properties to be tagged and their values to be managed in snapshots.
 *
 * @param tag The tag associated with the property.
 * @param next The original method descriptor.
 */
export function tagged<T>(tag: string, next: BDescriptor<T>): BDescriptor<T> {
  return function (target, propertyName) {
    // Register the tagged property in the TagsRegistry
    TagsRegistry.register(target, {
      tag,
      propertyName,
    });
    return next(target, propertyName) as T;
  };
}

/**
 * The main plugin responsible for managing service snapshots based on tagged properties.
 * This plugin supports snapshot creation, restoration, and updating for services.
 *
 * @param container Optional container that holds the services and their instances.
 */
export function TagsPlugin(container?: BContainer) {
  /**
   * Gets a snapshot of a service instance based on its tagged properties.
   *
   * @param target The service class or definition.
   * @param instance The instance of the service.
   * @param properties The properties of the service that have tags.
   * @param catchTheseTags List of tags to filter which properties to include in the snapshot.
   * @returns A snapshot of the service's data or undefined if no matching properties were found.
   */
  function getRawServiceSnapshot(
    target: BServiceClass,
    instance: BServiceInstance<never>,
    properties: BTagDefinition[],
    catchTheseTags: string[],
  ): BServiceSnapshot | undefined {
    let isServiceExportable = false;
    const setOfTags = new Set(catchTheseTags); // Create a set of tags to filter by
    const data = properties.reduce<BServiceSnapshot['data']>(
      (acc, { propertyName, tag }) => {
        // Only include properties that match the desired tags
        if (!setOfTags.has(tag)) return acc;
        isServiceExportable = true;
        acc[String(propertyName)] = instance[propertyName]; // Add property to snapshot data
        return acc;
      },
      {},
    );
    if (!isServiceExportable) return; // Return undefined if no properties match the tags
    return {
      data,
      key: instance[IdentifierSymbol], // Service instance identifier
      version: target.version ?? 1, // Service version (default to 1 if not provided)
    };
  }

  /**
   * Gets a snapshot of a service's data based on the tags provided.
   *
   * @param target The service definition or class to get a snapshot for.
   * @param catchTheseTags List of tags to filter the properties included in the snapshot.
   * @returns A service snapshot or undefined if no properties matched the tags.
   */
  function getServiceSnapshot(
    target: BServiceDefinition | BServiceClass,
    catchTheseTags: string[],
  ): BServiceSnapshot | undefined {
    if (!container) return;
    const metadata = target as unknown as BServiceClass;
    const properties = TagsRegistry.get(metadata); // Get the properties that have tags
    if (!properties) return;
    const instance = container.getByClass(target) as BServiceInstance<never>;
    return getRawServiceSnapshot(
      metadata,
      instance,
      properties,
      catchTheseTags,
    );
  }

  /**
   * Restores the service's state from a snapshot.
   * It updates the properties of the service instance based on the snapshot data.
   *
   * @param target The service definition or class to restore the state for.
   * @param snapshot The snapshot containing the data to restore.
   */
  function restoreServiceSnapshot(
    target: BServiceDefinition | BServiceClass,
    snapshot?: BServiceSnapshot,
  ) {
    if (!snapshot || !container) return;
    const instance = container.getByClass<Record<string, unknown>>(target);
    // Iterate through each property in the snapshot and restore its value
    Object.entries(snapshot.data).forEach(([propertyName, value]) => {
      if (!(propertyName in instance)) return; // Skip properties that don't exist
      instance[propertyName] = value; // Restore the property value
    });
  }

  /**
   * Gets a snapshot of all services in the container based on the tags provided.
   *
   * @param catchTheseTags List of tags to filter the properties included in the snapshot.
   * @returns A list of snapshots for all services matching the tags.
   */
  function getSnapshot(catchTheseTags: string[]) {
    if (!container) return [];
    const snapshot: BContainerSnapshot = [];
    TagsRegistry.forEach((properties, target) => {
      const instance = container.getByClass(target) as BServiceInstance<never>;
      const persistedProperties = getRawServiceSnapshot(
        target,
        instance,
        properties,
        catchTheseTags,
      );
      if (!persistedProperties) return;
      snapshot.push({
        key: target.identifier,
        version: target.version ?? 1, // Include the version of the service
        data: persistedProperties, // Include the data from the snapshot
      });
    });
    return snapshot; // Return the container snapshot
  }

  /**
   * Restores the container's state from a snapshot.
   * It restores the properties of all services based on the snapshot data.
   *
   * @param data The snapshot data to restore.
   */
  function restoreSnapshot(data: BContainerSnapshot) {
    const map = new Map<string, BServiceClass>();
    // Map each service identifier to its corresponding service class
    TagsRegistry.forEach((_, service) => {
      map.set(service.identifier, service);
    });
    data.forEach((item) => {
      const target = map.get(item.key); // Find the service class by key
      if (!target) return;
      restoreServiceSnapshot(target, item); // Restore the service from the snapshot
    });
  }

  // Return the plugin's methods and lifecycle hooks
  return {
    getSnapshot,
    restoreSnapshot,
    getServiceSnapshot,
    restoreServiceSnapshot,
    onCreate: undefined,
    onDestroy: undefined,
  };
}

extendPlugins(TagsPlugin);
