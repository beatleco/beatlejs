import type { BContainer } from '../../container';
import { IdentifierSymbol } from '../../container';

import type {
  BServiceClass,
  BServiceDefinition,
  BServiceInstance,
} from '../../service';
import { BTagDefinition, TaggedRegistry } from './decorators';

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

function getRawServiceSnapshot(
  target: BServiceClass,
  instance: BServiceInstance<never>,
  properties: BTagDefinition[],
  catchTheseTags: string[],
): BServiceSnapshot | undefined {
  let isServiceExportable = false;
  const setOfTags = new Set(catchTheseTags);
  const data = properties.reduce<BServiceSnapshot['data']>(
    (acc, { propertyName, tag }) => {
      if (!setOfTags.has(tag)) return acc;
      isServiceExportable = true;
      acc[String(propertyName)] = instance[propertyName];
      return acc;
    },
    {},
  );
  if (!isServiceExportable) return;
  return {
    data,
    key: instance[IdentifierSymbol],
    version: target.version ?? 1,
  };
}

/**
 * Gets a snapshot of a service's data based on the tags provided.
 *
 * @param target The service definition or class to get a snapshot for.
 * @param catchTheseTags List of tags to filter the properties included in the snapshot.
 * @returns A service snapshot or undefined if no properties matched the tags.
 */
export function getServiceSnapshot(
  container: BContainer,
  target: BServiceDefinition | BServiceClass,
  catchTheseTags: string[],
): BServiceSnapshot | undefined {
  const metadata = target as unknown as BServiceClass;
  const properties = TaggedRegistry.get(metadata);
  if (!properties) return;
  const instance = container.getByClass(target) as BServiceInstance<never>;
  return getRawServiceSnapshot(metadata, instance, properties, catchTheseTags);
}

/**
 * Restores the service's state from a snapshot.
 * It updates the properties of the service instance based on the snapshot data.
 *
 * @param target The service definition or class to restore the state for.
 * @param snapshot The snapshot containing the data to restore.
 */
function restoreServiceSnapshot(
  container: BContainer,
  target: BServiceDefinition | BServiceClass,
  snapshot?: BServiceSnapshot,
) {
  if (!snapshot) return;
  const instance = container.getByClass<Record<string, unknown>>(target);

  Object.entries(snapshot.data).forEach(([propertyName, value]) => {
    if (!(propertyName in instance)) return;
    instance[propertyName] = value;
  });
}

/**
 * Gets a snapshot of all services in the container based on the tags provided.
 *
 * @param catchTheseTags List of tags to filter the properties included in the snapshot.
 * @returns A list of snapshots for all services matching the tags.
 */
export function getSnapshot(container: BContainer, catchTheseTags: string[]) {
  const snapshot: BContainerSnapshot = [];
  TaggedRegistry.forEach((properties, target) => {
    const instance = container.getByClass(target) as BServiceInstance<never>;
    const persistedProperties = getRawServiceSnapshot(
      target,
      instance,
      properties,
      catchTheseTags,
    );
    if (!persistedProperties) return;
    snapshot.push(persistedProperties);
  });
  return snapshot;
}

/**
 * Restores the container's state from a snapshot.
 * It restores the properties of all services based on the snapshot data.
 *
 * @param data The snapshot data to restore.
 */
export function restoreSnapshot(
  container: BContainer,
  data: BContainerSnapshot,
) {
  const map = new Map<string, BServiceClass>();

  TaggedRegistry.forEach((_, service) => {
    const instance = container.getByClass(service) as unknown as BServiceInstance<unknown>;
    map.set(instance[IdentifierSymbol], service);
  });
  data.forEach((item) => {
    const target = map.get(item.key);
    if (!target) return;
    restoreServiceSnapshot(container, target, item);
  });
}
