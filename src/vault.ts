import type { BServiceInstance } from './service';

/**
 * Type definition for the Property Vault.
 * The vault is a map that stores properties of a service instance.
 */
export type PropertyVault = Map<string, { value: unknown }>;

/**
 * Symbol used to identify the property vault on service instances.
 */
export const VaultSymbol = Symbol('__vault__');

/**
 * Retrieves the property vault for a given service instance.
 * If the vault does not exist, it creates and attaches a new one.
 *
 * @param instance The service instance.
 * @returns The property vault for the instance.
 */
export function getVaultFromInstance(
  instance: BServiceInstance<unknown>,
): PropertyVault {
  if (!(VaultSymbol in instance)) {
    const vault = new Map();
    Object.defineProperty(instance, VaultSymbol, {
      configurable: false,
      writable: false,
      enumerable: false,
      value: vault,
    });
    return vault;
  }
  return instance[VaultSymbol] as unknown as PropertyVault;
}
