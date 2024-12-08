import type { BContainer } from '../container';
import { IdentifierSymbol } from '../container';
import { MakeCustomRegistry, PluginRegistry } from '../registries';
import type {
  BDescriptor,
  BServiceClass,
  BServiceDefinition,
  BServiceInstance,
} from '../service';

export type BTagDefinition = {
  propertyName: string;
  tag: string;
};

export type BContainerSnapshot = BServiceSnapshot[];
export type BServiceSnapshot = {
  key: string;
  version: number;
  data: Record<string, unknown>;
};

export const TagsRegistry = MakeCustomRegistry<BTagDefinition>();

export function tagged<T>(tag: string, next: BDescriptor<T>): BDescriptor<T> {
  return function (target, propertyName) {
    TagsRegistry.register(target, {
      tag,
      propertyName,
    });
    return next(target, propertyName) as T;
  };
}

export function TagsPlugin(container?: BContainer) {
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

  function getServiceSnapshot(
    target: BServiceDefinition | BServiceClass,
    catchTheseTags: string[],
  ): BServiceSnapshot | undefined {
    if (!container) return;
    const metadata = target as unknown as BServiceClass;
    const properties = TagsRegistry.get(metadata);
    if (!properties) return;
    const instance = container.getByClass(target) as BServiceInstance<never>;
    return getRawServiceSnapshot(
      metadata,
      instance,
      properties,
      catchTheseTags,
    );
  }

  function restoreServiceSnapshot(
    target: BServiceDefinition | BServiceClass,
    snapshot?: BServiceSnapshot,
  ) {
    if (!snapshot || !container) return;
    const instance = container.getByClass<Record<string, unknown>>(target);
    Object.entries(snapshot.data).forEach(([propertyName, value]) => {
      if (!(propertyName in instance)) return;
      instance[propertyName] = value;
    });
  }

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
        version: target.version ?? 1,
        data: persistedProperties,
      });
    });
    return snapshot;
  }
  function restoreSnapshot(data: BContainerSnapshot) {
    const map = new Map<string, BServiceClass>();
    TagsRegistry.forEach((_, service) => {
      map.set(service.identifier, service);
    });
    data.forEach((item) => {
      const target = map.get(item.key);
      if (!target) return;
      restoreServiceSnapshot(target, item);
    });
  }
  return {
    getSnapshot,
    restoreSnapshot,
    getServiceSnapshot,
    restoreServiceSnapshot,
    onCreate: undefined,
    onDestroy: undefined,
  };
}

PluginRegistry.add(TagsPlugin);
