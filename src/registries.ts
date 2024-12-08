import type { BPluginClass } from './plugin';
import type { BServiceClass } from './service';

export const ServiceRegistry = new Set<BServiceClass>();
export const ServiceIdentifiers = new Map<string, BServiceClass>();
export const PluginRegistry = new Set<BPluginClass>();

export function MakeCustomRegistry<T>() {
  const map = new Map<BServiceClass, T[]>();
  return {
    register(target: BServiceClass, prop: T) {
      let service = map.get(target);
      if (!service) {
        service = [];
        map.set(target, service);
      }
      service.unshift(prop);
    },
    get(target: BServiceClass) {
      return map.get(target);
    },
    count(target: BServiceClass) {
      const svc = map.get(target);
      if (!svc) return 0;
      return svc.length;
    },
    forEach(callback: (value: T[], key: BServiceClass) => void) {
      map.forEach(callback);
    },
  };
}
