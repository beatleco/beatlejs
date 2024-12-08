import type { BServiceInstance } from './service';

export type PropertyVault = Map<string, unknown>;

export const VaultSymbol = Symbol('__vault__');

export function getVault(instance: BServiceInstance<never>): PropertyVault {
  let vault: PropertyVault = instance[VaultSymbol];
  if (!vault) {
    vault = new Map();
    Object.defineProperty(instance, VaultSymbol, {
      configurable: false,
      writable: false,
      enumerable: false,
      value: vault,
    });
  }
  return vault;
}
