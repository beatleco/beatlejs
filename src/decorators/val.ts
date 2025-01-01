import { BDescriptor } from "../service";

/**
 * Defines primitive values within services using `val`.
 *
 * @description
 * The `val` function is used to define simple, primitive values within a service. This function is ideal for defining
 * properties that you want to store within a service, such as strings, numbers, booleans, or arrays, that can be accessed
 * and modified as part of the service's state.
 *
 * @example
 * ```tsx
 * import { Service, val } from "beatlejs";
 *
 * const $ServiceA = Service({ identifier: 'ServiceA' }, {
 *   userName: val('Beatle'),
 * });
 * ```
 *
 * @param next - The primitive value to be defined on the service. This could be a string, number, array, or any primitive type.
 *
 * @returns {BDescriptor<T>} A descriptor function that attaches the provided value to the service definition.
 */
export function val<T>(next: T): BDescriptor<T> {
  return function () {
    return next;
  };
}
